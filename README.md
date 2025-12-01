# E-Commerce Microservices Backend

A fully containerized e-commerce backend with microservices architecture using Docker, featuring a product management API, API gateway, and MongoDB database.

## 🏗️ Architecture

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
    │[Internal│         │ [Internal]  │
    └─────────┘         └─────────────┘
```

**Security Design:**

- ✅ Gateway is the **only** service exposed to external clients (port 5921)
- ✅ Backend and MongoDB are isolated in private Docker network
- ✅ All external requests must go through the Gateway

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Make (optional, for CLI commands)

### 1. Setup Environment

Create a `.env` file in the root directory with the following content:

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

**Development Mode** (with hot reload):

```bash
make dev-up
# or
docker compose --env-file .env -f docker/compose.development.yaml up -d
```

**Production Mode** (optimized):

```bash
make prod-up
# or
docker compose --env-file .env -f docker/compose.production.yaml up -d
```

### 3. Verify Installation

```bash
# Check health
curl http://localhost:5921/health        # Gateway
curl http://localhost:5921/api/health    # Backend via Gateway

# Test API
curl http://localhost:5921/api/products
```

---

## 📁 Project Structure

```
.
├── backend/
│   ├── Dockerfile           # Production multi-stage build
│   ├── Dockerfile.dev       # Development with hot reload
│   ├── .dockerignore
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts         # App entry point
│       ├── config/          # Database & environment config
│       ├── models/          # Mongoose schemas
│       ├── routes/          # API routes
│       └── types/           # TypeScript types
├── gateway/
│   ├── Dockerfile           # Production multi-stage build
│   ├── Dockerfile.dev       # Development with hot reload
│   ├── .dockerignore
│   ├── package.json
│   └── src/
│       └── gateway.js       # Proxy server
├── docker/
│   ├── compose.development.yaml
│   └── compose.production.yaml
├── .gitignore
├── Makefile                 # CLI commands
└── README.md
```

---

## 🔌 API Reference

### Health Endpoints

| Endpoint      | Method | Description          |
| ------------- | ------ | -------------------- |
| `/health`     | GET    | Gateway health check |
| `/api/health` | GET    | Backend health check |

### Product Endpoints

| Endpoint                    | Method | Description               |
| --------------------------- | ------ | ------------------------- |
| `/api/products`             | GET    | List products (paginated) |
| `/api/products`             | POST   | Create product            |
| `/api/products/search`      | GET    | Search products           |
| `/api/products/stats`       | GET    | Product statistics        |
| `/api/products/:id`         | GET    | Get product by ID         |
| `/api/products/:id`         | PUT    | Update product (full)     |
| `/api/products/:id`         | PATCH  | Update product (partial)  |
| `/api/products/:id`         | DELETE | Delete product            |
| `/api/products/:id/stock`   | PATCH  | Update stock              |
| `/api/products/bulk-delete` | POST   | Bulk delete products      |

### Query Parameters (GET /api/products)

| Parameter  | Description                         | Default   |
| ---------- | ----------------------------------- | --------- |
| `page`     | Page number                         | 1         |
| `limit`    | Items per page (max 100)            | 10        |
| `sort`     | Sort field (name, price, createdAt) | createdAt |
| `order`    | Sort order (asc, desc)              | desc      |
| `category` | Filter by category                  | -         |
| `minPrice` | Minimum price filter                | -         |
| `maxPrice` | Maximum price filter                | -         |

### Example Requests

```bash
# Create product
curl -X POST http://localhost:5921/api/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Laptop","price":999.99,"description":"Gaming laptop","category":"Electronics","stock":50}'

# Get products with pagination
curl "http://localhost:5921/api/products?page=1&limit=5&sort=price&order=asc"

# Search products
curl "http://localhost:5921/api/products/search?q=laptop"

# Get statistics
curl http://localhost:5921/api/products/stats

# Update stock
curl -X PATCH http://localhost:5921/api/products/{id}/stock \
  -H 'Content-Type: application/json' \
  -d '{"quantity":10,"operation":"increment"}'

# Delete product
curl -X DELETE http://localhost:5921/api/products/{id}

# Bulk delete
curl -X POST http://localhost:5921/api/products/bulk-delete \
  -H 'Content-Type: application/json' \
  -d '{"ids":["id1","id2","id3"]}'
```

### Security Test

```bash
# Verify backend is NOT directly accessible (should fail/timeout)
curl http://localhost:3847/api/products

# Verify MongoDB is NOT directly accessible
curl http://localhost:27017
```

---

## ⚙️ Makefile Commands

### Docker Services

| Command                      | Description                          |
| ---------------------------- | ------------------------------------ |
| `make up`                    | Start services (dev mode by default) |
| `make up MODE=prod`          | Start services in production mode    |
| `make down`                  | Stop services                        |
| `make build`                 | Build containers                     |
| `make logs`                  | View logs (all services)             |
| `make logs SERVICE=backend`  | View specific service logs           |
| `make restart`               | Restart all services                 |
| `make ps`                    | Show running containers              |
| `make shell SERVICE=backend` | Open shell in container              |

### Development

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `make dev-up`        | Start development environment   |
| `make dev-down`      | Stop development environment    |
| `make dev-logs`      | View development logs           |
| `make dev-restart`   | Restart development services    |
| `make dev-build`     | Build development containers    |
| `make backend-shell` | Open shell in backend container |
| `make gateway-shell` | Open shell in gateway container |
| `make mongo-shell`   | Open MongoDB shell              |

### Production

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `make prod-up`      | Start production environment |
| `make prod-down`    | Stop production environment  |
| `make prod-logs`    | View production logs         |
| `make prod-restart` | Restart production services  |
| `make prod-build`   | Build production containers  |

### Utilities

| Command                      | Description                         |
| ---------------------------- | ----------------------------------- |
| `make health`                | Check service health                |
| `make ps`                    | Show running containers             |
| `make logs`                  | View all logs                       |
| `make clean`                 | Remove containers and networks      |
| `make clean-all`             | Remove everything including volumes |
| `make db-backup`             | Backup MongoDB database             |
| `make db-reset`              | Reset MongoDB (⚠️ deletes data)     |
| `make shell SERVICE=backend` | Open shell in container             |

---

## ✅ Features Implemented

### Separate Dev and Prod Configs

- `docker/compose.development.yaml` - Hot reload, volume mounts, debug logging
- `docker/compose.production.yaml` - Optimized, security hardened, resource limits

### Data Persistence

- Named volumes for MongoDB data (`mongo-data-dev`, `mongo-data-prod`)
- Data survives container restarts

---

## 🔒 Security Features

| Feature              | Implementation                                 |
| -------------------- | ---------------------------------------------- |
| Network Isolation    | Only gateway exposed; backend/MongoDB internal |
| Non-root Users       | Custom users in all containers                 |
| Read-only Filesystem | Production containers are read-only            |
| No New Privileges    | `no-new-privileges:true` in production         |
| Capability Dropping  | `cap_drop: ALL` on Node.js services            |
| Input Validation     | Sanitization on all API inputs                 |
| Health Checks        | All services monitored                         |

---

## 🐳 Docker Optimization

| Optimization       | Description                        |
| ------------------ | ---------------------------------- |
| Multi-stage Builds | Separate build and runtime stages  |
| Alpine Base        | `node:20-alpine` (~50MB vs ~1GB)   |
| Layer Caching      | Package files copied before source |
| Dev Deps Pruning   | `npm prune --production`           |
| Tini Init          | Proper signal handling (PID 1)     |
| .dockerignore      | Excludes unnecessary files         |

### Additional Best Practices

- **Tini init system** - Proper signal handling (PID 1)
- **Health checks** - All services monitored
- **Resource limits** - CPU/memory limits in production
- **Log rotation** - Prevents disk filling
- **Restart policies** - Auto-recovery from failures
- **OCI Labels** - Standard image metadata

---

## 🌍 Environment Variables

| Variable                     | Description               | Default                         |
| ---------------------------- | ------------------------- | ------------------------------- |
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB username          | admin                           |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB password          | securepassword123               |
| `MONGO_URI`                  | MongoDB connection string | mongodb://admin:...@mongo:27017 |
| `MONGO_DATABASE`             | Database name             | ecommerce                       |
| `BACKEND_PORT`               | Backend port              | 3847 (DO NOT CHANGE)            |
| `GATEWAY_PORT`               | Gateway port              | 5921 (DO NOT CHANGE)            |
| `NODE_ENV`                   | Environment mode          | development                     |

---

## 🔧 Troubleshooting

### Containers not starting

```bash
make dev-logs                    # Check logs
make dev-build && make dev-up    # Rebuild and restart
```

### Port already in use

```bash
netstat -ano | findstr :5921     # Windows
lsof -i :5921                    # Linux/Mac
```

### MongoDB connection issues

```bash
docker logs mongo-dev            # Check mongo logs
make db-reset                    # Reset database
```

### Clean restart

```bash
make clean-all
make dev-up ARGS="--build"
```
