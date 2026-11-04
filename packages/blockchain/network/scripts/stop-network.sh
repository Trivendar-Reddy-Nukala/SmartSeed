#!/bin/bash
# =============================================================================
# SmartSeed Fabric Network - Stop Script
# Stops containers, removes crypto material, and cleans up artifacts
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="../docker/docker-compose-fabric.yml"

print_header() {
  echo ""
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}============================================================${NC}"
  echo ""
}

print_step() {
  echo -e "${YELLOW}[STEP]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[DONE]${NC} $1"
}

print_header "SmartSeed Fabric Network - Shutdown"

# Stop and remove docker containers
print_step "Stopping and removing docker containers..."
docker-compose -f "$COMPOSE_FILE" down --volumes --remove-orphans 2>/dev/null || true
print_success "Docker containers stopped and removed"

# Remove generated crypto material
print_step "Removing crypto material..."
rm -rf ../crypto-config
print_success "Crypto material removed"

# Remove channel artifacts
print_step "Removing channel artifacts..."
rm -rf ../channel-artifacts
print_success "Channel artifacts removed"

# Clean docker volumes
print_step "Pruning unused docker volumes..."
docker volume prune -f 2>/dev/null || true
print_success "Docker volumes cleaned"

# Remove chaincode docker images (if any)
print_step "Removing SmartSeed chaincode docker images..."
docker images -q "dev-peer*smartseed*" 2>/dev/null | xargs -r docker rmi -f 2>/dev/null || true
print_success "Chaincode images removed"

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  SmartSeed Fabric Network Stopped and Cleaned${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
