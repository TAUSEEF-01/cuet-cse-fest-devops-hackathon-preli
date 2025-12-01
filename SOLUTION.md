# E-Commerce Backend - DevOps Solution

A fully containerized microservices setup for an e-commerce backend using Docker and solid DevOps practices.

## Architecture

```
                    ┌─────────────────┐
                    │   Client/User   │
                    └────────┬────────┘
                             │
                             │ HTTP (port 5921)
                             │
                    ┌────────▼────────┐
                    │    Gateway      │
                    │  (port 5921)    │
                    │   [Exposed]     │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
         ┌──────────▼──────────┐      │
         │   Private Network   │      │
         │  (Docker Network)   │      │
         └──────────┬──────────┘      │
                    │                 │
         ┌──────────┴──────────┐      │
         │                     │      │
    ┌────▼────┐         ┌──────▼──────┐
    │ Backend │         │   MongoDB   │
    │(port    │◄────────┤  (port      │
    │ 3847)   │         │  27017)     │
    │[Not     │         │ [Not        │
    │Exposed] │         │ Exposed]    │
    └─────────┘         └─────────────┘
```

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template and configure
cp .env.example .env

# Edit .env with your values (or use defaults below)
```

Default `.env` configuration:

```env
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=securepassword123
MONGO_URI=mongodb://admin:securepassword123@mongo:27017
MONGO_DATABASE=ecommerce
BACKEND_PORT=3847
GATEWAY_PORT=5921
NODE_ENV=development
```

### 2. Start Services

**Development:**

```bash
make dev-up
# or
docker compose --env-file .env -f docker/compose.development.yaml up -d
```

**Production:**

```bash
make prod-up
# or
docker compose --env-file .env -f docker/compose.production.yaml up -d
```

### 3. Verify Services

```bash
make health
# or manually:
curl http://localhost:5921/health      # Gateway health
curl http://localhost:5921/api/health  # Backend health via gateway
```

---

## Makefile Commands

### Docker Services

| Command                      | Description                          |
| ---------------------------- | ------------------------------------ |
| `make up`                    | Start services (dev mode by default) |
| `make up MODE=prod`          | Start services in production mode    |
| `make up ARGS="--build"`     | Start with rebuild                   |
| `make down`                  | Stop services                        |
| `make down ARGS="--volumes"` | Stop and remove volumes              |
| `make build`                 | Build containers                     |
| `make build MODE=prod`       | Build production containers          |
| `make logs`                  | View logs (all services)             |
| `make logs SERVICE=backend`  | View specific service logs           |
| `make restart`               | Restart all services                 |
| `make ps`                    | Show running containers              |
| `make shell SERVICE=backend` | Open shell in container              |

### Development Aliases

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `make dev-up`        | Start development environment   |
| `make dev-down`      | Stop development environment    |
| `make dev-build`     | Build development containers    |
| `make dev-logs`      | View development logs           |
| `make dev-restart`   | Restart development services    |
| `make dev-ps`        | Show running dev containers     |
| `make dev-shell`     | Open shell in backend container |
| `make backend-shell` | Open shell in backend container |
| `make gateway-shell` | Open shell in gateway container |
| `make mongo-shell`   | Open MongoDB shell              |

### Production Aliases

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `make prod-up`      | Start production environment |
| `make prod-down`    | Stop production environment  |
| `make prod-build`   | Build production containers  |
| `make prod-logs`    | View production logs         |
| `make prod-restart` | Restart production services  |

### Backend Development

| Command                   | Description                      |
| ------------------------- | -------------------------------- |
| `make backend-build`      | Build TypeScript to JavaScript   |
| `make backend-install`    | Install backend dependencies     |
| `make backend-type-check` | Type check backend code          |
| `make backend-dev`        | Run backend locally (not Docker) |

### Database

| Command          | Description                               |
| ---------------- | ----------------------------------------- |
| `make db-reset`  | Reset MongoDB (WARNING: deletes all data) |
| `make db-backup` | Backup MongoDB database                   |

### Cleanup

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `make clean`         | Remove containers and networks                   |
| `make clean-all`     | Remove containers, networks, volumes, and images |
| `make clean-volumes` | Remove all volumes                               |

### Utilities

| Command       | Description          |
| ------------- | -------------------- |
| `make status` | Alias for `make ps`  |
| `make health` | Check service health |
| `make help`   | Display help message |

---

## Testing

### Health Checks

```bash
# Check gateway health
curl http://localhost:5921/health
# Expected: {"ok":true}

# Check backend health via gateway
curl http://localhost:5921/api/health
# Expected: {"ok":true}
```

### Product API Reference

#### Create Product

```bash
curl -X POST http://localhost:5921/api/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Laptop","price":999.99,"description":"Gaming laptop","category":"Electronics","stock":50}'
```

#### Get All Products (with Pagination)

```bash
# Basic
curl http://localhost:5921/api/products

# With pagination and sorting
curl "http://localhost:5921/api/products?page=1&limit=10&sort=price&order=asc"

# Filter by category
curl "http://localhost:5921/api/products?category=Electronics"

# Price range
curl "http://localhost:5921/api/products?minPrice=100&maxPrice=500"
```

Query Parameters:
| Parameter | Description | Default |
|-----------|-------------|---------|
| `page` | Page number | 1 |
| `limit` | Items per page (max 100) | 10 |
| `sort` | Sort field (name, price, createdAt, updatedAt) | createdAt |
| `order` | Sort order (asc, desc) | desc |
| `category` | Filter by category | - |
| `minPrice` | Minimum price filter | - |
| `maxPrice` | Maximum price filter | - |

#### Search Products

```bash
curl "http://localhost:5921/api/products/search?q=laptop"
```

#### Get Product Statistics

```bash
curl http://localhost:5921/api/products/stats
# Returns: { totalProducts, totalValue, avgPrice, categoryBreakdown, lowStockCount }
```

#### Get Product by ID

```bash
curl http://localhost:5921/api/products/{id}
```

#### Update Product (Full Replace)

```bash
curl -X PUT http://localhost:5921/api/products/{id} \
  -H 'Content-Type: application/json' \
  -d '{"name":"Updated Name","price":199.99,"description":"Updated","category":"Updated","stock":100}'
```

#### Partial Update (PATCH)

```bash
curl -X PATCH http://localhost:5921/api/products/{id} \
  -H 'Content-Type: application/json' \
  -d '{"price":149.99}'
```

#### Update Stock

```bash
# Increment stock
curl -X PATCH http://localhost:5921/api/products/{id}/stock \
  -H 'Content-Type: application/json' \
  -d '{"quantity":10,"operation":"increment"}'

# Decrement stock
curl -X PATCH http://localhost:5921/api/products/{id}/stock \
  -H 'Content-Type: application/json' \
  -d '{"quantity":5,"operation":"decrement"}'

# Set absolute stock value
curl -X PATCH http://localhost:5921/api/products/{id}/stock \
  -H 'Content-Type: application/json' \
  -d '{"quantity":100,"operation":"set"}'
```

#### Delete Product

```bash
curl -X DELETE http://localhost:5921/api/products/{id}
```

#### Bulk Delete Products

```bash
curl -X POST http://localhost:5921/api/products/bulk-delete \
  -H 'Content-Type: application/json' \
  -d '{"ids":["id1","id2","id3"]}'
```

### Security Test

```bash
# Verify backend is NOT directly accessible (should fail/timeout)
curl http://localhost:3847/api/products
# Expected: Connection refused or timeout

# Verify MongoDB is NOT directly accessible
curl http://localhost:27017
# Expected: Connection refused or timeout
```

### PowerShell Testing

```powershell
# Health checks
Invoke-RestMethod -Uri "http://localhost:5921/health"
Invoke-RestMethod -Uri "http://localhost:5921/api/health"

# Create product
$headers = @{"Content-Type"="application/json"}
$body = '{"name":"Test Product","price":99.99,"description":"A test product","category":"Test","stock":10}'
Invoke-WebRequest -Uri "http://localhost:5921/api/products" -Method POST -Headers $headers -Body $body

# Get all products with pagination
Invoke-RestMethod -Uri "http://localhost:5921/api/products?page=1&limit=5"

# Search products
Invoke-RestMethod -Uri "http://localhost:5921/api/products/search?q=laptop"

# Get statistics
Invoke-RestMethod -Uri "http://localhost:5921/api/products/stats"

# Update stock (decrement)
$body = '{"quantity":5,"operation":"decrement"}'
Invoke-WebRequest -Uri "http://localhost:5921/api/products/{id}/stock" -Method PATCH -Headers $headers -Body $body

# Delete product
Invoke-WebRequest -Uri "http://localhost:5921/api/products/{id}" -Method DELETE
```

---

## Features Implemented

### ✅ Separate Dev and Prod Configs

- `docker/compose.development.yaml` - Hot reload, volume mounts, debug logging
- `docker/compose.production.yaml` - Optimized, security hardened, resource limits

### ✅ Data Persistence

- Named volumes for MongoDB data (`mongo-data-dev`, `mongo-data-prod`)
- Data survives container restarts

### ✅ Security Best Practices

| Feature              | Implementation                         |
| -------------------- | -------------------------------------- |
| Network Isolation    | Only gateway exposed on port 5921      |
| Non-root Users       | Custom users in all containers         |
| Read-only Filesystem | Production containers are read-only    |
| No New Privileges    | `no-new-privileges:true` in production |
| Capability Dropping  | `cap_drop: ALL` on Node.js services    |
| Input Validation     | Name/price validation in backend       |

### ✅ Docker Image Optimization

| Optimization       | Description                        |
| ------------------ | ---------------------------------- |
| Multi-stage Builds | Separate build and runtime stages  |
| Alpine Base        | `node:20-alpine` (~50MB vs ~1GB)   |
| Layer Caching      | Package files copied before source |
| Dev Deps Pruning   | `npm prune --production`           |
| .dockerignore      | Excludes unnecessary files         |

### ✅ Makefile CLI Commands

- 30+ convenience commands
- Support for MODE (dev/prod) switching
- Service-specific operations
- Database backup/reset

### ✅ Additional Best Practices

- **Tini init system** - Proper signal handling (PID 1)
- **Health checks** - All services monitored
- **Resource limits** - CPU/memory limits in production
- **Log rotation** - Prevents disk filling
- **Restart policies** - Auto-recovery from failures
- **OCI Labels** - Standard image metadata

---

## Project Structure

```
.
├── backend/
│   ├── Dockerfile           # Production multi-stage build
│   ├── Dockerfile.dev       # Development with hot reload
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── config/
│       ├── models/
│       ├── routes/
│       └── types/
├── gateway/
│   ├── Dockerfile           # Production multi-stage build
│   ├── Dockerfile.dev       # Development with hot reload
│   ├── package.json
│   └── src/
│       └── gateway.js
├── docker/
│   ├── compose.development.yaml
│   └── compose.production.yaml
├── .gitignore
├── Makefile
├── README.md
```

---

## Environment Variables

| Variable                     | Description               | Default                                       |
| ---------------------------- | ------------------------- | --------------------------------------------- |
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB root username     | admin                                         |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB root password     | securepassword123                             |
| `MONGO_URI`                  | MongoDB connection string | mongodb://admin:securepassword123@mongo:27017 |
| `MONGO_DATABASE`             | Database name             | ecommerce                                     |
| `BACKEND_PORT`               | Backend service port      | 3847 (DO NOT CHANGE)                          |
| `GATEWAY_PORT`               | Gateway service port      | 5921 (DO NOT CHANGE)                          |
| `NODE_ENV`                   | Environment mode          | development                                   |

---

## Troubleshooting

### Containers not starting

```bash
# Check logs
make dev-logs
# or
docker compose --env-file .env -f docker/compose.development.yaml logs

# Rebuild containers
make dev-build
make dev-up
```

### Port already in use

```bash
# Check what's using the port
netstat -ano | findstr :5921

# Stop conflicting process or change port in .env
```

### MongoDB connection issues

```bash
# Check if mongo is healthy
docker ps

# Check mongo logs
docker logs mongo-dev

# Reset database
make db-reset
```

### Clean restart

```bash
# Remove everything and start fresh
make clean-all
make dev-up ARGS="--build"
```
