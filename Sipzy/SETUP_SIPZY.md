# SIPZY MVP SETUP GUIDE

Complete setup instructions for deploying and running the Sipzy Watch-to-Trade platform.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher) - `npm install -g pnpm`
- **Rust** (latest stable) - [Install Rust](https://rustup.rs/)
- **Solana CLI** (v1.18+) - [Install Solana](https://docs.solana.com/cli/install-solana-cli-tools)
- **Anchor CLI** (v0.30.1) - `cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.30.1`

---

## 🔧 1. Deploy the Anchor Program

### Step 1: Configure Solana CLI for Devnet

```bash
# Set cluster to devnet
solana config set --url https://api.devnet.solana.com

# Generate a new keypair (if you don't have one)
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop some SOL for deployment
solana airdrop 2
```

### Step 2: Build the Program

```bash
# Navigate to the project root (Sipzy folder)
cd Sipzy

# Build the Anchor program
anchor build
```

### Step 3: Get Your Program ID

After building, a keypair is generated at `target/deploy/sipzy_vault-keypair.json`.

```bash
# Get the program ID from the generated keypair
solana address -k target/deploy/sipzy_vault-keypair.json
```

**Copy this address** - you'll need it in the next steps.

### Step 4: Update Program ID

Update the program ID in these files:

1. **`programs/sipzy_vault/src/lib.rs`** - Line 4:
```rust
declare_id!("YOUR_PROGRAM_ID_HERE");
```

2. **`Anchor.toml`** - Update both devnet and localnet:
```toml
[programs.devnet]
sipzy_vault = "YOUR_PROGRAM_ID_HERE"

[programs.localnet]
sipzy_vault = "YOUR_PROGRAM_ID_HERE"
```

3. **`lib/idl/sipzy_vault.json`** - Update metadata:
```json
"metadata": {
  "address": "YOUR_PROGRAM_ID_HERE"
}
```

### Step 5: Rebuild and Deploy

```bash
# Rebuild with updated ID
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

You should see output like:
```
Deploying program "sipzy_vault"...
Program deployed to YOUR_PROGRAM_ID_HERE
```

---

## 🌐 2. Configure Environment Variables

Create a `.env.local` file in the `Sipzy` directory:

```bash
# Create the file
touch .env.local
```

Add the following environment variables:

```env
# ======================
# SOLANA CONFIGURATION
# ======================

# Your deployed program ID from Step 1
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID_HERE

# Treasury/Creator wallet for fee collection (your wallet or a dedicated treasury)
NEXT_PUBLIC_TREASURY_ADDRESS=YOUR_TREASURY_PUBKEY

# RPC URL (use devnet or your own RPC provider)
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# ======================
# x402 CONFIGURATION
# ======================

# Your wallet address for receiving x402 payments (can be same as treasury)
NEXT_PUBLIC_RECEIVER_ADDRESS=YOUR_RECEIVER_ADDRESS

# Network for x402 payments
NEXT_PUBLIC_NETWORK=solana-devnet

# x402 Facilitator URL (use official or self-hosted)
NEXT_PUBLIC_FACILITATOR_URL=https://facilitator.x402.org

# Coinbase Developer Platform API Key (for x402 verification)
# Get one at: https://portal.cdp.coinbase.com/
NEXT_PUBLIC_CDP_CLIENT_KEY=YOUR_CDP_CLIENT_KEY

# ======================
# APP CONFIGURATION
# ======================

# Base URL for Solana Actions/Blinks (update for production)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Getting x402 Configuration

1. **NEXT_PUBLIC_RECEIVER_ADDRESS**: Your Solana wallet address for receiving USDC payments
2. **NEXT_PUBLIC_CDP_CLIENT_KEY**: 
   - Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
   - Create a new project
   - Generate an API key
   - Copy the client key

---

## 🚀 3. Run the Development Server

### Step 1: Install Dependencies

```bash
# Install all dependencies
pnpm install
```

### Step 2: Start the Dev Server

```bash
# Start Next.js development server
pnpm dev
```

The app will be available at `http://localhost:3000`

---

## 🧪 4. Test the Application

### Test the Main Features

1. **Home Page** (`http://localhost:3000`)
   - Paste a YouTube URL or video ID
   - Click "Launch" to navigate to the watch page

2. **Watch & Trade Page** (`http://localhost:3000/watch/dQw4w9WgXcQ`)
   - Connect your Phantom or Solflare wallet
   - Initialize a pool (if first time)
   - Buy/sell tokens

3. **x402 Premium Gate** (`http://localhost:3000/watch/dQw4w9WgXcQ/premium`)
   - This route requires 0.01 USDC payment via x402
   - The middleware will intercept and show payment modal

4. **Blink API** (`http://localhost:3000/api/actions/trade?id=dQw4w9WgXcQ`)
   - Visit this URL to see the Solana Actions JSON response
   - Share this URL on X/Twitter to enable trading via Blinks

### Get Devnet SOL & USDC

```bash
# Airdrop devnet SOL
solana airdrop 2 YOUR_WALLET_ADDRESS

# For devnet USDC, use a faucet or mint from the devnet USDC program
```

---

## 📁 Project Structure

```
Sipzy/
├── app/
│   ├── api/
│   │   └── actions/
│   │       ├── route.ts          # Actions discovery endpoint
│   │       └── trade/
│   │           └── route.ts      # Blink trading endpoint
│   ├── watch/
│   │   └── [id]/
│   │       ├── page.tsx          # Watch page (server)
│   │       ├── client.tsx        # Watch page (client)
│   │       └── premium/
│   │           └── page.tsx      # Premium gated content
│   ├── content/                  # x402 demo pages
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Home page
├── components/
│   ├── providers/
│   │   └── wallet-provider.tsx   # Solana wallet adapter
│   ├── trading-sidebar.tsx       # Trading widget
│   └── youtube-player.tsx        # YouTube embed
├── lib/
│   ├── idl/
│   │   └── sipzy_vault.json      # Anchor IDL
│   └── program.ts                # Program utilities
├── programs/
│   └── sipzy_vault/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs            # Anchor program
├── public/
│   └── actions.json              # Solana Actions manifest
├── middleware.ts                 # x402 payment gate
├── Anchor.toml
├── package.json
└── SETUP_SIPZY.md               # This file
```

---

## 🔍 Understanding the Components

### Bonding Curve Formula

```
Price = (Supply × 0.0001) + 0.01 SOL
```

- **Base Price**: 0.01 SOL (10,000,000 lamports)
- **Slope**: 0.0001 SOL per token (100,000 lamports)
- **Example**: At supply 100, price = 0.01 + (100 × 0.0001) = 0.02 SOL

### Fee Structure

- **1% Trade Fee**: Every buy/sell sends 1% to the creator wallet
- **x402 Gate**: $0.01 USDC for premium content access

### Solana Actions (Blinks)

The `/api/actions/trade` endpoint follows the [Solana Actions spec](https://solana.com/docs/advanced/actions):

- **GET**: Returns action metadata with buy options
- **POST**: Creates and returns a transaction for signing

---

## 🐛 Troubleshooting

### Common Issues

1. **"Program not found" error**
   - Ensure the program is deployed to the correct cluster
   - Verify `NEXT_PUBLIC_PROGRAM_ID` matches your deployed program

2. **x402 payment not working**
   - Check `NEXT_PUBLIC_CDP_CLIENT_KEY` is valid
   - Ensure `NEXT_PUBLIC_FACILITATOR_URL` is reachable
   - Verify you have devnet USDC in your wallet

3. **Wallet won't connect**
   - Ensure you're on Solana Devnet in your wallet settings
   - Try refreshing the page

4. **Anchor build fails**
   - Run `rustup update` to update Rust
   - Ensure Anchor CLI version matches (v0.30.1)

### Logs and Debugging

```bash
# View program logs
solana logs YOUR_PROGRAM_ID

# Check transaction status
solana confirm TRANSACTION_SIGNATURE -v
```

---

## 🚢 Production Deployment

For production deployment:

1. **Update cluster to mainnet**:
   - Change `Anchor.toml` provider cluster to `mainnet`
   - Update `NEXT_PUBLIC_RPC_URL` to mainnet RPC
   - Update `NEXT_PUBLIC_NETWORK` to `solana-mainnet`

2. **Deploy to Vercel/Netlify**:
   - Add all environment variables to your hosting platform
   - Update `NEXT_PUBLIC_BASE_URL` to your production domain

3. **Security considerations**:
   - Audit the smart contract before mainnet deployment
   - Implement rate limiting on API routes
   - Add proper error handling and validation

---

## 📚 Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [x402 Protocol](https://x402.org/)
- [Solana Actions & Blinks](https://solana.com/docs/advanced/actions)
- [Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

---

**Built with ❤️ for the Creator Economy**

