# Docker Compose file paths
DEV_COMPOSE := docker/compose.development.yaml
PROD_COMPOSE := docker/compose.production.yaml

# Default values
MODE ?= dev
SERVICE ?= backend
ARGS ?=

# Select compose file based on mode
ifeq ($(MODE),prod)
	COMPOSE_FILE := $(PROD_COMPOSE)
else
	COMPOSE_FILE := $(DEV_COMPOSE)
endif

# Docker compose command
DOCKER_COMPOSE := docker compose --env-file .env -f $(COMPOSE_FILE)

# =============================================================================
# Docker Services:
#   up - Start services (use: make up [service...] or make up MODE=prod, ARGS="--build" for options)
#   down - Stop services (use: make down [service...] or make down MODE=prod, ARGS="--volumes" for options)
#   build - Build containers (use: make build [service...] or make build MODE=prod)
#   logs - View logs (use: make logs [service] or make logs SERVICE=backend, MODE=prod for production)
#   restart - Restart services (use: make restart [service...] or make restart MODE=prod)
#   shell - Open shell in container (use: make shell [service] or make shell SERVICE=gateway, MODE=prod, default: backend)
#   ps - Show running containers (use MODE=prod for production)
# =============================================================================

.PHONY: up down build logs restart shell ps

up:
	$(DOCKER_COMPOSE) up -d $(ARGS) $(filter-out $@,$(MAKECMDGOALS))

down:
	$(DOCKER_COMPOSE) down $(ARGS) $(filter-out $@,$(MAKECMDGOALS))

build:
	$(DOCKER_COMPOSE) build $(ARGS) $(filter-out $@,$(MAKECMDGOALS))

logs:
	$(DOCKER_COMPOSE) logs -f $(SERVICE) $(filter-out $@,$(MAKECMDGOALS))

restart:
	$(DOCKER_COMPOSE) restart $(filter-out $@,$(MAKECMDGOALS))

shell:
	docker exec -it $(SERVICE)-$(MODE) /bin/sh

ps:
	$(DOCKER_COMPOSE) ps

# =============================================================================
# Convenience Aliases (Development):
#   dev-up - Alias: Start development environment
#   dev-down - Alias: Stop development environment
#   dev-build - Alias: Build development containers
#   dev-logs - Alias: View development logs
#   dev-restart - Alias: Restart development services
#   dev-shell - Alias: Open shell in backend container
#   dev-ps - Alias: Show running development containers
#   backend-shell - Alias: Open shell in backend container
#   gateway-shell - Alias: Open shell in gateway container
#   mongo-shell - Open MongoDB shell
# =============================================================================

.PHONY: dev-up dev-down dev-build dev-logs dev-restart dev-shell dev-ps backend-shell gateway-shell mongo-shell

dev-up:
	docker compose --env-file .env -f $(DEV_COMPOSE) up -d $(ARGS)

dev-down:
	docker compose --env-file .env -f $(DEV_COMPOSE) down $(ARGS)

dev-build:
	docker compose --env-file .env -f $(DEV_COMPOSE) build $(ARGS)

dev-logs:
	docker compose --env-file .env -f $(DEV_COMPOSE) logs -f

dev-restart:
	docker compose --env-file .env -f $(DEV_COMPOSE) restart

dev-shell:
	docker exec -it backend-dev /bin/sh

dev-ps:
	docker compose --env-file .env -f $(DEV_COMPOSE) ps

backend-shell:
	docker exec -it backend-dev /bin/sh

gateway-shell:
	docker exec -it gateway-dev /bin/sh

mongo-shell:
	docker exec -it mongo-dev mongosh -u $${MONGO_INITDB_ROOT_USERNAME} -p $${MONGO_INITDB_ROOT_PASSWORD} --authenticationDatabase admin

# =============================================================================
# Convenience Aliases (Production):
#   prod-up - Alias: Start production environment
#   prod-down - Alias: Stop production environment
#   prod-build - Alias: Build production containers
#   prod-logs - Alias: View production logs
#   prod-restart - Alias: Restart production services
# =============================================================================

.PHONY: prod-up prod-down prod-build prod-logs prod-restart

prod-up:
	docker compose --env-file .env -f $(PROD_COMPOSE) up -d $(ARGS)

prod-down:
	docker compose --env-file .env -f $(PROD_COMPOSE) down $(ARGS)

prod-build:
	docker compose --env-file .env -f $(PROD_COMPOSE) build $(ARGS)

prod-logs:
	docker compose --env-file .env -f $(PROD_COMPOSE) logs -f

prod-restart:
	docker compose --env-file .env -f $(PROD_COMPOSE) restart

# =============================================================================
# Backend:
#   backend-build - Build backend TypeScript
#   backend-install - Install backend dependencies
#   backend-type-check - Type check backend code
#   backend-dev - Run backend in development mode (local, not Docker)
# =============================================================================

.PHONY: backend-build backend-install backend-type-check backend-dev

backend-build:
	cd backend && npm run build

backend-install:
	cd backend && npm install

backend-type-check:
	cd backend && npm run type-check

backend-dev:
	cd backend && npm run dev

# =============================================================================
# Database:
#   db-reset - Reset MongoDB database (WARNING: deletes all data)
#   db-backup - Backup MongoDB database
# =============================================================================

.PHONY: db-reset db-backup

db-reset:
	@echo "WARNING: This will delete all data in the MongoDB database!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose --env-file .env -f $(COMPOSE_FILE) down -v
	docker volume rm -f mongo-data-dev mongo-config-dev mongo-data-prod mongo-config-prod 2>/dev/null || true
	@echo "Database reset complete."

db-backup:
	@mkdir -p backups
	docker exec mongo-$(MODE) mongodump --uri="mongodb://$${MONGO_INITDB_ROOT_USERNAME}:$${MONGO_INITDB_ROOT_PASSWORD}@localhost:27017/$${MONGO_DATABASE}?authSource=admin" --archive=/tmp/backup.archive
	docker cp mongo-$(MODE):/tmp/backup.archive backups/backup-$$(date +%Y%m%d_%H%M%S).archive
	@echo "Backup saved to backups/"

# =============================================================================
# Cleanup:
#   clean - Remove containers and networks (both dev and prod)
#   clean-all - Remove containers, networks, volumes, and images
#   clean-volumes - Remove all volumes
# =============================================================================

.PHONY: clean clean-all clean-volumes

clean:
	docker compose --env-file .env -f $(DEV_COMPOSE) down --remove-orphans 2>/dev/null || true
	docker compose --env-file .env -f $(PROD_COMPOSE) down --remove-orphans 2>/dev/null || true
	@echo "Containers and networks removed."

clean-all:
	docker compose --env-file .env -f $(DEV_COMPOSE) down -v --rmi all --remove-orphans 2>/dev/null || true
	docker compose --env-file .env -f $(PROD_COMPOSE) down -v --rmi all --remove-orphans 2>/dev/null || true
	@echo "All containers, networks, volumes, and images removed."

clean-volumes:
	docker volume rm -f mongo-data-dev mongo-config-dev mongo-data-prod mongo-config-prod 2>/dev/null || true
	@echo "All volumes removed."

# =============================================================================
# Utilities:
#   status - Alias for ps
#   health - Check service health
# =============================================================================

.PHONY: status health

status: ps

health:
	@echo "Checking gateway health..."
	@curl -sf http://localhost:5921/health && echo " - Gateway: OK" || echo " - Gateway: FAILED"
	@echo "Checking backend health via gateway..."
	@curl -sf http://localhost:5921/api/health && echo " - Backend: OK" || echo " - Backend: FAILED"

# =============================================================================
# Help:
#   help - Display this help message
# =============================================================================

.PHONY: help

help:
	@echo "Docker Services:"
	@echo "  up            - Start services (use: make up or make up MODE=prod, ARGS=\"--build\")"
	@echo "  down          - Stop services (use: make down or make down MODE=prod, ARGS=\"--volumes\")"
	@echo "  build         - Build containers (use: make build or make build MODE=prod)"
	@echo "  logs          - View logs (use: make logs SERVICE=backend or make logs MODE=prod)"
	@echo "  restart       - Restart services (use: make restart or make restart MODE=prod)"
	@echo "  shell         - Open shell in container (use: make shell SERVICE=gateway)"
	@echo "  ps            - Show running containers"
	@echo ""
	@echo "Development Aliases:"
	@echo "  dev-up        - Start development environment"
	@echo "  dev-down      - Stop development environment"
	@echo "  dev-build     - Build development containers"
	@echo "  dev-logs      - View development logs"
	@echo "  dev-restart   - Restart development services"
	@echo "  dev-shell     - Open shell in backend container"
	@echo "  dev-ps        - Show running development containers"
	@echo "  backend-shell - Open shell in backend container"
	@echo "  gateway-shell - Open shell in gateway container"
	@echo "  mongo-shell   - Open MongoDB shell"
	@echo ""
	@echo "Production Aliases:"
	@echo "  prod-up       - Start production environment"
	@echo "  prod-down     - Stop production environment"
	@echo "  prod-build    - Build production containers"
	@echo "  prod-logs     - View production logs"
	@echo "  prod-restart  - Restart production services"
	@echo ""
	@echo "Backend:"
	@echo "  backend-build     - Build backend TypeScript"
	@echo "  backend-install   - Install backend dependencies"
	@echo "  backend-type-check - Type check backend code"
	@echo "  backend-dev       - Run backend in development mode (local)"
	@echo ""
	@echo "Database:"
	@echo "  db-reset      - Reset MongoDB database (WARNING: deletes all data)"
	@echo "  db-backup     - Backup MongoDB database"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean         - Remove containers and networks"
	@echo "  clean-all     - Remove containers, networks, volumes, and images"
	@echo "  clean-volumes - Remove all volumes"
	@echo ""
	@echo "Utilities:"
	@echo "  status        - Alias for ps"
	@echo "  health        - Check service health"
	@echo "  help          - Display this help message"

# Prevent make from interpreting additional arguments as targets
%:
	@:


