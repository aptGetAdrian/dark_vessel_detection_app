.PHONY: run dev build tidy lint test clean seed

## run: build and run the binary directly
run:
	go run ./cmd/api

## dev: hot-reload via air
dev:
	air

## build: compile to ./bin/api
build:
	go build -o bin/api ./cmd/api

## tidy: tidy and verify go modules
tidy:
	go mod tidy
	go mod verify

## lint: run golangci-lint (must be installed)
lint:
	golangci-lint run ./...

## test: run all tests with race detector
test:
	go test -race -cover ./...

## seed: populate the database with demo vessel data (requires DATABASE_URL)
seed:
	go run ./cmd/seed

## clean: remove build artefacts
clean:
	rm -rf bin/ tmp/
