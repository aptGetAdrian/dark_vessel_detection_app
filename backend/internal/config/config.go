package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	AppEnv   string
	Host     string
	Port     string
	LogLevel string
}

// Addr returns the full bind address (host:port).
func (c *Config) Addr() string {
	return fmt.Sprintf("%s:%s", c.Host, c.Port)
}

// Load reads configuration from environment variables with sensible defaults.
func Load() (*Config, error) {
	cfg := &Config{
		AppEnv:   getEnv("APP_ENV", "development"),
		Host:     getEnv("APP_HOST", "0.0.0.0"),
		Port:     getEnv("APP_PORT", "8080"),
		LogLevel: getEnv("LOG_LEVEL", "info"),
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
