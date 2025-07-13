# First stage. Building a binary
# -----------------------------------------------------------------------------
ARG USE_NVIDIA

FROM golang:1.23-bullseye AS builder

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Ensure webUI.go is regenerated with updated JavaScript files
RUN echo "Removing existing webUI.go file if it exists..."
RUN rm -f src/webUI.go

# Build a temporary binary to regenerate webUI.go
RUN echo "Building temporary binary to regenerate webUI.go..."
RUN go build -o threadfin-temp threadfin.go

# Run in dev mode to regenerate webUI.go with updated JavaScript
RUN echo "Running in dev mode to regenerate webUI.go..."
RUN ./threadfin-temp -dev &
RUN sleep 15
RUN pkill -f threadfin-temp || echo "Process already stopped"

# Verify webUI.go was regenerated
RUN echo "Verifying webUI.go was regenerated..."
RUN ls -la src/webUI.go && echo "webUI.go successfully regenerated" || (echo "ERROR: webUI.go not found!" && exit 1)

# Clean up temporary binary
RUN rm -f threadfin-temp

# Build the final application with optimizations
RUN echo "Building final optimized binary..."
RUN CGO_ENABLED=0 go build -mod=mod -ldflags="-s -w" -trimpath -o threadfin threadfin.go

# Second stage. Creating a minimal image
# -----------------------------------------------------------------------------
ARG USE_NVIDIA
FROM ubuntu:24.04 AS standard
FROM nvidia/cuda:12.8.0-base-ubuntu24.04 AS nvidia
FROM standard AS final
FROM nvidia AS final-nvidia

ARG USE_NVIDIA
FROM final${USE_NVIDIA:+-nvidia}

ARG BUILD_DATE
ARG VCS_REF
ARG THREADFIN_PORT=34400
ARG THREADFIN_VERSION

LABEL org.label-schema.build-date="${BUILD_DATE}" \
      org.label-schema.name="Threadfin" \
      org.label-schema.description="Dockerized Threadfin" \
      org.label-schema.vcs-ref="${VCS_REF}" \
      org.label-schema.vcs-url="https://github.com/zane33/ThreadfinZane33" \
      org.label-schema.vendor="Threadfin" \
      org.label-schema.version="${THREADFIN_VERSION}" \
      org.label-schema.schema-version="1.0"

ENV THREADFIN_BIN=/home/threadfin/bin \
    THREADFIN_CONF=/home/threadfin/conf \
    THREADFIN_HOME=/home/threadfin \
    THREADFIN_TEMP=/tmp/threadfin \
    THREADFIN_CACHE=/home/threadfin/cache \
    THREADFIN_UID=31337 \
    THREADFIN_GID=31337 \
    THREADFIN_USER=threadfin \
    THREADFIN_BRANCH=main \
    THREADFIN_DEBUG=0 \
    THREADFIN_PORT=34400 \
    THREADFIN_LOG=/var/log/threadfin.log \
    THREADFIN_BIND_IP_ADDRESS=0.0.0.0 \
    PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/threadfin/bin \
    DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR $THREADFIN_HOME

# Arguments to add the jellyfin repository
ARG TARGETARCH
ARG OS_VERSION=ubuntu
ARG OS_CODENAME=noble

# Install dependencies in a single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    ffmpeg \
    vlc \
    tzdata \
    gnupg \
    apt-transport-https && \
    mkdir -p $THREADFIN_BIN $THREADFIN_CONF $THREADFIN_TEMP $THREADFIN_HOME/cache && \
    chmod a+rwX $THREADFIN_CONF $THREADFIN_TEMP && \
    sed -i 's/geteuid/getppid/' /usr/bin/vlc && \
    curl -fsSL https://repo.jellyfin.org/master/ubuntu/jellyfin_team.gpg.key \
        | gpg --dearmor -o /etc/apt/trusted.gpg.d/ubuntu-jellyfin.gpg && \
    (if [ "${TARGETARCH}" = "arm" ]; then \
        echo "deb [arch=armhf] https://repo.jellyfin.org/master/${OS_VERSION} ${OS_CODENAME} main" > /etc/apt/sources.list.d/jellyfin.list; \
    else \
        echo "deb [arch=${TARGETARCH}] https://repo.jellyfin.org/master/${OS_VERSION} ${OS_CODENAME} main" > /etc/apt/sources.list.d/jellyfin.list; \
    fi) && \
    apt-get update && \
    apt-get install --no-install-recommends --no-install-suggests --yes \
        jellyfin-ffmpeg7 && \
    apt-get remove gnupg apt-transport-https --yes  && \
    apt-get clean autoclean --yes && \
    apt-get autoremove --yes && \
    rm -rf /var/cache/apt/archives* /var/lib/apt/lists/*

# Copy built binary from builder image
COPY --from=builder /app/threadfin $THREADFIN_BIN/
RUN chmod +rx $THREADFIN_BIN/threadfin

# Configure container volume mappings
VOLUME $THREADFIN_CONF
VOLUME $THREADFIN_TEMP

EXPOSE $THREADFIN_PORT

ENTRYPOINT ["sh", "-c", "${THREADFIN_BIN}/threadfin -port=${THREADFIN_PORT} -bind=${THREADFIN_BIND_IP_ADDRESS} -config=${THREADFIN_CONF} -debug=${THREADFIN_DEBUG}"]
