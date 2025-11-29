APP_NAME := nest-app
IMAGE := $(REGISTRY_HOST)/$(REGISTRY_REPO):latest
LOCAL_PORT := 3000

.PHONY: help build up down logs shell lint test docker-build docker-push deploy

help:
	@echo "Available targets: build, up, down, logs, shell, lint, test, docker-build, docker-push, deploy"

# Local build (node)
build:
	npm ci
	npm run build

up:
	docker-compose up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

shell:
	docker-compose exec app sh

lint:
	npm run lint

test:
	npm test

docker-build:
	docker build -t $(IMAGE) .

docker-push:
	docker push $(IMAGE)

# simple wrapper that uses ssh (assumes key already configured locally)
deploy:
	ssh $(SSH_USER)@$(SSH_HOST) "cd $(REMOTE_COMPOSE_DIR) && docker-compose pull app && docker-compose up -d --build"
