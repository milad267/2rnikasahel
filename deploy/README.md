# Dornika Sahel - Production Deployment Guide

## Overview

This guide explains how to deploy Dornika Sahel on a production Linux server with a **one-command installation**.

## Prerequisites

- Linux server (Ubuntu 20.04+, Debian 11+, CentOS 8+, or Arch Linux)
- Root/sudo access
- Domain name (optional, for SSL)
- PostgreSQL database (can be installed on same server)

## One-Command Installation

### Step 1: Clone and Bootstrap

```bash
git clone https://github.com/yourusername/dornika-sahel.git
cd dornika-sahel
sudo bash scripts/bootstrap-server.sh
```

This single command will:
- Install system dependencies (Node.js, Nginx, Certbot, etc.)
- Create application user (`dornika`)
- Setup directories with proper permissions
- Install npm dependencies and build the application
- Configure systemd services
- Setup HTTP Nginx configuration
- Start the application

### Step 2: Complete Setup Wizard

After bootstrap completes, open your browser and navigate to:

```
http://YOUR_SERVER_IP/admin/setup
```

Complete the wizard with your configuration:
- **Store Information**: Name, description, contact details
- **Superadmin**: Create the initial admin account
- **Domain**: Your domain name (e.g., example.com)
- **Email**: Admin email for SSL certificates
- **SSL Mode**: Choose one of:
  - `none` - No SSL (development only)
  - `lets_encrypt` - Automatic SSL with Let's Encrypt
  - `manual_certificate` - Manual SSL certificate
- **Database**: PostgreSQL connection settings
- **SMTP**: Email server configuration
- **SMS**: SMS provider configuration
- **Payment**: Payment gateway configuration
- **AI**: AI provider configuration

### Step 3: Automatic Installation

After completing the wizard, the **Installer Worker** automatically:
- Validates your configuration
- Applies SSL certificates (based on SSL mode)
- Configures Firewall rules
- Finalizes Nginx configuration
- Marks installation as completed

**Monitor progress:**
```bash
sudo journalctl -u dornika-installer -f
```

The wizard will show real-time progress and notify you when installation is complete.

### Step 4: Access Your Site

After installation completes:
- **Application**: `https://yourdomain.com` (or `http://YOUR_SERVER_IP` if no SSL)
- **Admin Panel**: `https://yourdomain.com/admin`

## SSL Configuration

### Let's Encrypt (Automatic)

If you selected `lets_encrypt` in the wizard:

1. Ensure your domain DNS points to the server IP
2. Ensure port 80 is accessible from the internet
3. Installer Worker automatically:
   - Validates domain and DNS
   - Obtains SSL certificate via Certbot
   - Configures HTTPS Nginx template
   - Tests and reloads Nginx

**Certificate Renewal:**
Certificates are automatically renewed by certbot. Check renewal status:
```bash
sudo certbot renew --dry-run
```

### Manual Certificate

If you selected `manual_certificate` in the wizard:

**Method 1: Via SSH (Recommended)**

1. Place your certificate files in the secure directory:
   ```bash
   sudo mkdir -p /etc/dornika/certs/YOUR_DOMAIN
   sudo cp fullchain.pem /etc/dornika/certs/YOUR_DOMAIN/
   sudo cp privkey.pem /etc/dornika/certs/YOUR_DOMAIN/
   ```

2. Set proper permissions:
   ```bash
   sudo chmod 600 /etc/dornika/certs/YOUR_DOMAIN/*.pem
   sudo chown root:root /etc/dornika/certs/YOUR_DOMAIN/*.pem
   ```

3. Installer Worker will automatically detect and apply the certificates.

**Method 2: Via Wizard (HTTPS Required)**

If you have a valid HTTPS connection (self-signed or temporary certificate), you can upload certificates directly through the wizard. The wizard will:
- Store files in staging area
- Installer Worker validates and moves to final location
- Sets proper permissions

**Security Note:**
- Private keys must never be committed to Git
- Private keys must be root-owned with 600 permissions
- Private keys must never appear in logs or API responses

### IP Address Access (Initial Setup)

When accessing the application via IP address before SSL is configured:
- Browser will show a security warning (this is normal)
- The connection is not encrypted
- This is only for initial setup
- After SSL is configured, use your domain name

## Installer Worker Architecture

The Installer Worker is a **root-owned systemd service** that:
- Runs with root privileges
- Only accepts predefined tasks
- Validates all configuration before applying
- Does not accept shell commands or arbitrary arguments
- Writes audit logs
- Updates state file for progress tracking

**Security:**
- Not accessible via HTTP
- Only triggered by Setup Wizard API
- Validates all input against strict schema
- No command injection possible

## Firewall Configuration

### SSH Port Detection

The firewall script automatically detects your SSH port from:
- `sshd -T` (most reliable)
- `/etc/ssh/sshd_config`
- `SSH_CONNECTION` environment variable
- Active listeners via `ss` or `netstat`

**Important:** If SSH port cannot be detected, the script will stop safely to prevent lockout.

### Firewall Rules

The following ports are configured:
- **SSH**: Detected port (preserved)
- **HTTP**: Port 80 (for ACME challenges and redirects)
- **HTTPS**: Port 443 (main application)

Blocked from external access:
- **PostgreSQL**: Port 5432 (internal only)
- **Next.js**: Port 3000 (internal only)

### Rollback

Firewall rules are automatically backed up before changes:
```
/var/backups/dornika-firewall/
```

**Rollback Timer:**
When you run `enable`, the script starts a rollback timer (default 120 seconds). If you don't confirm within this time, it automatically restores the previous rules.

**Confirm Changes:**
After applying firewall rules, test SSH connection from a second terminal. If SSH works, confirm the changes:
```bash
sudo bash deploy/firewall-setup.sh confirm
```

**Manual Rollback:**
If you lose SSH access or need to rollback manually:
```bash
sudo bash deploy/firewall-setup.sh rollback
```

This restores the most recent backup from `/var/backups/dornika-firewall/`.

**Custom Rollback Timeout:**
You can specify a custom timeout (in seconds):
```bash
sudo bash deploy/firewall-setup.sh enable 300  # 5 minutes
```

## File Structure

```
deploy/
├── systemd/
│   ├── dornika.service              # Main application service
│   └── dornika-installer.service    # Installer Worker service
├── nginx/
│   ├── dornika-http.conf            # HTTP config (initial)
│   ├── dornika-https.conf           # HTTPS config (Let's Encrypt)
│   └── dornika-https-manual.conf    # HTTPS config (Manual SSL)
├── firewall-setup.sh                # Firewall configuration script
└── README.md                        # This file

scripts/
├── bootstrap-server.sh              # One-command bootstrap script
├── dornika-installer.sh             # Installer Worker script
└── backup.sh                        # Backup script
```

## Directory Structure

```
/var/www/dornika-sahel/              # Application directory
├── .next/                           # Next.js build output
└── ...

/var/lib/dornika/                    # Data directory
├── backups/                         # Database backups (700)
├── uploads/
│   ├── public/                      # Public uploads (750)
│   └── private/                     # Private uploads (700)
├── chat/                            # Chat storage (700)
├── setup/                           # Setup configuration (700)
│   ├── setup-config.json           # Wizard configuration
│   └── installer-state.json        # Installer progress
└── logs/                            # Application logs (750)

/etc/dornika/
├── dornika.env                      # Environment file (600, root:root)
└── certs/
    └── YOUR_DOMAIN/                 # SSL certificates (700)
        ├── fullchain.pem            # Certificate (600)
        └── privkey.pem              # Private key (600)
```

## Service Management

```bash
# Main application
sudo systemctl start dornika
sudo systemctl stop dornika
sudo systemctl restart dornika
sudo systemctl status dornika
sudo journalctl -u dornika -f

# Installer Worker
sudo systemctl status dornika-installer
sudo journalctl -u dornika-installer -f
```

## Nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

## Environment Configuration

**IMPORTANT**: Environment file is stored securely outside the project directory.

Location: `/etc/dornika/dornika.env`

Required variables:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dornika
AUTH_SECRET=your-secure-random-string
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
BACKUP_ENCRYPTION_KEY=your-32-byte-hex-key
```

**Security:**
- File permissions: `600`
- Owner: `root:root`
- Never commit to Git
- Never store in project directory

## Migration

**IMPORTANT**: Never use `db:push` in production. Always use migrations.

```bash
# 1. Backup database first
sudo -u postgres pg_dump dornika > backup-$(date +%Y%m%d).sql

# 2. Run migrations
cd /var/www/dornika-sahel
sudo -u dornika npm run db:migrate

# 3. Verify application starts correctly
sudo systemctl status dornika
```

## Security Considerations

1. **Never run as root**: The application runs as the `dornika` user
2. **Firewall**: Only SSH, HTTP, and HTTPS ports are open
3. **Database**: PostgreSQL is not exposed to the internet
4. **SSL**: Always use HTTPS in production
5. **Secrets**: Never commit `.env` file to Git
6. **Updates**: Regularly update system packages and dependencies
7. **Backup Encryption**: Always set `BACKUP_ENCRYPTION_KEY` in production
8. **Environment File**: Must be outside project directory with restricted permissions
9. **Migration**: Use `db:migrate` not `db:push` in production
10. **Service Restart**: Use SSH/Terminal, not web panel
11. **Installer Worker**: Only accepts predefined tasks, no shell commands

## Troubleshooting

### Service won't start

```bash
sudo journalctl -u dornika -n 50
```

### Environment file not found

```bash
# Check if environment file exists
ls -la /etc/dornika/dornika.env

# Check permissions
sudo chmod 600 /etc/dornika/dornika.env
sudo chown root:root /etc/dornika/dornika.env
```

### Nginx configuration error

```bash
sudo nginx -t
```

### Permission denied

```bash
sudo chown -R dornika:dornika /var/www/dornika-sahel
sudo chown -R dornika:dornika /var/lib/dornika
```

### Database connection error

Check `DATABASE_URL` in `/etc/dornika/dornika.env` and ensure PostgreSQL is running:

```bash
sudo systemctl status postgresql
```

### SSL certificate error

```bash
# Check certificate files
ls -la /etc/letsencrypt/live/your-domain.com/
# or
ls -la /etc/dornika/certs/your-domain.com/

# Renew certificate (Let's Encrypt)
sudo certbot renew

# Reload nginx
sudo systemctl reload nginx
```

### Installer Worker failed

```bash
# Check installer logs
sudo journalctl -u dornika-installer -n 100

# Check state file
cat /var/lib/dornika/setup/installer-state.json

# Re-run installer manually
sudo bash /var/www/dornika-sahel/scripts/dornika-installer.sh
```

### SSH locked out after firewall

If you're locked out after applying firewall rules:

1. Access server via console (cloud provider console or physical access)
2. Disable firewall temporarily:
   ```bash
   # UFW
   sudo ufw disable

   # Firewalld
   sudo systemctl stop firewalld
   ```
3. Check SSH port:
   ```bash
   sudo sshd -T | grep port
   ```
4. Manually allow SSH port:
   ```bash
   # UFW
   sudo ufw allow YOUR_SSH_PORT/tcp

   # Firewalld
   sudo firewall-cmd --permanent --add-port=YOUR_SSH_PORT/tcp
   sudo firewall-cmd --reload
   ```
5. Re-enable firewall

### Setup Wizard not accessible

```bash
# Check if service is running
sudo systemctl status dornika

# Check if Nginx is running
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Check logs
sudo journalctl -u dornika -n 50
sudo tail -f /var/log/nginx/error.log
```

## Health Check

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Backup

The application includes automated backup functionality. Configure backup settings in the admin panel.

Backup files are stored in `/var/lib/dornika/backups/`.

**Encryption:**
Always set `BACKUP_ENCRYPTION_KEY` in production to encrypt backups.

## Server Management

Server Management panel (accessible only to Superadmin):
- View masked configuration
- Monitor service status
- View logs
- **Cannot** restart services (use SSH/Terminal)
- **Cannot** install packages
- **Cannot** run migrations
- **Cannot** modify firewall

## Support

For issues and questions, please open an issue on GitHub.

## Production Testing

**IMPORTANT**: Before deploying to production, test on a clean server:

1. Set up a test server with the same OS
2. Run the complete one-command installation
3. Test all features
4. Verify SSL certificates
5. Test backup and restore
6. Test firewall rules
7. Document any issues

Only deploy to production after successful testing.
