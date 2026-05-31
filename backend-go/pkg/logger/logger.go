package logger

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger

// InitLogger initializes a custom structured logger with Uber's Zap library
func InitLogger() {
	var config zapcore.EncoderConfig
	var encoder zapcore.Encoder
	var level zapcore.Level

	env := os.Getenv("ENV")
	if env == "" {
		env = os.Getenv("NODE_ENV")
	}

	if env == "production" || env == "prod" {
		// Production-grade JSON configuration (optimized for Cloud Run/GCP logs)
		config = zap.NewProductionEncoderConfig()
		config.EncodeTime = zapcore.ISO8601TimeEncoder // 2026-05-31T11:15:00...
		config.TimeKey = "timestamp"
		config.MessageKey = "message"
		config.LevelKey = "severity" // Matches GCP Cloud Logging severe levels
		config.EncodeLevel = func(l zapcore.Level, enc zapcore.PrimitiveArrayEncoder) {
			switch l {
			case zapcore.DebugLevel:
				enc.AppendString("DEBUG")
			case zapcore.InfoLevel:
				enc.AppendString("INFO")
			case zapcore.WarnLevel:
				enc.AppendString("WARNING")
			case zapcore.ErrorLevel:
				enc.AppendString("ERROR")
			case zapcore.DPanicLevel:
				enc.AppendString("CRITICAL")
			case zapcore.PanicLevel:
				enc.AppendString("ALERT")
			case zapcore.FatalLevel:
				enc.AppendString("EMERGENCY")
			default:
				enc.AppendString("DEFAULT")
			}
		}
		encoder = zapcore.NewJSONEncoder(config)
		level = zap.InfoLevel
	} else {
		// Development configuration with easy readability
		config = zap.NewDevelopmentEncoderConfig()
		config.EncodeTime = zapcore.TimeEncoderOfLayout("15:04:05")
		config.EncodeLevel = zapcore.CapitalColorLevelEncoder
		encoder = zapcore.NewConsoleEncoder(config)
		level = zap.DebugLevel
	}

	core := zapcore.NewCore(encoder, zapcore.AddSync(os.Stdout), level)
	Log = zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

	zap.ReplaceGlobals(Log)
}

// Info logs key-value activity messages
func Info(message string, fields ...zap.Field) {
	if Log != nil {
		Log.Info(message, fields...)
	}
}

// Warn logs key-value warning messages
func Warn(message string, fields ...zap.Field) {
	if Log != nil {
		Log.Warn(message, fields...)
	}
}

// Error logs key-value error messages
func Error(message string, fields ...zap.Field) {
	if Log != nil {
		Log.Error(message, fields...)
	}
}

// Debug logs key-value debug messages
func Debug(message string, fields ...zap.Field) {
	if Log != nil {
		Log.Debug(message, fields...)
	}
}

// Fatal logs key-value fatal messages and calls os.Exit(1)
func Fatal(message string, fields ...zap.Field) {
	if Log != nil {
		Log.Fatal(message, fields...)
	} else {
		panic(message)
	}
}
