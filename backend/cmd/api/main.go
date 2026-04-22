package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/internal/aishub"
	"github.com/yourorg/go-backend/internal/config"
	"github.com/yourorg/go-backend/internal/logger"
	"github.com/yourorg/go-backend/internal/poller"
	"github.com/yourorg/go-backend/internal/sentinel"
	"github.com/yourorg/go-backend/internal/server"
	"github.com/yourorg/go-backend/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic("failed to load config: " + err.Error())
	}

	log, err := logger.New(cfg.LogLevel)
	if err != nil {
		panic("failed to init logger: " + err.Error())
	}
	defer log.Sync() //nolint:errcheck

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Optional: PostgreSQL
	var st *store.Store
	if cfg.DatabaseURL != "" {
		st, err = store.New(ctx, cfg.DatabaseURL, log)
		if err != nil {
			log.Fatal("database connection failed", zap.Error(err))
		}
		defer st.Close()
		log.Info("database connected")
	} else {
		log.Warn("DATABASE_URL not set — running with mock data")
	}

	// Optional: Sentinel Hub satellite client
	var sentinelClient *sentinel.Client
	if cfg.SentinelClientID != "" && cfg.SentinelClientSecret != "" {
		sentinelClient = sentinel.NewClient(cfg.SentinelClientID, cfg.SentinelClientSecret)
		log.Info("Sentinel Hub enabled", zap.Duration("scan_interval", cfg.SentinelScanInterval))
	} else {
		log.Warn("SENTINEL_CLIENT_ID/SECRET not set — using simulated satellite detections")
	}

	// Optional: AIS Hub + poller (requires DB)
	var aisClient *aishub.Client
	if cfg.AISHubUsername != "" {
		aisClient = aishub.NewClient(cfg.AISHubUsername)
	}

	if st != nil {
		if aisClient == nil {
			log.Warn("AISHUB_USERNAME not set — AIS polling disabled")
		}
		p := poller.New(aisClient, sentinelClient, st, cfg.AISPollInterval, cfg.SentinelScanInterval, log)
		go p.Start(ctx)
	}

	log.Info("starting server",
		zap.String("env", cfg.AppEnv),
		zap.String("addr", cfg.Addr()),
	)

	srv := server.New(cfg, log, st)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := srv.Start(); err != nil {
			log.Fatal("server error", zap.Error(err))
		}
	}()

	<-quit
	log.Info("shutting down...")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal("forced shutdown", zap.Error(err))
	}
	log.Info("server exited cleanly")
}
