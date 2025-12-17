# Deploying with Remix IDE to zkSync Sepolia

## Step 1: Get zkSync Sepolia ETH

1. Go to [zkSync Faucet](https://portal.zksync.io/bridge/)
2. Connect your wallet: `0xbd3f5a66e602391e54CF9CA7DD307545219119fA`
3. Get some test ETH on zkSync Sepolia

## Step 2: Configure MetaMask for zkSync Sepolia

Add this network to MetaMask:
- **Network Name**: zkSync Sepolia Testnet
- **RPC URL**: https://sepolia.era.zksync.dev
- **Chain ID**: 300
- **Currency**: ETH
- **Explorer**: https://sepolia.explorer.zksync.io

## Step 3: Deploy with Remix IDE

1. Open [Remix IDE](https://remix.ethereum.org/)

2. Create a new file `ENIADDigitalCertificate.sol` and paste the contract code from:
   `/home/n48i1/Documents/S9-ENIAD/Blockchain/Mini-Projet/contracts/contracts/ENIADDigitalCertificate.sol`

3. Compile:
   - Go to **Solidity Compiler** tab
   - Set compiler version to `0.8.20`
   - Click **Compile**

4. Deploy:
   - Go to **Deploy & Run Transactions** tab
   - Environment: **Injected Provider - MetaMask**
   - Make sure MetaMask is on **zkSync Sepolia**
   - Click **Deploy**
   - Confirm transaction in MetaMask

5. Copy the deployed contract address (looks like `0x...`)

## Step 4: Update Your Config

After deployment, update these files with your contract address:

### frontend/config.js
```javascript
const CONFIG = {
  contractAddress: "0xYOUR_CONTRACT_ADDRESS_HERE",
  // ... rest stays the same
};
```

### backend/.env
```env
CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS_HERE
```

## Step 5: Start the Application

```bash
cd backend
npm start
```

Open http://localhost:3000 in your browser.

## Your Wallet is the Admin!

Since you deployed the contract, your wallet `0xbd3f5a66e602391e54CF9CA7DD307545219119fA` is automatically the admin and can issue certificates.
