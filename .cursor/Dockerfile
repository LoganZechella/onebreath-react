# Use Ubuntu 24.04 as the base image
FROM ubuntu:24.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV NODE_VERSION=18.17.0

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-dev \
    python3-pip \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    software-properties-common \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Verify installations
RUN python3 --version && node --version && npm --version

# Ensure ubuntu user has sudo privileges (user already exists in Ubuntu 24.04)
RUN echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to the non-root user
USER ubuntu

# Set working directory to user's home
WORKDIR /home/ubuntu

# Set the default command
CMD ["/bin/bash"]
