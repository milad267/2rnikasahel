#!/usr/bin/env bash
# ============================================================================
# 💾 DSAHEL Backup Script — بکاپ خودکار دیتابیس و فایل‌ها
# ============================================================================
# Usage:
#   sudo bash scripts/backup.sh                    # Run backup now
#   sudo bash scripts/backup.sh --restore FILE     # Restore from backup
#   sudo bash scripts/backup.sh --list             # List backups
#
# This script is called automatically by the systemd backup timer.
# ============================================================================

set -euo pipefail

# ─── Colors ───
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Configuration ───
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Use APP_DATA_DIR if set, otherwise default to /opt/dornika-data
if [[ -n "${APP_DATA_DIR:-}" ]]; then
    DATA_DIR="$APP_DATA_DIR"
else
    DATA_DIR="/opt/dornika-data"
fi

BACKUP_DIR="${BACKUP_DIR:-${DATA_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_NAME="dornika-backup-${TIMESTAMP}"

# NOTE: DATABASE_URL must be set in environment before running this script.
# Do NOT source .env file here — it contains secrets.
# Example: sudo DATABASE_URL="postgresql://..." bash scripts/backup.sh

# ─── Functions ───

check_prerequisites() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root."
        exit 1
    fi
    
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
    
    if ! command -v pg_dump &>/dev/null; then
        log_error "pg_dump not found. Install postgresql-client."
        exit 1
    fi
}

backup_database() {
    log_info "Backing up database..."

    local db_url="${DATABASE_URL:-}"
    if [[ -z "$db_url" ]]; then
        log_warn "DATABASE_URL not set. Skipping database backup."
        return 1
    fi

    # Create plaintext temp file first, then encrypt if key is available
    local db_file="${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"
    # Use PGPASSWORD env var instead of embedding in command line (process list visible)
    local db_host db_port db_user db_pass db_name
    db_host=$(echo "$db_url" | sed -n 's|.*://[^:]*:\([^@]*\)@\([^:]*\).*|\2|p')
    db_port=$(echo "$db_url" | sed -n 's|.*://[^:]*:\([^@]*\)@\([^:]*\):\([0-9]*\).*|\3|p')
    db_user=$(echo "$db_url" | sed -n 's|.*://\([^:]*\):.*@.*|\1|p')
    db_pass=$(echo "$db_url" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
    db_name=$(echo "$db_url" | sed -n 's|.*/\([^?]*\).*|\1|p')

    # Fail if parsing fails — do NOT expose password in process list
    if [[ -z "$db_host" || -z "$db_name" ]]; then
        log_error "Could not parse DATABASE_URL. Please set individual DB_* environment variables."
        return 1
    fi

    export PGPASSWORD="$db_pass"
    pg_dump -h "$db_host" -p "${db_port:-5432}" -U "$db_user" -d "$db_name" --no-owner --no-acl | gzip > "$db_file"
    unset PGPASSWORD

    log_ok "Database backup: $(du -h "$db_file" | cut -f1)"

    # Encrypt if key is available
    if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
        log_info "Encrypting database backup..."
        local enc_file="${db_file}.enc"
        node -e "
            const fs = require('fs');
            const crypto = require('crypto');
            const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
            if (key.length !== 32) { console.error('Invalid key length'); process.exit(1); }
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            const plaintext = fs.readFileSync('${db_file}');
            const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
            const authTag = cipher.getAuthTag();
            const manifest = {
                encrypted: true,
                algorithm: 'aes-256-gcm',
                version: 2,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                ciphertext: encrypted.toString('hex'),
                originalSize: plaintext.length,
                encryptedSize: encrypted.length + iv.length + authTag.length
            };
            fs.writeFileSync('${enc_file}', JSON.stringify(manifest, null, 0), { mode: 0o600 });
            fs.unlinkSync('${db_file}');
            console.log('Encrypted: ${enc_file}');
        " && log_ok "Database backup encrypted" || log_warn "Encryption failed, keeping plaintext"
    fi
}

backup_storage() {
    log_info "Backing up storage files..."

    local storage_dir="${DATA_DIR}/storage"
    local uploads_public_dir="${DATA_DIR}/uploads/public"
    local uploads_private_dir="${DATA_DIR}/uploads/private"

    local found_any=false

    if [[ -d "$storage_dir" ]]; then
        # Create plaintext temp file first, then encrypt if key is available
        local storage_tmp="${BACKUP_DIR}/${BACKUP_NAME}-storage.tar.gz.tmp"
        tar -czf "$storage_tmp" \
            --exclude="*.tmp" \
            --exclude="*.log" \
            "$storage_dir" 2>/dev/null || true

        if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            log_info "Encrypting storage archive..."
            local storage_enc="${BACKUP_DIR}/${BACKUP_NAME}-storage.tar.gz.enc"
            node -e "
                const fs = require('fs');
                const crypto = require('crypto');
                const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
                if (key.length !== 32) { console.error('Invalid key length'); process.exit(1); }
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
                const plaintext = fs.readFileSync('${storage_tmp}');
                const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
                const authTag = cipher.getAuthTag();
                const manifest = {
                    encrypted: true,
                    algorithm: 'aes-256-gcm',
                    version: 2,
                    iv: iv.toString('hex'),
                    authTag: authTag.toString('hex'),
                    ciphertext: encrypted.toString('hex'),
                    originalSize: plaintext.length,
                    encryptedSize: encrypted.length + iv.length + authTag.length
                };
                fs.writeFileSync('${storage_enc}', JSON.stringify(manifest, null, 0), { mode: 0o600 });
                fs.unlinkSync('${storage_tmp}');
                console.log('Encrypted: ${storage_enc}');
            " && log_ok "Storage archive encrypted" || log_warn "Encryption failed, keeping plaintext"
        else
            mv "$storage_tmp" "${BACKUP_DIR}/${BACKUP_NAME}-storage.tar.gz"
        fi
        found_any=true
    fi
    
    if [[ -d "$uploads_public_dir" ]]; then
        local pub_tmp="${BACKUP_DIR}/${BACKUP_NAME}-uploads-public.tar.gz.tmp"
        tar -czf "$pub_tmp" "$uploads_public_dir" 2>/dev/null || true

        if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            log_info "Encrypting public uploads archive..."
            local pub_enc="${BACKUP_DIR}/${BACKUP_NAME}-uploads-public.tar.gz.enc"
            node -e "
                const fs = require('fs');
                const crypto = require('crypto');
                const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
                if (key.length !== 32) { console.error('Invalid key length'); process.exit(1); }
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
                const plaintext = fs.readFileSync('${pub_tmp}');
                const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
                const authTag = cipher.getAuthTag();
                const manifest = {
                    encrypted: true,
                    algorithm: 'aes-256-gcm',
                    version: 2,
                    iv: iv.toString('hex'),
                    authTag: authTag.toString('hex'),
                    ciphertext: encrypted.toString('hex'),
                    originalSize: plaintext.length,
                    encryptedSize: encrypted.length + iv.length + authTag.length
                };
                fs.writeFileSync('${pub_enc}', JSON.stringify(manifest, null, 0), { mode: 0o600 });
                fs.unlinkSync('${pub_tmp}');
                console.log('Encrypted: ${pub_enc}');
            " && log_ok "Public uploads archive encrypted" || log_warn "Encryption failed, keeping plaintext"
        else
            mv "$pub_tmp" "${BACKUP_DIR}/${BACKUP_NAME}-uploads-public.tar.gz"
        fi
        found_any=true
    fi

    if [[ -d "$uploads_private_dir" ]]; then
        local priv_tmp="${BACKUP_DIR}/${BACKUP_NAME}-uploads-private.tar.gz.tmp"
        tar -czf "$priv_tmp" "$uploads_private_dir" 2>/dev/null || true

        if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            log_info "Encrypting private uploads archive..."
            local priv_enc="${BACKUP_DIR}/${BACKUP_NAME}-uploads-private.tar.gz.enc"
            node -e "
                const fs = require('fs');
                const crypto = require('crypto');
                const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
                if (key.length !== 32) { console.error('Invalid key length'); process.exit(1); }
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
                const plaintext = fs.readFileSync('${priv_tmp}');
                const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
                const authTag = cipher.getAuthTag();
                const manifest = {
                    encrypted: true,
                    algorithm: 'aes-256-gcm',
                    version: 2,
                    iv: iv.toString('hex'),
                    authTag: authTag.toString('hex'),
                    ciphertext: encrypted.toString('hex'),
                    originalSize: plaintext.length,
                    encryptedSize: encrypted.length + iv.length + authTag.length
                };
                fs.writeFileSync('${priv_enc}', JSON.stringify(manifest, null, 0), { mode: 0o600 });
                fs.unlinkSync('${priv_tmp}');
                console.log('Encrypted: ${priv_enc}');
            " && log_ok "Private uploads archive encrypted" || log_warn "Encryption failed, keeping plaintext"
        else
            mv "$priv_tmp" "${BACKUP_DIR}/${BACKUP_NAME}-uploads-private.tar.gz"
            chmod 600 "${BACKUP_DIR}/${BACKUP_NAME}-uploads-private.tar.gz"
        fi
        found_any=true
    fi
    
    if [[ "$found_any" == true ]]; then
        log_ok "Storage backup completed"
    else
        log_warn "No storage directories found. Skipping."
    fi
}

# NOTE: .env backup is intentionally REMOVED.
# Secrets should be managed via secure vault or external config management.
# Backing up .env in plaintext inside the backup archive is a security risk.

cleanup_old() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    find "$BACKUP_DIR" -name "dornika-backup-*" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
    log_ok "Old backups cleaned"
}

list_backups() {
    echo -e "\n${CYAN}━━━ Available Backups ━━━${NC}"
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No database backups found."
    ls -lh "$BACKUP_DIR"/*-storage*.tar.gz 2>/dev/null || echo "No storage backups found."
    echo ""
}

restore_backup() {
    local restore_file="$1"
    if [[ ! -f "$restore_file" ]]; then
        log_error "Backup file not found: $restore_file"
        exit 1
    fi
    
    log_warn "Restoring from: $restore_file"
    log_warn "This will OVERWRITE current data!"
    echo -n "Continue? (y/N): "
    read -r confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log_info "Restore cancelled."
        exit 0
    fi
    
    case "$restore_file" in
        *.sql.gz)
            log_info "Restoring database..."
            gunzip -c "$restore_file" | psql "$DATABASE_URL"
            log_ok "Database restored"
            ;;
        *-storage*.tar.gz)
            log_info "Restoring storage..."
            tar -xzf "$restore_file" -C "${DATA_DIR}"
            log_ok "Storage restored"
            ;;
        *)
            log_error "Unknown backup format: $restore_file"
            exit 1
            ;;
    esac
}

# ─── Main ───

case "${1:-}" in
    --list|-l)
        check_prerequisites
        list_backups
        ;;
    --restore|-r)
        check_prerequisites
        restore_backup "${2:-}"
        ;;
    *)
        check_prerequisites
        echo -e "\n${CYAN}╔══════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║     💾 DSAHEL Backup                    ║${NC}"
        echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}\n"
        
        backup_database
        backup_storage
        cleanup_old
        
        echo -e "\n${GREEN}✅ Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}${NC}\n"
        list_backups
        ;;
esac
