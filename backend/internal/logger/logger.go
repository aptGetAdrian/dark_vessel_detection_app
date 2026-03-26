package logger

import (
	"fmt"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// New creates a new zap logger configured for the given level.
// In development mode (level = "debug") it uses a human-readable console encoder.
// In all other modes it uses JSON output suitable for log aggregators.
func New(level string) (*zap.Logger, error) {
	var zapLevel zapcore.Level
	if err := zapLevel.UnmarshalText([]byte(level)); err != nil {
		return nil, fmt.Errorf("invalid log level %q: %w", level, err)
	}

	var cfg zap.Config
	if level == "debug" {
		cfg = zap.NewDevelopmentConfig()
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	} else {
		cfg = zap.NewProductionConfig()
	}

	cfg.Level = zap.NewAtomicLevelAt(zapLevel)

	log, err := cfg.Build(zap.AddCallerSkip(0))
	if err != nil {
		return nil, fmt.Errorf("failed to build logger: %w", err)
	}

	return log, nil
}
