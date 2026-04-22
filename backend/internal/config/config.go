package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	AppEnv          string
	Host            string
	Port            string
	LogLevel        string
	DatabaseURL     string
	AISHubUsername  string
	AISPollInterval time.Duration
	// Sentinel Hub (Copernicus Data Space Ecosystem) credentials
	// Register free at https://dataspace.copernicus.eu
	SentinelClientID     string
	SentinelClientSecret string
	SentinelScanInterval time.Duration
}

func (c *Config) Addr() string {
	return fmt.Sprintf("%s:%s", c.Host, c.Port)
}

func Load() (*Config, error) {
	pollSec, _ := strconv.Atoi(getEnv("AIS_POLL_INTERVAL_SEC", "60"))
	if pollSec < 60 {
		pollSec = 60 // enforce AIS Hub rate limit (1 req/min)
	}
	scanHours, _ := strconv.Atoi(getEnv("SENTINEL_SCAN_INTERVAL_HOURS", "12"))
	if scanHours < 1 {
		scanHours = 12
	}
	return &Config{
		AppEnv:               getEnv("APP_ENV", "development"),
		Host:                 getEnv("APP_HOST", "0.0.0.0"),
		Port:                 getEnv("APP_PORT", "8080"),
		LogLevel:             getEnv("LOG_LEVEL", "info"),
		DatabaseURL:          getEnv("DATABASE_URL", ""),
		AISHubUsername:       getEnv("AISHUB_USERNAME", ""),
		AISPollInterval:      time.Duration(pollSec) * time.Second,
		SentinelClientID:     getEnv("SENTINEL_CLIENT_ID", ""),
		SentinelClientSecret: getEnv("SENTINEL_CLIENT_SECRET", ""),
		SentinelScanInterval: time.Duration(scanHours) * time.Hour,
	}, nil
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
