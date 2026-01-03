# ==============================================================================
# PROJECT: SIPZY - UNIVERSAL WEBOVERLAY SOCIAL ECONOMY
# STATUS: SYSTEM ARCHITECTURE SPECIFICATION V1.0
# ==============================================================================

# 1. PROBLEM STATEMENT (THE WHY)
# ------------------------------------------------------------------------------
# - Value Leakage: YouTube/Twitch take 30-50% cuts. Creators get pennies.
# - Static Viewership: Fans watch but don't participate in financial growth.
# - High Friction: SocialFi apps fail because they try to "replace" YouTube.
# - Monetization Lag: Ad-revenue takes months to settle.

# 2. THE SIPZY SOLUTION (THE WHAT)
# ------------------------------------------------------------------------------
# Sipzy is an economic meta-layer that sits on top of existing platforms.
# - Dynamic Overlay: Embeds YouTube/Twitch streams with a financial sidebar.
# - Creator Equity: Tokenizes the "Hype" of a creator or a specific stream.
# - Atomic Micropayments: Uses x402 for sub-cent, pay-as-you-go viewing.
# - Interoperability: Shareable "Blinks" turn any URL into a trading terminal.

# 3. TECHNICAL ARCHITECTURE (HYBRID MODEL)
# ------------------------------------------------------------------------------
# [On-Chain: Solana]
#   - Bonding Curve (Vault): Manages instant liquidity for Creator Coins.
#   - cNFT Registry: Low-cost minting for stream milestones and badges.
#   - x402 Verifier: Atomic on-chain checks for access-controlled content.
#
# [Off-Chain: Sipzy Portal]
#   - Metadata Store: PostgreSQL index for YouTube Video IDs & token hashes.
#   - Media Proxy: Websocket server to serve premium "Gated" video frames.
#   - AI Oracle: Scans chat sentiment to trigger "Hype Trading" windows.

# 4. BUSINESS & REVENUE MODEL (THE SUSTAINABILITY)
# ------------------------------------------------------------------------------
# Sipzy survives by being high-volume and low-overhead.
# - Transaction Fee: 1% fee on bonding curve trades.
#   - 50% to Creator (Instant Revenue).
#   - 50% to Sipzy DAO (Growth & NGO Support).
# - Service Fee: $0.001 flat fee for every x402 micropayment verified.
# - Launchpad Tax: 10% of initial coin supply reserved for Creator/Sipzy.

# 5. CORE FEATURES & USPs
# ------------------------------------------------------------------------------
# - HypeCurve: Token price rises based on social engagement metrics.
# - StreamBlinks: Fans buy tokens directly inside X (Twitter) or Discord chats.
# - Permissionless Launch: Fans can start a "Fan Coin" for any creator.
# - Creator Claim: Creators connect via OAuth to claim their fee escrow.

# 6. PRODUCT SCHEMA (SOLANA PLAYGROUND READY)
# ------------------------------------------------------------------------------
# Sipzy_Vault Program Account:
# {
#   u64 total_reserve_sol: Total liquidity in the bonding curve
#   u64 circulating_supply: Tokens issued for this creator
#   Pubkey creator_wallet: Beneficiary for the 0.5% trade commission
#   bool is_claimed: Whether the creator has verified their identity
# }

# 7. DEVELOPMENT STAGES
# ------------------------------------------------------------------------------
# [STAGE 1] -> Base Bonding Curve (Rust/Solpg) & YouTube Embed.
# [STAGE 2] -> x402 SDK Integration for Pay-Per-View.
# [STAGE 3] -> Action API for generating "Trading Blinks".
# [STAGE 4] -> AI Hype-Detector for automated Flash-Sales.

# ==============================================================================
# END DOCUMENTATION - READY FOR DEPLOYMENT ON SOLANA PLAYGROUND
# ==============================================================================
