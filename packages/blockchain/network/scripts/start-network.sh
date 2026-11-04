#!/bin/bash
# =============================================================================
# SmartSeed Fabric Network - Start Script
# Generates crypto material, starts containers, creates and joins channel
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CHANNEL_NAME="smartseedchannel"
COMPOSE_FILE="../docker/docker-compose-fabric.yml"
CRYPTO_CONFIG="../configtx/crypto-config.yaml"
CONFIGTX_DIR="../configtx"
CRYPTO_OUTPUT="../crypto-config"
CHANNEL_ARTIFACTS="../channel-artifacts"
MAX_RETRY=5
CLI_DELAY=3

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

print_header() {
  echo ""
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}============================================================${NC}"
  echo ""
}

print_step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
  print_header "Checking Prerequisites"

  for cmd in cryptogen configtxgen docker docker-compose; do
    if ! command -v "$cmd" &>/dev/null; then
      print_error "$cmd is not installed or not in PATH"
      exit 1
    fi
    print_success "$cmd found"
  done
}

# ---------------------------------------------------------------------------
# Step 1: Generate Crypto Material
# ---------------------------------------------------------------------------
generate_crypto() {
  print_header "Generating Crypto Material"

  if [ -d "$CRYPTO_OUTPUT" ]; then
    print_warning "Removing existing crypto material..."
    rm -rf "$CRYPTO_OUTPUT"
  fi

  print_step "Generating certificates using cryptogen..."
  cryptogen generate --config="$CRYPTO_CONFIG" --output="$CRYPTO_OUTPUT"

  if [ $? -ne 0 ]; then
    print_error "Failed to generate crypto material"
    exit 1
  fi

  print_success "Crypto material generated successfully"
}

# ---------------------------------------------------------------------------
# Step 2: Generate Channel Artifacts
# ---------------------------------------------------------------------------
generate_channel_artifacts() {
  print_header "Generating Channel Artifacts"

  mkdir -p "$CHANNEL_ARTIFACTS"

  export FABRIC_CFG_PATH="$CONFIGTX_DIR"

  # Generate genesis block
  print_step "Generating genesis block..."
  configtxgen \
    -profile SmartSeedOrdererGenesis \
    -channelID system-channel \
    -outputBlock "$CHANNEL_ARTIFACTS/genesis.block"

  if [ $? -ne 0 ]; then
    print_error "Failed to generate genesis block"
    exit 1
  fi
  print_success "Genesis block generated"

  # Generate channel configuration transaction
  print_step "Generating channel configuration transaction..."
  configtxgen \
    -profile SmartSeedChannel \
    -outputCreateChannelTx "$CHANNEL_ARTIFACTS/${CHANNEL_NAME}.tx" \
    -channelID "$CHANNEL_NAME"

  if [ $? -ne 0 ]; then
    print_error "Failed to generate channel configuration transaction"
    exit 1
  fi
  print_success "Channel configuration transaction generated"

  # Generate anchor peer update for ManufacturerOrg
  print_step "Generating anchor peer update for ManufacturerOrg..."
  configtxgen \
    -profile SmartSeedChannel \
    -outputAnchorPeersUpdate "$CHANNEL_ARTIFACTS/ManufacturerMSPanchors.tx" \
    -channelID "$CHANNEL_NAME" \
    -asOrg ManufacturerOrg

  if [ $? -ne 0 ]; then
    print_error "Failed to generate anchor peer update for ManufacturerOrg"
    exit 1
  fi
  print_success "ManufacturerOrg anchor peer update generated"

  # Generate anchor peer update for RegulatorOrg
  print_step "Generating anchor peer update for RegulatorOrg..."
  configtxgen \
    -profile SmartSeedChannel \
    -outputAnchorPeersUpdate "$CHANNEL_ARTIFACTS/RegulatorMSPanchors.tx" \
    -channelID "$CHANNEL_NAME" \
    -asOrg RegulatorOrg

  if [ $? -ne 0 ]; then
    print_error "Failed to generate anchor peer update for RegulatorOrg"
    exit 1
  fi
  print_success "RegulatorOrg anchor peer update generated"
}

# ---------------------------------------------------------------------------
# Step 3: Start Docker Containers
# ---------------------------------------------------------------------------
start_containers() {
  print_header "Starting Docker Containers"

  print_step "Starting Fabric network containers..."
  docker-compose -f "$COMPOSE_FILE" up -d

  if [ $? -ne 0 ]; then
    print_error "Failed to start docker containers"
    exit 1
  fi

  print_success "Docker containers started"
  print_step "Waiting for containers to stabilize (${CLI_DELAY}s)..."
  sleep "$CLI_DELAY"
}

# ---------------------------------------------------------------------------
# Step 4: Create Channel
# ---------------------------------------------------------------------------
create_channel() {
  print_header "Creating Channel: $CHANNEL_NAME"

  local ORDERER_CA="$CRYPTO_OUTPUT/ordererOrganizations/smartseed.com/orderers/orderer.smartseed.com/msp/tlscacerts/tlsca.smartseed.com-cert.pem"
  local MANUFACTURER_MSP="$CRYPTO_OUTPUT/peerOrganizations/manufacturer.smartseed.com/users/Admin@manufacturer.smartseed.com/msp"

  print_step "Creating channel..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.smartseed.com/users/Admin@manufacturer.smartseed.com/msp \
    -e CORE_PEER_ADDRESS=peer0.manufacturer.smartseed.com:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.smartseed.com/peers/peer0.manufacturer.smartseed.com/tls/ca.crt \
    peer0.manufacturer.smartseed.com peer channel create \
      -o orderer.smartseed.com:7050 \
      -c "$CHANNEL_NAME" \
      -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.tx \
      --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block \
      --tls \
      --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/smartseed.com/orderers/orderer.smartseed.com/msp/tlscacerts/tlsca.smartseed.com-cert.pem

  if [ $? -ne 0 ]; then
    print_error "Failed to create channel"
    exit 1
  fi
  print_success "Channel '$CHANNEL_NAME' created"
}

# ---------------------------------------------------------------------------
# Step 5: Join Peers to Channel
# ---------------------------------------------------------------------------
join_channel() {
  print_header "Joining Peers to Channel"

  # Join Manufacturer peer
  print_step "Joining peer0.manufacturer to channel..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.smartseed.com/users/Admin@manufacturer.smartseed.com/msp \
    -e CORE_PEER_ADDRESS=peer0.manufacturer.smartseed.com:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.smartseed.com/peers/peer0.manufacturer.smartseed.com/tls/ca.crt \
    peer0.manufacturer.smartseed.com peer channel join \
      -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block

  if [ $? -ne 0 ]; then
    print_error "Failed to join peer0.manufacturer to channel"
    exit 1
  fi
  print_success "peer0.manufacturer joined channel"

  # Join Regulator peer
  print_step "Joining peer0.regulator to channel..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=RegulatorMSP \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.smartseed.com/users/Admin@regulator.smartseed.com/msp \
    -e CORE_PEER_ADDRESS=peer0.regulator.smartseed.com:9051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.smartseed.com/peers/peer0.regulator.smartseed.com/tls/ca.crt \
    peer0.regulator.smartseed.com peer channel join \
      -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block

  if [ $? -ne 0 ]; then
    print_error "Failed to join peer0.regulator to channel"
    exit 1
  fi
  print_success "peer0.regulator joined channel"
}

# ---------------------------------------------------------------------------
# Step 6: Update Anchor Peers
# ---------------------------------------------------------------------------
update_anchor_peers() {
  print_header "Updating Anchor Peers"

  # Update anchor peer for ManufacturerOrg
  print_step "Updating anchor peer for ManufacturerOrg..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.smartseed.com/users/Admin@manufacturer.smartseed.com/msp \
    -e CORE_PEER_ADDRESS=peer0.manufacturer.smartseed.com:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.smartseed.com/peers/peer0.manufacturer.smartseed.com/tls/ca.crt \
    peer0.manufacturer.smartseed.com peer channel update \
      -o orderer.smartseed.com:7050 \
      -c "$CHANNEL_NAME" \
      -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/ManufacturerMSPanchors.tx \
      --tls \
      --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/smartseed.com/orderers/orderer.smartseed.com/msp/tlscacerts/tlsca.smartseed.com-cert.pem

  if [ $? -ne 0 ]; then
    print_error "Failed to update anchor peer for ManufacturerOrg"
    exit 1
  fi
  print_success "ManufacturerOrg anchor peer updated"

  # Update anchor peer for RegulatorOrg
  print_step "Updating anchor peer for RegulatorOrg..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=RegulatorMSP \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.smartseed.com/users/Admin@regulator.smartseed.com/msp \
    -e CORE_PEER_ADDRESS=peer0.regulator.smartseed.com:9051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.smartseed.com/peers/peer0.regulator.smartseed.com/tls/ca.crt \
    peer0.regulator.smartseed.com peer channel update \
      -o orderer.smartseed.com:7050 \
      -c "$CHANNEL_NAME" \
      -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/RegulatorMSPanchors.tx \
      --tls \
      --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/smartseed.com/orderers/orderer.smartseed.com/msp/tlscacerts/tlsca.smartseed.com-cert.pem

  if [ $? -ne 0 ]; then
    print_error "Failed to update anchor peer for RegulatorOrg"
    exit 1
  fi
  print_success "RegulatorOrg anchor peer updated"
}

# ---------------------------------------------------------------------------
# Main Execution
# ---------------------------------------------------------------------------
main() {
  print_header "SmartSeed Fabric Network - Startup"

  check_prerequisites
  generate_crypto
  generate_channel_artifacts
  start_containers
  create_channel
  join_channel
  update_anchor_peers

  echo ""
  echo -e "${GREEN}============================================================${NC}"
  echo -e "${GREEN}  SmartSeed Fabric Network Started Successfully!${NC}"
  echo -e "${GREEN}============================================================${NC}"
  echo ""
  echo -e "${CYAN}  Channel:     ${NC}$CHANNEL_NAME"
  echo -e "${CYAN}  Orderer:     ${NC}orderer.smartseed.com:7050"
  echo -e "${CYAN}  Peer (Mfg):  ${NC}peer0.manufacturer.smartseed.com:7051"
  echo -e "${CYAN}  Peer (Reg):  ${NC}peer0.regulator.smartseed.com:9051"
  echo -e "${CYAN}  CA (Mfg):    ${NC}ca.manufacturer.smartseed.com:7054"
  echo -e "${CYAN}  CA (Reg):    ${NC}ca.regulator.smartseed.com:8054"
  echo -e "${CYAN}  CouchDB 0:   ${NC}http://localhost:5984/_utils"
  echo -e "${CYAN}  CouchDB 1:   ${NC}http://localhost:6984/_utils"
  echo ""
}

main "$@"
