package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/yourorg/go-backend/internal/config"
	"github.com/yourorg/go-backend/internal/logger"
	"github.com/yourorg/go-backend/internal/server"
	"go.uber.org/zap"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		panic("failed to load config: " + err.Error())
	}

	// Init logger
	log, err := logger.New(cfg.LogLevel)
	if err != nil {
		panic("failed to init logger: " + err.Error())
	}
	defer log.Sync() //nolint:errcheck

	log.Info("starting server",
		zap.String("env", cfg.AppEnv),
		zap.String("host", cfg.Host),
		zap.String("port", cfg.Port),
	)

	// Build and start server
	srv := server.New(cfg, log)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := srv.Start(); err != nil {
			log.Fatal("server error", zap.Error(err))
		}
	}()

	<-quit
	log.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("forced shutdown", zap.Error(err))
	}

	log.Info("server exited cleanly")
}
