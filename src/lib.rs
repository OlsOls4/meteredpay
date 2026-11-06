// MeteredPay — seller-side pay-per-call on NEAR testnet.
//
// INTERNAL BUILD NOTES live in BUILD_NOTES.md (repo-internal only; this is
// NOT the submission README). Locked spec: ../SPEC.md. Architecture:
// ../prep/04-architecture.md. Day-1 glossary (wins on conflict):
// ../../goals/win-cash-with-meteredpay-at-near-hackathon/hidden_files/day1-glossary.md
//
// Money rules, frozen:
// - Single seller, single price, fixed at init. No set_price, no price drift.
// - A call in `paid` state has NOT been paid to the seller: its price is
//   RESERVED (held) from available into held. Nothing has moved.
// - A "refund" is a RELEASE of that held amount back to available, on a
//   buyer failure/timeout claim or backstop expiry. Never deducted money
//   is never "returned". There is no contract-side auto-refund.
// - The ONLY deduction is submit_success, which requires BOTH a real
//   on-chain ed25519 verification of the seller attestation AND a real
//   on-chain ed25519 verification of the payer (buyer) authorisation.
//   No string-comparison verification, no backdoor, no admin override,
//   no seller-only success path.
// - Five-number balances everywhere: available = deposit - spent - held.
//   Gas is chain-level, shown separately on the explorer, never mixed
//   into contract balances.
// - Testnet only. No mainnet, no NEAR Intents, no Chain Signatures in
//   this contract. Seller withdrawal is plain testnet NEAR.
//
// FROZEN SIGNATURE MESSAGE FORMATS (canonical forms for the days 4-5
// buyer script — do not change after the day 10-11 freeze):
//   len(p) = UTF-8 byte length of p, decimal, no padding.
//   Seller attestation message (UTF-8 bytes):
//     meteredpay-v1-seller|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>
//   Buyer success message (UTF-8 bytes):
//     meteredpay-v1-buyer-success|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>|<len(price_yocto)>:<price_yocto>|<len(seller_account_id)>:<seller_account_id>
//     where price_yocto is the decimal yocto string of price_per_call.
//   Seller error attestation message (for submit_failure evidence, UTF-8):
//     meteredpay-v1-seller-error|<len(call_id)>:<call_id>|<len(seller_error_hash)>:<seller_error_hash>
//   Signatures are base64 (standard alphabet, with padding) of the raw
//   64-byte ed25519 signature. Public keys are "ed25519:<base58>" strings.
//   The buyer signature is verified against the key that signed the
//   submit_success transaction (env::signer_account_pk), so the buyer
//   must sign the message with an ed25519 key (all faucet accounts are).

use base64::Engine;
use near_sdk::json_types::{U64, U128};
use near_sdk::store::LookupMap;
use near_sdk::{AccountId, NearToken, PanicOnDefault, Promise, env, near, require};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Call statuses. These exact strings are the contract vocabulary; the
/// day-1 glossary maps them to UI words (see BUILD_NOTES.md).
pub const STATUS_PAID: &str = "paid";
pub const STATUS_SUCCESS_DEDUCTED: &str = "success-deducted";
pub const STATUS_FAILED_REFUNDED: &str = "failed-refunded";
pub const STATUS_TIMEOUT_REFUNDED: &str = "timeout-refunded";
pub const STATUS_REFUSED: &str = "refused";

/// Refusal reasons, exactly as specified in prep/04 §2.3.
pub const REASON_WRONG_SELLER: &str = "wrong_seller";
pub const REASON_DUPLICATE_CALL_ID: &str = "duplicate_call_id";
pub const REASON_INVALID_CALL_ID: &str = "invalid_call_id";
pub const REASON_INSUFFICIENT_DEPOSIT: &str = "insufficient_deposit";
pub const REASON_OVER_BUDGET: &str = "over_budget";

/// Documented failure reasons for submit_failure (prep/04 §2.3 / §3.4).
pub const FAILURE_SELLER_ERROR: &str = "seller_error";
pub const FAILURE_INVALID_RESPONSE: &str = "invalid_response";
pub const FAILURE_TIMEOUT: &str = "timeout";

/// Bounds for call_timeout_seconds fixed at build time (prep/04 §2.3:
/// "a zero or absurd timeout" must be rejected).
pub const MIN_TIMEOUT_SECONDS: u64 = 60;
pub const MAX_TIMEOUT_SECONDS: u64 = 86_400; // 24 hours

/// Pagination cap for list_calls / list_refusals (prep/04 §2.4: "capped
/// at a sane limit").
pub const MAX_LIST_LIMIT: u64 = 100;

/// Nanoseconds per second (block timestamps are nanoseconds).
const NS_PER_SECOND: u64 = 1_000_000_000;

// ---------------------------------------------------------------------------
// Stored / returned records
// ---------------------------------------------------------------------------

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct BuyerBalance {
    pub deposit: U128,
    pub held: U128,
    pub spent: U128,
    pub budget_cap: U128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct BalanceView {
    pub account_id: AccountId,
    pub deposit: U128,
    pub held: U128,
    pub spent: U128,
    pub available: U128,
    pub budget_cap: U128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct CallRecord {
    pub buyer_account_id: AccountId,
    pub call_id: String,
    pub seller_account_id: AccountId,
    pub price: U128,
    /// One of: paid, success-deducted, failed-refunded,
    /// timeout-refunded, refused. `paid` means price HELD, not paid
    /// to the seller.
    pub status: String,
    /// Set only on a success claim.
    pub response_hash: Option<String>,
    /// Set only on a failure/timeout claim or expiry.
    pub failure_reason: Option<String>,
    pub proposed_at: U64,
    pub proposed_height: U64,
    pub resolved_at: Option<U64>,
    pub resolved_height: Option<U64>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct RefusalRecord {
    pub buyer_account_id: AccountId,
    pub call_id: String,
    pub reason: String,
    pub price: U128,
    pub deposit: U128,
    pub spent: U128,
    pub held: U128,
    pub budget_cap: U128,
    pub timestamp: U64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct SellerView {
    pub seller_account_id: AccountId,
    pub seller_public_key: String,
    pub price_per_call: U128,
    pub call_timeout_seconds: U64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct SellerBalanceView {
    pub seller_account_id: AccountId,
    pub earned: U128,
    pub withdrawn: U128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct SuccessClaimResult {
    pub call: CallRecord,
    pub buyer_balance: BalanceView,
    pub seller_balance: SellerBalanceView,
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct FailureClaimResult {
    pub call: CallRecord,
    pub buyer_balance: BalanceView,
}

// ---------------------------------------------------------------------------
// Contract state
// ---------------------------------------------------------------------------

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    seller_account_id: AccountId,
    /// "ed25519:<base58>" string, validated at init.
    seller_public_key: String,
    price_per_call: u128,
    call_timeout_seconds: u64,
    buyers: LookupMap<AccountId, BuyerBalance>,
    /// Keyed by (buyer, call_id). Call IDs are unique per buyer only.
    calls: LookupMap<(AccountId, String), CallRecord>,
    /// Call IDs per buyer, in request order (list_calls reverses this).
    /// Includes refused calls: a refused call_id is taken (test 15).
    buyer_call_ids: LookupMap<AccountId, Vec<String>>,
    refusals: LookupMap<AccountId, Vec<RefusalRecord>>,
    seller_earned: u128,
    seller_withdrawn: u128,
    calls_total: u64,
    refunds_total: u64,
}

// ---------------------------------------------------------------------------
// Signature helpers (frozen formats — see header comment)
// ---------------------------------------------------------------------------

fn len_prefixed(parts: &[&str]) -> String {
    let mut out = String::new();
    for (i, part) in parts.iter().enumerate() {
        if i > 0 {
            out.push('|');
        }
        // str::len() is the UTF-8 byte length, which is what the
        // buyer script must also use (Buffer.byteLength in JS).
        out.push_str(&format!("{}:{}", part.len(), part));
    }
    out
}

fn seller_attestation_message(call_id: &str, response_hash: &str) -> String {
    format!("meteredpay-v1-seller|{}", len_prefixed(&[call_id, response_hash]))
}

fn buyer_success_message(
    call_id: &str,
    response_hash: &str,
    price_yocto: &str,
    seller_account_id: &str,
) -> String {
    format!(
        "meteredpay-v1-buyer-success|{}",
        len_prefixed(&[call_id, response_hash, price_yocto, seller_account_id])
    )
}

fn seller_error_message(call_id: &str, seller_error_hash: &str) -> String {
    format!(
        "meteredpay-v1-seller-error|{}",
        len_prefixed(&[call_id, seller_error_hash])
    )
}

/// Parse an "ed25519:<base58>" public key string into 32 raw bytes.
fn parse_ed25519_key(key: &str) -> [u8; 32] {
    let stripped = match key.strip_prefix("ed25519:") {
        Some(s) => s,
        None => env::panic_str("Public key must start with ed25519:"),
    };
    let bytes = match bs58::decode(stripped).into_vec() {
        Ok(v) => v,
        Err(_) => env::panic_str("Public key is not valid base58"),
    };
    match bytes.as_slice().try_into() {
        Ok(arr) => arr,
        Err(_) => env::panic_str("Public key must decode to 32 bytes"),
    }
}

/// The ed25519 key that signed the current transaction. Deduction
/// authorisation is verified against THIS key: only the payer's own
/// signing key can authorise a deduction for their call.
/// (near-sdk 5's PublicKey stores [curve_byte || key_data], so the
/// raw 32 bytes are as_bytes()[1..] after a curve check.)
fn signer_ed25519_key() -> [u8; 32] {
    let pk = env::signer_account_pk();
    require!(
        pk.curve_type() == near_sdk::CurveType::ED25519,
        "Buyer signing key must be an ed25519 key"
    );
    let bytes = pk.as_bytes();
    require!(
        bytes.len() == 33,
        "Buyer signing key must be an ed25519 key"
    );
    let mut out = [0u8; 32];
    out.copy_from_slice(&bytes[1..]);
    out
}

/// Decode a base64 signature and really verify it on-chain.
/// Never a string comparison: env::ed25519_verify is the host
/// ed25519 verification.
fn verify_signature(signature_b64: &str, message: &str, public_key: &[u8; 32]) -> bool {
    let raw = match base64::engine::general_purpose::STANDARD.decode(signature_b64) {
        Ok(v) => v,
        Err(_) => env::panic_str("Signature is not valid base64"),
    };
    let sig: &[u8; 64] = match raw.as_slice().try_into() {
        Ok(s) => s,
        Err(_) => env::panic_str("Signature must be 64 bytes"),
    };
    env::ed25519_verify(sig, message.as_bytes(), public_key)
}

fn require_response_hash(hash: &str) {
    require!(
        hash.len() == 64 && hash.bytes().all(|b| b.is_ascii_hexdigit()),
        "response_hash must be 64 hex characters (SHA-256 hex)"
    );
}

// ---------------------------------------------------------------------------
// Contract implementation
// ---------------------------------------------------------------------------

#[near]
impl Contract {
    #[init]
    pub fn init(
        seller_account_id: AccountId,
        seller_public_key: String,
        price_per_call: U128,
        call_timeout_seconds: U64,
    ) -> Self {
        require!(
            !seller_account_id.as_str().is_empty(),
            "Seller account id must not be empty"
        );
        // Validates the key format now, so a bad key can never be
        // frozen into the contract at deploy time.
        let _ = parse_ed25519_key(&seller_public_key);
        require!(price_per_call.0 > 0, "Price per call must be greater than zero");
        require!(
            call_timeout_seconds.0 >= MIN_TIMEOUT_SECONDS
                && call_timeout_seconds.0 <= MAX_TIMEOUT_SECONDS,
            "call_timeout_seconds must be between 60 and 86400"
        );
        Self {
            seller_account_id,
            seller_public_key,
            price_per_call: price_per_call.0,
            call_timeout_seconds: call_timeout_seconds.0,
            buyers: LookupMap::new(b"b"),
            calls: LookupMap::new(b"c"),
            buyer_call_ids: LookupMap::new(b"i"),
            refusals: LookupMap::new(b"r"),
            seller_earned: 0,
            seller_withdrawn: 0,
            calls_total: 0,
            refunds_total: 0,
        }
    }

    // ---- internal helpers -------------------------------------------------

    fn balance_view(&self, account_id: &AccountId) -> BalanceView {
        match self.buyers.get(account_id) {
            Some(b) => BalanceView {
                account_id: account_id.clone(),
                deposit: b.deposit,
                held: b.held,
                spent: b.spent,
                available: U128::from(
                    b.deposit.0.saturating_sub(b.spent.0).saturating_sub(b.held.0),
                ),
                budget_cap: b.budget_cap,
            },
            None => BalanceView {
                account_id: account_id.clone(),
                deposit: U128::from(0),
                held: U128::from(0),
                spent: U128::from(0),
                available: U128::from(0),
                budget_cap: U128::from(0),
            },
        }
    }

    fn seller_balance_view(&self) -> SellerBalanceView {
        SellerBalanceView {
            seller_account_id: self.seller_account_id.clone(),
            earned: U128::from(self.seller_earned),
            withdrawn: U128::from(self.seller_withdrawn),
        }
    }

    fn record_refusal(&mut self, buyer: &AccountId, call_id: &str, reason: &str) -> CallRecord {
        let view = self.balance_view(buyer);
        let refusal = RefusalRecord {
            buyer_account_id: buyer.clone(),
            call_id: call_id.to_string(),
            reason: reason.to_string(),
            price: U128::from(self.price_per_call),
            deposit: view.deposit,
            spent: view.spent,
            held: view.held,
            budget_cap: view.budget_cap,
            timestamp: U64::from(env::block_timestamp()),
        };
        let mut list = self.refusals.get(buyer).cloned().unwrap_or_default();
        list.push(refusal);
        self.refusals.insert(buyer.clone(), list);
        // A refused call_id is taken: a later request with the same
        // call_id for this buyer is refused as duplicate (test 15).
        // Never overwrite an existing call record (e.g. a duplicate
        // refusal must not erase the original call). The RETURNED
        // record always carries status `refused`: it reflects the
        // outcome of THIS request, so a duplicate refusal never
        // masquerades as the original paid call. When a record
        // already exists, the returned record is a view of this
        // refusal only and is not stored; the stored record and the
        // on-chain refusal list stay authoritative.
        let record = CallRecord {
            buyer_account_id: buyer.clone(),
            call_id: call_id.to_string(),
            seller_account_id: self.seller_account_id.clone(),
            price: U128::from(self.price_per_call),
            status: STATUS_REFUSED.to_string(),
            response_hash: None,
            failure_reason: None,
            proposed_at: U64::from(env::block_timestamp()),
            proposed_height: U64::from(env::block_height()),
            resolved_at: Some(U64::from(env::block_timestamp())),
            resolved_height: Some(U64::from(env::block_height())),
        };
        if self.calls.get(&(buyer.clone(), call_id.to_string())).is_none() {
            self.calls.insert((buyer.clone(), call_id.to_string()), record.clone());
            let mut ids = self.buyer_call_ids.get(buyer).cloned().unwrap_or_default();
            ids.push(call_id.to_string());
            self.buyer_call_ids.insert(buyer.clone(), ids);
            self.calls_total += 1;
        }
        record
    }

    fn paid_call(&self, buyer: &AccountId, call_id: &str) -> CallRecord {
        let record = match self.calls.get(&(buyer.clone(), call_id.to_string())) {
            Some(r) => r.clone(),
            None => env::panic_str("Call not found"),
        };
        require!(
            record.status == STATUS_PAID,
            "Call is not in paid state"
        );
        record
    }

    fn release_hold(
        &mut self,
        buyer: &AccountId,
        mut record: CallRecord,
        status: &str,
        failure_reason: &str,
    ) -> CallRecord {
        let mut balance = self.buyers.get(buyer).cloned().unwrap_or_else(|| {
            env::panic_str("Buyer has no balance record")
        });
        balance.held = U128::from(balance.held.0 - record.price.0);
        self.buyers.insert(buyer.clone(), balance);
        record.status = status.to_string();
        record.failure_reason = Some(failure_reason.to_string());
        record.resolved_at = Some(U64::from(env::block_timestamp()));
        record.resolved_height = Some(U64::from(env::block_height()));
        self.calls.insert(
            (buyer.clone(), record.call_id.clone()),
            record.clone(),
        );
        self.refunds_total += 1;
        record
    }

    // ---- change calls -----------------------------------------------------

    /// Buyer prepays testnet NEAR. First deposit defaults the budget
    /// cap to the deposit; later deposits never move the cap.
    #[payable]
    pub fn deposit(&mut self) -> BalanceView {
        let buyer = env::predecessor_account_id();
        let attached = env::attached_deposit().as_yoctonear();
        require!(attached > 0, "Deposit must be greater than zero");
        match self.buyers.get(&buyer).cloned() {
            Some(mut balance) => {
                balance.deposit = U128::from(balance.deposit.0 + attached);
                self.buyers.insert(buyer.clone(), balance);
            }
            None => {
                self.buyers.insert(
                    buyer.clone(),
                    BuyerBalance {
                        deposit: U128::from(attached),
                        held: U128::from(0),
                        spent: U128::from(0),
                        budget_cap: U128::from(attached),
                    },
                );
            }
        }
        self.balance_view(&buyer)
    }

    /// Buyer sets their own budget cap only. Rejected, never silently
    /// clamped, when cap > deposit; rejected when cap < spent.
    /// The buyer must have deposited first (a cap before any deposit
    /// would otherwise poison the first-deposit cap default).
    pub fn set_budget_cap(&mut self, budget_cap: U128) -> BalanceView {
        let buyer = env::predecessor_account_id();
        let mut balance = match self.buyers.get(&buyer).cloned() {
            Some(b) => b,
            None => env::panic_str("Deposit first before setting a budget cap"),
        };
        require!(
            budget_cap.0 <= balance.deposit.0,
            "Budget cap cannot exceed your deposit"
        );
        require!(
            budget_cap.0 >= balance.spent.0,
            "Budget cap cannot be below what you have already spent"
        );
        balance.budget_cap = budget_cap;
        self.buyers.insert(buyer.clone(), balance);
        self.balance_view(&buyer)
    }

    /// On-chain guardrail. A refusal is a SUCCESSFUL transaction with
    /// an on-chain refusal record — never a failed transaction — so
    /// judges can inspect it. Balances are unchanged on refusal.
    /// Checks in prep/04 order: wrong seller, call_id, deposit,
    /// then budget.
    pub fn request_call(
        &mut self,
        call_id: String,
        seller_account_id: AccountId,
    ) -> CallRecord {
        let buyer = env::predecessor_account_id();
        if seller_account_id != self.seller_account_id {
            return self.record_refusal(&buyer, &call_id, REASON_WRONG_SELLER);
        }
        if call_id.is_empty() {
            // Distinct from duplicate_call_id: an empty id is not a
            // duplicate, it is invalid. Still a refusal record, still
            // balances unchanged. (Prep/04 groups this check under
            // duplicate_call_id; a distinct reason is more auditable.)
            return self.record_refusal(&buyer, &call_id, REASON_INVALID_CALL_ID);
        }
        if self.calls.get(&(buyer.clone(), call_id.clone())).is_some() {
            return self.record_refusal(&buyer, &call_id, REASON_DUPLICATE_CALL_ID);
        }
        let view = self.balance_view(&buyer);
        if view.deposit.0 == 0 || view.available.0 < self.price_per_call {
            return self.record_refusal(&buyer, &call_id, REASON_INSUFFICIENT_DEPOSIT);
        }
        if view.spent.0.saturating_add(view.held.0).saturating_add(self.price_per_call)
            > view.budget_cap.0
        {
            return self.record_refusal(&buyer, &call_id, REASON_OVER_BUDGET);
        }
        let mut balance = self.buyers.get(&buyer).cloned().unwrap();
        balance.held = U128::from(balance.held.0 + self.price_per_call);
        self.buyers.insert(buyer.clone(), balance);
        let record = CallRecord {
            buyer_account_id: buyer.clone(),
            call_id: call_id.clone(),
            seller_account_id: self.seller_account_id.clone(),
            price: U128::from(self.price_per_call),
            status: STATUS_PAID.to_string(),
            response_hash: None,
            failure_reason: None,
            proposed_at: U64::from(env::block_timestamp()),
            proposed_height: U64::from(env::block_height()),
            resolved_at: None,
            resolved_height: None,
        };
        self.calls.insert((buyer.clone(), call_id.clone()), record.clone());
        let mut ids = self.buyer_call_ids.get(&buyer).cloned().unwrap_or_default();
        ids.push(call_id);
        self.buyer_call_ids.insert(buyer, ids);
        self.calls_total += 1;
        record
    }

    /// The ONLY deduction method. Caller must be the buyer who owns
    /// the call (the payer). Both signatures are really verified
    /// on-chain with env::ed25519_verify:
    ///  - buyer_signature: by the key that signed this transaction,
    ///    over (call_id, response_hash, price_per_call, seller).
    ///    The price inside the signed message is price_per_call, so a
    ///    claim for any other price fails verification (no negotiated,
    ///    partial, or inflated price).
    ///  - seller_signature: by the registered seller's key stored at
    ///    init, over (call_id, response_hash).
    /// A seller-only claim, a buyer-only claim, a replayed receipt on
    /// a terminal call, or a mismatched hash is rejected with balances
    /// unchanged (the transaction fails; no state changes persist).
    pub fn submit_success(
        &mut self,
        call_id: String,
        response_hash: String,
        seller_signature: String,
        buyer_signature: String,
    ) -> SuccessClaimResult {
        let buyer = env::predecessor_account_id();
        let mut record = self.paid_call(&buyer, &call_id);
        require_response_hash(&response_hash);
        // Buyer (payer) authorisation first, per prep/04 check order.
        let buyer_key = signer_ed25519_key();
        let buyer_message = buyer_success_message(
            &call_id,
            &response_hash,
            &self.price_per_call.to_string(),
            self.seller_account_id.as_str(),
        );
        require!(
            verify_signature(&buyer_signature, &buyer_message, &buyer_key),
            "Invalid buyer signature"
        );
        // Seller attestation second. The signature binds (call_id,
        // response_hash), so a hash mismatch fails here too.
        let seller_key = parse_ed25519_key(&self.seller_public_key);
        let seller_message = seller_attestation_message(&call_id, &response_hash);
        require!(
            verify_signature(&seller_signature, &seller_message, &seller_key),
            "Invalid seller signature"
        );
        let mut balance = self.buyers.get(&buyer).cloned().unwrap();
        balance.held = U128::from(balance.held.0 - self.price_per_call);
        balance.spent = U128::from(balance.spent.0 + self.price_per_call);
        self.buyers.insert(buyer.clone(), balance);
        self.seller_earned += self.price_per_call;
        record.status = STATUS_SUCCESS_DEDUCTED.to_string();
        record.response_hash = Some(response_hash);
        record.resolved_at = Some(U64::from(env::block_timestamp()));
        record.resolved_height = Some(U64::from(env::block_height()));
        self.calls.insert(
            (buyer.clone(), call_id.clone()),
            record.clone(),
        );
        SuccessClaimResult {
            call: record,
            buyer_balance: self.balance_view(&buyer),
            seller_balance: self.seller_balance_view(),
        }
    }

    /// Buyer releases a held amount after a failure or timeout.
    /// This is a RELEASE, never a return of deducted money: spent and
    /// seller earned are unchanged. A `timeout` reason resolves the
    /// call to `timeout-refunded` (test 4); other reasons resolve to
    /// `failed-refunded` (test 2). If seller error evidence is
    /// supplied, hash and signature must come together and the
    /// signature must really verify against the registered seller,
    /// or the call stays `paid`.
    pub fn submit_failure(
        &mut self,
        call_id: String,
        failure_reason: String,
        seller_error_hash: Option<String>,
        seller_error_signature: Option<String>,
    ) -> FailureClaimResult {
        let buyer = env::predecessor_account_id();
        let record = self.paid_call(&buyer, &call_id);
        require!(
            failure_reason == FAILURE_SELLER_ERROR
                || failure_reason == FAILURE_INVALID_RESPONSE
                || failure_reason == FAILURE_TIMEOUT,
            "failure_reason must be seller_error, invalid_response, or timeout"
        );
        match (&seller_error_hash, &seller_error_signature) {
            (Some(hash), Some(sig)) => {
                require_response_hash(hash);
                let seller_key = parse_ed25519_key(&self.seller_public_key);
                let message = seller_error_message(&call_id, hash);
                require!(
                    verify_signature(sig, &message, &seller_key),
                    "Invalid seller error signature"
                );
            }
            (None, None) => {}
            _ => env::panic_str(
                "Seller error hash and signature must be supplied together or not at all",
            ),
        }
        let status = if failure_reason == FAILURE_TIMEOUT {
            STATUS_TIMEOUT_REFUNDED
        } else {
            STATUS_FAILED_REFUNDED
        };
        let record = self.release_hold(&buyer, record, status, &failure_reason);
        FailureClaimResult {
            call: record,
            buyer_balance: self.balance_view(&buyer),
        }
    }

    /// Release a held amount after the backstop deadline. Anyone may
    /// call it — it can only release a hold, never deduct — so a
    /// third-party expiry cannot steal. NOTE: prep/04 lists this as
    /// expire_call(call_id); the buyer must be explicit here, or a
    /// third party could not name whose call to expire (calls are
    /// keyed per buyer). The days 4-5 buyer script uses this form.
    pub fn expire_call(
        &mut self,
        buyer_account_id: AccountId,
        call_id: String,
    ) -> FailureClaimResult {
        let record = self.paid_call(&buyer_account_id, &call_id);
        let deadline = record.proposed_at.0
            + self.call_timeout_seconds.saturating_mul(NS_PER_SECOND);
        require!(
            env::block_timestamp() >= deadline,
            "Call has not expired yet"
        );
        let record = self.release_hold(
            &buyer_account_id,
            record,
            STATUS_TIMEOUT_REFUNDED,
            FAILURE_TIMEOUT,
        );
        FailureClaimResult {
            call: record,
            buyer_balance: self.balance_view(&buyer_account_id),
        }
    }

    /// Seller withdraws exactly `earned` in testnet NEAR, and only to
    /// the registered seller. Returns a transfer Promise: the amount
    /// and updated seller balance are read back via
    /// get_seller_balance (a Promise return carries no JSON value).
    /// A second withdraw with earned == 0 is rejected.
    pub fn withdraw(&mut self) -> Promise {
        let caller = env::predecessor_account_id();
        require!(
            caller == self.seller_account_id,
            "Only the seller can withdraw"
        );
        require!(self.seller_earned > 0, "Nothing to withdraw");
        let amount = self.seller_earned;
        self.seller_earned = 0;
        self.seller_withdrawn += amount;
        Promise::new(self.seller_account_id.clone())
            .transfer(NearToken::from_yoctonear(amount))
    }

    // ---- views ------------------------------------------------------------

    pub fn get_seller(&self) -> SellerView {
        SellerView {
            seller_account_id: self.seller_account_id.clone(),
            seller_public_key: self.seller_public_key.clone(),
            price_per_call: U128::from(self.price_per_call),
            call_timeout_seconds: U64::from(self.call_timeout_seconds),
        }
    }

    pub fn get_buyer_balance(&self, account_id: AccountId) -> BalanceView {
        self.balance_view(&account_id)
    }

    pub fn get_call(&self, buyer_account_id: AccountId, call_id: String) -> Option<CallRecord> {
        self.calls.get(&(buyer_account_id, call_id)).cloned()
    }

    pub fn list_calls(
        &self,
        buyer_account_id: AccountId,
        from_index: U64,
        limit: U64,
    ) -> Vec<CallRecord> {
        let ids = self.buyer_call_ids.get(&buyer_account_id).cloned().unwrap_or_default();
        let limit = limit.0.min(MAX_LIST_LIMIT) as usize;
        let from = from_index.0 as usize;
        ids.iter()
            .rev()
            .skip(from)
            .take(limit)
            .filter_map(|id| {
                self.calls.get(&(buyer_account_id.clone(), id.clone())).cloned()
            })
            .collect()
    }

    pub fn list_refusals(
        &self,
        buyer_account_id: AccountId,
        from_index: U64,
        limit: U64,
    ) -> Vec<RefusalRecord> {
        let list = self.refusals.get(&buyer_account_id).cloned().unwrap_or_default();
        let limit = limit.0.min(MAX_LIST_LIMIT) as usize;
        let from = from_index.0 as usize;
        list.iter().rev().skip(from).take(limit).cloned().collect()
    }

    pub fn get_seller_balance(&self) -> SellerBalanceView {
        self.seller_balance_view()
    }
}

// ---------------------------------------------------------------------------
// Unit tests (mock env; ed25519_verify is really executed by the mock).
// Test-only keypairs generated for these vectors only — never real
// account keys, never used on-chain. Vectors:
//   seller pub ed25519:9fUAHL9mAz4jRU4VvLpfzhs4ojyia1orLyujCKmRqFhD
//   buyer  pub ed25519:BfSsd5Qz22roKf4Rq1uXLDoCBDL3DC96gN7WbYUJBxZ6
//   call test-call-1, hash 3ed59d9f... (SHA-256 of "test response"),
//   price 100000000000000000000000 (0.1 NEAR), seller seller.testnet.
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{AccountId, NearToken, PublicKey, testing_env};

    const SELLER: &str = "seller.testnet";
    const BUYER: &str = "buyer.testnet";
    const OTHER: &str = "other.testnet";
    const SELLER_PUB: &str = "ed25519:9fUAHL9mAz4jRU4VvLpfzhs4ojyia1orLyujCKmRqFhD";
    const BUYER_PUB: &str = "ed25519:BfSsd5Qz22roKf4Rq1uXLDoCBDL3DC96gN7WbYUJBxZ6";
    const CALL_ID: &str = "test-call-1";
    const HASH: &str = "3ed59d9f6e32da0f3c9784f5f1f178565b7627537b7be4314d2fcfe2d284f912";
    const ERR_HASH: &str = "4274b1899eba687801198c89f64a3fdade080a475c8a54881ba8fa10e7f45691";
    const PRICE: u128 = 100_000_000_000_000_000_000_000; // 0.1 NEAR
    const SELLER_SIG: &str = "GOnGsxqSF2AJjCrPbl0MZdGTJx5ZZM9i5wqcMyKPu6Mbn/gXzM7g4TX3mNHJCCrA663qj0/a0bM9V/JU0uWuAg==";
    const BUYER_SIG: &str = "sToeZcJSG49O6fQBtOOyI5dNU11NlgaG8b8+dUSjJarB+ygVItUHJqQLW2iCjS2qY7enzqWPQXIo1wa1zDsjBA==";
    const SELLER_ERR_SIG: &str = "F2c3YBUzkx8Xq+svfqunvTdVtQn9rdo17VUdLEvxXlZMRzqLQ8tZA57aGhG05W2hAISsy/A1EE6IQbWSFnY+Aw==";

    fn acct(s: &str) -> AccountId {
        s.parse().unwrap()
    }

    fn new_contract() -> Contract {
        Contract::init(
            acct(SELLER),
            SELLER_PUB.to_string(),
            U128::from(PRICE),
            U64::from(600),
        )
    }

    fn ctx(
        predecessor: &str,
        signer_pk: Option<&str>,
        attached: u128,
        timestamp: u64,
    ) -> VMContextBuilder {
        let mut b = VMContextBuilder::new();
        b.current_account_id(acct("contract.testnet"))
            .signer_account_id(acct(predecessor))
            .predecessor_account_id(acct(predecessor))
            .attached_deposit(NearToken::from_yoctonear(attached))
            .block_timestamp(timestamp)
            .block_height(100);
        if let Some(pk) = signer_pk {
            b.signer_account_pk(pk.parse::<PublicKey>().unwrap());
        }
        b
    }

    fn set_ctx(predecessor: &str, signer_pk: Option<&str>, attached: u128, timestamp: u64) {
        testing_env!(ctx(predecessor, signer_pk, attached, timestamp).build());
    }

    fn deposit_and_request(c: &mut Contract, deposit: u128) -> CallRecord {
        set_ctx(BUYER, Some(BUYER_PUB), deposit, 1_000_000_000_000);
        c.deposit();
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        c.request_call(CALL_ID.to_string(), acct(SELLER))
    }

    #[test]
    fn init_rejects_bad_params() {
        // A valid init must succeed (guards the happy path too).
        let _ = new_contract();
    }

    #[test]
    #[should_panic(expected = "Price per call must be greater than zero")]
    fn init_rejects_zero_price() {
        let _ = Contract::init(
            acct(SELLER),
            SELLER_PUB.to_string(),
            U128::from(0),
            U64::from(600),
        );
    }

    #[test]
    #[should_panic(expected = "Public key must start with ed25519:")]
    fn init_rejects_bad_seller_key() {
        let _ = Contract::init(
            acct(SELLER),
            "bad-key".to_string(),
            U128::from(PRICE),
            U64::from(600),
        );
    }

    #[test]
    #[should_panic(expected = "call_timeout_seconds must be between 60 and 86400")]
    fn init_rejects_zero_timeout() {
        let _ = Contract::init(
            acct(SELLER),
            SELLER_PUB.to_string(),
            U128::from(PRICE),
            U64::from(0),
        );
    }

    #[test]
    fn deposit_defaults_cap_then_keeps_it() {
        let mut c = new_contract();
        set_ctx(BUYER, Some(BUYER_PUB), 1_000_000_000_000_000_000_000_000, 1_000_000_000_000);
        let v = c.deposit();
        assert_eq!(v.deposit.0, 1_000_000_000_000_000_000_000_000);
        assert_eq!(v.budget_cap.0, 1_000_000_000_000_000_000_000_000);
        assert_eq!(v.available.0, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 500_000_000_000_000_000_000_000, 1_000_000_000_000);
        let v = c.deposit();
        assert_eq!(v.deposit.0, 1_500_000_000_000_000_000_000_000);
        // Cap does not move on a later deposit.
        assert_eq!(v.budget_cap.0, 1_000_000_000_000_000_000_000_000);
    }

    #[test]
    #[should_panic(expected = "Budget cap cannot exceed your deposit")]
    fn cap_above_deposit_rejected() {
        let mut c = new_contract();
        set_ctx(BUYER, Some(BUYER_PUB), PRICE, 1_000_000_000_000);
        c.deposit();
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        c.set_budget_cap(U128::from(PRICE + 1));
    }

    #[test]
    fn success_flow_deducts_once() {
        let mut c = new_contract();
        let rec = deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        assert_eq!(rec.status, STATUS_PAID);
        let before = c.get_buyer_balance(acct(BUYER));
        assert_eq!(before.held.0, PRICE);
        assert_eq!(before.available.0, 1_000_000_000_000_000_000_000_000 - PRICE);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let res = c.submit_success(
            CALL_ID.to_string(),
            HASH.to_string(),
            SELLER_SIG.to_string(),
            BUYER_SIG.to_string(),
        );
        assert_eq!(res.call.status, STATUS_SUCCESS_DEDUCTED);
        assert_eq!(res.call.response_hash.as_deref(), Some(HASH));
        assert_eq!(res.buyer_balance.held.0, 0);
        assert_eq!(res.buyer_balance.spent.0, PRICE);
        assert_eq!(res.seller_balance.earned.0, PRICE);
    }

    #[test]
    #[should_panic(expected = "Invalid buyer signature")]
    fn seller_only_success_rejected() {
        // Seller signature presented as the buyer signature: the
        // payer never authorised, so verification against the
        // buyer's key must fail.
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_success(
            CALL_ID.to_string(),
            HASH.to_string(),
            SELLER_SIG.to_string(),
            SELLER_SIG.to_string(),
        );
    }

    #[test]
    #[should_panic(expected = "Invalid seller signature")]
    fn buyer_only_success_rejected() {
        // Buyer signature presented as the seller attestation.
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_success(
            CALL_ID.to_string(),
            HASH.to_string(),
            BUYER_SIG.to_string(),
            BUYER_SIG.to_string(),
        );
    }

    #[test]
    #[should_panic(expected = "Call is not in paid state")]
    fn double_claim_rejected() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_success(
            CALL_ID.to_string(),
            HASH.to_string(),
            SELLER_SIG.to_string(),
            BUYER_SIG.to_string(),
        );
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_success(
            CALL_ID.to_string(),
            HASH.to_string(),
            SELLER_SIG.to_string(),
            BUYER_SIG.to_string(),
        );
    }

    #[test]
    #[should_panic(expected = "Call not found")]
    fn wrong_buyer_claim_rejected() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(OTHER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_failure(
            CALL_ID.to_string(),
            FAILURE_SELLER_ERROR.to_string(),
            None,
            None,
        );
    }

    #[test]
    fn failure_releases_hold() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let res = c.submit_failure(
            CALL_ID.to_string(),
            FAILURE_SELLER_ERROR.to_string(),
            Some(ERR_HASH.to_string()),
            Some(SELLER_ERR_SIG.to_string()),
        );
        assert_eq!(res.call.status, STATUS_FAILED_REFUNDED);
        assert_eq!(res.buyer_balance.held.0, 0);
        assert_eq!(res.buyer_balance.spent.0, 0);
        assert_eq!(res.buyer_balance.available.0, 1_000_000_000_000_000_000_000_000);
        assert_eq!(c.get_seller_balance().earned.0, 0);
    }

    #[test]
    fn timeout_claim_resolves_timeout_refunded() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let res = c.submit_failure(
            CALL_ID.to_string(),
            FAILURE_TIMEOUT.to_string(),
            None,
            None,
        );
        assert_eq!(res.call.status, STATUS_TIMEOUT_REFUNDED);
        assert_eq!(res.buyer_balance.held.0, 0);
        assert_eq!(res.buyer_balance.spent.0, 0);
    }

    #[test]
    #[should_panic(expected = "Invalid seller error signature")]
    fn forged_seller_error_rejected() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        // Buyer signature is not a seller error attestation.
        let _ = c.submit_failure(
            CALL_ID.to_string(),
            FAILURE_SELLER_ERROR.to_string(),
            Some(ERR_HASH.to_string()),
            Some(BUYER_SIG.to_string()),
        );
    }

    #[test]
    #[should_panic(expected = "Call is not in paid state")]
    fn success_after_failure_rejected() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_failure(
            CALL_ID.to_string(),
            FAILURE_TIMEOUT.to_string(),
            None,
            None,
        );
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_success(
            CALL_ID.to_string(),
            HASH.to_string(),
            SELLER_SIG.to_string(),
            BUYER_SIG.to_string(),
        );
    }

    #[test]
    fn over_budget_refused_with_record() {
        let mut c = new_contract();
        // Deposit 1 NEAR, cap lowered to 0.15 NEAR. First call of 0.1
        // is held (spent+held+price = 0.1 <= 0.15). Second call:
        // available (0.9) still covers the price, so the deposit
        // check passes, but spent+held+price = 0.2 > cap 0.15, so it
        // is refused over_budget (spec check order: deposit first,
        // then budget — a case where BOTH fail reports the deposit
        // reason instead, by design).
        set_ctx(BUYER, Some(BUYER_PUB), 1_000_000_000_000_000_000_000_000, 1_000_000_000_000);
        c.deposit();
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        c.set_budget_cap(U128::from(150_000_000_000_000_000_000_000));
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let first = c.request_call("call-a".to_string(), acct(SELLER));
        assert_eq!(first.status, STATUS_PAID);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let refused = c.request_call("call-b".to_string(), acct(SELLER));
        assert_eq!(refused.status, STATUS_REFUSED);
        let refusals = c.list_refusals(acct(BUYER), U64::from(0), U64::from(10));
        assert_eq!(refusals.len(), 1);
        assert_eq!(refusals[0].reason, REASON_OVER_BUDGET);
        let bal = c.get_buyer_balance(acct(BUYER));
        assert_eq!(bal.held.0, PRICE); // only the first call is held
        assert_eq!(bal.spent.0, 0);
    }

    #[test]
    fn cap_below_deposit_refused() {
        let mut c = new_contract();
        set_ctx(BUYER, Some(BUYER_PUB), 1_000_000_000_000_000_000_000_000, 1_000_000_000_000);
        c.deposit();
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        c.set_budget_cap(U128::from(PRICE));
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let first = c.request_call("call-a".to_string(), acct(SELLER));
        assert_eq!(first.status, STATUS_PAID);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let refused = c.request_call("call-b".to_string(), acct(SELLER));
        assert_eq!(refused.status, STATUS_REFUSED);
        let refusals = c.list_refusals(acct(BUYER), U64::from(0), U64::from(10));
        assert_eq!(refusals[0].reason, REASON_OVER_BUDGET);
    }

    #[test]
    fn zero_deposit_refused() {
        let mut c = new_contract();
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let rec = c.request_call(CALL_ID.to_string(), acct(SELLER));
        assert_eq!(rec.status, STATUS_REFUSED);
        let refusals = c.list_refusals(acct(BUYER), U64::from(0), U64::from(10));
        assert_eq!(refusals[0].reason, REASON_INSUFFICIENT_DEPOSIT);
        let bal = c.get_buyer_balance(acct(BUYER));
        assert_eq!(bal.deposit.0, 0);
        assert_eq!(bal.held.0, 0);
    }

    #[test]
    fn wrong_seller_and_duplicate_refused() {
        let mut c = new_contract();
        set_ctx(BUYER, Some(BUYER_PUB), 1_000_000_000_000_000_000_000_000, 1_000_000_000_000);
        c.deposit();
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let rec = c.request_call(CALL_ID.to_string(), acct(OTHER));
        assert_eq!(rec.status, STATUS_REFUSED);
        let refusals = c.list_refusals(acct(BUYER), U64::from(0), U64::from(10));
        assert_eq!(refusals[0].reason, REASON_WRONG_SELLER);
        // The wrong-seller refusal TAKES the call_id (test 15: a
        // call_id in ANY state, refused included, is a duplicate),
        // so a fresh id is used for the paid call.
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let ok = c.request_call("call-ok".to_string(), acct(SELLER));
        assert_eq!(ok.status, STATUS_PAID);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let dup = c.request_call("call-ok".to_string(), acct(SELLER));
        assert_eq!(dup.status, STATUS_REFUSED);
        let refusals = c.list_refusals(acct(BUYER), U64::from(0), U64::from(10));
        // Newest first: duplicate refusal is on top.
        assert_eq!(refusals[0].reason, REASON_DUPLICATE_CALL_ID);
        assert_eq!(refusals[1].reason, REASON_WRONG_SELLER);
    }

    #[test]
    fn second_buyer_isolated() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(OTHER, Some(BUYER_PUB), 500_000_000_000_000_000_000_000, 1_000_000_000_000);
        c.deposit();
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_failure(
            CALL_ID.to_string(),
            FAILURE_TIMEOUT.to_string(),
            None,
            None,
        );
        let other = c.get_buyer_balance(acct(OTHER));
        assert_eq!(other.deposit.0, 500_000_000_000_000_000_000_000);
        assert_eq!(other.held.0, 0);
        assert_eq!(other.spent.0, 0);
    }

    #[test]
    fn expire_before_deadline_rejected_then_releases() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        // Proposed at 1_000_000_000_000 ns; deadline +600s.
        set_ctx(OTHER, None, 0, 1_000_000_000_000 + 599_000_000_000);
        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.expire_call(acct(BUYER), CALL_ID.to_string());
        }))
        .expect_err("expiry before deadline must panic");
        let still = c.get_call(acct(BUYER), CALL_ID.to_string()).unwrap();
        assert_eq!(still.status, STATUS_PAID);
        // Third party (OTHER) may expire after the deadline.
        set_ctx(OTHER, None, 0, 1_000_000_000_000 + 600_000_000_000);
        let res = c.expire_call(acct(BUYER), CALL_ID.to_string());
        assert_eq!(res.call.status, STATUS_TIMEOUT_REFUNDED);
        assert_eq!(res.buyer_balance.held.0, 0);
    }

    #[test]
    fn withdraw_pays_earned_once() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_success(
            CALL_ID.to_string(),
            HASH.to_string(),
            SELLER_SIG.to_string(),
            BUYER_SIG.to_string(),
        );
        set_ctx(SELLER, None, 0, 1_000_000_000_000);
        let _ = c.withdraw();
        let bal = c.get_seller_balance();
        assert_eq!(bal.earned.0, 0);
        assert_eq!(bal.withdrawn.0, PRICE);
    }

    #[test]
    #[should_panic(expected = "Nothing to withdraw")]
    fn second_withdraw_rejected() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_success(
            CALL_ID.to_string(),
            HASH.to_string(),
            SELLER_SIG.to_string(),
            BUYER_SIG.to_string(),
        );
        set_ctx(SELLER, None, 0, 1_000_000_000_000);
        let _ = c.withdraw();
        set_ctx(SELLER, None, 0, 1_000_000_000_000);
        let _ = c.withdraw();
    }

    #[test]
    #[should_panic(expected = "Only the seller can withdraw")]
    fn non_seller_withdraw_rejected() {
        let mut c = new_contract();
        deposit_and_request(&mut c, 1_000_000_000_000_000_000_000_000);
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.submit_success(
            CALL_ID.to_string(),
            HASH.to_string(),
            SELLER_SIG.to_string(),
            BUYER_SIG.to_string(),
        );
        set_ctx(BUYER, Some(BUYER_PUB), 0, 1_000_000_000_000);
        let _ = c.withdraw();
    }
}
