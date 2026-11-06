// MeteredPay dashboard — single config value for the seller API.
// The dashboard is read-only: it never signs, never sends a contract
// transaction, and never asks for a private key or seed phrase.
// Change SELLER_URL here to point at a hosted seller; the default is
// the local demonstrator seller.
window.METEREDPAY_CONFIG = {
  CONTRACT_ID: 'apathetic-party.testnet',
  SELLER_ACCOUNT_ID: 'tedious-sea.testnet',
  PRICE_NEAR: '0.1',
  PRICE_YOCTO: '100000000000000000000000',
  BUYER_WAIT_SECONDS: 30,
  BACKSTOP_SECONDS: 600,
  DEMO_DEPOSIT_NEAR: '0.5',
  DEMO_CAP_NEAR: '0.2',
  // RPC endpoints, tried in order, with retries (see app.js).
  // FastNear is primary: the deprecated rpc.testnet.near.org endpoint
  // was rate-limited during days 4-5 verification.
  RPC_URLS: [
    'https://rpc.testnet.fastnear.com',
    'https://rpc.testnet.near.org'
  ],
  EXPLORER_TX: 'https://testnet.nearblocks.io/txns/',
  EXPLORER_ACCOUNT: 'https://testnet.nearblocks.io/address/',
  // Block pages, for live history rows: the frozen contract stores no
  // transaction hash per call (see app.js rowExplorerHtml), so a live
  // row links to the block that contains it instead of an invented tx.
  EXPLORER_BLOCK: 'https://testnet.nearblocks.io/blocks/',
  // Demonstrator seller API. Default: local. Set to a hosted URL
  // (e.g. https://seller.example.com) when one exists.
  SELLER_URL: 'http://127.0.0.1:8787',
  // Buyer used for the recorded demo run (Journey 0 playback) —
  // the canonical freeze1011 replay (dashboard/frozen-run.json).
  DEMO_BUYER: 'freeze1011-buyer.testnet'
};
