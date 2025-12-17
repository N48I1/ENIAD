/**
 * ENIAD Certificate Verification Backend API
 * 
 * RESTful API server for blockchain certificate operations
 * Provides endpoints for issuing, verifying, and listing certificates
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const crypto = require('crypto');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "http://localhost:8545", "ws://localhost:8545"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Request logging
app.use(morgan('combined'));

// JSON body parsing
app.use(express.json());

// Static files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// =============================================================================
// BLOCKCHAIN CONNECTION (zkSync Sepolia Testnet)
// =============================================================================

let provider;
let contract;

// Contract ABI (from Remix IDE deployment)
const contractABI = [
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes32", "name": "certificateHash", "type": "bytes32" }, { "indexed": true, "internalType": "uint256", "name": "certificateId", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "studentId", "type": "string" }], "name": "CertificateIssued", "type": "event" },
    { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes32", "name": "certificateHash", "type": "bytes32" }, { "indexed": true, "internalType": "uint256", "name": "certificateId", "type": "uint256" }], "name": "CertificateRevoked", "type": "event" },
    { "inputs": [], "name": "admin", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "certificateCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "certificateIds", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "name": "certificates", "outputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "string", "name": "studentName", "type": "string" }, { "internalType": "string", "name": "studentId", "type": "string" }, { "internalType": "string", "name": "diploma", "type": "string" }, { "internalType": "uint256", "name": "year", "type": "uint256" }, { "internalType": "address", "name": "issuer", "type": "address" }, { "internalType": "uint256", "name": "issuedAt", "type": "uint256" }, { "internalType": "bool", "name": "isValid", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "bytes32", "name": "_hash", "type": "bytes32" }], "name": "getCertificateByHash", "outputs": [{ "internalType": "bool", "name": "exists", "type": "bool" }, { "components": [{ "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "string", "name": "studentName", "type": "string" }, { "internalType": "string", "name": "studentId", "type": "string" }, { "internalType": "string", "name": "diploma", "type": "string" }, { "internalType": "uint256", "name": "year", "type": "uint256" }, { "internalType": "address", "name": "issuer", "type": "address" }, { "internalType": "uint256", "name": "issuedAt", "type": "uint256" }, { "internalType": "bool", "name": "isValid", "type": "bool" }], "internalType": "struct ENIADDigitalCertificate.Certificate", "name": "cert", "type": "tuple" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getCertificateCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "string", "name": "_studentName", "type": "string" }, { "internalType": "string", "name": "_studentId", "type": "string" }, { "internalType": "string", "name": "_diploma", "type": "string" }, { "internalType": "uint256", "name": "_year", "type": "uint256" }], "name": "issueCertificate", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }], "name": "revokeCertificate", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "bytes32", "name": "_hash", "type": "bytes32" }], "name": "verifyCertificate", "outputs": [{ "components": [{ "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "string", "name": "studentName", "type": "string" }, { "internalType": "string", "name": "studentId", "type": "string" }, { "internalType": "string", "name": "diploma", "type": "string" }, { "internalType": "uint256", "name": "year", "type": "uint256" }, { "internalType": "address", "name": "issuer", "type": "address" }, { "internalType": "uint256", "name": "issuedAt", "type": "uint256" }, { "internalType": "bool", "name": "isValid", "type": "bool" }], "internalType": "struct ENIADDigitalCertificate.Certificate", "name": "", "type": "tuple" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }], "name": "verifyCertificateById", "outputs": [{ "components": [{ "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "string", "name": "studentName", "type": "string" }, { "internalType": "string", "name": "studentId", "type": "string" }, { "internalType": "string", "name": "diploma", "type": "string" }, { "internalType": "uint256", "name": "year", "type": "uint256" }, { "internalType": "address", "name": "issuer", "type": "address" }, { "internalType": "uint256", "name": "issuedAt", "type": "uint256" }, { "internalType": "bool", "name": "isValid", "type": "bool" }], "internalType": "struct ENIADDigitalCertificate.Certificate", "name": "", "type": "tuple" }], "stateMutability": "view", "type": "function" }
];

// Initialize blockchain connection
function initBlockchain() {
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!contractAddress) {
        console.warn('CONTRACT_ADDRESS not set. Some API endpoints will be unavailable.');
        return false;
    }

    try {
        provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        contract = new ethers.Contract(contractAddress, contractABI, provider);
        console.log(`Connected to blockchain at ${rpcUrl}`);
        console.log(`Contract address: ${contractAddress}`);
        return true;
    } catch (error) {
        console.error('Failed to connect to blockchain:', error.message);
        return false;
    }
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        blockchain: {
            connected: false,
            network: null,
            contractAddress: process.env.CONTRACT_ADDRESS || null
        }
    };

    try {
        if (provider) {
            const network = await provider.getNetwork();
            health.blockchain.connected = true;
            health.blockchain.network = network.name;
            health.blockchain.chainId = network.chainId;
        }
    } catch (error) {
        health.blockchain.error = error.message;
    }

    res.json(health);
});

/**
 * @route POST /api/certificates/hash
 * @description Generate SHA-256 hash for certificate data
 * @body { studentName, studentId, diploma, year }
 */
app.post('/api/certificates/hash', (req, res) => {
    try {
        const { studentName, studentId, diploma, year } = req.body;

        if (!studentName || !studentId || !diploma || !year) {
            return res.status(400).json({
                error: 'Missing required fields: studentName, studentId, diploma, year'
            });
        }

        // Generate SHA-256 hash
        const dataString = `${studentName}|${studentId}|${diploma}|${year}|${Date.now()}`;
        const hash = crypto.createHash('sha256').update(dataString).digest('hex');

        res.json({
            hash: `0x${hash}`,
            data: { studentName, studentId, diploma, year },
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Hash generation error:', error);
        res.status(500).json({ error: 'Failed to generate hash' });
    }
});

/**
 * @route GET /api/certificates
 * @description List all certificates (paginated)
 * @query page (default: 1), limit (default: 10)
 */
app.get('/api/certificates', async (req, res) => {
    if (!contract) {
        return res.status(503).json({ error: 'Blockchain connection not available' });
    }

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);

        const totalCount = await contract.getCertificateCount();
        const total = totalCount.toNumber();

        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);

        const certificates = [];

        for (let id = start; id <= end; id++) {
            try {
                const hash = await contract.certificateIds(id);
                const [exists, cert] = await contract.getCertificateByHash(hash);

                if (exists) {
                    certificates.push({
                        id: cert.id.toNumber(),
                        hash: hash,
                        studentName: cert.studentName,
                        studentId: cert.studentId,
                        diploma: cert.diploma,
                        year: cert.year.toNumber(),
                        issuedAt: new Date(cert.issuedAt.toNumber() * 1000).toISOString(),
                        isValid: cert.isValid,
                        issuer: cert.issuer
                    });
                }
            } catch (err) {
                // Skip invalid entries
            }
        }

        res.json({
            certificates,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('List certificates error:', error);
        res.status(500).json({ error: 'Failed to fetch certificates' });
    }
});

/**
 * @route GET /api/certificates/:id
 * @description Get certificate by ID
 */
app.get('/api/certificates/:id', async (req, res) => {
    if (!contract) {
        return res.status(503).json({ error: 'Blockchain connection not available' });
    }

    try {
        const id = parseInt(req.params.id);

        if (isNaN(id) || id < 1) {
            return res.status(400).json({ error: 'Invalid certificate ID' });
        }

        const hash = await contract.certificateIds(id);
        const [exists, cert] = await contract.getCertificateByHash(hash);

        if (!exists) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json({
            id: cert.id.toNumber(),
            hash: hash,
            studentName: cert.studentName,
            studentId: cert.studentId,
            diploma: cert.diploma,
            year: cert.year.toNumber(),
            issuedAt: new Date(cert.issuedAt.toNumber() * 1000).toISOString(),
            isValid: cert.isValid,
            issuer: cert.issuer
        });
    } catch (error) {
        console.error('Get certificate error:', error);
        res.status(500).json({ error: 'Failed to fetch certificate' });
    }
});

/**
 * @route GET /api/certificates/verify/:hash
 * @description Verify certificate by hash
 */
app.get('/api/certificates/verify/:hash', async (req, res) => {
    if (!contract) {
        return res.status(503).json({ error: 'Blockchain connection not available' });
    }

    try {
        let hash = req.params.hash;

        // Validate hash format
        if (!hash.startsWith('0x')) {
            hash = '0x' + hash;
        }

        if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
            return res.status(400).json({ error: 'Invalid hash format. Expected 32-byte hex string.' });
        }

        const [exists, cert] = await contract.getCertificateByHash(hash);

        if (!exists) {
            return res.json({
                verified: false,
                message: 'Certificate not found on blockchain'
            });
        }

        res.json({
            verified: cert.isValid,
            message: cert.isValid ? 'Certificate is valid' : 'Certificate has been revoked',
            certificate: {
                id: cert.id.toNumber(),
                hash: hash,
                studentName: cert.studentName,
                studentId: cert.studentId,
                diploma: cert.diploma,
                year: cert.year.toNumber(),
                issuedAt: new Date(cert.issuedAt.toNumber() * 1000).toISOString(),
                isValid: cert.isValid,
                issuer: cert.issuer
            }
        });
    } catch (error) {
        console.error('Verify certificate error:', error);
        res.status(500).json({ error: 'Failed to verify certificate' });
    }
});

/**
 * @route POST /api/admin/issue
 * @description Issue a new certificate (requires admin private key in .env)
 * @body { studentName, studentId, diploma, year }
 */
app.post('/api/admin/issue', async (req, res) => {
    if (!contract) {
        return res.status(503).json({ error: 'Blockchain connection not available' });
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        return res.status(403).json({
            error: 'Server-side issuance not configured. Please use MetaMask for admin functions.'
        });
    }

    try {
        const { studentName, studentId, diploma, year } = req.body;

        if (!studentName || !studentId || !diploma || !year) {
            return res.status(400).json({
                error: 'Missing required fields: studentName, studentId, diploma, year'
            });
        }

        // Create wallet and connect to contract
        const wallet = new ethers.Wallet(privateKey, provider);
        const adminContract = contract.connect(wallet);

        // Issue certificate
        const tx = await adminContract.issueCertificate(
            studentName,
            studentId,
            diploma,
            parseInt(year)
        );

        const receipt = await tx.wait();

        // Extract certificate hash from event
        const event = receipt.events?.find(e => e.event === 'CertificateIssued');
        const certHash = event?.args?.certificateHash;
        const certId = event?.args?.certificateId?.toNumber();

        res.json({
            success: true,
            message: 'Certificate issued successfully',
            transactionHash: receipt.transactionHash,
            certificate: {
                id: certId,
                hash: certHash
            }
        });
    } catch (error) {
        console.error('Issue certificate error:', error);
        res.status(500).json({
            error: 'Failed to issue certificate',
            details: error.reason || error.message
        });
    }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

initBlockchain();

app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`  ENIAD Certificate API Server`);
    console.log(`  Running on: http://localhost:${PORT}`);
    console.log(`=================================================`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  GET  /api/health              - Health check`);
    console.log(`  POST /api/certificates/hash   - Generate hash`);
    console.log(`  GET  /api/certificates        - List certificates`);
    console.log(`  GET  /api/certificates/:id    - Get by ID`);
    console.log(`  GET  /api/certificates/verify/:hash - Verify by hash`);
    console.log(`  POST /api/admin/issue         - Issue certificate\n`);
});

module.exports = app;
