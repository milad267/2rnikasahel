#!/bin/bash
# Dornika Sahel - Installer Worker (Root-owned, Secure)
#
# Security Architecture:
# - Runs from Root-owned directory: /usr/local/lib/dornika-installer/
# - Reads config from FIXED path: APP_DATA_DIR/setup/setup-config.json
# - Request file contains ONLY: requestId, type, timestamp, requestedBy
# - NO configPath, NO commands, NO paths in request
# - Validates request schema strictly
# - Rejects any request with unexpected fields
# - Atomic file operations
# - Secure queue directory structure

set -e

# Configuration
INSTALLER_DIR="/usr/local/lib/dornika-installer"
DATA_DIR="/var/lib/dornika"
INSTALLER_DATA_DIR="/var/lib/dornika-installer"
QUEUE_DIR="$DATA_DIR/setup/installer-queue"
PROCESSING_DIR="$DATA_DIR/setup/installer-processing"
PROCESSED_DIR="$DATA_DIR/setup/installer-processed"
FAILED_DIR="$DATA_DIR/setup/installer-failed"
STATE_FILE="$DATA_DIR/setup/installer-state.json"
CONFIG_FILE="$DATA_DIR/setup/setup-config.json"  # FIXED path
LOG_FILE="$DATA_DIR/logs/installer.log"
FIREWALL_SNAPSHOTS="$INSTALLER_DATA_DIR/firewall-snapshots"

# Polling interval (seconds)
POLL_INTERVAL=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"; }

# Update state
update_state() {
    local stage="$1"
    local status="$2"
    local message="${3:-}"
    local timestamp=$(date -Iseconds)

    cat > "$STATE_FILE" << EOF
{
  "stage": "$stage",
  "status": "$status",
  "message": "$message",
  "timestamp": "$timestamp"
}
EOF
}

# Validate request file security
validate_request_security() {
    local request_file="$1"

    # Check if file exists
    if [ ! -f "$request_file" ]; then
        log_error "Request file does not exist: $request_file"
        return 1
    fi

    # Check if regular file (not symlink, not directory)
    if [ ! -f "$request_file" ] || [ -L "$request_file" ]; then
        log_error "Request file is not a regular file or is a symlink: $request_file"
        return 1
    fi

    # Check file is in queue directory (path traversal protection)
    local real_path=$(realpath "$request_file" 2>/dev/null || echo "")
    local queue_real=$(realpath "$QUEUE_DIR" 2>/dev/null || echo "")

    if [[ ! "$real_path" == "$queue_real"/* ]]; then
        log_error "Request file is outside queue directory (security violation): $request_file"
        return 1
    fi

    # Check file permissions (must be 600)
    local perms=$(stat -c %a "$request_file" 2>/dev/null || echo "")
    if [ "$perms" != "600" ]; then
        log_error "Request file permissions are not 600: $perms (rejecting)"
        return 1
    fi

    # Check file owner (should be root or dornika)
    local owner=$(stat -c %U "$request_file" 2>/dev/null || echo "")
    if [ "$owner" != "root" ] && [ "$owner" != "dornika" ]; then
        log_error "Request file owner is not root or dornika: $owner (rejecting)"
        return 1
    fi

    return 0
}

# Validate request schema (strict)
validate_request_schema() {
    local request_file="$1"

    # Validate JSON with strict parsing
    if ! jq -e . "$request_file" >/dev/null 2>&1; then
        log_error "Invalid JSON in request file"
        return 1
    fi

    # Extract fields with strict validation
    local request_id=$(jq -e -r '.requestId // empty' "$request_file" 2>/dev/null || echo "")
    local request_type=$(jq -e -r '.type // empty' "$request_file" 2>/dev/null || echo "")
    local timestamp=$(jq -e -r '.timestamp // empty' "$request_file" 2>/dev/null || echo "")
    local requested_by=$(jq -e -r '.requestedBy // empty' "$request_file" 2>/dev/null || echo "")

    # Validate required fields exist
    if [ -z "$request_id" ]; then
        log_error "Request ID is missing"
        return 1
    fi

    if [ -z "$request_type" ]; then
        log_error "Request type is missing"
        return 1
    fi

    if [ -z "$timestamp" ]; then
        log_error "Timestamp is missing"
        return 1
    fi

    if [ -z "$requested_by" ]; then
        log_error "RequestedBy is missing"
        return 1
    fi

    # Validate requestId format (hex string, 32-64 chars)
    if [[ ! "$request_id" =~ ^[a-f0-9]{32,64}$ ]]; then
        log_error "Invalid requestId format: $request_id"
        return 1
    fi

    # Validate type is exactly "apply_setup" or "firewall_confirm"
    if [ "$request_type" != "apply_setup" ] && [ "$request_type" != "firewall_confirm" ]; then
        log_error "Invalid request type: $request_type (only 'apply_setup' or 'firewall_confirm' allowed)"
        return 1
    fi

    # Validate timestamp format (ISO 8601)
    if [[ ! "$timestamp" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2} ]]; then
        log_error "Invalid timestamp format: $timestamp"
        return 1
    fi

    # Validate requestedBy (alphanumeric, dash, underscore only)
    if [[ ! "$requested_by" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        log_error "Invalid requestedBy format: $requested_by"
        return 1
    fi

    # Check for unexpected fields (security)
    local field_count=$(jq 'keys | length' "$request_file")
    if [ "$field_count" -ne 4 ]; then
        log_error "Request has unexpected fields (expected 4, got $field_count)"
        return 1
    fi

    # Verify only allowed fields exist
    local has_configPath=$(jq 'has("configPath")' "$request_file")
    local has_command=$(jq 'has("command")' "$request_file")
    local has_path=$(jq 'has("path")' "$request_file")
    local has_url=$(jq 'has("url")' "$request_file")
    local has_sql=$(jq 'has("sql")' "$request_file")

    if [ "$has_configPath" = "true" ] || [ "$has_command" = "true" ] || [ "$has_path" = "true" ] || [ "$has_url" = "true" ] || [ "$has_sql" = "true" ]; then
        log_error "Request contains forbidden fields (configPath, command, path, url, or sql)"
        return 1
    fi

    log_info "Request schema validated: $request_id"
    return 0
}

# Validate configuration (from FIXED path) - Root-side validation
validate_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        update_state "validation" "failed" "Configuration file not found"
        return 1
    fi

    # Reject symlinks
    if [ -L "$CONFIG_FILE" ]; then
        log_error "Configuration file is a symlink (security violation): $CONFIG_FILE"
        update_state "validation" "failed" "Configuration file is a symlink"
        return 1
    fi

    # Validate JSON with strict parsing
    if ! jq -e . "$CONFIG_FILE" >/dev/null 2>&1; then
        log_error "Invalid JSON in configuration file"
        update_state "validation" "failed" "Invalid JSON"
        return 1
    fi

    # Extract and validate fields with strict parsing
    DOMAIN=$(jq -e -r '.domain // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    EMAIL=$(jq -e -r '.email // empty' "$CONFIG_FILE" 2>/dev/null || echo "")
    SSL_MODE=$(jq -e -r '.sslMode // empty' "$CONFIG_FILE" 2>/dev/null || echo "none")

    # Validate domain (required)
    if [ -z "$DOMAIN" ]; then
        log_error "Domain is required"
        update_state "validation" "failed" "Domain is required"
        return 1
    fi

    # Validate domain format (strict regex)
    if [[ ! "$DOMAIN" =~ ^(localhost|([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$ ]]; then
        log_error "Invalid domain format: $DOMAIN"
        update_state "validation" "failed" "Invalid domain format"
        return 1
    fi

    # Reject dangerous characters in domain
    if [[ "$DOMAIN" =~ [\<\>\&\;\|\`\$\(\)\{\}\[\]\!\#\*\?\~] ]]; then
        log_error "Domain contains dangerous characters"
        update_state "validation" "failed" "Domain contains dangerous characters"
        return 1
    fi

    # Validate SSL mode (required)
    if [ -z "$SSL_MODE" ]; then
        SSL_MODE="none"
    fi

    if [[ ! "$SSL_MODE" =~ ^(none|lets_encrypt|manual_certificate)$ ]]; then
        log_error "Invalid SSL mode: $SSL_MODE"
        update_state "validation" "failed" "Invalid SSL mode"
        return 1
    fi

    # Validate email for Let's Encrypt
    if [ "$SSL_MODE" = "lets_encrypt" ]; then
        if [ -z "$EMAIL" ]; then
            log_error "Email is required for Let's Encrypt SSL"
            update_state "validation" "failed" "Email is required for Let's Encrypt"
            return 1
        fi

        # Strict email validation
        if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            log_error "Invalid email format: $EMAIL"
            update_state "validation" "failed" "Invalid email format"
            return 1
        fi

        # Reject dangerous characters in email
        if [[ "$EMAIL" =~ [\<\>\&\;\|\`\$\(\)\{\}\[\]\!\#\*\?\~] ]]; then
            log_error "Email contains dangerous characters"
            update_state "validation" "failed" "Email contains dangerous characters"
            return 1
        fi
    fi

    # Check for forbidden fields (security)
    local forbidden_fields=("command" "shell" "binary" "argument" "url" "filePath" "configPath" "certificatePath" "snapshotId" "sql")
    for field in "${forbidden_fields[@]}"; do
        if jq -e "has(\"$field\")" "$CONFIG_FILE" >/dev/null 2>&1; then
            log_error "Configuration contains forbidden field: $field"
            update_state "validation" "failed" "Configuration contains forbidden field"
            return 1
        fi
    done

    # Validate field count (should be limited)
    local field_count=$(jq 'keys | length' "$CONFIG_FILE")
    if [ "$field_count" -gt 20 ]; then
        log_error "Configuration has too many fields (expected <= 20, got $field_count)"
        update_state "validation" "failed" "Configuration has too many fields"
        return 1
    fi

    log_info "Configuration validated successfully"
    update_state "validation" "completed" "Configuration validated"
    return 0
}

# Task: Apply HTTP Nginx
apply_http_nginx() {
    log_step "Applying HTTP Nginx configuration..."
    update_state "nginx_http" "running" "Applying HTTP Nginx"

    local DOMAIN=$(jq -r '.domain // "localhost"' "$CONFIG_FILE")

    # Copy HTTP template from Root-owned directory
    cp "$INSTALLER_DIR/nginx-http.conf" /etc/nginx/sites-available/dornika
    sed -i "s/{{DOMAIN}}/$DOMAIN/g" /etc/nginx/sites-available/dornika

    # Enable site
    ln -sf /etc/nginx/sites-available/dornika /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test configuration
    if ! nginx -t; then
        log_error "Nginx configuration test failed"
        update_state "nginx_http" "failed" "Nginx test failed"
        return 1
    fi

    # Reload Nginx
    systemctl reload nginx

    log_info "HTTP Nginx applied successfully"
    update_state "nginx_http" "completed" "HTTP Nginx applied"
    return 0
}

# Task: Apply Let's Encrypt SSL
apply_letsencrypt_ssl() {
    log_step "Applying Let's Encrypt SSL..."
    update_state "ssl_letsencrypt" "running" "Applying Let's Encrypt SSL"

    local DOMAIN=$(jq -r '.domain' "$CONFIG_FILE")
    local EMAIL=$(jq -r '.email' "$CONFIG_FILE")

    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot is not installed"
        update_state "ssl_letsencrypt" "failed" "Certbot not installed"
        return 1
    fi

    # Check DNS resolution
    if ! nslookup "$DOMAIN" &> /dev/null; then
        log_error "Domain does not resolve: $DOMAIN"
        update_state "ssl_letsencrypt" "failed" "Domain does not resolve"
        return 1
    fi

    # Check port 80
    if ! nc -z localhost 80 &> /dev/null; then
        log_error "Port 80 is not listening"
        update_state "ssl_letsencrypt" "failed" "Port 80 not listening"
        return 1
    fi

    # Obtain certificate
    if ! certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL"; then
        log_error "Certbot failed to obtain certificate"
        update_state "ssl_letsencrypt" "failed" "Certbot failed"
        return 1
    fi

    # Copy HTTPS template from Root-owned directory
    cp "$INSTALLER_DIR/nginx-https.conf" /etc/nginx/sites-available/dornika
    sed -i "s/{{DOMAIN}}/$DOMAIN/g" /etc/nginx/sites-available/dornika

    # Test configuration
    if ! nginx -t; then
        log_error "Nginx configuration test failed after SSL"
        update_state "ssl_letsencrypt" "failed" "Nginx test failed"
        return 1
    fi

    # Reload Nginx
    systemctl reload nginx

    log_info "Let's Encrypt SSL applied successfully"
    update_state "ssl_letsencrypt" "completed" "Let's Encrypt SSL applied"
    return 0
}

# Task: Apply Manual SSL
apply_manual_ssl() {
    log_step "Applying Manual SSL..."
    update_state "ssl_manual" "running" "Applying Manual SSL"

    local DOMAIN=$(jq -e -r '.domain' "$CONFIG_FILE" 2>/dev/null || echo "")
    local CERT_DIR="/etc/dornika/certs/$DOMAIN"
    local STAGING_DIR="/var/lib/dornika/setup/cert-staging"

    # Validate domain format
    if [[ ! "$DOMAIN" =~ ^(localhost|([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$ ]]; then
        log_error "Invalid domain format: $DOMAIN"
        update_state "ssl_manual" "failed" "Invalid domain format"
        return 1
    fi

    # Check if certificate files exist in final location (SSH method)
    if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
        log_info "Certificate files found in final location (SSH method)"
    # Check if certificate files exist in staging (Wizard upload method)
    elif [ -d "$STAGING_DIR" ]; then
        log_info "Checking staging directory for uploaded certificates..."
        
        # Find most recent metadata file (secure)
        local metadata_file=""
        for f in "$STAGING_DIR"/*.metadata.json; do
            if [ -f "$f" ]; then
                metadata_file="$f"
                break
            fi
        done
        
        if [ -z "$metadata_file" ] || [ ! -f "$metadata_file" ]; then
            log_error "No staged certificate metadata found"
            update_state "ssl_manual" "failed" "No staged certificate found. Please upload via Wizard or SSH."
            return 1
        fi

        # Validate metadata file security
        if [ -L "$metadata_file" ]; then
            log_error "Metadata file is a symlink (security violation)"
            update_state "ssl_manual" "failed" "Metadata file security violation"
            return 1
        fi

        local meta_perms=$(stat -c %a "$metadata_file" 2>/dev/null || echo "")
        if [ "$meta_perms" != "600" ]; then
            log_error "Metadata file permissions are not 600: $meta_perms"
            update_state "ssl_manual" "failed" "Metadata file permission violation"
            return 1
        fi

        # Extract and validate IDs from metadata
        local cert_id=$(jq -e -r '.certId // empty' "$metadata_file" 2>/dev/null || echo "")
        local key_id=$(jq -e -r '.keyId // empty' "$metadata_file" 2>/dev/null || echo "")
        local meta_domain=$(jq -e -r '.domain // empty' "$metadata_file" 2>/dev/null || echo "")

        # Validate cert_id and key_id format (hex string, 32 chars)
        if [[ ! "$cert_id" =~ ^[a-f0-9]{32}$ ]] || [[ ! "$key_id" =~ ^[a-f0-9]{32}$ ]]; then
            log_error "Invalid cert_id or key_id format"
            update_state "ssl_manual" "failed" "Invalid certificate ID format"
            return 1
        fi

        # Validate domain match
        if [ "$meta_domain" != "$DOMAIN" ]; then
            log_error "Domain mismatch: metadata=$meta_domain, config=$DOMAIN"
            update_state "ssl_manual" "failed" "Domain mismatch"
            return 1
        fi

        local staging_cert="$STAGING_DIR/${cert_id}.pem"
        local staging_key="$STAGING_DIR/${key_id}.key"

        # Validate staging files security
        if [ ! -f "$staging_cert" ] || [ ! -f "$staging_key" ]; then
            log_error "Staged certificate files not found"
            update_state "ssl_manual" "failed" "Staged certificate files not found"
            return 1
        fi

        if [ -L "$staging_cert" ] || [ -L "$staging_key" ]; then
            log_error "Staged files are symlinks (security violation)"
            update_state "ssl_manual" "failed" "Staged files security violation"
            return 1
        fi

        # Validate staging files are within staging directory
        local cert_real=$(realpath "$staging_cert" 2>/dev/null || echo "")
        local key_real=$(realpath "$staging_key" 2>/dev/null || echo "")
        local staging_real=$(realpath "$STAGING_DIR" 2>/dev/null || echo "")

        if [[ ! "$cert_real" == "$staging_real"/* ]] || [[ ! "$key_real" == "$staging_real"/* ]]; then
            log_error "Staged files are outside staging directory (security violation)"
            update_state "ssl_manual" "failed" "Staged files path violation"
            return 1
        fi

        log_info "Found staged certificate files"

        # Normalize domain (lowercase, remove trailing dot)
        DOMAIN=$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]' | sed 's/\.$//')

        # Validate domain format (ASCII/Punycode only, no dangerous characters)
        if [[ ! "$DOMAIN" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$ ]]; then
            log_error "Invalid domain format: $DOMAIN"
            update_state "ssl_manual" "failed" "Invalid domain format"
            return 1
        fi

        # Validate certificate with openssl
        if ! openssl x509 -in "$staging_cert" -noout -text >/dev/null 2>&1; then
            log_error "Certificate validation failed"
            update_state "ssl_manual" "failed" "Certificate validation failed"
            return 1
        fi

        # Check certificate expiry (must have at least 24 hours remaining)
        if ! openssl x509 -in "$staging_cert" -checkend 86400 -noout >/dev/null 2>&1; then
            log_error "Certificate expired or expires within 24 hours"
            update_state "ssl_manual" "failed" "Certificate expired or expiring soon"
            return 1
        fi

        # Check certificate is valid for SSL server (has proper extensions)
        local cert_purpose=$(openssl x509 -in "$staging_cert" -noout -purpose 2>/dev/null | grep "SSL server" || echo "")
        if [[ ! "$cert_purpose" == *"Yes"* ]]; then
            log_error "Certificate is not valid for SSL server"
            update_state "ssl_manual" "failed" "Certificate not valid for SSL server"
            return 1
        fi

        # Validate private key with openssl
        if ! openssl pkey -in "$staging_key" -noout >/dev/null 2>&1; then
            log_error "Private key validation failed"
            update_state "ssl_manual" "failed" "Private key validation failed"
            return 1
        fi

        # Check certificate and key match using Public Key Fingerprint
        # This method works for RSA, EC/ECDSA, and other key types
        local cert_pubkey_fp=$(openssl x509 -in "$staging_cert" -pubkey -noout 2>/dev/null | openssl pkey -pubin -outform DER 2>/dev/null | openssl dgst -sha256 | awk '{print $NF}')
        local key_pubkey_fp=$(openssl pkey -in "$staging_key" -pubout -outform DER 2>/dev/null | openssl dgst -sha256 | awk '{print $NF}')

        if [ -z "$cert_pubkey_fp" ] || [ -z "$key_pubkey_fp" ]; then
            log_error "Failed to extract public key fingerprints"
            update_state "ssl_manual" "failed" "Public key extraction failed"
            return 1
        fi

        if [ "$cert_pubkey_fp" != "$key_pubkey_fp" ]; then
            log_error "Certificate and private key do not match (public key fingerprint mismatch)"
            update_state "ssl_manual" "failed" "Certificate and key mismatch"
            return 1
        fi

        log_info "Certificate and private key match verified"

        # Check domain in certificate using openssl -checkhost (if available)
        # Fallback to manual check if -checkhost not supported
        local domain_matched=false
        
        # Try openssl x509 -checkhost first (OpenSSL 1.1.1+)
        if openssl x509 -in "$staging_cert" -checkhost "$DOMAIN" -noout >/dev/null 2>&1; then
            domain_matched=true
            log_info "Domain $DOMAIN verified via openssl -checkhost"
        else
            # Fallback: Manual SAN/CN extraction (portable method)
            # Extract SAN entries using awk instead of grep -P
            local san_entries=$(openssl x509 -in "$staging_cert" -noout -ext subjectAltName 2>/dev/null | \
                awk -F'DNS:' '{for(i=2;i<=NF;i++) print $i}' | \
                awk -F',' '{print $1}' | \
                tr '[:upper:]' '[:lower:]' | \
                sed 's/^[ \t]*//;s/[ \t]*$//')
            
            # Extract CN
            local cn=$(openssl x509 -in "$staging_cert" -noout -subject 2>/dev/null | \
                sed -n 's/.*CN *= *\([^,/]*\).*/\1/p' | \
                tr '[:upper:]' '[:lower:]' | \
                sed 's/^[ \t]*//;s/[ \t]*$//')
            
            # Check SAN entries (exact match or wildcard)
            for san in $san_entries; do
                # Exact match
                if [ "$san" = "$DOMAIN" ]; then
                    domain_matched=true
                    break
                fi
                # Wildcard match
                # *.example.com matches sub.example.com (one label)
                # *.shop.example.com matches api.shop.example.com (one label)
                # Does NOT match: example.com, shop.example.com, a.b.example.com
                if [[ "$san" == \*.* ]]; then
                    local wildcard_base="${san#\*.}"
                    local domain_base="${DOMAIN#*.}"
                    
                    # Domain must end with .wildcard_base
                    # Prefix must be exactly one label (no dots)
                    if [[ "$DOMAIN" == *."$wildcard_base" ]]; then
                        local prefix="${DOMAIN%."$wildcard_base"}"
                        # Prefix must not be empty and must not contain dots
                        if [ -n "$prefix" ] && [[ "$prefix" != *.* ]]; then
                            domain_matched=true
                            break
                        fi
                    fi
                fi
            done
            
            # Check CN if no SAN match (CN is fallback only if no SAN exists)
            if [ "$domain_matched" = false ] && [ -z "$san_entries" ] && [ -n "$cn" ]; then
                # Exact match
                if [ "$cn" = "$DOMAIN" ]; then
                    domain_matched=true
                fi
                # Wildcard CN match (same rules as SAN)
                if [[ "$cn" == \*.* ]]; then
                    local wildcard_base="${cn#\*.}"
                    local domain_base="${DOMAIN#*.}"
                    
                    # Domain must end with .wildcard_base
                    # Prefix must be exactly one label (no dots)
                    if [[ "$DOMAIN" == *."$wildcard_base" ]]; then
                        local prefix="${DOMAIN%."$wildcard_base"}"
                        # Prefix must not be empty and must not contain dots
                        if [ -n "$prefix" ] && [[ "$prefix" != *.* ]]; then
                            domain_matched=true
                        fi
                    fi
                fi
            fi
        fi
        
        # Domain must match - fail if not
        if [ "$domain_matched" = false ]; then
            log_error "Domain $DOMAIN does not match certificate CN or SAN entries"
            update_state "ssl_manual" "failed" "Domain mismatch with certificate"
            return 1
        fi
        
        log_info "Domain $DOMAIN verified in certificate"

        # Create final directory
        mkdir -p "$CERT_DIR"
        chmod 700 "$CERT_DIR"
        chown root:root "$CERT_DIR"

        # Move files to final location
        cp "$staging_cert" "$CERT_DIR/fullchain.pem"
        cp "$staging_key" "$CERT_DIR/privkey.pem"

        # Set permissions
        chmod 600 "$CERT_DIR/fullchain.pem"
        chmod 600 "$CERT_DIR/privkey.pem"
        chown root:root "$CERT_DIR/fullchain.pem"
        chown root:root "$CERT_DIR/privkey.pem"

        # Clean up staging files
        rm -f "$staging_cert" "$staging_key" "$metadata_file"

        log_info "Certificate files moved to final location"
    else
        log_error "Certificate files not found in final location or staging"
        update_state "ssl_manual" "failed" "Certificate not found"
        return 1
    fi

    # Check permissions
    local key_perms=$(stat -c %a "$CERT_DIR/privkey.pem")
    if [ "$key_perms" != "600" ]; then
        log_warn "Private key permissions are not 600, fixing..."
        chmod 600 "$CERT_DIR/privkey.pem"
    fi

    local key_owner=$(stat -c %U:%G "$CERT_DIR/privkey.pem")
    if [ "$key_owner" != "root:root" ]; then
        log_warn "Private key owner is not root:root, fixing..."
        chown root:root "$CERT_DIR/privkey.pem"
    fi

    # Copy manual HTTPS template from Root-owned directory
    cp "$INSTALLER_DIR/nginx-manual.conf" /etc/nginx/sites-available/dornika
    sed -i "s/{{DOMAIN}}/$DOMAIN/g" /etc/nginx/sites-available/dornika

    # Test configuration
    if ! nginx -t; then
        log_error "Nginx configuration test failed"
        update_state "ssl_manual" "failed" "Nginx test failed"
        return 1
    fi

    # Reload Nginx
    systemctl reload nginx

    log_info "Manual SSL applied successfully"
    update_state "ssl_manual" "completed" "Manual SSL applied"
    return 0
}

# Task: Apply Firewall Rules
apply_firewall_rules() {
    log_step "Applying Firewall rules..."
    update_state "firewall" "running" "Applying Firewall rules"

    # Run firewall setup script from Root-owned directory
    if ! bash "$INSTALLER_DIR/firewall-setup.sh" enable; then
        log_error "Firewall setup failed"
        update_state "firewall" "failed" "Firewall setup failed"
        return 1
    fi

    log_info "Firewall rules applied successfully"
    update_state "firewall" "completed" "Firewall rules applied"
    return 0
}

# Cancel firewall rollback timer
cancel_firewall_rollback() {
    log_step "Cancelling firewall rollback timer..."
    
    # Stop and disable rollback timer
    systemctl stop dornika-firewall-rollback.timer 2>/dev/null || true
    systemctl disable dornika-firewall-rollback.timer 2>/dev/null || true
    
    # Remove timer and service files
    rm -f /etc/systemd/system/dornika-firewall-rollback.timer
    rm -f /etc/systemd/system/dornika-firewall-rollback.service
    systemctl daemon-reload 2>/dev/null || true
    
    # Remove active snapshot state file
    rm -f /var/lib/dornika-installer/rollback/active-snapshot
    
    log_info "Firewall rollback timer cancelled"
    return 0
}

# Task: Mark Installation Completed
mark_completed() {
    log_step "Marking installation as completed..."
    update_state "completed" "completed" "Installation completed successfully"

    # Lock setup
    touch "$DATA_DIR/setup/.setup-lock"

    log_info "Installation marked as completed"
    return 0
}

# Process a single request (with TOCTOU protection)
process_request() {
    local request_file="$1"
    local request_id=$(basename "$request_file" .json)

    log_info "Processing request: $request_id"

    # Step 1: Validate request in queue directory (before move)
    if ! validate_request_security "$request_file"; then
        log_error "Request security validation failed in queue: $request_id"
        mv "$request_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
        return 1
    fi

    # Step 2: Atomic move to processing directory (root-owned)
    if ! mv "$request_file" "$PROCESSING_DIR/${request_id}.json" 2>/dev/null; then
        log_error "Failed to move request to processing directory: $request_id"
        return 1
    fi

    local processing_file="$PROCESSING_DIR/${request_id}.json"

    # Step 3: Re-validate after move (TOCTOU protection)
    # Check file is now in processing directory
    local real_path=$(realpath "$processing_file" 2>/dev/null || echo "")
    local processing_real=$(realpath "$PROCESSING_DIR" 2>/dev/null || echo "")

    if [[ ! "$real_path" == "$processing_real"/* ]]; then
        log_error "Request file is outside processing directory after move: $request_id"
        mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
        return 1
    fi

    # Re-check file type (not symlink)
    if [ -L "$processing_file" ] || [ ! -f "$processing_file" ]; then
        log_error "Request file is symlink or not regular file after move: $request_id"
        mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
        return 1
    fi

    # Re-check permissions (must be 600)
    local perms=$(stat -c %a "$processing_file" 2>/dev/null || echo "")
    if [ "$perms" != "600" ]; then
        log_error "Request file permissions changed after move: $perms (expected 600)"
        mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
        return 1
    fi

    # Re-check owner (must be dornika or root)
    local owner=$(stat -c %U "$processing_file" 2>/dev/null || echo "")
    if [ "$owner" != "dornika" ] && [ "$owner" != "root" ]; then
        log_error "Request file owner changed after move: $owner"
        mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
        return 1
    fi

    # Step 4: Validate request schema (strict)
    if ! validate_request_schema "$processing_file"; then
        log_error "Request schema validation failed: $request_id"
        mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
        return 1
    fi

    # Step 5: Validate configuration (from FIXED path)
    if ! validate_config; then
        log_error "Configuration validation failed"
        mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
        return 1
    fi

    # Step 6: Process based on request type
    local request_type=$(jq -e -r '.type' "$processing_file" 2>/dev/null || echo "")

    if [ "$request_type" = "apply_setup" ]; then
        # Apply HTTP Nginx
        if ! apply_http_nginx; then
            log_error "HTTP Nginx application failed"
            mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
            return 1
        fi

        # Apply SSL based on mode
        local SSL_MODE=$(jq -e -r '.sslMode // "none"' "$CONFIG_FILE" 2>/dev/null || echo "none")

        case "$SSL_MODE" in
            lets_encrypt)
                if ! apply_letsencrypt_ssl; then
                    log_error "Let's Encrypt SSL application failed"
                    mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
                    return 1
                fi
                ;;
            manual_certificate)
                if ! apply_manual_ssl; then
                    log_error "Manual SSL application failed"
                    mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
                    return 1
                fi
                ;;
            none)
                log_info "SSL mode is none, skipping SSL setup"
                update_state "ssl" "skipped" "SSL mode is none"
                ;;
            *)
                log_error "Invalid SSL mode: $SSL_MODE"
                mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
                return 1
                ;;
        esac

        # Apply Firewall
        if ! apply_firewall_rules; then
            log_error "Firewall application failed"
            mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
            return 1
        fi

        # Mark as completed
        if ! mark_completed; then
            log_error "Failed to mark installation as completed"
            mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
            return 1
        fi

    elif [ "$request_type" = "firewall_confirm" ]; then
        # Cancel firewall rollback timer
        if ! cancel_firewall_rollback; then
            log_error "Failed to cancel firewall rollback"
            mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
            return 1
        fi
        update_state "firewall" "confirmed" "Firewall changes confirmed"
    else
        log_error "Unknown request type: $request_type"
        mv "$processing_file" "$FAILED_DIR/${request_id}.json" 2>/dev/null || true
        return 1
    fi

    # Step 7: Move to processed directory
    mv "$processing_file" "$PROCESSED_DIR/${request_id}.json" 2>/dev/null || true

    log_info "Request processed successfully: $request_id"
    update_state "completed" "completed" "All tasks completed successfully"
    return 0
}

# Main polling loop
run_worker() {
    log_info "Starting Installer Worker..."
    update_state "started" "running" "Installer Worker started"

    # Create directories
    mkdir -p "$QUEUE_DIR"
    mkdir -p "$PROCESSING_DIR"
    mkdir -p "$PROCESSED_DIR"
    mkdir -p "$FAILED_DIR"
    chmod 700 "$QUEUE_DIR"
    chmod 700 "$PROCESSING_DIR"
    chmod 700 "$PROCESSED_DIR"
    chmod 700 "$FAILED_DIR"

    # Polling loop
    while true; do
        # Check for pending requests
        for request_file in "$QUEUE_DIR"/*.json; do
            if [ -f "$request_file" ]; then
                process_request "$request_file"
            fi
        done

        # Sleep before next poll
        sleep "$POLL_INTERVAL"
    done
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Run worker
run_worker
