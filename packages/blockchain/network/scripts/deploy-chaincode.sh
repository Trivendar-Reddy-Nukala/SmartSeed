#!/bin/bash
# =============================================================================
# SmartSeed Fabric Network - Deploy Chaincode Script
# Uses Fabric 2.x lifecycle to package, install, approve, and commit chaincode
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
CHANNEL_NAME="smartseedchannel"
CHAINCODE_NAME="smartseed"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE=1
CHAINCODE_PATH="../../chaincode/smartseed"
CHAINCODE_LANG="golang"
PACKAGE_NAME="${CHAINCODE_NAME}.tar.gz"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# TLS and crypto paths (inside containers)
ORDERER_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/smartseed.com/orderers/orderer.smartseed.com/msp/tlscacerts/tlsca.smartseed.com-cert.pem"
MANUFACTURER_MSP_PATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.smartseed.com/users/Admin@manufacturer.smartseed.com/msp"
MANUFACTURER_TLS_ROOTCERT="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/manufacturer.smartseed.com/peers/peer0.manufacturer.smartseed.com/tls/ca.crt"
REGULATOR_MSP_PATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.smartseed.com/users/Admin@regulator.smartseed.com/msp"
REGULATOR_TLS_ROOTCERT="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulator.smartseed.com/peers/peer0.regulator.smartseed.com/tls/ca.crt"

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

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Set peer environment for Manufacturer
set_manufacturer_env() {
  export CORE_PEER_LOCALMSPID="ManufacturerMSP"
  export CORE_PEER_MSPCONFIGPATH="$MANUFACTURER_MSP_PATH"
  export CORE_PEER_ADDRESS="peer0.manufacturer.smartseed.com:7051"
  export CORE_PEER_TLS_ENABLED="true"
  export CORE_PEER_TLS_ROOTCERT_FILE="$MANUFACTURER_TLS_ROOTCERT"
}

# Set peer environment for Regulator
set_regulator_env() {
  export CORE_PEER_LOCALMSPID="RegulatorMSP"
  export CORE_PEER_MSPCONFIGPATH="$REGULATOR_MSP_PATH"
  export CORE_PEER_ADDRESS="peer0.regulator.smartseed.com:9051"
  export CORE_PEER_TLS_ENABLED="true"
  export CORE_PEER_TLS_ROOTCERT_FILE="$REGULATOR_TLS_ROOTCERT"
}

# ---------------------------------------------------------------------------
# Step 1: Package Chaincode
# ---------------------------------------------------------------------------
package_chaincode() {
  print_header "Packaging Chaincode"

  print_step "Packaging chaincode '${CHAINCODE_NAME}' v${CHAINCODE_VERSION}..."

  docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH="$MANUFACTURER_MSP_PATH" \
    peer0.manufacturer.smartseed.com peer lifecycle chaincode package \
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/${PACKAGE_NAME}" \
      --path "$CHAINCODE_PATH" \
      --lang "$CHAINCODE_LANG" \
      --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"

  if [ $? -ne 0 ]; then
    print_error "Failed to package chaincode"
    exit 1
  fi
  print_success "Chaincode packaged as ${PACKAGE_NAME}"
}

# ---------------------------------------------------------------------------
# Step 2: Install Chaincode on Both Peers
# ---------------------------------------------------------------------------
install_chaincode() {
  print_header "Installing Chaincode on Peers"

  # Install on Manufacturer peer
  print_step "Installing on peer0.manufacturer..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH="$MANUFACTURER_MSP_PATH" \
    -e CORE_PEER_ADDRESS=peer0.manufacturer.smartseed.com:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$MANUFACTURER_TLS_ROOTCERT" \
    peer0.manufacturer.smartseed.com peer lifecycle chaincode install \
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/${PACKAGE_NAME}"

  if [ $? -ne 0 ]; then
    print_error "Failed to install chaincode on peer0.manufacturer"
    exit 1
  fi
  print_success "Chaincode installed on peer0.manufacturer"

  # Install on Regulator peer
  print_step "Installing on peer0.regulator..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=RegulatorMSP \
    -e CORE_PEER_MSPCONFIGPATH="$REGULATOR_MSP_PATH" \
    -e CORE_PEER_ADDRESS=peer0.regulator.smartseed.com:9051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$REGULATOR_TLS_ROOTCERT" \
    peer0.regulator.smartseed.com peer lifecycle chaincode install \
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/${PACKAGE_NAME}"

  if [ $? -ne 0 ]; then
    print_error "Failed to install chaincode on peer0.regulator"
    exit 1
  fi
  print_success "Chaincode installed on peer0.regulator"

  # Get package ID
  print_step "Querying installed chaincode package ID..."
  PACKAGE_ID=$(docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH="$MANUFACTURER_MSP_PATH" \
    -e CORE_PEER_ADDRESS=peer0.manufacturer.smartseed.com:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$MANUFACTURER_TLS_ROOTCERT" \
    peer0.manufacturer.smartseed.com peer lifecycle chaincode queryinstalled \
      --output json | jq -r ".installed_chaincodes[] | select(.label==\"${CHAINCODE_NAME}_${CHAINCODE_VERSION}\") | .package_id")

  if [ -z "$PACKAGE_ID" ]; then
    print_error "Failed to get package ID"
    exit 1
  fi
  print_success "Package ID: ${PACKAGE_ID}"
}

# ---------------------------------------------------------------------------
# Step 3: Approve Chaincode for Both Orgs
# ---------------------------------------------------------------------------
approve_chaincode() {
  print_header "Approving Chaincode for Organizations"

  # Approve for ManufacturerOrg
  print_step "Approving for ManufacturerOrg..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH="$MANUFACTURER_MSP_PATH" \
    -e CORE_PEER_ADDRESS=peer0.manufacturer.smartseed.com:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$MANUFACTURER_TLS_ROOTCERT" \
    peer0.manufacturer.smartseed.com peer lifecycle chaincode approveformyorg \
      -o orderer.smartseed.com:7050 \
      --channelID "$CHANNEL_NAME" \
      --name "$CHAINCODE_NAME" \
      --version "$CHAINCODE_VERSION" \
      --package-id "$PACKAGE_ID" \
      --sequence "$CHAINCODE_SEQUENCE" \
      --tls \
      --cafile "$ORDERER_CA"

  if [ $? -ne 0 ]; then
    print_error "Failed to approve chaincode for ManufacturerOrg"
    exit 1
  fi
  print_success "Chaincode approved for ManufacturerOrg"

  # Approve for RegulatorOrg
  print_step "Approving for RegulatorOrg..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=RegulatorMSP \
    -e CORE_PEER_MSPCONFIGPATH="$REGULATOR_MSP_PATH" \
    -e CORE_PEER_ADDRESS=peer0.regulator.smartseed.com:9051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$REGULATOR_TLS_ROOTCERT" \
    peer0.regulator.smartseed.com peer lifecycle chaincode approveformyorg \
      -o orderer.smartseed.com:7050 \
      --channelID "$CHANNEL_NAME" \
      --name "$CHAINCODE_NAME" \
      --version "$CHAINCODE_VERSION" \
      --package-id "$PACKAGE_ID" \
      --sequence "$CHAINCODE_SEQUENCE" \
      --tls \
      --cafile "$ORDERER_CA"

  if [ $? -ne 0 ]; then
    print_error "Failed to approve chaincode for RegulatorOrg"
    exit 1
  fi
  print_success "Chaincode approved for RegulatorOrg"
}

# ---------------------------------------------------------------------------
# Step 4: Commit Chaincode Definition
# ---------------------------------------------------------------------------
commit_chaincode() {
  print_header "Committing Chaincode Definition"

  # Check commit readiness
  print_step "Checking commit readiness..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH="$MANUFACTURER_MSP_PATH" \
    -e CORE_PEER_ADDRESS=peer0.manufacturer.smartseed.com:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$MANUFACTURER_TLS_ROOTCERT" \
    peer0.manufacturer.smartseed.com peer lifecycle chaincode checkcommitreadiness \
      --channelID "$CHANNEL_NAME" \
      --name "$CHAINCODE_NAME" \
      --version "$CHAINCODE_VERSION" \
      --sequence "$CHAINCODE_SEQUENCE" \
      --tls \
      --cafile "$ORDERER_CA" \
      --output json

  # Commit
  print_step "Committing chaincode definition to channel..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH="$MANUFACTURER_MSP_PATH" \
    -e CORE_PEER_ADDRESS=peer0.manufacturer.smartseed.com:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$MANUFACTURER_TLS_ROOTCERT" \
    peer0.manufacturer.smartseed.com peer lifecycle chaincode commit \
      -o orderer.smartseed.com:7050 \
      --channelID "$CHANNEL_NAME" \
      --name "$CHAINCODE_NAME" \
      --version "$CHAINCODE_VERSION" \
      --sequence "$CHAINCODE_SEQUENCE" \
      --tls \
      --cafile "$ORDERER_CA" \
      --peerAddresses peer0.manufacturer.smartseed.com:7051 \
      --tlsRootCertFiles "$MANUFACTURER_TLS_ROOTCERT" \
      --peerAddresses peer0.regulator.smartseed.com:9051 \
      --tlsRootCertFiles "$REGULATOR_TLS_ROOTCERT"

  if [ $? -ne 0 ]; then
    print_error "Failed to commit chaincode definition"
    exit 1
  fi
  print_success "Chaincode definition committed"
}

# ---------------------------------------------------------------------------
# Step 5: Verify Commit
# ---------------------------------------------------------------------------
verify_commit() {
  print_header "Verifying Chaincode Commit"

  print_step "Querying committed chaincode on channel..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=ManufacturerMSP \
    -e CORE_PEER_MSPCONFIGPATH="$MANUFACTURER_MSP_PATH" \
    -e CORE_PEER_ADDRESS=peer0.manufacturer.smartseed.com:7051 \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$MANUFACTURER_TLS_ROOTCERT" \
    peer0.manufacturer.smartseed.com peer lifecycle chaincode querycommitted \
      --channelID "$CHANNEL_NAME" \
      --name "$CHAINCODE_NAME" \
      --tls \
      --cafile "$ORDERER_CA"

  if [ $? -ne 0 ]; then
    print_error "Failed to verify chaincode commit"
    exit 1
  fi
  print_success "Chaincode commit verified"
}

# ---------------------------------------------------------------------------
# Main Execution
# ---------------------------------------------------------------------------
main() {
  print_header "SmartSeed Chaincode Deployment"
  echo -e "${CYAN}  Chaincode:  ${NC}${CHAINCODE_NAME}"
  echo -e "${CYAN}  Version:    ${NC}${CHAINCODE_VERSION}"
  echo -e "${CYAN}  Sequence:   ${NC}${CHAINCODE_SEQUENCE}"
  echo -e "${CYAN}  Channel:    ${NC}${CHANNEL_NAME}"
  echo ""

  package_chaincode
  install_chaincode
  approve_chaincode
  commit_chaincode
  verify_commit

  echo ""
  echo -e "${GREEN}============================================================${NC}"
  echo -e "${GREEN}  SmartSeed Chaincode Deployed Successfully!${NC}"
  echo -e "${GREEN}============================================================${NC}"
  echo ""
  echo -e "${CYAN}  Name:      ${NC}${CHAINCODE_NAME}"
  echo -e "${CYAN}  Version:   ${NC}${CHAINCODE_VERSION}"
  echo -e "${CYAN}  Channel:   ${NC}${CHANNEL_NAME}"
  echo -e "${CYAN}  Package:   ${NC}${PACKAGE_ID}"
  echo ""
}

main "$@"
