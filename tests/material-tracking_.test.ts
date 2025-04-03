import { describe, it, expect, beforeEach } from "vitest"

// Mock Clarity environment
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Mock principal
  },
  block: {
    height: 100,
  },
  contracts: {
    materialTracking: {
      registerBatch: (batchId, mineId, mineralType, quantity) => {
        if (mockData.batches[batchId]) {
          return { type: "err", value: 201 } // err-batch-exists
        }
        mockData.batches[batchId] = {
          mineId,
          mineralType,
          quantity,
          extractionDate: mockClarity.block.height,
          currentOwner: mockClarity.tx.sender,
          status: "extracted",
        }
        return { type: "ok", value: true }
      },
      transferBatch: (batchId, recipient, location) => {
        if (!mockData.batches[batchId]) {
          return { type: "err", value: 202 } // err-batch-not-found
        }
        if (mockData.batches[batchId].currentOwner !== mockClarity.tx.sender) {
          return { type: "err", value: 203 } // err-not-owner
        }
        
        // Update batch owner
        mockData.batches[batchId].currentOwner = recipient
        
        // Record transfer
        const transferId = mockData.transferCounter
        mockData.transfers[`${batchId}-${transferId}`] = {
          from: mockClarity.tx.sender,
          to: recipient,
          timestamp: mockClarity.block.height,
          location,
        }
        
        mockData.transferCounter++
        return { type: "ok", value: transferId }
      },
      updateBatchStatus: (batchId, newStatus) => {
        if (!mockData.batches[batchId]) {
          return { type: "err", value: 202 } // err-batch-not-found
        }
        if (mockData.batches[batchId].currentOwner !== mockClarity.tx.sender) {
          return { type: "err", value: 203 } // err-not-owner
        }
        
        mockData.batches[batchId].status = newStatus
        return { type: "ok", value: true }
      },
      getBatchDetails: (batchId) => {
        return mockData.batches[batchId] || null
      },
      getTransferHistory: (batchId, transferId) => {
        return mockData.transfers[`${batchId}-${transferId}`] || null
      },
    },
  },
}

// Mock data store
const mockData = {
  batches: {},
  transfers: {},
  transferCounter: 0,
}

// Reset mock data before each test
beforeEach(() => {
  mockData.batches = {}
  mockData.transfers = {}
  mockData.transferCounter = 0
})

describe("Material Tracking Contract", () => {
  it("should register a new batch", () => {
    const result = mockClarity.contracts.materialTracking.registerBatch("batch001", "mine001", "gold", 1000)
    
    expect(result.type).toBe("ok")
    expect(mockData.batches["batch001"]).toBeDefined()
    expect(mockData.batches["batch001"].mineralType).toBe("gold")
    expect(mockData.batches["batch001"].quantity).toBe(1000)
  })
  
  it("should not register a batch that already exists", () => {
    // Register once
    mockClarity.contracts.materialTracking.registerBatch("batch001", "mine001", "gold", 1000)
    
    // Try to register again
    const result = mockClarity.contracts.materialTracking.registerBatch("batch001", "mine002", "tin", 500)
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(201) // err-batch-exists
  })
  
  it("should transfer a batch to a new owner", () => {
    // First register the batch
    mockClarity.contracts.materialTracking.registerBatch("batch001", "mine001", "gold", 1000)
    
    // Then transfer it
    const newOwner = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const result = mockClarity.contracts.materialTracking.transferBatch("batch001", newOwner, "Processing Facility A")
    
    expect(result.type).toBe("ok")
    expect(mockData.batches["batch001"].currentOwner).toBe(newOwner)
    
    // Check transfer record
    const transferId = result.value
    const transfer = mockData.transfers[`batch001-${transferId}`]
    expect(transfer).toBeDefined()
    expect(transfer.from).toBe(mockClarity.tx.sender)
    expect(transfer.to).toBe(newOwner)
  })
  
  it("should update batch status", () => {
    // First register the batch
    mockClarity.contracts.materialTracking.registerBatch("batch001", "mine001", "gold", 1000)
    
    // Then update its status
    const result = mockClarity.contracts.materialTracking.updateBatchStatus("batch001", "processed")
    
    expect(result.type).toBe("ok")
    expect(mockData.batches["batch001"].status).toBe("processed")
  })
  
  it("should get batch details", () => {
    // Register a batch
    mockClarity.contracts.materialTracking.registerBatch("batch001", "mine001", "gold", 1000)
    
    // Get batch details
    const details = mockClarity.contracts.materialTracking.getBatchDetails("batch001")
    
    expect(details).toBeDefined()
    expect(details.mineId).toBe("mine001")
    expect(details.mineralType).toBe("gold")
    expect(details.quantity).toBe(1000)
    expect(details.status).toBe("extracted")
  })
})

