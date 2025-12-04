test-up:
	docker compose -f docker-compose.yml -f docker-compose.test.yml up -d

test-down:
	docker compose -f docker-compose.yml -f docker-compose.test.yml down

test-reset:
	docker compose -f docker-compose.yml -f docker-compose.test.yml down -v
