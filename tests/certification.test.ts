import { describe, it, expect, beforeEach } from "vitest"

// Mock Clarity environment
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Mock contract owner
  },
  block: {
    height: 100,
  },
  contracts: {
    certification: {
      addCertifier: (certifier) => {
        if (mockClarity.tx.sender !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
          return { type: "err", value: 301 } // err-not-authorized
        }
        mockData.certifiers[certifier] = { active: true }
        return { type: "ok", value: true }
      },
      removeCertifier: (certifier) => {
        if (mockClarity.tx.sender !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
          return { type: "err", value: 301 } // err-not-authorized
        }
        if (mockData.certifiers[certifier]) {
          mockData.certifiers[certifier].active = false
        }
        return { type: "ok", value: true }
      },
      certifyBatch: (batchId, standards, validityPeriod, notes) => {
        if (!mockData.certifiers[mockClarity.tx.sender] || !mockData.certifiers[mockClarity.tx.sender].active) {
          return { type: "err", value: 301 } // err-not-authorized
        }
        if (mockData.certifications[batchId]) {
          return { type: "err", value: 302 } // err-already-certified
        }
        
        mockData.certifications[batchId] = {
          certifier: mockClarity.tx.sender,
          certificationDate: mockClarity.block.height,
          expirationDate: mockClarity.block.height + validityPeriod,
          standards,
          status: "valid",
          notes,
        }
        
        return { type: "ok", value: true }
      },
      revokeCertification: (batchId, reason) => {
        if (!mockData.certifications[batchId]) {
          return { type: "err", value: 303 } // err-certification-not-found
        }
        
        const cert = mockData.certifications[batchId]
        if (
            mockClarity.tx.sender !== cert.certifier &&
            mockClarity.tx.sender !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
        ) {
          return { type: "err", value: 301 } // err-not-authorized
        }
        
        cert.status = "revoked"
        cert.notes = reason
        
        return { type: "ok", value: true }
      },
      getCertification: (batchId) => {
        return mockData.certifications[batchId] || null
      },
      isCertifier: (address) => {
        return mockData.certifiers[address]?.active || false
      },
    },
  },
}

// Mock data store
const mockData = {
  certifiers: {},
  certifications: {},
}

// Reset mock data before each test
beforeEach(() => {
  mockData.certifiers = {}
  mockData.certifications = {}
  // Set contract owner as a certifier by default
  mockData.certifiers["ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"] = { active: true }
})

describe("Certification Contract", () => {
  it("should add a new certifier", () => {
    const certifier = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const result = mockClarity.contracts.certification.addCertifier(certifier)
    
    expect(result.type).toBe("ok")
    expect(mockData.certifiers[certifier]).toBeDefined()
    expect(mockData.certifiers[certifier].active).toBe(true)
  })
  
  it("should remove a certifier", () => {
    // First add a certifier
    const certifier = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    mockClarity.contracts.certification.addCertifier(certifier)
    
    // Then remove them
    const result = mockClarity.contracts.certification.removeCertifier(certifier)
    
    expect(result.type).toBe("ok")
    expect(mockData.certifiers[certifier].active).toBe(false)
  })
  
  it("should certify a batch", () => {
    const batchId = "batch001"
    const standards = ["ISO9001", "ConflictFree2023"]
    const validityPeriod = 10000 // blocks
    const notes = "Certified after thorough inspection"
    
    const result = mockClarity.contracts.certification.certifyBatch(batchId, standards, validityPeriod, notes)
    
    expect(result.type).toBe("ok")
    expect(mockData.certifications[batchId]).toBeDefined()
    expect(mockData.certifications[batchId].standards).toEqual(standards)
    expect(mockData.certifications[batchId].status).toBe("valid")
  })
  
  it("should not allow non-certifiers to certify batches", () => {
    // Change sender to a non-certifier
    const originalSender = mockClarity.tx.sender
    mockClarity.tx.sender = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
    
    const result = mockClarity.contracts.certification.certifyBatch("batch001", ["ISO9001"], 10000, "Test")
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(301) // err-not-authorized
    
    // Restore original sender
    mockClarity.tx.sender = originalSender // err-not-authorized
    
    // Restore original sender
    mockClarity.tx.sender = originalSender
  })
  
  it("should revoke a certification", () => {
    // First certify a batch
    const batchId = "batch001"
    mockClarity.contracts.certification.certifyBatch(batchId, ["ISO9001"], 10000, "Initial certification")
    
    // Then revoke it
    const result = mockClarity.contracts.certification.revokeCertification(batchId, "Failed follow-up inspection")
    
    expect(result.type).toBe("ok")
    expect(mockData.certifications[batchId].status).toBe("revoked")
    expect(mockData.certifications[batchId].notes).toBe("Failed follow-up inspection")
  })
  
  it("should get certification details", () => {
    // First certify a batch
    const batchId = "batch001"
    mockClarity.contracts.certification.certifyBatch(
        batchId,
        ["ISO9001", "ConflictFree2023"],
        10000,
        "Test certification",
    )
    
    // Get certification details
    const cert = mockClarity.contracts.certification.getCertification(batchId)
    
    expect(cert).toBeDefined()
    expect(cert.certifier).toBe(mockClarity.tx.sender)
    expect(cert.standards).toContain("ISO9001")
    expect(cert.status).toBe("valid")
  })
  
  it("should check if an address is a certifier", () => {
    const certifier = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    
    // Check before adding
    let isCertifier = mockClarity.contracts.certification.isCertifier(certifier)
    expect(isCertifier).toBe(false)
    
    // Add certifier
    mockClarity.contracts.certification.addCertifier(certifier)
    
    // Check after adding
    isCertifier = mockClarity.contracts.certification.isCertifier(certifier)
    expect(isCertifier).toBe(true)
  })
})

