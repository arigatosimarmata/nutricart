package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nutricart/backend/pkg/logger"
	"go.uber.org/zap"
)

// ZapLoggerMiddleware integrates Fiber with Uber's Zap logging for structured tracing
func ZapLoggerMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		path := c.Path()
		method := c.Method()

		// Execute the request handler pipeline
		err := c.Next()

		latency := time.Since(start)

		status := c.Response().StatusCode()
		clientIP := c.IP()
		userAgent := c.Get("User-Agent")

		// Prepare standard structured fields
		fields := []zap.Field{
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", status),
			zap.String("latency", latency.String()),
			zap.Int64("latency_ms", latency.Milliseconds()),
			zap.String("client_ip", clientIP),
			zap.String("user_agent", userAgent),
		}

		// Inject request headers tracing if debug-oriented
		if status >= 500 {
			if err != nil {
				fields = append(fields, zap.Error(err))
			}
			logger.Error("HTTP request failed with server error", fields...)
		} else if status >= 400 {
			if err != nil {
				fields = append(fields, zap.String("handler_error", err.Error()))
			}
			logger.Warn("HTTP request warning with client error", fields...)
		} else {
			logger.Info("HTTP request processed successfully", fields...)
		}

		return err
	}
}
