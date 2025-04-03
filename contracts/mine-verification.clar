;; Mine Verification Contract
;; Validates legitimate and ethical mining operations

;; Define data maps
(define-map verified-mines
  { mine-id: (string-ascii 32) }
  {
    owner: principal,
    location: (string-ascii 64),
    minerals: (list 10 (string-ascii 16)),
    verified: bool,
    verification-date: uint,
    verifier: principal
  }
)

;; Define constants
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u100))
(define-constant err-mine-exists (err u101))
(define-constant err-mine-not-found (err u102))

;; Define functions
(define-public (register-mine (mine-id (string-ascii 32)) (location (string-ascii 64)) (minerals (list 10 (string-ascii 16))))
  (let ((mine-data {
    owner: tx-sender,
    location: location,
    minerals: minerals,
    verified: false,
    verification-date: u0,
    verifier: contract-owner
  }))
    (if (is-some (map-get? verified-mines { mine-id: mine-id }))
      err-mine-exists
      (ok (map-insert verified-mines { mine-id: mine-id } mine-data))
    )
  )
)

(define-public (verify-mine (mine-id (string-ascii 32)))
  (let ((mine-data-opt (map-get? verified-mines { mine-id: mine-id })))
    (if (is-none mine-data-opt)
      err-mine-not-found
      (let ((mine-data (unwrap-panic mine-data-opt)))
        (if (is-eq tx-sender contract-owner)
          (ok (map-set verified-mines
            { mine-id: mine-id }
            (merge mine-data {
              verified: true,
              verification-date: block-height,
              verifier: tx-sender
            })
          ))
          err-not-authorized
        )
      )
    )
  )
)

(define-read-only (get-mine-details (mine-id (string-ascii 32)))
  (map-get? verified-mines { mine-id: mine-id })
)

(define-read-only (is-mine-verified (mine-id (string-ascii 32)))
  (let ((mine-data-opt (map-get? verified-mines { mine-id: mine-id })))
    (if (is-some mine-data-opt)
      (get verified (unwrap-panic mine-data-opt))
      false
    )
  )
)

