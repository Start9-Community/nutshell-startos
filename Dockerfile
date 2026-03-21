# Use a slim python image for multi-arch support
FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Nutshell (Cashu) — pin marshmallow<4 for environs compat
RUN pip install "marshmallow<4" cashu==0.19.2

# Set up data directory
RUN mkdir -p /data
ENV MINT_DATABASE_DIR=/data

# Expose port
EXPOSE 3338

# Standard execution (StartOS will override this in setupMain)
CMD ["python3", "-m", "cashu.mint"]
