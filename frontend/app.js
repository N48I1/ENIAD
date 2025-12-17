/**
 * ENIAD Digital Certificate System - Frontend Application
 * 
 * Main JavaScript for blockchain certificate issuance and verification
 * Using Ethers.js v5.7.2 for Web3 interactions
 * 
 * Contract deployed on zkSync Sepolia Testnet
 * Configuration loaded from config.js
 */

// =============================================================================
// CONFIGURATION (loaded from config.js: CONFIG and CONTRACT_ABI)
// =============================================================================

// =============================================================================
// GLOBAL STATE
// =============================================================================

let provider;
let signer;
let contract;
let userAddress;
let contractABI;
let isAdmin = false;
let isConnected = false;

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const connectWalletBtn = document.getElementById('connectWalletBtn');
const networkStatus = document.getElementById('networkStatus');
const networkWarning = document.getElementById('networkWarning');
const networkWarningText = document.getElementById('networkWarningText');
const switchNetworkBtn = document.getElementById('switchNetworkBtn');
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const adminLoginOverlay = document.getElementById('adminLoginOverlay');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const toastContainer = document.getElementById('toastContainer');

// =============================================================================
// INITIALIZATION
// =============================================================================

async function init() {
    loadABI();
    setupEventListeners();
    await checkWalletConnection();
}

function loadABI() {
    // ABI is now loaded from config.js (CONTRACT_ABI variable)
    if (typeof CONTRACT_ABI !== 'undefined') {
        contractABI = CONTRACT_ABI;
        console.log('✅ Contract ABI loaded from config');
        console.log(`📍 Contract: ${CONFIG.contractAddress}`);
        console.log(`🌐 Network: ${CONFIG.networkName}`);
    } else {
        console.error("❌ Contract ABI not found in config.js");
        showToast('Contract ABI missing. Check config.js', 'error');
    }
}

function setupEventListeners() {
    // Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            switchTab(target);
            // Close mobile menu on navigation
            sidebar.classList.remove('open');
        });
    });

    // Wallet
    connectWalletBtn.addEventListener('click', handleWalletClick);

    // Network switch
    if (switchNetworkBtn) {
        switchNetworkBtn.addEventListener('click', switchNetwork);
    }

    // Verify
    document.getElementById('verifyBtn').addEventListener('click', verifyCertificate);
    document.getElementById('verifyInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyCertificate();
    });

    // Issue
    document.getElementById('issueForm').addEventListener('submit', issueCertificate);

    // Mobile menu
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // MetaMask events
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }
}

// =============================================================================
// NAVIGATION
// =============================================================================

function switchTab(tabName) {
    // Update Nav
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update View
    views.forEach(view => view.classList.remove('active'));
    document.getElementById(`${tabName}View`)?.classList.add('active');

    // Update title
    const titles = {
        home: 'Welcome',
        verify: 'Verify Certificate',
        admin: 'Admin Dashboard'
    };
    document.getElementById('pageTitle').textContent = titles[tabName] || 'Welcome';
}

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================

function showToast(message, type = 'info', duration = 4000) {
    const icons = {
        success: 'checkmark-circle',
        error: 'close-circle',
        warning: 'warning',
        info: 'information-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <ion-icon name="${icons[type]}"></ion-icon>
        <span class="toast-text">${message}</span>
        <button class="toast-close" aria-label="Close">
            <ion-icon name="close-outline"></ion-icon>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));

    // Auto remove
    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
}

// =============================================================================
// LOADING STATES
// =============================================================================

function setButtonLoading(button, loading, originalContent = null) {
    if (loading) {
        button.dataset.originalContent = button.innerHTML;
        button.innerHTML = `<div class="spinner"></div> Processing...`;
        button.disabled = true;
    } else {
        button.innerHTML = button.dataset.originalContent || originalContent;
        button.disabled = false;
    }
}

// =============================================================================
// WALLET CONNECTION
// =============================================================================

async function checkWalletConnection() {
    if (typeof window.ethereum === 'undefined') {
        console.log('MetaMask not detected');
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            await connectWallet();
        }
    } catch (err) {
        console.error('Error checking wallet:', err);
    }
}

async function handleWalletClick() {
    if (isConnected) {
        disconnectWallet();
    } else {
        await connectWallet();
    }
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showToast('Please install MetaMask to continue!', 'warning');
        window.open('https://metamask.io/download/', '_blank');
        return;
    }

    try {
        setButtonLoading(connectWalletBtn, true);

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        isConnected = true;

        // Check network
        await checkNetwork();

        updateWalletUI(userAddress);
        await initContract();

        showToast('Wallet connected successfully!', 'success');

    } catch (error) {
        console.error('Wallet connection error:', error);
        if (error.code === 4001) {
            showToast('Connection request rejected', 'warning');
        } else {
            showToast('Failed to connect wallet', 'error');
        }
    } finally {
        setButtonLoading(connectWalletBtn, false, `
            <ion-icon name="wallet-outline"></ion-icon>
            <span>Connect Wallet</span>
        `);
    }
}

function disconnectWallet() {
    provider = null;
    signer = null;
    contract = null;
    userAddress = null;
    isAdmin = false;
    isConnected = false;

    connectWalletBtn.innerHTML = `
        <ion-icon name="wallet-outline"></ion-icon>
        <span>Connect Wallet</span>
    `;
    connectWalletBtn.classList.remove('connected');

    networkStatus.textContent = 'Not Connected';
    networkStatus.classList.remove('connected');

    networkWarning.classList.add('hidden');
    adminLoginOverlay.classList.remove('hidden');

    showToast('Wallet disconnected', 'info');
}

function updateWalletUI(address) {
    const shortAddr = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    connectWalletBtn.innerHTML = `
        <ion-icon name="wallet"></ion-icon>
        <span>${shortAddr}</span>
    `;
    connectWalletBtn.classList.add('connected');
}

// =============================================================================
// NETWORK HANDLING
// =============================================================================

async function checkNetwork() {
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    if (chainId === CONFIG.chainId) {
        networkStatus.textContent = CONFIG.networkName;
        networkStatus.classList.add('connected');
        networkWarning.classList.add('hidden');
    } else {
        networkStatus.textContent = `Chain ${chainId}`;
        networkStatus.classList.remove('connected');
        networkWarning.classList.remove('hidden');
        networkWarningText.textContent = `Connected to wrong network (Chain ${chainId}). Please switch to ${CONFIG.networkName}.`;
    }
}

async function switchNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CONFIG.chainIdHex }]
        });
    } catch (error) {
        if (error.code === 4902) {
            // Chain not added, try to add it
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: CONFIG.chainIdHex,
                        chainName: CONFIG.networkName,
                        nativeCurrency: { name: 'ETH', symbol: CONFIG.currencySymbol, decimals: 18 },
                        rpcUrls: [CONFIG.rpcUrl],
                        blockExplorerUrls: [CONFIG.blockExplorerUrl]
                    }]
                });
            } catch (addError) {
                showToast('Failed to add network', 'error');
            }
        } else {
            showToast('Failed to switch network', 'error');
        }
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else {
        userAddress = accounts[0];
        updateWalletUI(userAddress);
        initContract();
        showToast('Account changed', 'info');
    }
}

function handleChainChanged() {
    window.location.reload();
}

// =============================================================================
// CONTRACT INITIALIZATION
// =============================================================================

async function initContract() {
    if (!CONFIG || !CONFIG.contractAddress || !contractABI) {
        console.error("Config or ABI missing");
        return;
    }

    try {
        contract = new ethers.Contract(CONFIG.contractAddress, contractABI, signer);

        // Check Admin Status
        const adminAddress = await contract.admin();
        isAdmin = adminAddress.toLowerCase() === userAddress.toLowerCase();

        if (isAdmin) {
            adminLoginOverlay.classList.add('hidden');
            showToast('Admin access granted', 'success');
        } else {
            adminLoginOverlay.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Failed to initialize contract:", err);
        showToast('Failed to connect to smart contract', 'error');
    }
}

// =============================================================================
// CERTIFICATE VERIFICATION
// =============================================================================

async function verifyCertificate() {
    const input = document.getElementById('verifyInput').value.trim();
    if (!input) {
        showToast('Please enter a Hash or ID', 'warning');
        return;
    }

    const verifyBtn = document.getElementById('verifyBtn');
    const resultCard = document.getElementById('verificationResult');
    const revokedCard = document.getElementById('verificationRevoked');
    const errorCard = document.getElementById('verificationError');

    // Hide all results
    resultCard.classList.add('hidden');
    revokedCard.classList.add('hidden');
    errorCard.classList.add('hidden');

    setButtonLoading(verifyBtn, true);

    try {
        // Get contract for reading (use wallet if connected, else create read-only provider)
        let readContract = contract;
        if (!readContract) {
            const zkSyncProvider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
            readContract = new ethers.Contract(CONFIG.contractAddress, contractABI, zkSyncProvider);
        }

        let exists, cert, hash;

        // Check if input is ID (numeric) or Hash (0x...)
        if (input.startsWith("0x")) {
            hash = input;
            [exists, cert] = await readContract.getCertificateByHash(input);
        } else {
            const id = parseInt(input);
            if (isNaN(id) || id < 1) {
                throw new Error('Invalid certificate ID');
            }
            hash = await readContract.certificateIds(id);
            [exists, cert] = await readContract.getCertificateByHash(hash);
        }

        if (!exists || cert.id.toNumber() === 0) {
            document.getElementById('errorMessage').textContent = 'No certificate found with this Hash or ID.';
            errorCard.classList.remove('hidden');
            showToast('Certificate not found', 'error');
            return;
        }

        // Check if revoked
        if (!cert.isValid) {
            revokedCard.classList.remove('hidden');
            showToast('Certificate has been revoked', 'warning');
            return;
        }

        // Populate success UI
        document.getElementById('certName').textContent = cert.studentName;
        document.getElementById('certDiploma').textContent = cert.diploma;
        document.getElementById('certStudentId').textContent = cert.studentId;
        document.getElementById('certYear').textContent = cert.year.toString();
        document.getElementById('certHashDisplay').textContent = hash;

        const date = new Date(cert.issuedAt.toNumber() * 1000);
        document.getElementById('certDate').textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        resultCard.classList.remove('hidden');
        showToast('Certificate verified successfully!', 'success');

    } catch (error) {
        console.error('Verification error:', error);
        document.getElementById('errorMessage').textContent = error.reason || error.message || 'Verification failed';
        errorCard.classList.remove('hidden');
        showToast('Verification failed', 'error');
    } finally {
        setButtonLoading(verifyBtn, false, `
            <ion-icon name="search-outline"></ion-icon>
            Verify
        `);
    }
}

// =============================================================================
// CERTIFICATE ISSUANCE
// =============================================================================

async function issueCertificate(e) {
    e.preventDefault();

    if (!contract || !isAdmin) {
        showToast('Unauthorized or not connected', 'error');
        return;
    }

    const name = document.getElementById('studentName').value.trim();
    const sId = document.getElementById('studentId').value.trim();
    const diploma = document.getElementById('diplomaTitle').value.trim();
    const year = parseInt(document.getElementById('gradYear').value);

    // Validation
    if (!name || !sId || !diploma || !year) {
        showToast('Please fill in all fields', 'warning');
        return;
    }

    const btn = document.getElementById('issueBtn');
    const resultBox = document.getElementById('issueResult');
    const msg = document.getElementById('issueMsg');

    setButtonLoading(btn, true);
    resultBox.classList.remove('hidden');
    resultBox.className = 'notification info';
    msg.textContent = 'Please confirm transaction in MetaMask...';

    try {
        // Estimate gas
        const gasEstimate = await contract.estimateGas.issueCertificate(name, sId, diploma, year);
        showToast(`Estimated gas: ${gasEstimate.toString()}`, 'info');

        const tx = await contract.issueCertificate(name, sId, diploma, year);
        msg.textContent = 'Transaction sent! Waiting for confirmation...';

        const receipt = await tx.wait();

        // Find Hash from event
        const event = receipt.events?.find(e => e.event === 'CertificateIssued');
        const hash = event?.args?.certificateHash;
        const certId = event?.args?.certificateId?.toNumber();

        resultBox.className = 'notification success';
        msg.innerHTML = `
            <strong>✅ Certificate Issued Successfully!</strong><br>
            <small>ID: ${certId}</small><br>
            <small style="word-break: break-all;">Hash: ${hash}</small>
        `;

        document.getElementById('issueForm').reset();
        showToast('Certificate issued successfully!', 'success');

    } catch (error) {
        console.error('Issuance error:', error);
        resultBox.className = 'notification error';
        msg.textContent = `Error: ${error.reason || error.message}`;
        showToast('Failed to issue certificate', 'error');
    } finally {
        setButtonLoading(btn, false, `
            <ion-icon name="add-circle-outline"></ion-icon>
            Issue Certificate
        `);
    }
}

// =============================================================================
// GLOBAL SCOPE
// =============================================================================

// Expose switchTab for HTML onclick handlers
window.switchTab = switchTab;

// Initialize app
document.addEventListener('DOMContentLoaded', init);
