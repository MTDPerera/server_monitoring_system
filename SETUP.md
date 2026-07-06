# Setup Guide — Server Monitoring Dashboard

This guide covers everything you need to go from zero to a fully working monitoring system in production.

---

## Overview

You will set up three layers:

```
[ Each Server ]        →  node_exporter   (exposes metrics on port 9100)
[ Each Network Hub ]   →  Prometheus       (scrapes node_exporter targets)
                       →  Nginx + HTTPS    (secures Prometheus endpoint)
[ Dashboard Server ]   →  Next.js app      (queries all Prometheus instances)
```

Each private network needs **one Prometheus instance**. Every server you want to monitor needs **node_exporter** installed.

---

## Prerequisites

- Ubuntu 22.04 / Debian 12 on all servers (other distros work but commands may differ)
- A domain name with DNS access (for HTTPS subdomains)
- One subdomain per network Prometheus instance, e.g.:
  - `prom-net1.yourdomain.com`
  - `prom-net2.yourdomain.com`
  - `prom-net3.yourdomain.com`
- Ports open on each server:
  - `9100` — node_exporter (only needs to be reachable by the Prometheus hub, not the internet)
  - `443` — Nginx/HTTPS on the Prometheus hub (reachable by the dashboard)

---

## Step 1 — Install node_exporter on Every Server

Run this on **each server** you want to monitor.

```bash
# Download and extract
wget https://github.com/prometheus/node_exporter/releases/download/v1.8.2/node_exporter-1.8.2.linux-amd64.tar.gz
tar xvf node_exporter-1.8.2.linux-amd64.tar.gz
sudo cp node_exporter-1.8.2.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter-1.8.2.linux-amd64*

# Create a dedicated system user
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

**Verify it is running:**
```bash
curl http://localhost:9100/metrics | head -5
```

You should see lines starting with `# HELP` and `# TYPE`. If you do, node_exporter is working.

> Repeat Step 1 on every server across all three networks.

---

## Step 2 — Install Prometheus on the Hub Server (one per network)

Pick one server per network to be the **Prometheus hub**. This server will scrape all the other servers in that network.

```bash
# Download and extract
wget https://github.com/prometheus/prometheus/releases/download/v2.53.0/prometheus-2.53.0.linux-amd64.tar.gz
tar xvf prometheus-2.53.0.linux-amd64.tar.gz
sudo cp prometheus-2.53.0.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-2.53.0.linux-amd64/promtool /usr/local/bin/
rm -rf prometheus-2.53.0.linux-amd64*

# Create directories
sudo mkdir -p /etc/prometheus /var/lib/prometheus

# Create systemd service
sudo tee /etc/systemd/system/prometheus.service > /dev/null <<EOF
[Unit]
Description=Prometheus
After=network.target

[Service]
User=root
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --storage.tsdb.retention.time=30d

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus
```

> Repeat Step 2 on the hub server of each of your three networks.

---

## Step 3 — Configure Prometheus to Scrape Your Servers

Edit `/etc/prometheus/prometheus.yml` on each hub server. Add all the server IPs in that network.

**Example for Network 1 (Physical Servers):**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'servers'
    static_configs:
      - targets:
          - '192.168.1.10:9100'    # replace with your server IPs
          - '192.168.1.11:9100'
          - '192.168.1.12:9100'
        labels:
          network: 'network1'
```

**Example for Network 2 (Hetzner):**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'servers'
    static_configs:
      - targets:
          - '10.0.0.2:9100'
          - '10.0.0.3:9100'
        labels:
          network: 'hetzner'
```

After editing, restart Prometheus and verify targets are being scraped:

```bash
sudo systemctl restart prometheus
```

Open `http://<hub-server-ip>:9090/targets` in a browser — all targets should show as **UP** (green).

---

## Step 4 — Secure Prometheus with Nginx + HTTPS + Basic Auth

The dashboard connects to Prometheus over the internet, so you must put it behind HTTPS with a password.

Run this on each Prometheus hub server:

```bash
# Install Nginx, certbot, and htpasswd tool
sudo apt update
sudo apt install -y nginx apache2-utils certbot python3-certbot-nginx

# Create a Basic Auth password file
# Replace 'admin' with your chosen username
sudo htpasswd -c /etc/nginx/.htpasswd admin
# You will be prompted to enter and confirm a password — save it, you will need it later
```

Create the Nginx config for your Prometheus subdomain:

```bash
sudo nano /etc/nginx/sites-available/prometheus
```

Paste this (replace `prom-net1.yourdomain.com` with your actual subdomain):

```nginx
server {
    listen 80;
    server_name prom-net1.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name prom-net1.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/prom-net1.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prom-net1.yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        auth_basic           "Prometheus";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass           http://localhost:9090;
        proxy_set_header     Host $host;
        proxy_set_header     X-Real-IP $remote_addr;
    }
}
```

Enable the site and get an SSL certificate:

```bash
sudo ln -s /etc/nginx/sites-available/prometheus /etc/nginx/sites-enabled/
sudo nginx -t   # check for config errors
sudo certbot --nginx -d prom-net1.yourdomain.com
sudo systemctl restart nginx
```

**Verify:** Open `https://prom-net1.yourdomain.com` in a browser — it should ask for a username and password, then show the Prometheus UI.

> Repeat Step 4 on each Prometheus hub with its own subdomain (`prom-net2`, `prom-net3`).

---

## Step 5 — Deploy the Dashboard

On your dashboard server, clone the repo:

```bash
git clone https://github.com/MTDPerera/server_monitoring_system.git
cd server_monitoring_system
```

Create the environment file:

```bash
cp .env.example apps/dashboard/.env
nano apps/dashboard/.env
```

Fill in your real Prometheus URLs and credentials:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/monitoring

# Network 1
PROM_NET1_URL=https://prom-net1.yourdomain.com
PROM_NET1_USER=admin
PROM_NET1_PASS=your_basic_auth_password
PROM_NET1_LABEL=Physical Servers

# Network 2
PROM_NET2_URL=https://prom-net2.yourdomain.com
PROM_NET2_USER=admin
PROM_NET2_PASS=your_basic_auth_password
PROM_NET2_LABEL=Hetzner Bare-Metal

# Network 3
PROM_NET3_URL=https://prom-net3.yourdomain.com
PROM_NET3_USER=admin
PROM_NET3_PASS=your_basic_auth_password
PROM_NET3_LABEL=Third Network
```

Start the dashboard:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Open `http://<dashboard-server-ip>:3000/overview` — you should see live data from all three networks.

---

## Step 6 — (Optional) Put the Dashboard Behind Nginx + HTTPS

If you want the dashboard on a proper domain with HTTPS:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Copy the config from `nginx/dashboard.conf`, update `YOUR_DOMAIN.COM` with your domain, then:

```bash
sudo certbot --nginx -d yourdomain.com
sudo systemctl restart nginx
```

---

## Troubleshooting

**node_exporter not reachable from Prometheus hub:**
- Check firewall: `sudo ufw allow from <prometheus-hub-ip> to any port 9100`

**Prometheus targets showing as DOWN:**
- Check node_exporter is running: `sudo systemctl status node_exporter`
- Verify the IP and port in `prometheus.yml` are correct

**Dashboard shows a network as offline:**
- Test the Prometheus URL manually: `curl -u admin:password https://prom-net1.yourdomain.com/api/v1/targets`
- Check Nginx is running: `sudo systemctl status nginx`
- Check SSL certificate: `sudo certbot renew --dry-run`

**Database connection error on startup:**
- Make sure `DATABASE_URL` in `.env` is correct
- Migrations run automatically on startup via the entrypoint script

---

## Architecture Summary

```
Private Network 1          Private Network 2          Private Network 3
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  server1:9100    │       │  server1:9100    │       │  server1:9100    │
│  server2:9100    │       │  server2:9100    │       │  server2:9100    │
│       ↓          │       │       ↓          │       │       ↓          │
│  Prometheus:9090 │       │  Prometheus:9090 │       │  Prometheus:9090 │
│  Nginx HTTPS     │       │  Nginx HTTPS     │       │  Nginx HTTPS     │
└────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
         │                          │                           │
         └──────────────────────────┼───────────────────────────┘
                                    ↓
                         ┌─────────────────────┐
                         │   Next.js Dashboard  │
                         │   + PostgreSQL       │
                         └─────────────────────┘
```
