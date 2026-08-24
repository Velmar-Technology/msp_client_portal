# Multi-stage Dockerfile to build and run msp-agent on Linux/WSL
FROM rust:1-slim-bookworm AS builder

WORKDIR /usr/src/msp-agent

# Install dependencies (pkg-config, libssl-dev for native-tls)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy cargo manifest
COPY Cargo.toml ./

# Create dummy src to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release || true

# Copy real source code
COPY src ./src

# Touch main.rs to invalidate dummy build and build release binary
RUN touch src/main.rs && cargo build --release

# Runtime container
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/src/msp-agent/target/release/msp-agent /app/msp-agent

ENV RUST_LOG=info
ENV MSP_GATEWAY_URL=ws://server:3001/agent-ws
ENV MSP_AGENT_ID=00000000-0000-0000-0000-000000000001
ENV MSP_AGENT_TOKEN=dev-token

CMD ["/app/msp-agent"]
