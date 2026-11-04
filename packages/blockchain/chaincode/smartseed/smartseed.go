// SmartSeed Blockchain — Chaincode for Hyperledger Fabric 2.5
//
// This chaincode manages the lifecycle of seed products, batches, transfers,
// verifications, and counterfeit reports on an immutable ledger.

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// -------------------------------------------------------------------------
// Data Structures
// -------------------------------------------------------------------------

// SmartSeedContract implements the Fabric ContractInterface.
type SmartSeedContract struct {
	contractapi.Contract
}

// ProductRecord stores product metadata on the ledger.
type ProductRecord struct {
	DocType      string `json:"docType"`
	ProductID    string `json:"productId"`
	TenantID     string `json:"tenantId"`
	Name         string `json:"name"`
	BrandName    string `json:"brandName"`
	CropType     string `json:"cropType"`
	SeedVariety  string `json:"seedVariety"`
	RecordHash   string `json:"recordHash"`
	RegisteredAt string `json:"registeredAt"`
	RegisteredBy string `json:"registeredBy"`
}

// BatchRecord stores seed batch data on the ledger.
type BatchRecord struct {
	DocType           string `json:"docType"`
	BatchID           string `json:"batchId"`
	ProductID         string `json:"productId"`
	TenantID          string `json:"tenantId"`
	BatchNumber       string `json:"batchNumber"`
	ManufacturingDate string `json:"manufacturingDate"`
	ExpiryDate        string `json:"expiryDate"`
	InitialQuantity   int    `json:"initialQuantity"`
	CurrentQuantity   int    `json:"currentQuantity"`
	Status            string `json:"status"`
	RecordHash        string `json:"recordHash"`
	RegisteredAt      string `json:"registeredAt"`
	RegisteredBy      string `json:"registeredBy"`
	PreviousTxID      string `json:"previousTxId"`
}

// TransferRecord stores a product transfer event.
type TransferRecord struct {
	DocType      string `json:"docType"`
	TransferID   string `json:"transferId"`
	BatchID      string `json:"batchId"`
	TenantID     string `json:"tenantId"`
	SenderID     string `json:"senderId"`
	SenderRole   string `json:"senderRole"`
	ReceiverID   string `json:"receiverId"`
	ReceiverRole string `json:"receiverRole"`
	Quantity     int    `json:"quantity"`
	Status       string `json:"status"`
	RecordHash   string `json:"recordHash"`
	Timestamp    string `json:"timestamp"`
	PreviousTxID string `json:"previousTxId"`
}

// VerificationRecord stores a QR verification event.
type VerificationRecord struct {
	DocType        string `json:"docType"`
	VerificationID string `json:"verificationId"`
	BatchID        string `json:"batchId"`
	TenantID       string `json:"tenantId"`
	VerifiedBy     string `json:"verifiedBy"`
	Location       string `json:"location"`
	Result         string `json:"result"`
	RecordHash     string `json:"recordHash"`
	Timestamp      string `json:"timestamp"`
}

// CounterfeitReport stores a counterfeit report on the ledger.
type CounterfeitReport struct {
	DocType    string `json:"docType"`
	ReportID   string `json:"reportId"`
	BatchID    string `json:"batchId"`
	TenantID   string `json:"tenantId"`
	ReportedBy string `json:"reportedBy"`
	Reason     string `json:"reason"`
	RecordHash string `json:"recordHash"`
	Timestamp  string `json:"timestamp"`
}

// ProvenanceResult aggregates all records for a batch.
type ProvenanceResult struct {
	Batch         *BatchRecord          `json:"batch"`
	Transfers     []*TransferRecord     `json:"transfers"`
	Verifications []*VerificationRecord `json:"verifications"`
	Reports       []*CounterfeitReport  `json:"reports"`
}

// -------------------------------------------------------------------------
// Product Functions
// -------------------------------------------------------------------------

// RegisterProduct creates a new product record on the ledger.
func (s *SmartSeedContract) RegisterProduct(
	ctx contractapi.TransactionContextInterface,
	productID, tenantID, name, brandName, cropType, seedVariety, recordHash string,
) error {
	if productID == "" || tenantID == "" || name == "" || recordHash == "" {
		return fmt.Errorf("productID, tenantID, name, and recordHash are required")
	}

	exists, err := s.recordExists(ctx, productID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("product %s already exists", productID)
	}

	txTime, _ := ctx.GetStub().GetTxTimestamp()
	ts := time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)

	clientID, _ := ctx.GetClientIdentity().GetID()

	record := ProductRecord{
		DocType:      "product",
		ProductID:    productID,
		TenantID:     tenantID,
		Name:         name,
		BrandName:    brandName,
		CropType:     cropType,
		SeedVariety:  seedVariety,
		RecordHash:   recordHash,
		RegisteredAt: ts,
		RegisteredBy: clientID,
	}

	data, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal product: %v", err)
	}
	return ctx.GetStub().PutState(productID, data)
}

// GetProduct returns a product record by ID.
func (s *SmartSeedContract) GetProduct(
	ctx contractapi.TransactionContextInterface,
	productID string,
) (*ProductRecord, error) {
	data, err := ctx.GetStub().GetState(productID)
	if err != nil {
		return nil, fmt.Errorf("failed to read product %s: %v", productID, err)
	}
	if data == nil {
		return nil, fmt.Errorf("product %s does not exist", productID)
	}

	var record ProductRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("failed to unmarshal product: %v", err)
	}
	return &record, nil
}

// GetProductsByTenant returns all products belonging to a tenant.
func (s *SmartSeedContract) GetProductsByTenant(
	ctx contractapi.TransactionContextInterface,
	tenantID string,
) ([]*ProductRecord, error) {
	query := fmt.Sprintf(`{"selector":{"docType":"product","tenantId":"%s"}}`, tenantID)
	return queryProducts(ctx, query)
}

// -------------------------------------------------------------------------
// Batch Functions
// -------------------------------------------------------------------------

// RegisterBatch creates a new seed batch on the ledger.
func (s *SmartSeedContract) RegisterBatch(
	ctx contractapi.TransactionContextInterface,
	batchID, productID, tenantID, batchNumber, mfgDate, expiryDate string,
	quantity int,
	recordHash string,
) error {
	if batchID == "" || productID == "" || tenantID == "" || batchNumber == "" || recordHash == "" {
		return fmt.Errorf("batchID, productID, tenantID, batchNumber, and recordHash are required")
	}
	if quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}

	exists, err := s.recordExists(ctx, batchID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("batch %s already exists", batchID)
	}

	txTime, _ := ctx.GetStub().GetTxTimestamp()
	ts := time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)
	clientID, _ := ctx.GetClientIdentity().GetID()

	record := BatchRecord{
		DocType:           "batch",
		BatchID:           batchID,
		ProductID:         productID,
		TenantID:          tenantID,
		BatchNumber:       batchNumber,
		ManufacturingDate: mfgDate,
		ExpiryDate:        expiryDate,
		InitialQuantity:   quantity,
		CurrentQuantity:   quantity,
		Status:            "registered",
		RecordHash:        recordHash,
		RegisteredAt:      ts,
		RegisteredBy:      clientID,
		PreviousTxID:      "",
	}

	data, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %v", err)
	}
	return ctx.GetStub().PutState(batchID, data)
}

// GetBatch returns a batch record by ID.
func (s *SmartSeedContract) GetBatch(
	ctx contractapi.TransactionContextInterface,
	batchID string,
) (*BatchRecord, error) {
	data, err := ctx.GetStub().GetState(batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to read batch %s: %v", batchID, err)
	}
	if data == nil {
		return nil, fmt.Errorf("batch %s does not exist", batchID)
	}

	var record BatchRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("failed to unmarshal batch: %v", err)
	}
	return &record, nil
}

// UpdateBatchStatus changes the status of a batch.
func (s *SmartSeedContract) UpdateBatchStatus(
	ctx contractapi.TransactionContextInterface,
	batchID, newStatus, recordHash string,
) error {
	batch, err := s.GetBatch(ctx, batchID)
	if err != nil {
		return err
	}

	batch.Status = newStatus
	batch.RecordHash = recordHash
	batch.PreviousTxID = ctx.GetStub().GetTxID()

	data, err := json.Marshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %v", err)
	}
	return ctx.GetStub().PutState(batchID, data)
}

// GetBatchesByProduct returns all batches for a product.
func (s *SmartSeedContract) GetBatchesByProduct(
	ctx contractapi.TransactionContextInterface,
	productID string,
) ([]*BatchRecord, error) {
	query := fmt.Sprintf(`{"selector":{"docType":"batch","productId":"%s"}}`, productID)
	return queryBatches(ctx, query)
}

// GetBatchesByTenant returns all batches for a tenant.
func (s *SmartSeedContract) GetBatchesByTenant(
	ctx contractapi.TransactionContextInterface,
	tenantID string,
) ([]*BatchRecord, error) {
	query := fmt.Sprintf(`{"selector":{"docType":"batch","tenantId":"%s"}}`, tenantID)
	return queryBatches(ctx, query)
}

// -------------------------------------------------------------------------
// Transfer Functions
// -------------------------------------------------------------------------

// RecordTransfer creates a transfer record and updates batch quantity.
func (s *SmartSeedContract) RecordTransfer(
	ctx contractapi.TransactionContextInterface,
	transferID, batchID, tenantID, senderID, senderRole, receiverID, receiverRole string,
	quantity int,
	recordHash string,
) error {
	if transferID == "" || batchID == "" || tenantID == "" || senderID == "" || receiverID == "" || recordHash == "" {
		return fmt.Errorf("all transfer fields are required")
	}
	if quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}

	// Validate batch exists and has sufficient quantity
	batch, err := s.GetBatch(ctx, batchID)
	if err != nil {
		return fmt.Errorf("batch validation failed: %v", err)
	}
	if batch.CurrentQuantity < quantity {
		return fmt.Errorf("insufficient batch quantity: available %d, requested %d", batch.CurrentQuantity, quantity)
	}

	exists, err := s.recordExists(ctx, transferID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("transfer %s already exists", transferID)
	}

	txTime, _ := ctx.GetStub().GetTxTimestamp()
	ts := time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)

	// Update batch quantity
	batch.CurrentQuantity -= quantity
	if batch.CurrentQuantity == 0 {
		batch.Status = "fully_dispatched"
	} else {
		batch.Status = "partially_dispatched"
	}
	batch.PreviousTxID = ctx.GetStub().GetTxID()
	batch.RecordHash = recordHash

	batchData, err := json.Marshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %v", err)
	}
	if err := ctx.GetStub().PutState(batchID, batchData); err != nil {
		return fmt.Errorf("failed to update batch: %v", err)
	}

	// Create transfer record
	transfer := TransferRecord{
		DocType:      "transfer",
		TransferID:   transferID,
		BatchID:      batchID,
		TenantID:     tenantID,
		SenderID:     senderID,
		SenderRole:   senderRole,
		ReceiverID:   receiverID,
		ReceiverRole: receiverRole,
		Quantity:     quantity,
		Status:       "initiated",
		RecordHash:   recordHash,
		Timestamp:    ts,
		PreviousTxID: ctx.GetStub().GetTxID(),
	}

	transferData, err := json.Marshal(transfer)
	if err != nil {
		return fmt.Errorf("failed to marshal transfer: %v", err)
	}
	return ctx.GetStub().PutState(transferID, transferData)
}

// AcceptTransfer marks a transfer as received.
func (s *SmartSeedContract) AcceptTransfer(
	ctx contractapi.TransactionContextInterface,
	transferID, recordHash string,
) error {
	transfer, err := s.getTransfer(ctx, transferID)
	if err != nil {
		return err
	}
	if transfer.Status != "initiated" && transfer.Status != "dispatched" {
		return fmt.Errorf("transfer %s cannot be accepted in status %s", transferID, transfer.Status)
	}

	transfer.Status = "received"
	transfer.RecordHash = recordHash
	transfer.PreviousTxID = ctx.GetStub().GetTxID()

	data, err := json.Marshal(transfer)
	if err != nil {
		return fmt.Errorf("failed to marshal transfer: %v", err)
	}
	return ctx.GetStub().PutState(transferID, data)
}

// RejectTransfer marks a transfer as rejected and restores batch quantity.
func (s *SmartSeedContract) RejectTransfer(
	ctx contractapi.TransactionContextInterface,
	transferID, reason, recordHash string,
) error {
	transfer, err := s.getTransfer(ctx, transferID)
	if err != nil {
		return err
	}
	if transfer.Status != "initiated" && transfer.Status != "dispatched" {
		return fmt.Errorf("transfer %s cannot be rejected in status %s", transferID, transfer.Status)
	}

	// Restore batch quantity
	batch, err := s.GetBatch(ctx, transfer.BatchID)
	if err != nil {
		return fmt.Errorf("failed to read batch for quantity restore: %v", err)
	}
	batch.CurrentQuantity += transfer.Quantity
	if batch.CurrentQuantity >= batch.InitialQuantity {
		batch.Status = "in_inventory"
	} else {
		batch.Status = "partially_dispatched"
	}
	batch.PreviousTxID = ctx.GetStub().GetTxID()

	batchData, err := json.Marshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %v", err)
	}
	if err := ctx.GetStub().PutState(transfer.BatchID, batchData); err != nil {
		return fmt.Errorf("failed to restore batch quantity: %v", err)
	}

	transfer.Status = "rejected"
	transfer.RecordHash = recordHash
	transfer.PreviousTxID = ctx.GetStub().GetTxID()

	data, err := json.Marshal(transfer)
	if err != nil {
		return fmt.Errorf("failed to marshal transfer: %v", err)
	}
	return ctx.GetStub().PutState(transferID, data)
}

// GetTransfer returns a transfer by ID.
func (s *SmartSeedContract) GetTransfer(
	ctx contractapi.TransactionContextInterface,
	transferID string,
) (*TransferRecord, error) {
	return s.getTransfer(ctx, transferID)
}

// GetTransfersByBatch returns all transfers for a batch.
func (s *SmartSeedContract) GetTransfersByBatch(
	ctx contractapi.TransactionContextInterface,
	batchID string,
) ([]*TransferRecord, error) {
	query := fmt.Sprintf(`{"selector":{"docType":"transfer","batchId":"%s"}}`, batchID)
	return queryTransfers(ctx, query)
}

// -------------------------------------------------------------------------
// Verification Functions
// -------------------------------------------------------------------------

// RecordVerification logs a QR code verification event.
func (s *SmartSeedContract) RecordVerification(
	ctx contractapi.TransactionContextInterface,
	verificationID, batchID, tenantID, verifiedBy, location, result, recordHash string,
) error {
	if verificationID == "" || batchID == "" || tenantID == "" || recordHash == "" {
		return fmt.Errorf("verificationID, batchID, tenantID, and recordHash are required")
	}

	txTime, _ := ctx.GetStub().GetTxTimestamp()
	ts := time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)

	record := VerificationRecord{
		DocType:        "verification",
		VerificationID: verificationID,
		BatchID:        batchID,
		TenantID:       tenantID,
		VerifiedBy:     verifiedBy,
		Location:       location,
		Result:         result,
		RecordHash:     recordHash,
		Timestamp:      ts,
	}

	data, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal verification: %v", err)
	}
	return ctx.GetStub().PutState(verificationID, data)
}

// GetVerificationsByBatch returns all verification records for a batch.
func (s *SmartSeedContract) GetVerificationsByBatch(
	ctx contractapi.TransactionContextInterface,
	batchID string,
) ([]*VerificationRecord, error) {
	query := fmt.Sprintf(`{"selector":{"docType":"verification","batchId":"%s"}}`, batchID)
	iter, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("query failed: %v", err)
	}
	defer iter.Close()

	var results []*VerificationRecord
	for iter.HasNext() {
		kv, err := iter.Next()
		if err != nil {
			return nil, err
		}
		var record VerificationRecord
		if err := json.Unmarshal(kv.Value, &record); err != nil {
			continue
		}
		results = append(results, &record)
	}
	return results, nil
}

// -------------------------------------------------------------------------
// Counterfeit Report Functions
// -------------------------------------------------------------------------

// RecordCounterfeitReport logs a counterfeit report and flags the batch.
func (s *SmartSeedContract) RecordCounterfeitReport(
	ctx contractapi.TransactionContextInterface,
	reportID, batchID, tenantID, reportedBy, reason, recordHash string,
) error {
	if reportID == "" || batchID == "" || tenantID == "" || reason == "" || recordHash == "" {
		return fmt.Errorf("reportID, batchID, tenantID, reason, and recordHash are required")
	}

	txTime, _ := ctx.GetStub().GetTxTimestamp()
	ts := time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)

	report := CounterfeitReport{
		DocType:    "counterfeit_report",
		ReportID:   reportID,
		BatchID:    batchID,
		TenantID:   tenantID,
		ReportedBy: reportedBy,
		Reason:     reason,
		RecordHash: recordHash,
		Timestamp:  ts,
	}

	data, err := json.Marshal(report)
	if err != nil {
		return fmt.Errorf("failed to marshal counterfeit report: %v", err)
	}
	if err := ctx.GetStub().PutState(reportID, data); err != nil {
		return err
	}

	// Flag the batch as under investigation
	batch, err := s.GetBatch(ctx, batchID)
	if err == nil && batch.Status != "under_investigation" {
		batch.Status = "under_investigation"
		batch.PreviousTxID = ctx.GetStub().GetTxID()
		batchData, _ := json.Marshal(batch)
		_ = ctx.GetStub().PutState(batchID, batchData)
	}

	return nil
}

// GetCounterfeitReportsByBatch returns all counterfeit reports for a batch.
func (s *SmartSeedContract) GetCounterfeitReportsByBatch(
	ctx contractapi.TransactionContextInterface,
	batchID string,
) ([]*CounterfeitReport, error) {
	query := fmt.Sprintf(`{"selector":{"docType":"counterfeit_report","batchId":"%s"}}`, batchID)
	iter, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("query failed: %v", err)
	}
	defer iter.Close()

	var results []*CounterfeitReport
	for iter.HasNext() {
		kv, err := iter.Next()
		if err != nil {
			return nil, err
		}
		var record CounterfeitReport
		if err := json.Unmarshal(kv.Value, &record); err != nil {
			continue
		}
		results = append(results, &record)
	}
	return results, nil
}

// -------------------------------------------------------------------------
// Provenance Functions
// -------------------------------------------------------------------------

// GetBatchProvenance returns the complete supply chain history for a batch.
func (s *SmartSeedContract) GetBatchProvenance(
	ctx contractapi.TransactionContextInterface,
	batchID string,
) (*ProvenanceResult, error) {
	batch, err := s.GetBatch(ctx, batchID)
	if err != nil {
		return nil, err
	}

	transfers, err := s.GetTransfersByBatch(ctx, batchID)
	if err != nil {
		transfers = []*TransferRecord{}
	}

	verifications, err := s.GetVerificationsByBatch(ctx, batchID)
	if err != nil {
		verifications = []*VerificationRecord{}
	}

	reports, err := s.GetCounterfeitReportsByBatch(ctx, batchID)
	if err != nil {
		reports = []*CounterfeitReport{}
	}

	return &ProvenanceResult{
		Batch:         batch,
		Transfers:     transfers,
		Verifications: verifications,
		Reports:       reports,
	}, nil
}

// GetBatchHistory returns the state change history for a batch key.
func (s *SmartSeedContract) GetBatchHistory(
	ctx contractapi.TransactionContextInterface,
	batchID string,
) ([]map[string]interface{}, error) {
	iter, err := ctx.GetStub().GetHistoryForKey(batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to get history for %s: %v", batchID, err)
	}
	defer iter.Close()

	var history []map[string]interface{}
	for iter.HasNext() {
		mod, err := iter.Next()
		if err != nil {
			return nil, err
		}

		entry := map[string]interface{}{
			"txId":      mod.TxId,
			"timestamp": time.Unix(mod.Timestamp.Seconds, int64(mod.Timestamp.Nanos)).UTC().Format(time.RFC3339),
			"isDelete":  mod.IsDelete,
		}

		if !mod.IsDelete && mod.Value != nil {
			var record map[string]interface{}
			if err := json.Unmarshal(mod.Value, &record); err == nil {
				entry["value"] = record
			}
		}

		history = append(history, entry)
	}
	return history, nil
}

// -------------------------------------------------------------------------
// Internal Helpers
// -------------------------------------------------------------------------

func (s *SmartSeedContract) recordExists(ctx contractapi.TransactionContextInterface, key string) (bool, error) {
	data, err := ctx.GetStub().GetState(key)
	if err != nil {
		return false, fmt.Errorf("failed to read state for %s: %v", key, err)
	}
	return data != nil, nil
}

func (s *SmartSeedContract) getTransfer(ctx contractapi.TransactionContextInterface, transferID string) (*TransferRecord, error) {
	data, err := ctx.GetStub().GetState(transferID)
	if err != nil {
		return nil, fmt.Errorf("failed to read transfer %s: %v", transferID, err)
	}
	if data == nil {
		return nil, fmt.Errorf("transfer %s does not exist", transferID)
	}
	var record TransferRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transfer: %v", err)
	}
	return &record, nil
}

func queryProducts(ctx contractapi.TransactionContextInterface, query string) ([]*ProductRecord, error) {
	iter, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("query failed: %v", err)
	}
	defer iter.Close()

	var results []*ProductRecord
	for iter.HasNext() {
		kv, err := iter.Next()
		if err != nil {
			return nil, err
		}
		var record ProductRecord
		if err := json.Unmarshal(kv.Value, &record); err != nil {
			continue
		}
		results = append(results, &record)
	}
	return results, nil
}

func queryBatches(ctx contractapi.TransactionContextInterface, query string) ([]*BatchRecord, error) {
	iter, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("query failed: %v", err)
	}
	defer iter.Close()

	var results []*BatchRecord
	for iter.HasNext() {
		kv, err := iter.Next()
		if err != nil {
			return nil, err
		}
		var record BatchRecord
		if err := json.Unmarshal(kv.Value, &record); err != nil {
			continue
		}
		results = append(results, &record)
	}
	return results, nil
}

func queryTransfers(ctx contractapi.TransactionContextInterface, query string) ([]*TransferRecord, error) {
	iter, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("query failed: %v", err)
	}
	defer iter.Close()

	var results []*TransferRecord
	for iter.HasNext() {
		kv, err := iter.Next()
		if err != nil {
			return nil, err
		}
		var record TransferRecord
		if err := json.Unmarshal(kv.Value, &record); err != nil {
			continue
		}
		results = append(results, &record)
	}
	return results, nil
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartSeedContract{})
	if err != nil {
		log.Fatalf("Error creating SmartSeed chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Fatalf("Error starting SmartSeed chaincode: %v", err)
	}
}

