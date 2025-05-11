.PHONY: setup install test lint start node clean

# Python & Node commands
PY=poetry
NPM=npm

# ----------- Development Convenience Targets -------------------

setup: ## Install Python + Node dependencies
	$(PY) install --no-interaction --no-root
	$(NPM) install --legacy-peer-deps

start: ## Run Flask dev server on port 8080
	$(PY) run python -m src.web.app

node: ## Launch local Hardhat chain
	npx hardhat node

compile: ## Compile Solidity contracts
	npx hardhat compile

deploy-local: ## Deploy contracts to local Hardhat network
	npx hardhat run scripts/deploy.js --network localhost

test: ## Run Solidity, Python and Playwright tests
	npx hardhat test && \
	$(PY) run pytest -q && \
	$(NPM) run test:e2e

clean: ## Remove build artefacts & caches
	rm -rf artifacts cache tests-results 