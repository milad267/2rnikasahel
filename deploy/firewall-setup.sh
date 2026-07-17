#!/bin/bash
# Firewall configuration script for Dornika Sahel
# Supports: UFW, firewalld, nftables
# Usage: sudo bash deploy/firewall-setup.sh [enable|status|rollback|confirm]
#
# Security Features:
# - Real backup and restore (not just disable/enable)
# - Snapshot-based rollback
# - Systemd timer for rollback (persistent across reboots)
# - Secure confirmation mechanism (no /tmp files)
# - SSH port detection from multiple sources
# - Safe stop if SSH port not detected

set -e

ACTION=${1:-status}
ROLLBACK_TIMEOUT=${2:-120}  # Default 120 seconds

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Backup directory - Root-owned
BACKUP_DIR="/var/backups/dornika-firewall"
SNAPSHOT_DIR="/var/lib/dornika-installer/firewall-snapshots"
mkdir -p "$BACKUP_DIR"
mkdir -p "$SNAPSHOT_DIR"
chmod 700 "$SNAPSHOT_DIR"
chown root:root "$SNAPSHOT_DIR"

# Detect actual SSH port from multiple sources
detect_ssh_port() {
    local ssh_port=""

    # Method 1: Check sshd -T (most reliable)
    if command -v sshd &> /dev/null; then
        ssh_port=$(sshd -T 2>/dev/null | grep "^port " | awk '{print $2}' | head -1)
    fi

    # Method 2: Check sshd_config
    if [ -z "$ssh_port" ] && [ -f /etc/ssh/sshd_config ]; then
        ssh_port=$(grep -E "^Port\s+" /etc/ssh/sshd_config | awk '{print $2}' | head -1)
    fi

    # Method 3: Check SSH_CONNECTION environment variable
    if [ -z "$ssh_port" ] && [ -n "$SSH_CONNECTION" ]; then
        ssh_port=$(echo "$SSH_CONNECTION" | awk '{print $2}')
    fi

    # Method 4: Check listening ports
    if [ -z "$ssh_port" ]; then
        if command -v ss &> /dev/null; then
            ssh_port=$(ss -tlnp 2>/dev/null | grep sshd | awk '{print $4}' | grep -oE '[0-9]+$' | head -1)
        elif command -v netstat &> /dev/null; then
            ssh_port=$(netstat -tlnp 2>/dev/null | grep sshd | awk '{print $4}' | grep -oE '[0-9]+$' | head -1)
        fi
    fi

    # If SSH port not detected, STOP safely
    if [ -z "$ssh_port" ]; then
        log_error "SSH port could not be detected from any source"
        log_error "Cannot proceed safely - SSH port must be known to avoid lockout"
        log_error "Please ensure SSH is running and try again"
        exit 1
    fi

    echo "$ssh_port"
}

SSH_PORT=$(detect_ssh_port)

if [ -z "$SSH_PORT" ]; then
    log_error "Failed to detect SSH port. Aborting firewall setup."
    log_error "This is a safety measure to prevent SSH lockout."
    exit 1
fi

log_info "Detected SSH port: $SSH_PORT"

# Detect firewall system
detect_firewall() {
    if command -v ufw &> /dev/null; then
        echo "ufw"
    elif command -v firewall-cmd &> /dev/null; then
        echo "firewalld"
    elif command -v nft &> /dev/null; then
        echo "nftables"
    else
        echo "none"
    fi
}

FIREWALL_TYPE=$(detect_firewall)
log_info "Detected firewall system: $FIREWALL_TYPE"

# Create snapshot
create_snapshot() {
    local snapshot_id=$(date +%Y%m%d_%H%M%S)
    local snapshot_dir="$SNAPSHOT_DIR/$snapshot_id"
    mkdir -p "$snapshot_dir"
    chmod 700 "$snapshot_dir"

    case $FIREWALL_TYPE in
        ufw)
            # Backup UFW rules and configuration
            ufw status verbose > "$snapshot_dir/ufw-status.txt" 2>&1 || true
            if [ -f /etc/ufw/before.rules ]; then
                cp /etc/ufw/before.rules "$snapshot_dir/before.rules"
            fi
            if [ -f /etc/ufw/after.rules ]; then
                cp /etc/ufw/after.rules "$snapshot_dir/after.rules"
            fi
            if [ -f /etc/ufw/before6.rules ]; then
                cp /etc/ufw/before6.rules "$snapshot_dir/before6.rules"
            fi
            if [ -f /etc/ufw/after6.rules ]; then
                cp /etc/ufw/after6.rules "$snapshot_dir/after6.rules"
            fi
            if [ -f /etc/ufw/ufw.conf ]; then
                cp /etc/ufw/ufw.conf "$snapshot_dir/ufw.conf"
            fi
            if [ -f /etc/ufw/sysctl.conf ]; then
                cp /etc/ufw/sysctl.conf "$snapshot_dir/sysctl.conf"
            fi
            if [ -d /etc/ufw/applications.d ]; then
                cp -r /etc/ufw/applications.d "$snapshot_dir/applications.d"
            fi
            ;;
        firewalld)
            # Backup firewalld configuration
            firewall-cmd --list-all > "$snapshot_dir/firewalld-status.txt" 2>&1 || true
            if [ -d /etc/firewalld ]; then
                tar -czf "$snapshot_dir/firewalld-config.tar.gz" -C / etc/firewalld 2>/dev/null || true
            fi
            ;;
        nftables)
            # Backup nftables ruleset
            nft list ruleset > "$snapshot_dir/nft-ruleset.nft" 2>&1 || true
            if [ -f /etc/nftables.conf ]; then
                cp /etc/nftables.conf "$snapshot_dir/nftables.conf"
            fi
            ;;
    esac

    echo "$snapshot_id"
}

# Restore snapshot
restore_snapshot() {
    local snapshot_id="$1"
    local snapshot_dir="$SNAPSHOT_DIR/$snapshot_id"

    if [ ! -d "$snapshot_dir" ]; then
        log_error "Snapshot not found: $snapshot_id"
        return 1
    fi

    log_step "Restoring firewall snapshot: $snapshot_id"

    case $FIREWALL_TYPE in
        ufw)
            # Reset UFW
            ufw --force reset

            # Restore configuration files
            if [ -f "$snapshot_dir/before.rules" ]; then
                cp "$snapshot_dir/before.rules" /etc/ufw/before.rules
            fi
            if [ -f "$snapshot_dir/after.rules" ]; then
                cp "$snapshot_dir/after.rules" /etc/ufw/after.rules
            fi
            if [ -f "$snapshot_dir/before6.rules" ]; then
                cp "$snapshot_dir/before6.rules" /etc/ufw/before6.rules
            fi
            if [ -f "$snapshot_dir/after6.rules" ]; then
                cp "$snapshot_dir/after6.rules" /etc/ufw/after6.rules
            fi
            if [ -f "$snapshot_dir/ufw.conf" ]; then
                cp "$snapshot_dir/ufw.conf" /etc/ufw/ufw.conf
            fi
            if [ -f "$snapshot_dir/sysctl.conf" ]; then
                cp "$snapshot_dir/sysctl.conf" /etc/ufw/sysctl.conf
            fi
            if [ -d "$snapshot_dir/applications.d" ]; then
                cp -r "$snapshot_dir/applications.d" /etc/ufw/
            fi

            # Re-enable UFW
            ufw --force enable
            log_info "UFW restored successfully"
            ;;
        firewalld)
            # Restore firewalld configuration
            if [ -f "$snapshot_dir/firewalld-config.tar.gz" ]; then
                tar -xzf "$snapshot_dir/firewalld-config.tar.gz" -C / 2>/dev/null || true
            fi
            # Reload firewalld
            firewall-cmd --reload
            log_info "Firewalld restored successfully"
            ;;
        nftables)
            # Restore nftables ruleset
            if [ -f "$snapshot_dir/nft-ruleset.nft" ]; then
                nft -f "$snapshot_dir/nft-ruleset.nft"
            fi
            log_info "Nftables restored successfully"
            ;;
    esac
}

# Create rollback timer (per-snapshot)
create_rollback_timer() {
    local snapshot_id="$1"
    local timeout="$2"

    # Validate snapshot_id format (strict regex)
    if [[ ! "$snapshot_id" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
        log_error "Invalid snapshot ID format: $snapshot_id (expected YYYYMMDD_HHMMSS)"
        return 1
    fi

    # Create snapshot state file (root-owned)
    echo "$snapshot_id" > /var/lib/dornika-installer/rollback/active-snapshot
    chmod 600 /var/lib/dornika-installer/rollback/active-snapshot
    chown root:root /var/lib/dornika-installer/rollback/active-snapshot

    # Create per-snapshot systemd timer
    local timer_name="dornika-firewall-rollback-${snapshot_id}.timer"
    local service_name="dornika-firewall-rollback-${snapshot_id}.service"

    cat > "/etc/systemd/system/${timer_name}" << EOF
[Unit]
Description=Dornika Firewall Rollback Timer (Snapshot: ${snapshot_id})
After=network.target

[Timer]
OnActiveSec=${timeout}s
Unit=${service_name}

[Install]
WantedBy=timers.target
EOF

    # Create per-snapshot systemd service
    cat > "/etc/systemd/system/${service_name}" << EOF
[Unit]
Description=Dornika Firewall Rollback Service (Snapshot: ${snapshot_id})
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash /usr/local/lib/dornika-installer/firewall-restore.sh

[Install]
WantedBy=multi-user.target
EOF

    # Store active timer name in state file
    echo "${timer_name}" > /var/lib/dornika-installer/rollback/active-timer
    chmod 600 /var/lib/dornika-installer/rollback/active-timer
    chown root:root /var/lib/dornika-installer/rollback/active-timer

    # Enable and start timer
    systemctl daemon-reload
    systemctl enable "${timer_name}"
    systemctl start "${timer_name}"

    log_info "Rollback timer created: ${timer_name}"
    log_info "Snapshot ID: $snapshot_id"
    log_info "Timeout: ${timeout}s"
}

# Cancel rollback timer (per-snapshot)
cancel_rollback_timer() {
    # Read active timer name from state file
    local active_timer=""
    if [ -f /var/lib/dornika-installer/rollback/active-timer ]; then
        active_timer=$(cat /var/lib/dornika-installer/rollback/active-timer 2>/dev/null || echo "")
    fi

    if [ -n "$active_timer" ]; then
        # Stop and disable specific timer
        systemctl stop "$active_timer" 2>/dev/null || true
        systemctl disable "$active_timer" 2>/dev/null || true
        
        # Remove timer and service files
        local service_name="${active_timer%.timer}.service"
        rm -f "/etc/systemd/system/${active_timer}"
        rm -f "/etc/systemd/system/${service_name}"
        systemctl daemon-reload 2>/dev/null || true
        
        log_info "Rollback timer cancelled: $active_timer"
    fi
    
    # Remove state files
    rm -f /var/lib/dornika-installer/rollback/active-snapshot
    rm -f /var/lib/dornika-installer/rollback/active-timer
}

# Rollback function
rollback() {
    local snapshot_id="${1:-}"

    if [ -z "$snapshot_id" ]; then
        # Find most recent snapshot
        snapshot_id=$(ls -t "$SNAPSHOT_DIR" 2>/dev/null | head -1)
    fi

    if [ -z "$snapshot_id" ]; then
        log_error "No snapshot found for rollback"
        return 1
    fi

    log_step "Rolling back firewall to snapshot: $snapshot_id"
    restore_snapshot "$snapshot_id"
    cancel_rollback_timer
}

# UFW functions
setup_ufw() {
    case $ACTION in
        enable)
            log_step "Configuring UFW firewall..."

            # Create snapshot
            local snapshot_id=$(create_snapshot)
            log_info "Snapshot created: $snapshot_id"

            # Reset to defaults
            ufw --force reset

            # Default policies
            ufw default deny incoming
            ufw default allow outgoing

            # SSH (detected port)
            ufw allow $SSH_PORT/tcp comment 'SSH'

            # HTTP/HTTPS
            ufw allow 80/tcp comment 'HTTP (ACME/Redirect)'
            ufw allow 443/tcp comment 'HTTPS'

            # Block PostgreSQL from external
            ufw deny 5432/tcp comment 'PostgreSQL (internal only)'

            # Block Next.js port from external
            ufw deny 3000/tcp comment 'Next.js (internal only)'

            # Enable firewall
            ufw --force enable

            log_info "UFW firewall enabled successfully"
            log_info "SSH port $SSH_PORT is preserved"
            log_info ""
            log_warn "IMPORTANT: Test SSH connection from a second terminal!"
            log_warn "If you lose SSH access, run: sudo bash $0 rollback $snapshot_id"
            log_info ""
            log_info "Creating rollback timer (${ROLLBACK_TIMEOUT}s)..."

            # Create rollback timer
            create_rollback_timer "$snapshot_id" "$ROLLBACK_TIMEOUT"

            ufw status verbose
            ;;

        status)
            ufw status verbose
            ;;

        rollback)
            rollback "${2:-}"
            ;;

        confirm)
            cancel_rollback_timer
            log_info "Firewall changes confirmed"
            ;;

        *)
            log_error "Unknown action: $ACTION"
            log_info "Available actions: enable, status, rollback, confirm"
            exit 1
            ;;
    esac
}

# Firewalld functions
setup_firewalld() {
    case $ACTION in
        enable)
            log_step "Configuring firewalld..."

            # Create snapshot
            local snapshot_id=$(create_snapshot)
            log_info "Snapshot created: $snapshot_id"

            # Start and enable firewalld
            systemctl start firewalld
            systemctl enable firewalld

            # Allow services
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https
            firewall-cmd --permanent --add-port=$SSH_PORT/tcp

            # Block PostgreSQL and Next.js from external
            firewall-cmd --permanent --remove-service=postgresql 2>/dev/null || true
            firewall-cmd --permanent --add-rich-rule='rule family="ipv4" port port="5432" protocol="tcp" reject'
            firewall-cmd --permanent --add-rich-rule='rule family="ipv4" port port="3000" protocol="tcp" reject'

            # Reload
            firewall-cmd --reload

            log_info "Firewalld configured successfully"
            log_info "SSH port $SSH_PORT is preserved"
            log_info ""
            log_warn "IMPORTANT: Test SSH connection from a second terminal!"
            log_warn "If you lose SSH access, run: sudo bash $0 rollback $snapshot_id"
            log_info ""
            log_info "Creating rollback timer (${ROLLBACK_TIMEOUT}s)..."

            # Create rollback timer
            create_rollback_timer "$snapshot_id" "$ROLLBACK_TIMEOUT"

            firewall-cmd --list-all
            ;;

        status)
            firewall-cmd --list-all
            ;;

        rollback)
            rollback "${2:-}"
            ;;

        confirm)
            cancel_rollback_timer
            log_info "Firewall changes confirmed"
            ;;

        *)
            log_error "Unknown action: $ACTION"
            log_info "Available actions: enable, status, rollback, confirm"
            exit 1
            ;;
    esac
}

# Nftables functions
setup_nftables() {
    case $ACTION in
        enable)
            log_step "Configuring nftables..."
            log_warn "Nftables configuration requires manual setup"
            log_info "Please create /etc/nftables.conf with appropriate rules"
            log_info "Basic rules:"
            echo "  - Allow SSH (port $SSH_PORT)"
            echo "  - Allow HTTP (port 80)"
            echo "  - Allow HTTPS (port 443)"
            echo "  - Block PostgreSQL (port 5432) from external"
            echo "  - Block Next.js (port 3000) from external"
            ;;

        status)
            if command -v nft &> /dev/null; then
                nft list ruleset
            else
                log_error "nft command not found"
            fi
            ;;

        rollback)
            rollback "${2:-}"
            ;;

        confirm)
            cancel_rollback_timer
            log_info "Firewall changes confirmed"
            ;;

        *)
            log_error "Unknown action: $ACTION"
            log_info "Available actions: enable, status, rollback, confirm"
            exit 1
            ;;
    esac
}

# Main
case $FIREWALL_TYPE in
    ufw)
        setup_ufw
        ;;
    firewalld)
        setup_firewalld
        ;;
    nftables)
        setup_nftables
        ;;
    none)
        log_error "No firewall system detected"
        log_info "Please install ufw, firewalld, or nftables"
        exit 1
        ;;
esac
