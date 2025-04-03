;; Certification Contract
;; Verifies compliance with conflict-free standards

;; Define data maps
(define-map certifications
  { batch-id: (string-ascii 32) }
  {
    certifier: principal,
    certification-date: uint,
    expiration-date: uint,
    standards: (list 5 (string-ascii 32)),
    status: (string-ascii 16),
    notes: (string-utf8 256)
  }
)

(define-map authorized-certifiers
  { certifier: principal }
  { active: bool }
)

;; Define constants
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u301))
(define-constant err-already-certified (err u302))
(define-constant err-certification-not-found (err u303))

;; Define functions
(define-public (add-certifier (certifier principal))
  (if (is-eq tx-sender contract-owner)
    (ok (map-set authorized-certifiers { certifier: certifier } { active: true }))
    err-not-authorized
  )
)

(define-public (remove-certifier (certifier principal))
  (if (is-eq tx-sender contract-owner)
    (ok (map-set authorized-certifiers { certifier: certifier } { active: false }))
    err-not-authorized
  )
)

(define-public (certify-batch
  (batch-id (string-ascii 32))
  (standards (list 5 (string-ascii 32)))
  (validity-period uint)
  (notes (string-utf8 256))
)
  (let (
    (certifier-data-opt (map-get? authorized-certifiers { certifier: tx-sender }))
    (cert-exists (is-some (map-get? certifications { batch-id: batch-id })))
  )
    (if (and (is-some certifier-data-opt)
             (get active (unwrap-panic certifier-data-opt))
             (not cert-exists))
      (ok (map-insert certifications
        { batch-id: batch-id }
        {
          certifier: tx-sender,
          certification-date: block-height,
          expiration-date: (+ block-height validity-period),
          standards: standards,
          status: "valid",
          notes: notes
        }
      ))
      (if (not (and (is-some certifier-data-opt)
                   (get active (unwrap-panic certifier-data-opt))))
        err-not-authorized
        err-already-certified
      )
    )
  )
)

(define-public (revoke-certification (batch-id (string-ascii 32)) (reason (string-utf8 256)))
  (let (
    (cert-opt (map-get? certifications { batch-id: batch-id }))
  )
    (if (is-none cert-opt)
      err-certification-not-found
      (let (
        (cert (unwrap-panic cert-opt))
        (is-certifier (is-eq tx-sender (get certifier cert)))
        (is-owner (is-eq tx-sender contract-owner))
      )
        (if (or is-certifier is-owner)
          (ok (map-set certifications
            { batch-id: batch-id }
            (merge cert {
              status: "revoked",
              notes: reason
            })
          ))
          err-not-authorized
        )
      )
    )
  )
)

(define-read-only (get-certification (batch-id (string-ascii 32)))
  (map-get? certifications { batch-id: batch-id })
)

(define-read-only (is-certifier (address principal))
  (let ((certifier-data-opt (map-get? authorized-certifiers { certifier: address })))
    (if (is-some certifier-data-opt)
      (get active (unwrap-panic certifier-data-opt))
      false
    )
  )
)

