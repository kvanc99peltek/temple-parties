.PHONY: setup install run dev build test lint clean

# One-time setup: install dependencies and create .env.local
setup:
	npm install
	@if [ ! -f .env.local ]; then cp .env.example .env.local && echo "Created .env.local - add your Supabase keys"; fi

# Install dependencies
install:
	npm install

# Run development server
run:
	npm run dev

# Alias for run
dev: run

# Build for production
build:
	npm run build

# Run tests
test:
	npm test

# Run linter
lint:
	npm run lint

# Clean up
clean:
	rm -rf node_modules .next
