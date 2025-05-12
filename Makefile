.PHONY: setup start

# Python command
PY = poetry

setup: ## Install Python dependencies
	$(PY) install --no-interaction --no-root

start: ## Run Flask dev server on port 8080
	$(PY) run python -m src.web.app
