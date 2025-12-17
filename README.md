# ENIAD Digital Certificate System

A decentralized application (DApp) for issuing and verifying academic diplomas on the Ethereum Blockchain. Validates authenticity and prevents forgery using cryptographic proofs.

## Project Architecture

- **Blockchain**: Ethereum (Hardhat Local Network)
- **Smart Contract**: Solidity (`ENIADDigitalCertificate.sol`)
- **Frontend**: HTML5, CSS3, JavaScript, Ethers.js
- **Backend**: Node.js/Express (Serving static assets)

## Prerequisites

- Node.js & npm
- MetaMask Browser Extension

## Setup & Installation

1.  **Install Dependencies**
    ```bash
    # Install root/backend/contracts dependencies if needed, or simply inner folders
    cd contracts && npm install
    cd ../backend && npm install
    ```

2.  **Start Local Blockchain**
    ```bash
    # Terminal 1
    cd contracts
    npx hardhat node
    ```

3.  **Deploy Smart Contract**
    ```bash
    # Terminal 2
    cd contracts
    npx hardhat run scripts/deploy.js --network localhost
    ```
    *Note: This will update `frontend/config.js` with the new contract address.*

4.  **Start Web Server**
    ```bash
    # Terminal 3 (or same as Terminal 2)
    cd backend
    npm start
    ```

5.  **Access Application**
    - Open `http://localhost:3000` in your browser.

## Usage Guide

1.  **Connect Wallet**: Click "Connect Wallet". Ensure MetaMask is on `Localhost 8545`.
    - *Tip: Import Hardhat Account #0 (Admin) to issue certificates.*
2.  **Issue Certificate (Admin Only)**:
    - Go to "Admin Dashboard".
    - Fill in Student Name, ID, Diploma, Year.
    - Click "Issue Certificate" and confirm transaction.
3.  **Verify Certificate**:
    - Copy the Certificate Hash returned after issuance.
    - Go to "Verify Diploma".
    - Paste Hash or ID and search.

## Features

- **Immutable Records**: Certificates cannot be modified or deleted.
- **Public Verification**: Anyone with the hash or ID can verify validity.
- **Admin Control**: Only the contract deployer (University) can issue certificates.
