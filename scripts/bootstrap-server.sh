#!/bin/bash
# Dornika Sahel - Production Bootstrap Script
#
# Usage:
#   git clone REPOSITORY_URL && cd PROJECT_FOLDER && sudo bash scripts/bootstrap-server.sh
#
# This script performs complete installation in one command:
#   1. Installs prerequisites
#   2. Creates application user
#   3. Builds application
#   4. Installs systemd services
#   5. Starts application with HTTP
#   6. Installer Worker waits for Setup Wizard configuration
#
# After running this script:
#   1. Open http://SERVER_IP/admin/setup in browser
#   2. Complete Setup Wizard
#   3. Installer Worker automatically applies SSL, Firewall, and final configuration
#   4. Site is live with HTTPS (if configured)

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
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Configuration
APP_USER="dornika"
APP_DIR="/var/www/dornika-sahel"
DATA_DIR="/var/lib/dornika"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Read Node.js version from package.json (engines.node)
NODE_VERSION=$(node -p "require('$PROJECT_ROOT/package.json').engines.node" 2>/dev/null || echo "20")
NODE_VERSION=${NODE_VERSION%%.*}  # Extract major version

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    log_error "Cannot detect OS"
    exit 1
fi

log_info "Detected OS: $OS"
log_info "Project root: $PROJECT_ROOT"

# Install dependencies based on OS
install_dependencies() {
    log_step "Installing system dependencies..."

    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y curl git nginx ufw jq certbot python3-certbot-nginx
            
            # Install Node.js
            if ! command -v node &> /dev/null; then
                curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
                apt-get install -y nodejs
            fi
            ;;
        
        centos|rhel|fedora)
            dnf install -y curl git nginx firewalld jq certbot python3-certbot-nginx
            
            # Install Node.js
            if ! command -v node &> /dev/null; then
                curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
                dnf install -y nodejs
            fi
            ;;
        
        arch)
            pacman -Sy --noconfirm curl git nginx ufw jq nodejs certbot python-certbot-nginx
            ;;
        
        *)
            log_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    log_info "Dependencies installed"
}

# Create application user
create_user() {
    log_step "Creating application user..."

    if ! id "$APP_USER" &>/dev/null; then
        useradd -r -s /bin/false -m -d /home/$APP_USER $APP_USER
        log_info "Created user: $APP_USER"
    else
        log_info "User $APP_USER already exists"
    fi
}

# Setup directories
setup_directories() {
    log_step "Setting up directories..."

    # Application directory
    mkdir -p $APP_DIR
    chown -R $APP_USER:$APP_USER $APP_DIR

    # Data directory with proper structure
    mkdir -p $DATA_DIR
    mkdir -p $DATA_DIR/backups
    mkdir -p $DATA_DIR/uploads/public
    mkdir -p $DATA_DIR/uploads/private
    mkdir -p $DATA_DIR/chat
    mkdir -p $DATA_DIR/setup
    mkdir -p $DATA_DIR/logs

    # Set permissions
    chown -R $APP_USER:$APP_USER $DATA_DIR
    chmod 750 $DATA_DIR
    chmod 700 $DATA_DIR/backups
    chmod 700 $DATA_DIR/uploads/private
    chmod 750 $DATA_DIR/uploads/public
    chmod 700 $DATA_DIR/chat
    chmod 700 $DATA_DIR/setup
    chmod 750 $DATA_DIR/logs

    # Nginx directories
    mkdir -p /var/www/certbot

    # Certificate directory
    mkdir -p /etc/dornika/certs
    chmod 700 /etc/dornika/certs
    chown root:root /etc/dornika/certs

    log_info "Directories created with proper permissions"
}

# Install application
install_application() {
    log_step "Installing application..."

    cd $PROJECT_ROOT

    # Install dependencies using npm ci (clean install from lockfile)
    # IMPORTANT: Do NOT use --production flag before build (devDependencies needed)
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        log_error "package-lock.json not found. Cannot proceed with npm ci."
        log_error "Please ensure package-lock.json is committed to the repository."
        exit 1
    fi

    # Build application
    npm run build

    # Copy to application directory
    cp -r . $APP_DIR/
    chown -R $APP_USER:$APP_USER $APP_DIR

    log_info "Application installed"
}

# Setup systemd services
setup_systemd() {
    log_step "Setting up systemd services..."

    # Create secure environment directory
    mkdir -p /etc/dornika
    chmod 700 /etc/dornika

    # Create secure environment file if not exists
    if [ ! -f "/etc/dornika/dornika.env" ]; then
        log_info "Creating secure environment file at /etc/dornika/dornika.env"
        cat > /etc/dornika/dornika.env << 'EOF'
# Dornika Sahel Environment Configuration
# IMPORTANT: This file must be secured with proper permissions
# Copy values from .env.example and customize

DATABASE_URL=postgresql://user:password@localhost:5432/dornika
AUTH_SECRET=change-this-to-a-secure-random-string
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Add other environment variables as needed
EOF
        chmod 600 /etc/dornika/dornika.env
        chown root:root /etc/dornika/dornika.env
        log_warn "Please edit /etc/dornika/dornika.env with your actual configuration"
    fi

    # Copy main service file
    cp $PROJECT_ROOT/deploy/systemd/dornika.service /etc/systemd/system/
    sed -i "s|/var/www/dornika-sahel|$APP_DIR|g" /etc/systemd/system/dornika.service

    # Install Root-owned Installer files
    log_step "Installing Root-owned Installer files..."
    bash $PROJECT_ROOT/scripts/install-root-installer.sh

    # Copy installer service file (uses Root-owned paths)
    cp $PROJECT_ROOT/deploy/systemd/dornika-installer.service /etc/systemd/system/

    # Create installer queue directory structure
    mkdir -p $DATA_DIR/setup/installer-queue
    mkdir -p $DATA_DIR/setup/installer-processed
    mkdir -p $DATA_DIR/setup/installer-failed
    mkdir -p $DATA_DIR/setup/cert-staging
    mkdir -p /var/lib/dornika-installer/firewall-snapshots
    mkdir -p /var/lib/dornika-installer/rollback
    
    # Set permissions
    chown -R dornika:dornika $DATA_DIR/setup/installer-queue
    chown -R root:root $DATA_DIR/setup/installer-processed
    chown -R root:root $DATA_DIR/setup/installer-failed
    chown -R dornika:dornika $DATA_DIR/setup/cert-staging
    chown -R root:root /var/lib/dornika-installer
    
    chmod 700 $DATA_DIR/setup/installer-queue
    chmod 700 $DATA_DIR/setup/installer-processed
    chmod 700 $DATA_DIR/setup/installer-failed
    chmod 700 $DATA_DIR/setup/cert-staging
    chmod 700 /var/lib/dornika-installer/firewall-snapshots
    chmod 700 /var/lib/dornika-installer/rollback

    # Reload systemd
    systemctl daemon-reload

    # Enable and start main service
    systemctl enable dornika

    # Enable and start installer worker (runs from Root-owned directory)
    systemctl enable dornika-installer

    log_info "Systemd services configured"
}

# Setup HTTP Nginx (initial)
setup_nginx_http() {
    log_step "Setting up HTTP Nginx (initial)..."

    # Copy HTTP template
    cp $PROJECT_ROOT/deploy/nginx/dornika-http.conf /etc/nginx/sites-available/dornika
    sed -i "s/{{DOMAIN}}/localhost/g" /etc/nginx/sites-available/dornika

    # Enable site
    ln -sf /etc/nginx/sites-available/dornika /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test configuration
    if ! nginx -t; then
        log_error "Nginx configuration test failed"
        exit 1
    fi

    log_info "HTTP Nginx configured"
}

# Start services
start_services() {
    log_step "Starting services..."

    # Start Nginx
    systemctl restart nginx

    # Start main application
    systemctl start dornika

    # Start installer worker (polls queue for requests)
    systemctl start dornika-installer

    log_info "Services started"
}

# Main
main() {
    log_info "Starting Dornika Sahel bootstrap..."
    log_info ""
    log_info "============================================"
    log_info "  One-Command Installation"
    log_info "============================================"
    log_info ""

    install_dependencies
    create_user
    setup_directories
    install_application
    setup_systemd
    setup_nginx_http
    start_services

    log_info ""
    log_info "============================================"
    log_info "  Bootstrap completed!"
    log_info "============================================"
    log_info ""
    log_info "Next steps:"
    log_info ""
    log_info "1. Open Setup Wizard in your browser:"
    log_info "   http://$(hostname -I | awk '{print $1}')/admin/setup"
    log_info ""
    log_info "2. Complete the wizard to configure:"
    log_info "   - Store information"
    log_info "   - Superadmin account"
    log_info "   - Domain and Email"
    log_info "   - SSL mode (Let's Encrypt or Manual)"
    log_info "   - Database, SMTP, SMS, Payment, AI"
    log_info ""
    log_info "3. Installer Worker will automatically:"
    log_info "   - Apply SSL certificates"
    log_info "   - Configure Firewall"
    log_info "   - Finalize Nginx configuration"
    log_info "   - Mark installation as completed"
    log_info ""
    log_info "4. After completion, your site will be live!"
    log_info ""
    log_info "Monitor installation progress:"
    log_info "   sudo journalctl -u dornika-installer -f"
    log_info ""
    log_info "============================================"
}

main "$@"
