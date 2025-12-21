# -----------------------------------------
#  Docker Prod & Test Environment Commands
# -----------------------------------------

# File names
PROD_COMPOSE = docker-compose.yml
TEST_COMPOSE = docker-compose.test.yml

# ----------------------
# Run Environments
# ----------------------

.PHONY: prod
prod:
	docker compose -f $(PROD_COMPOSE) up -d --build

.PHONY: test
test:
	docker compose -f $(TEST_COMPOSE) up -d --build

.PHONY: all
all:
	docker compose -f $(PROD_COMPOSE) up -d --build 
	docker compose -f $(TEST_COMPOSE) up -d	--build

# ----------------------
# Stop Environments
# ----------------------

.PHONY: stop-prod
stop-prod:
	docker compose -f $(PROD_COMPOSE) down

.PHONY: stop-test
stop-test:
	docker compose -f $(TEST_COMPOSE) down

.PHONY: stop-all
stop-all:
	docker compose -f $(PROD_COMPOSE) down
	docker compose -f $(TEST_COMPOSE) down

# ----------------------
# Reset Volumes
# ----------------------

.PHONY: clean-test
clean-test:
	docker volume rm -f mongo_test_data || true

.PHONY: clean-prod
clean-prod:
	docker volume rm -f mongo_data || true

.PHONY: clean-all
clean-all:
	docker volume rm -f mongo_data || true
	docker volume rm -f mongo_test_data || true
