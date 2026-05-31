# =========================================================
# Stage 1: Build React Frontend Assets
# =========================================================
FROM node:20-alpine AS node-builder

WORKDIR /app

# Copy React client package manifests for cache layer optimization
COPY package.json package-lock.json* ./

# Install packages
RUN npm ci

# Copy entire source files
COPY . .

# Compile optimized static output into /app/dist
RUN npm run build

# =========================================================
# Stage 2: Build Go High-Performance Application Binary
# =========================================================
FROM golang:1.21-alpine AS go-builder

WORKDIR /app/backend-go

# Copy Go module and dependency declarations
COPY backend-go/go.mod backend-go/go.sum* ./

# Copy Go source files
COPY backend-go/ .

# Automatically tidy and construct/update go.sum verifying checksums on the fly during container build
RUN go mod tidy

# Download and verify dependencies
RUN go mod download

# Build statically linked optimization binary without debug symbols
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/nutricart-app cmd/api/main.go

# =========================================================
# Stage 3: Extreme Minimalist Production Base Image
# =========================================================
FROM alpine:3.19 AS runner

WORKDIR /app

# Create a non-root group and user for secure sandboxed execution on GCP Cloud Run
RUN addgroup -S nutricart && adduser -S nutricart -G nutricart

# Set environment defaults
ENV ENV=production
ENV PORT=3000

# Copy compiled Go main binary from Stage 2
COPY --from=go-builder /app/nutricart-app ./nutricart-app

# Copy optimized React client assets from Stage 1 to the location served by Go Fiber
COPY --from=node-builder /app/dist ./dist

# Adjust file ownership metadata safely to the non-root user
RUN chown -R nutricart:nutricart /app

# Expose container network boundary
EXPOSE 3000

# Run as non-root user for security (GCP sandboxed containers best practice)
USER nutricart

# Start Go application that handles both REST APIs, DB Auto-migrations, and static UI routes
CMD ["./nutricart-app"]
