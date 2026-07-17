#!/bin/bash
# Dornika Sahel - Root Installer Setup
#
# This script installs Root-owned Installer files to secure location
# Must be run as root during bootstrap
#
# Target: /usr/local/lib/dornika-installer/

set -e

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

# Configuration
INSTALLER_DIR="/usr/local/lib/dornika-installer"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log_step "Installing Root-owned Installer files..."

# Create installer directory
mkdir -p "$INSTALLER_DIR"
mkdir -p "$INSTALLER_DIR/schemas"

# Copy installer scripts
log_info "Copying installer scripts..."
cp "$PROJECT_ROOT/scripts/dornika-installer.sh" "$INSTALLER_DIR/dornika-installer.sh"
cp "$PROJECT_ROOT/deploy/firewall-setup.sh" "$INSTALLER_DIR/firewall-setup.sh"

# Create firewall restore script
cat > "$INSTALLER_DIR/firewall-restore.sh" << 'EOF'
#!/bin/bash
# Firewall Restore Script - Called by systemd timer
# Reads snapshot ID from Root-owned state file

set -e

SNAPSHOT_STATE_FILE="/var/lib/dornika-installer/rollback/active-snapshot"
SNAPSHOT_DIR="/var/lib/dornika-installer/firewall-snapshots"

# Read snapshot ID from state file
if [ ! -f "$SNAPSHOT_STATE_FILE" ]; then
    echo "ERROR: Snapshot state file not found: $SNAPSHOT_STATE_FILE"
    exit 1
fi

SNAPSHOT_ID=$(cat "$SNAPSHOT_STATE_FILE" 2>/dev/null || echo "")

# Validate snapshot ID format (strict regex)
if [[ ! "$SNAPSHOT_ID" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
    echo "ERROR: Invalid snapshot ID format: $SNAPSHOT_ID"
    exit 1
fi

SNAPSHOT_PATH="$SNAPSHOT_DIR/$SNAPSHOT_ID"

if [ ! -d "$SNAPSHOT_PATH" ]; then
    echo "ERROR: Snapshot not found: $SNAPSHOT_ID"
    exit 1
fi

echo "Restoring firewall snapshot: $SNAPSHOT_ID"

# Detect firewall type
if command -v ufw &> /dev/null; then
    FIREWALL_TYPE="ufw"
elif command -v firewall-cmd &> /dev/null; then
    FIREWALL_TYPE="firewalld"
elif command -v nft &> /dev/null; then
    FIREWALL_TYPE="nftables"
else
    echo "ERROR: No firewall system detected"
    exit 1
fi

case $FIREWALL_TYPE in
    ufw)
        # Reset UFW
        ufw --force reset
        
        # Restore configuration files
        if [ -f "$SNAPSHOT_PATH/before.rules" ]; then
            cp "$SNAPSHOT_PATH/before.rules" /etc/ufw/before.rules
        fi
        if [ -f "$SNAPSHOT_PATH/after.rules" ]; then
            cp "$SNAPSHOT_PATH/after.rules" /etc/ufw/after.rules
        fi
        if [ -f "$SNAPSHOT_PATH/before6.rules" ]; then
            cp "$SNAPSHOT_PATH/before6.rules" /etc/ufw/before6.rules
        fi
        if [ -f "$SNAPSHOT_PATH/after6.rules" ]; then
            cp "$SNAPSHOT_PATH/after6.rules" /etc/ufw/after6.rules
        fi
        if [ -f "$SNAPSHOT_PATH/ufw.conf" ]; then
            cp "$SNAPSHOT_PATH/ufw.conf" /etc/ufw/ufw.conf
        fi
        if [ -f "$SNAPSHOT_PATH/sysctl.conf" ]; then
            cp "$SNAPSHOT_PATH/sysctl.conf" /etc/ufw/sysctl.conf
        fi
        if [ -d "$SNAPSHOT_PATH/applications.d" ]; then
            cp -r "$SNAPSHOT_PATH/applications.d" /etc/ufw/
        fi
        
        # Re-enable UFW
        ufw --force enable
        echo "UFW restored successfully"
        ;;
    firewalld)
        if [ -f "$SNAPSHOT_PATH/firewalld-config.tar.gz" ]; then
            tar -xzf "$SNAPSHOT_PATH/firewalld-config.tar.gz" -C / 2>/dev/null || true
        fi
        firewall-cmd --reload
        echo "Firewalld restored successfully"
        ;;
    nftables)
        if [ -f "$SNAPSHOT_PATH/nft-ruleset.nft" ]; then
            nft -f "$SNAPSHOT_PATH/nft-ruleset.nft"
        fi
        echo "Nftables restored successfully"
        ;;
esac

# Read and cancel active timer
if [ -f /var/lib/dornika-installer/rollback/active-timer ]; then
    active_timer=$(cat /var/lib/dornika-installer/rollback/active-timer 2>/dev/null || echo "")
    if [ -n "$active_timer" ]; then
        systemctl stop "$active_timer" 2>/dev/null || true
        systemctl disable "$active_timer" 2>/dev/null || true
        service_name="${active_timer%.timer}.service"
        rm -f "/etc/systemd/system/${active_timer}"
        rm -f "/etc/systemd/system/${service_name}"
        systemctl daemon-reload 2>/dev/null || true
        echo "Rollback timer cancelled: $active_timer"
    fi
fi

# Remove state files
rm -f "$SNAPSHOT_STATE_FILE"
rm -f /var/lib/dornika-installer/rollback/active-timer

echo "Firewall rollback completed"
EOF

# Copy Nginx templates
log_info "Copying Nginx templates..."
cp "$PROJECT_ROOT/deploy/nginx/dornika-http.conf" "$INSTALLER_DIR/nginx-http.conf"
cp "$PROJECT_ROOT/deploy/nginx/dornika-https.conf" "$INSTALLER_DIR/nginx-https.conf"
cp "$PROJECT_ROOT/deploy/nginx/dornika-https-manual.conf" "$INSTALLER_DIR/nginx-manual.conf"

# Set permissions
log_info "Setting permissions..."
chown -R root:root "$INSTALLER_DIR"
chmod 750 "$INSTALLER_DIR"
chmod 750 "$INSTALLER_DIR/dornika-installer.sh"
chmod 750 "$INSTALLER_DIR/firewall-setup.sh"
chmod 750 "$INSTALLER_DIR/firewall-restore.sh"
chmod 644 "$INSTALLER_DIR/nginx-http.conf"
chmod 644 "$INSTALLER_DIR/nginx-https.conf"
chmod 644 "$INSTALLER_DIR/nginx-manual.conf"
chmod 750 "$INSTALLER_DIR/schemas"

log_info "Root Installer files installed successfully"
log_info "Location: $INSTALLER_DIR"
log_info "Permissions: root:root 750 (directory), 750 (scripts), 644 (templates)"
