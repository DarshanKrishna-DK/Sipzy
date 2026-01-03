# FILE: README_MVP.md
# PROJECT: SIPZY 24-HOUR SPRINT MANIFEST
# ==============================================================================

## 1. STRATEGIC SCOPE (THE "MINIMUM" PRODUCT)
Build a functional Web Portal where users watch YouTube streams and engage in an 
instant circular economy via Solana.

- GOAL: Show a "Watch-to-Trade" loop and a "Pay-to-Unlock" gate.
- NON-GOAL: No database, no user profiles, no search bars, no legal compliance.

## 2. SYSTEM ARCHITECTURE
- FRONTEND: Next.js 14 (App Router) + Tailwind + @solana/wallet-adapter.
- ON-CHAIN: One Anchor Program (Sipzy_Vault) for Bonding Curve logic.
- PAYWALL: x402 Protocol middleware for gated content.
- VIDEO: Static YouTube iFrame embedding.

## 3. CORE FEATURES (THE MUST-HAVES)
### [A] The Bonding Curve (The Economic Engine)
- Instruction: `initialize_pool` -> Takes a YouTube ID and creates a PDA.
- Instruction: `buy_tokens` -> Math: Price = (Supply * 0.0001) + 0.01 SOL.
- Instruction: `sell_tokens` -> Returns SOL to user from PDA; burns tokens.
- Revenue: 1% of every trade is routed directly to the Creator's Pubkey.

### [B] The x402 Paywall (The Access Engine)
- Route: `/watch/[id]/premium`
- Trigger: HTTP 402 "Payment Required" if 0.01 USDC has not been sent.
- UI: Pop-up modal handled by the x402-template to sign payment.

### [C] The Portal UI
- Main Dashboard: Pasted URL loads the video and the Sidebar.
- Sidebar: Real-time price feed (fetched from Program State) + Buy/Sell buttons.

## 4. TEAM SPLIT & TASK LIST
- MEMBER A (BLOCKCHAIN): 
  1. Write `lib.rs` in Solana Playground.
  2. Deploy to Devnet.
  3. Export IDL for Member B.
- MEMBER B (FRONTEND):
  1. Setup Next.js with `create-solana-dapp`.
  2. Implement Sidebar Trading Logic using Member A's IDL.
  3. Configure x402 middleware for the Premium Gate.

## 5. MVP SUCCESS METRIC
"A user can paste a link, buy a token that makes the price go up for the next person, 
and pay 0.01 USDC to unlock the secret chat."

# ==============================================================================
# CURSOR INSTRUCTION: Use this file as the SOURCE OF TRUTH for all code generation.
# ==============================================================================