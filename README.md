# ENIAD Digital Certificate System

> 🎓 A production-ready decentralized application (DApp) for issuing and verifying tamper-proof academic certificates on the Ethereum blockchain.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

## 📋 Overview

ENIAD Digital Certificate System enables universities to issue blockchain-verified diplomas that are:
- **Immutable** - Cannot be modified or deleted
- **Verifiable** - Anyone can verify authenticity with a hash or ID
- **Transparent** - All issuances are recorded on-chain with events
- **Secure** - Only authorized admins can issue certificates

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend                               │
│   HTML5 + CSS3 + Vanilla JS + Ethers.js v5.7.2              │
│   • Glassmorphism UI  • Toast Notifications  • Mobile-ready │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                    Backend API (Express.js)                  │
│   • RESTful Endpoints  • Rate Limiting  • Security Headers  │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                  Blockchain (Ethereum)                       │
│   ENIADDigitalCertificate.sol (Solidity ^0.8.20)            │
│   • Issue/Verify/Revoke  • Event Logging  • Admin Control   │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- [MetaMask](https://metamask.io/) browser extension
- Git

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/N48I1/ENIAD-SmartCert.git
cd ENIAD-SmartCert

# Install contract dependencies
cd contracts && npm install

# Install backend dependencies
cd ../backend && npm install
```

### 2. Start Local Blockchain

```bash
# Terminal 1
cd contracts
npx hardhat node
```

### 3. Deploy Smart Contract

```bash
# Terminal 2
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Start Web Server

```bash
# Terminal 3
cd backend
npm start
```

### 5. Access Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🦊 MetaMask Setup

1. Open MetaMask and add a custom network:
   - **Network Name**: Localhost 8545
   - **RPC URL**: http://localhost:8545
   - **Chain ID**: 1337
   - **Currency**: ETH

2. Import Hardhat test account (Admin):
   - Copy private key from Hardhat node output (Account #0)
   - In MetaMask: Account → Import Account → Paste private key

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with blockchain status |
| `POST` | `/api/certificates/hash` | Generate SHA-256 hash for certificate data |
| `GET` | `/api/certificates` | List all certificates (paginated) |
| `GET` | `/api/certificates/:id` | Get certificate by ID |
| `GET` | `/api/certificates/verify/:hash` | Verify certificate by hash |
| `POST` | `/api/admin/issue` | Issue new certificate (requires PRIVATE_KEY in .env) |

### Example: Verify Certificate

```bash
curl http://localhost:3000/api/certificates/verify/0x...your_hash
```

Response:
```json
{
  "verified": true,
  "message": "Certificate is valid",
  "certificate": {
    "id": 1,
    "studentName": "John Doe",
    "diploma": "Master in Computer Science",
    "year": 2025,
    "isValid": true
  }
}
```

## 📜 Smart Contract Functions

| Function | Access | Description |
|----------|--------|-------------|
| `issueCertificate(name, id, diploma, year)` | Admin Only | Issue new certificate |
| `verifyCertificate(hash)` | Public | Verify by hash (reverts if invalid) |
| `verifyCertificateById(id)` | Public | Verify by ID |
| `getCertificateByHash(hash)` | Public | Get certificate (works for revoked) |
| `revokeCertificate(id)` | Admin Only | Revoke a certificate |
| `getCertificateCount()` | Public | Get total issued count |

### Events

- `CertificateIssued(bytes32 hash, uint256 id, string studentId)`
- `CertificateRevoked(bytes32 hash, uint256 id)`

## 🌐 Deploying to Sepolia Testnet

1. Create `.env` in contracts folder:
```env
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

2. Get Sepolia ETH from [faucet](https://sepoliafaucet.com/)

3. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

4. Verify on Etherscan:
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 🧪 Running Tests

```bash
cd contracts
npx hardhat test
```

Expected output:
```
  ENIADDigitalCertificate
    Issuance
      ✓ Should allow admin to issue a certificate
      ✓ Should fail if non-admin tries to issue
      ✓ Should emit CertificateIssued event
    Verification
      ✓ Should verify valid certificate by hash
      ✓ Should verify valid certificate by ID
      ✓ Should fail verification for invalid hash
    Revocation
      ✓ Should allow admin to revoke a certificate
      ✓ Should emit CertificateRevoked event
      ✓ Should fail if non-admin tries to revoke
      ✓ Should fail to revoke already revoked certificate
      ✓ Should still allow viewing revoked certificate
    Certificate Count
      ✓ Should return correct certificate count

  12 passing
```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| MetaMask not connecting | Ensure network is Localhost 8545 with Chain ID 1337 |
| "Only admin" error | Import Hardhat Account #0 private key to MetaMask |
| Contract not found | Re-run deploy script, check `frontend/config.js` has correct address |
| Transactions stuck | Reset MetaMask account: Settings → Advanced → Clear Activity |
| Port 3000 in use | Change PORT in `backend/.env` |

## 📁 Project Structure

```
ENIAD-SmartCert/
├── contracts/
│   ├── contracts/
│   │   └── ENIADDigitalCertificate.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── ENIADDigitalCertificate.test.js
│   ├── hardhat.config.js
│   └── package.json
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── config.js
│   └── artifacts/
└── README.md
```

## 🔒 Security Features

- **Smart Contract**: onlyAdmin modifier, input validation, reentrancy-safe
- **Backend**: Helmet.js headers, CORS, rate limiting, input sanitization
- **Frontend**: MetaMask validation, transaction confirmation, error boundaries

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

---

<p align="center">Built with ❤️ for ENIAD Engineering School</p>
