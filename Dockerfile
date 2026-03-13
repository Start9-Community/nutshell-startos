# Use a slim python image for multi-arch support
FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install yq for parsing StartOS config
RUN curl -L https://github.com/mikefarah/yq/releases/latest/download/yq_linux_$(dpkg --print-architecture) -o /usr/bin/yq && \
    chmod +x /usr/bin/yq

# Install Nutshell (Cashu)
RUN pip install cashu==0.19.2

# Set up data directory
RUN mkdir -p /data
ENV MINT_DATABASE_DIR=/data

# Copy entrypoint and scripts
COPY docker_entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker_entrypoint.sh

COPY scripts/health.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/health.sh

# Expose port
EXPOSE 3338

# Standard StartOS entrypoint
ENTRYPOINT ["docker_entrypoint.sh"]
