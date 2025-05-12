.PHONY: setup install test lint start clean

# Python & Node commands
PY=poetry
NPM=npm

# ----------- Development Convenience Targets -------------------

setup: ## Install Python + Node dependencies
	$(PY) install --no-interaction --no-root
	$(NPM) install --legacy-peer-deps

start: ## Run Flask dev server on port 8080
	$(PY) run python -m src.web.app
