#!/bin/bash
# WSL Docker Setup Script
# Installs Docker and configures local dev environment

set -e

echo "🐧 Starting WSL Docker Setup..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker service
echo "🚀 Starting Docker service..."
sudo service docker start

# Add current user to docker group (avoid needing sudo)
sudo usermod -aG docker $USER

# Install Docker Compose v1 (for docker-compose command)
echo "📦 Installing Docker Compose v1..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
echo "✅ Docker installation complete!"
docker --version
docker-compose --version

echo ""
echo "⚠️  IMPORTANT: You may need to log out and back in for group changes to take effect."
echo "Or run: newgrp docker"
