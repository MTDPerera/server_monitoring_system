# Server Monitoring Dashboard — System Documentation

---

## What Is This System?

This is a centralized infrastructure monitoring dashboard built with Next.js. It connects to three separate private networks, collects server health data from each, and displays everything in one place. It also monitors websites and API endpoints for uptime.

---

## How the System Works (Architecture)

The system works on a **hub-and-spoke model**:

- Each of the three private networks runs its own **Prometheus** instance
- Prometheus scrapes metrics from **node_exporter** agents installed on each server
- The central **Next.js dashboard** queries all three Prometheus instances at the same time
- Results from all three networks are merged and shown together in the UI
- A **PostgreSQL database** stores website and endpoint check history

If one network goes offline, the other two still work — the system uses `Promise.allSettled()` so one failed network never crashes the whole dashboard.

**Two separate data pipelines:**

1. **Prometheus pipeline** — server health metrics (CPU, memory, disk, load, network). Data is queried live from Prometheus on demand.
2. **Active check pipeline** — website and API endpoint uptime. The dashboard itself sends HTTP requests to target URLs every 60 seconds and stores each result in PostgreSQL.

---

## Technology Stack

| Component       | Technology                          |
|-----------------|-------------------------------------|
| Frontend        | Next.js 15, TypeScript, Tailwind CSS |
| Metrics source  | Prometheus + node_exporter          |
| Database        | PostgreSQL (via Prisma ORM)         |
| Local dev       | Docker Compose                      |
| HTTP client     | Axios (for Prometheus), fetch (for checks) |

---

## The Three Networks

| Network | Label           | Description                          |
|---------|-----------------|--------------------------------------|
| network1 | Physical Servers | On-premise physical server infrastructure |
| hetzner  | Hetzner Bare-Metal | Hetzner cloud bare-metal servers    |
| network3 | Third Network   | Third private network                |

Each network has its own Prometheus URL and optional Basic Auth credentials set in environment variables.

---

## Core Library Functions

All the core logic lives in two files inside `apps/dashboard/src/lib/`.

### prometheus.ts — Prometheus Client

This file handles all communication with the three Prometheus instances.

**getSources()**
Reads the three Prometheus URLs and credentials from environment variables. Filters out any network where the URL is not configured. Called fresh on every request.

**queryAll(promql)**
Sends any PromQL query to all three Prometheus instances at the same time. Returns a merged list of results, each tagged with which network it came from. Used by the generic metrics API route.

**getTargets()**
Calls each Prometheus instance to get its list of active scrape targets. Returns the health status (up/down/unknown), last scrape time, error messages, and labels for every target across all networks. This drives the targets table on the Overview page and the entire Servers page.

**getNetworkStats()**
Fetches targets per network and computes a summary: how many are up, how many are down, total count, and a health percentage. If a whole network is unreachable, it returns `online: false` with the error message rather than throwing. Used for the summary cards on the Overview page.

**getServerMetrics(instance, network)**
Fetches 13 metrics in parallel for a specific server from the correct Prometheus instance:
- CPU usage % (5-minute rate)
- Memory: total, used, available, usage %
- Disk: root filesystem total, used, available, usage %
- Load averages: 1-minute, 5-minute, 15-minute
- Uptime in seconds
- Network I/O: receive and transmit bytes per second

**getServerDetail(instance, network)**
Fetches expanded detail for the Server Detail page:
- Every mounted filesystem (size, used, available, usage %)
- Per-CPU-core usage breakdown
- Per-network-interface throughput (Rx and Tx bytes/sec)

---

### checker.ts — HTTP Uptime Checker

This file handles active HTTP checks for websites and API endpoints.

Every check returns one of three statuses:
- **up** — response received and HTTP status code matches what was expected
- **down** — response received but wrong status code, or connection refused
- **timeout** — no response within 10 seconds

**checkUrl(url, expectedStatus)**
Simple website uptime check. Sends a GET request, follows redirects, compares the response code. Measures response time in milliseconds. Used for website monitoring.

**checkEndpoint(url, method, headers, body, expectedStatus)**
Full API endpoint check. Supports any HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD), custom request headers, and a request body. Used for API endpoint monitoring.

**checkSslExpiry(url)**
Opens a TLS connection to port 443 of the target domain and reads the SSL certificate expiry date. Returns null for non-HTTPS URLs or unreachable hosts. The result is stored in the database and shown as a colored badge on the Websites page: green (more than 30 days), yellow (14–30 days), red (less than 14 days).

---

## API Routes

The dashboard exposes a set of internal API routes that the frontend pages call.

### Server Metric Routes (Prometheus)

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/overview | Returns per-network target counts: up, down, total, health % |
| GET | /api/targets | Returns all active scrape targets from all networks |
| GET | /api/metrics?query=\<promql\> | Runs any PromQL query across all networks |
| GET | /api/server-metrics?instance=\<i\>&network=\<n\> | Returns the 13-metric summary for one server |
| GET | /api/server-detail?instance=\<i\>&network=\<n\> | Returns disk, CPU core, and network interface detail for one server |

### Website Routes (PostgreSQL)

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/websites | Returns all websites with their last 20 check results |
| POST | /api/websites | Creates a new website to monitor |
| PATCH | /api/websites/[id] | Updates a website's tags |
| DELETE | /api/websites/[id] | Deletes a website and all its history |
| GET | /api/websites/[id]/history | Returns full check history for one website |
| POST | /api/websites/check-all | Runs a health check on every website now |

### API Endpoint Routes (PostgreSQL)

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/endpoints | Returns all endpoints with their last 20 check results |
| POST | /api/endpoints | Creates a new endpoint to monitor |
| PATCH | /api/endpoints/[id] | Updates an endpoint's tags |
| DELETE | /api/endpoints/[id] | Deletes an endpoint and all its history |
| POST | /api/endpoints/check-all | Runs a health check on every endpoint now |

---

## Database Schema

The PostgreSQL database stores only website and endpoint check data. Server metrics do not touch the database — they are always queried live from Prometheus.

### Website
Stores a website to be monitored.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique ID (CUID) |
| name | String | Display name |
| url | String | Full URL including https:// |
| expectedStatus | Int | HTTP status code that means "up" (default 200) |
| tags | String[] | Labels for grouping (e.g. production, staging) |
| sslExpiresAt | DateTime? | SSL certificate expiry date |
| createdAt / updatedAt | DateTime | Timestamps |

### WebsiteCheck
One record per check run for a website.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique ID |
| websiteId | String | Links to Website |
| status | String | "up", "down", or "timeout" |
| statusCode | Int? | HTTP status received (null on timeout) |
| responseMs | Int? | Response time in milliseconds |
| error | String? | Error message if check failed |
| checkedAt | DateTime | When the check was run |

### Endpoint
Stores an API endpoint to be monitored.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique ID |
| name | String | Display name |
| url | String | Full URL |
| method | String | HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD) |
| headers | Json | Custom request headers as key-value pairs |
| body | String? | Request body (for POST/PUT/PATCH) |
| expectedStatus | Int | Expected HTTP status code |
| tags | String[] | Labels for grouping |

### EndpointCheck
One record per check run for an endpoint. Same fields as WebsiteCheck.

**Data retention:** After every check-all run, old records are deleted so that each website and endpoint keeps a maximum of 100 check records.

---

## UI Pages

### Overview Page (/overview)
The main summary page. Automatically refreshes every 30 seconds.

Shows:
- Total servers, online count, offline count across all networks
- One card per network showing its up/down/health stats
- A world map visualization of network nodes
- A full table of every scrape target across all networks

### Servers Page (/servers)
Lists all servers across all networks. Refreshes every 30 seconds.

Features:
- Search by instance name
- Filter by network
- Click any healthy (up) server to open its detail page

### Server Detail Page (/servers/detail)
Deep-dive for a single server. Loads by reading the instance and network from the URL.

Shows:
- CPU %, memory %, root disk % — each with a visual bar
- Load averages (1m / 5m / 15m), uptime, network Rx/Tx speeds
- All mounted filesystems with individual usage bars
- Per-CPU-core usage breakdown
- Per-network-interface throughput

### Websites Page (/websites)
Website uptime monitoring. Checks run every 60 seconds automatically.

Each website card shows:
- Current status (Up / Down / Timeout)
- SSL certificate days remaining
- Latest response time and HTTP status code
- Response time sparkline (bar chart of last 20 checks)
- Uptime history bars (last 20 checks as green/yellow/red)
- Uptime percentage

Actions: Add website, edit tags, delete, manual check now.

### Endpoints Page (/endpoints)
API endpoint monitoring. Same 60-second check cycle as Websites.

Additional features beyond the website view:
- HTTP method badge (GET, POST, PUT, PATCH, DELETE, HEAD)
- Custom request headers and request body when adding an endpoint
- Filter bar: filter by status (up/down) and by HTTP method
- Stats strip: total, up, down, and average response time

---

## Docker Compose (Local Development)

The file `docker-compose.dev.yml` starts four services for local development:

| Service | Port | Purpose |
|---------|------|---------|
| postgres | 5434 | PostgreSQL database |
| prometheus-net1 | 9091 | Mock Prometheus for Network 1 |
| prometheus-net2 | 9092 | Mock Prometheus for Network 2 |
| prometheus-net3 | 9093 | Mock Prometheus for Network 3 |

---

## Environment Variables

Set these in `apps/dashboard/.env`:

| Variable | Dev Example | Description |
|----------|-------------|-------------|
| DATABASE_URL | postgresql://postgres:postgres@localhost:5434/monitoring | PostgreSQL connection string |
| PROM_NET1_URL | http://localhost:9091 | Prometheus URL for Network 1 |
| PROM_NET1_LABEL | Physical Servers | Display name for Network 1 |
| PROM_NET1_USER | (empty in dev) | Basic Auth username |
| PROM_NET1_PASS | (empty in dev) | Basic Auth password |
| PROM_NET2_URL | http://localhost:9092 | Prometheus URL for Network 2 |
| PROM_NET3_URL | http://localhost:9093 | Prometheus URL for Network 3 |

In production, replace the localhost URLs with real HTTPS subdomains and add Basic Auth credentials.

---

## Local Development Setup

```
# 1. Start Docker services
docker compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
cd apps/dashboard && npm install

# 3. Run database migrations (first time only)
npx prisma migrate dev

# 4. Start the dashboard
npm run dev
```

The dashboard will be available at **http://localhost:3000**

Navigate to `/overview` to confirm all three Prometheus instances are connected and data is flowing.

---

*Server Monitoring Dashboard — Internal Documentation — June 2026*
