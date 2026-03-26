.PHONY: run dev build tidy lint test clean

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

## clean: remove build artefacts
clean:
	rm -rf bin/ tmp/
