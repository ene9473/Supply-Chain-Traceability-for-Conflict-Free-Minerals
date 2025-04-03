;; Material Tracking Contract
;; Monitors minerals through processing and manufacturing

;; Define data maps
(define-map mineral-batches
  { batch-id: (string-ascii 32) }
  {
    mine-id: (string-ascii 32),
    mineral-type: (string-ascii 16),
    quantity: uint,
    extraction-date: uint,
    current-owner: principal,
    status: (string-ascii 16)
  }
)

(define-map batch-transfers
  { batch-id: (string-ascii 32), transfer-id: uint }
  {
    from: principal,
    to: principal,
    timestamp: uint,
    location: (string-ascii 64)
  }
)

;; Define variables
(define-data-var transfer-counter uint u0)

;; Define constants
(define-constant err-batch-exists (err u201))
(define-constant err-batch-not-found (err u202))
(define-constant err-not-owner (err u203))

;; Define functions
(define-public (register-batch (batch-id (string-ascii 32)) (mine-id (string-ascii 32)) (mineral-type (string-ascii 16)) (quantity uint))
  (let ((batch-data {
    mine-id: mine-id,
    mineral-type: mineral-type,
    quantity: quantity,
    extraction-date: block-height,
    current-owner: tx-sender,
    status: "extracted"
  }))
    (if (is-some (map-get? mineral-batches { batch-id: batch-id }))
      err-batch-exists
      (ok (map-insert mineral-batches { batch-id: batch-id } batch-data))
    )
  )
)

(define-public (transfer-batch (batch-id (string-ascii 32)) (recipient principal) (location (string-ascii 64)))
  (let (
    (batch-opt (map-get? mineral-batches { batch-id: batch-id }))
    (transfer-id (var-get transfer-counter))
  )
    (if (is-none batch-opt)
      err-batch-not-found
      (let ((batch (unwrap-panic batch-opt)))
        (if (is-eq tx-sender (get current-owner batch))
          (begin
            (map-set mineral-batches
              { batch-id: batch-id }
              (merge batch { current-owner: recipient })
            )
            (map-insert batch-transfers
              { batch-id: batch-id, transfer-id: transfer-id }
              {
                from: tx-sender,
                to: recipient,
                timestamp: block-height,
                location: location
              }
            )
            (var-set transfer-counter (+ transfer-id u1))
            (ok transfer-id)
          )
          err-not-owner
        )
      )
    )
  )
)

(define-public (update-batch-status (batch-id (string-ascii 32)) (new-status (string-ascii 16)))
  (let ((batch-opt (map-get? mineral-batches { batch-id: batch-id })))
    (if (is-none batch-opt)
      err-batch-not-found
      (let ((batch (unwrap-panic batch-opt)))
        (if (is-eq tx-sender (get current-owner batch))
          (ok (map-set mineral-batches
            { batch-id: batch-id }
            (merge batch { status: new-status })
          ))
          err-not-owner
        )
      )
    )
  )
)

(define-read-only (get-batch-details (batch-id (string-ascii 32)))
  (map-get? mineral-batches { batch-id: batch-id })
)

(define-read-only (get-transfer-history (batch-id (string-ascii 32)) (transfer-id uint))
  (map-get? batch-transfers { batch-id: batch-id, transfer-id: transfer-id })
)

