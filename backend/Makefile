.PHONY: setup install run dev test clean

# One-time setup: create venv and install dependencies
setup:
	python3 -m venv venv
	. venv/bin/activate && pip install -r requirements.txt
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env - add your Supabase keys"; fi

# Install dependencies (if venv already exists)
install:
	. venv/bin/activate && pip install -r requirements.txt

# Run the server
run:
	. venv/bin/activate && uvicorn app.main:app --reload

# Alias for run
dev: run

# Run tests
test:
	. venv/bin/activate && pytest

# Clean up
clean:
	rm -rf venv __pycache__ .pytest_cache
	find . -type d -name "__pycache__" -exec rm -rf {} +
