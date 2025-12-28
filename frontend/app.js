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

    // Load Home page by default
    switchTab('home');

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
    // Event Listeners for Navigation
    document.getElementById('profileBtn')?.addEventListener('click', toggleProfileMenu); // Optional if using profile menu

    // Navigation Buttons (Delegation or re-query)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('connectWalletBtn').addEventListener('click', handleWalletClick); // Changed from connectWallet to handleWalletClick
    document.getElementById('verifyBtn').addEventListener('click', verifyCertificate);
    document.getElementById('issueForm').addEventListener('submit', issueCertificate);

    // Add "Enter" key listener for Verification Input
    document.getElementById('verifyInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') verifyCertificate();
    });

    // Mobile menu
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Network switch
    if (switchNetworkBtn) {
        switchNetworkBtn.addEventListener('click', switchNetwork);
    }

    // MetaMask events
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }

    // ==========================================================
    // REAL-TIME FORM BINDING FOR CERTIFICATE PREVIEW
    // ==========================================================
    setupRealTimeFormBinding();

    // ==========================================================
    // ADMIN FORM EVENT LISTENERS
    // ==========================================================
    document.getElementById('revokeForm')?.addEventListener('submit', revokeCertificateHandler);
    document.getElementById('updateForm')?.addEventListener('submit', updateCertificateHandler);
}

// Real-time form binding function
function setupRealTimeFormBinding() {
    const nameInput = document.getElementById('studentName');
    const cniInput = document.getElementById('studentCni');
    const apogeeInput = document.getElementById('studentApogee');
    const majorSelect = document.getElementById('majorSelect');
    const yearInput = document.getElementById('gradYear');
    const degreeTypeSelect = document.getElementById('degreeType');
    const issuerInput = document.getElementById('issuerName');

    // Preview elements
    const previewName = document.getElementById('previewName');
    const previewMajor = document.getElementById('previewMajor');
    const previewYear = document.getElementById('previewYear');
    const previewIds = document.getElementById('previewIds');
    const previewDegreeType = document.getElementById('previewDegreeType');
    const previewIssuer = document.getElementById('previewIssuer');
    const diplomaPlaceholder = document.getElementById('diplomaPlaceholder');
    const diplomaPreview = document.getElementById('diplomaPreview');

    // Update functions
    function updatePreview() {
        const name = nameInput?.value.trim() || '_____________________';
        const cni = cniInput?.value.trim() || '______';
        const apogee = apogeeInput?.value.trim() || '______';
        const major = majorSelect?.value || '_______';
        const year = yearInput?.value || '____';
        const degreeType = degreeTypeSelect?.value || 'Diploma';
        const issuer = issuerInput?.value.trim() || 'MAJDOUBI ILYAS';

        if (previewName) previewName.textContent = name;
        if (previewMajor) previewMajor.textContent = major || '_______';
        if (previewYear) previewYear.textContent = year;
        if (previewIds) previewIds.textContent = `${cni} / ${apogee}`;
        if (previewDegreeType) previewDegreeType.textContent = degreeType;
        if (previewIssuer) previewIssuer.textContent = issuer.toUpperCase();

        // Show/hide based on content
        const hasContent = nameInput?.value.trim() || cniInput?.value.trim() ||
            apogeeInput?.value.trim() || majorSelect?.value;

        if (hasContent && diplomaPlaceholder && diplomaPreview) {
            diplomaPlaceholder.classList.add('hidden');
            diplomaPreview.classList.remove('hidden');
        }
    }

    // Add event listeners
    if (nameInput) nameInput.addEventListener('input', updatePreview);
    if (cniInput) cniInput.addEventListener('input', updatePreview);
    if (apogeeInput) apogeeInput.addEventListener('input', updatePreview);
    if (majorSelect) majorSelect.addEventListener('change', updatePreview);
    if (yearInput) yearInput.addEventListener('input', updatePreview);
    if (degreeTypeSelect) degreeTypeSelect.addEventListener('change', updatePreview);
    if (issuerInput) issuerInput.addEventListener('input', updatePreview);

    // Initial update
    updatePreview();
}

// Generate QR Code function
function generateQRCode(containerId, text) {
    const container = document.getElementById(containerId);
    if (!container || !text) return;

    try {
        // Use qrcode-generator library
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();

        // Replace container content with QR code
        container.innerHTML = qr.createImgTag(3, 0);
    } catch (e) {
        console.error('QR Code generation failed:', e);
    }
}

// =============================================================================
// STATISTICS DASHBOARD
// =============================================================================

async function refreshStatistics() {
    try {
        // Update UI to show loading
        const elements = [
            'statsTotalCerts', 'statsDiploma', 'statsMaster', 'statsPhd', 'statsAchievement',
            'statsIRSI', 'statsROC', 'statsAI', 'statsGI'
        ];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '...';
        });

        // Fetch stats from smart contract
        // Note: This assumes the contract has getStatistics() or similar functions
        // The user will need to update the smart contract to support these calls

        if (certificateContract) {
            // Try to call getTotalCertificates if available
            try {
                const total = await certificateContract.getTotalCertificates();
                document.getElementById('statsTotalCerts').textContent = total.toString();
            } catch (e) {
                document.getElementById('statsTotalCerts').textContent = 'N/A';
            }

            // Try to get certificates by degree type
            try {
                const diplomaCount = await certificateContract.getCertificatesByDegreeType('Diploma');
                const masterCount = await certificateContract.getCertificatesByDegreeType('Master');
                const phdCount = await certificateContract.getCertificatesByDegreeType('PhD');
                const achievementCount = await certificateContract.getCertificatesByDegreeType('Achievement');

                document.getElementById('statsDiploma').textContent = diplomaCount.toString();
                document.getElementById('statsMaster').textContent = masterCount.toString();
                document.getElementById('statsPhd').textContent = phdCount.toString();
                document.getElementById('statsAchievement').textContent = achievementCount.toString();
            } catch (e) {
                document.getElementById('statsDiploma').textContent = 'N/A';
                document.getElementById('statsMaster').textContent = 'N/A';
                document.getElementById('statsPhd').textContent = 'N/A';
                document.getElementById('statsAchievement').textContent = 'N/A';
            }

            // Try to get certificates by major
            try {
                const irsiCount = await certificateContract.getCertificatesByMajor('IRSI');
                const rocCount = await certificateContract.getCertificatesByMajor('ROC');
                const aiCount = await certificateContract.getCertificatesByMajor('AI');
                const giCount = await certificateContract.getCertificatesByMajor('GI');

                document.getElementById('statsIRSI').textContent = irsiCount.toString();
                document.getElementById('statsROC').textContent = rocCount.toString();
                document.getElementById('statsAI').textContent = aiCount.toString();
                document.getElementById('statsGI').textContent = giCount.toString();
            } catch (e) {
                document.getElementById('statsIRSI').textContent = 'N/A';
                document.getElementById('statsROC').textContent = 'N/A';
                document.getElementById('statsAI').textContent = 'N/A';
                document.getElementById('statsGI').textContent = 'N/A';
            }
        } else {
            // Contract not connected
            elements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = 'N/A';
            });
            showToast('Connect wallet to view statistics', 'warning');
        }

        // Update last refresh time
        const lastUpdate = document.getElementById('statsLastUpdate');
        if (lastUpdate) {
            lastUpdate.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }

    } catch (error) {
        console.error('Error refreshing statistics:', error);
        showToast('Failed to fetch statistics', 'error');
    }
}

// =============================================================================
// NAVIGATION
// =============================================================================

function switchTab(tabName) {
    // If trying to access admin without being an admin, show the overlay
    if (tabName === 'admin' && !isAdmin) {
        adminLoginOverlay.classList.remove('hidden');
        return; // Don't switch to admin tab
    }

    // Hide admin overlay when navigating away or if admin
    adminLoginOverlay.classList.add('hidden');

    // Hide all views
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));

    // Show target view
    const target = document.getElementById(`${tabName}View`);
    if (target) {
        target.classList.remove('hidden');
        // Animation trigger could go here
    }

    // Update Nav State
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('bg-white/10', 'text-white');
            btn.classList.remove('text-gray-300');
        } else {
            btn.classList.remove('bg-white/10', 'text-white');
            btn.classList.add('text-gray-300');
        }
    });

    // Update Titles
    const titles = {
        home: 'Welcome',
        about: 'About Us',
        verify: 'Verify Certificate',
        admin: 'Admin Dashboard'
    };
    const subtitles = {
        home: 'Manage and verify digital academic credentials',
        about: 'Learn more about our blockchain mission',
        verify: 'Enter certificate ID to verify its authenticity',
        admin: 'Issue and manage student certificates'
    };

    if (document.getElementById('pageTitle')) {
        document.getElementById('pageTitle').textContent = titles[tabName] || 'Welcome';
    }
    if (document.getElementById('pageSubtitle')) {
        document.getElementById('pageSubtitle').textContent = subtitles[tabName] || '';
    }
}

// =============================================================================
// ADMIN TAB NAVIGATION
// =============================================================================

function switchAdminTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`adminTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`)?.classList.add('active');

    // Hide all panels
    document.querySelectorAll('.admin-panel').forEach(panel => {
        panel.classList.add('hidden');
    });

    // Show selected panel
    const targetPanel = document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Panel`);
    if (targetPanel) {
        targetPanel.classList.remove('hidden');
    }
}

// Revoke Certificate
async function revokeCertificateHandler(e) {
    e.preventDefault();

    const hash = document.getElementById('revokeHash').value.trim();
    const reason = document.getElementById('revokeReason').value.trim();
    const resultDiv = document.getElementById('revokeResult');
    const msgSpan = document.getElementById('revokeMsg');

    if (!hash) {
        showToast('Please enter a certificate hash', 'error');
        return;
    }

    resultDiv.classList.remove('hidden');
    msgSpan.textContent = 'Revoking certificate...';

    try {
        // Call smart contract revoke function
        const tx = await certificateContract.revokeCertificate(hash);
        await tx.wait();

        msgSpan.textContent = '✓ Certificate revoked successfully!';
        resultDiv.style.background = 'rgba(34, 197, 94, 0.1)';
        resultDiv.style.borderColor = '#22c55e';
        resultDiv.style.color = '#22c55e';
        showToast('Certificate revoked successfully', 'success');

        // Clear form
        document.getElementById('revokeHash').value = '';
        document.getElementById('revokeReason').value = '';
    } catch (error) {
        console.error('Revoke error:', error);
        msgSpan.textContent = `Error: ${error.reason || error.message || 'Failed to revoke'}`;
        showToast('Failed to revoke certificate', 'error');
    }
}

// Lookup Certificate for Update
async function lookupCertificateForUpdate() {
    const hash = document.getElementById('updateLookupHash').value.trim();
    const updateForm = document.getElementById('updateForm');
    const resultDiv = document.getElementById('updateResult');
    const msgSpan = document.getElementById('updateMsg');

    if (!hash) {
        showToast('Please enter a certificate hash', 'error');
        return;
    }

    resultDiv.classList.remove('hidden');
    msgSpan.textContent = 'Looking up certificate...';

    try {
        // Call smart contract to get certificate data
        const certData = await certificateContract.getCertificate(hash);

        if (!certData || !certData.studentName) {
            msgSpan.textContent = 'Certificate not found';
            showToast('Certificate not found', 'error');
            return;
        }

        // Populate update form
        document.getElementById('updateName').value = certData.studentName;
        document.getElementById('updateMajor').value = certData.degree || 'IRSI';
        document.getElementById('updateYear').value = certData.graduationYear?.toString() || '2025';

        // Show edit form
        updateForm.classList.remove('hidden');
        resultDiv.classList.add('hidden');
        showToast('Certificate found! You can now edit.', 'success');
    } catch (error) {
        console.error('Lookup error:', error);
        msgSpan.textContent = `Error: ${error.reason || error.message || 'Failed to lookup'}`;
        showToast('Failed to lookup certificate', 'error');
    }
}

// Update Certificate
async function updateCertificateHandler(e) {
    e.preventDefault();

    const hash = document.getElementById('updateLookupHash').value.trim();
    const name = document.getElementById('updateName').value.trim();
    const major = document.getElementById('updateMajor').value;
    const year = document.getElementById('updateYear').value;
    const resultDiv = document.getElementById('updateResult');
    const msgSpan = document.getElementById('updateMsg');

    resultDiv.classList.remove('hidden');
    msgSpan.textContent = 'Updating certificate...';

    try {
        // Call smart contract update function
        const tx = await certificateContract.updateCertificate(hash, name, major, parseInt(year));
        await tx.wait();

        msgSpan.textContent = '✓ Certificate updated successfully!';
        resultDiv.style.background = 'rgba(34, 197, 94, 0.1)';
        resultDiv.style.borderColor = '#22c55e';
        resultDiv.style.color = '#22c55e';
        showToast('Certificate updated successfully', 'success');

        // Reset form
        document.getElementById('updateForm').classList.add('hidden');
        document.getElementById('updateLookupHash').value = '';
    } catch (error) {
        console.error('Update error:', error);
        msgSpan.textContent = `Error: ${error.reason || error.message || 'Failed to update'}`;
        showToast('Failed to update certificate', 'error');
    }
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

    const btn = document.getElementById('connectWalletBtn');
    const btnText = document.getElementById('walletBtnText');
    const badge = document.getElementById('roleBadge');

    // Reset button text
    btnText.textContent = 'Connect Wallet';

    // Reset button color to original purple gradient
    btn.classList.remove('from-green-600', 'to-emerald-600', 'hover:from-green-500', 'hover:to-emerald-500', 'shadow-green-500/20', 'connected');
    btn.classList.add('from-indigo-600', 'to-purple-600', 'hover:from-indigo-500', 'hover:to-purple-500', 'shadow-indigo-500/20');

    // Hide role badge
    if (badge) {
        badge.classList.add('hidden');
        badge.textContent = '';
    }

    if (networkStatus) {
        networkStatus.textContent = 'Not Connected';
        networkStatus.classList.remove('connected');
    }

    if (networkWarning) networkWarning.classList.add('hidden');
    if (adminLoginOverlay) adminLoginOverlay.classList.remove('hidden');

    showToast('Wallet disconnected', 'info');
}


function updateWalletUI(address) {
    const shortAddr = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    const btn = document.getElementById('connectWalletBtn');
    const btnText = document.getElementById('walletBtnText');

    if (!btn) {
        console.error("connectWalletBtn not found");
        return;
    }

    // Update button text (use btnText if exists, otherwise set innerHTML on btn)
    if (btnText) {
        btnText.textContent = shortAddr;
    } else {
        // Fallback: update the button directly
        btn.innerHTML = `<ion-icon name="wallet"></ion-icon> <span>${shortAddr}</span>`;
    }

    // Change to green connected state
    btn.classList.remove('from-indigo-600', 'to-purple-600', 'hover:from-indigo-500', 'hover:to-purple-500', 'shadow-indigo-500/20');
    btn.classList.add('from-green-600', 'to-emerald-600', 'hover:from-green-500', 'hover:to-emerald-500', 'shadow-green-500/20');
    btn.classList.add('connected');

    console.log("✅ Wallet UI updated:", shortAddr);
}


// Function to update the role badge (called after admin check)
function updateRoleBadge() {
    const badge = document.getElementById('roleBadge');
    if (!badge) return;

    badge.classList.remove('hidden');

    if (isAdmin) {
        badge.textContent = 'Admin';
        badge.classList.remove('text-gray-400', 'border-gray-600', 'bg-gray-800');
        badge.classList.add('text-green-400', 'border-green-500/50', 'bg-green-500/10');
    } else {
        badge.textContent = 'User';
        badge.classList.remove('text-green-400', 'border-green-500/50', 'bg-green-500/10');
        badge.classList.add('text-gray-400', 'border-gray-600', 'bg-gray-800');
    }
}

// =============================================================================
// NETWORK HANDLING
// =============================================================================

async function checkNetwork() {
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    if (chainId === CONFIG.chainId) {
        if (networkStatus) {
            networkStatus.textContent = CONFIG.networkName;
            networkStatus.classList.add('connected');
        }
        if (networkWarning) networkWarning.classList.add('hidden');
        console.log("✅ Correct network:", CONFIG.networkName);
    } else {
        if (networkStatus) {
            networkStatus.textContent = `Chain ${chainId}`;
            networkStatus.classList.remove('connected');
        }
        if (networkWarning) networkWarning.classList.remove('hidden');
        if (networkWarningText) networkWarningText.textContent = `Connected to wrong network (Chain ${chainId}). Please switch to ${CONFIG.networkName}.`;
        showToast(`Wrong network! Please switch to ${CONFIG.networkName}`, 'warning');
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

    console.log("🔗 Initializing contract...");
    console.log("📍 Contract Address:", CONFIG.contractAddress);
    console.log("👤 Connected Wallet:", userAddress);

    try {
        contract = new ethers.Contract(CONFIG.contractAddress, contractABI, signer);

        // Check Admin Status
        const adminAddress = await contract.admin();
        console.log("🔐 Contract Admin:", adminAddress);
        console.log("🔍 Comparing:", userAddress?.toLowerCase(), "===", adminAddress?.toLowerCase());

        isAdmin = adminAddress.toLowerCase() === userAddress.toLowerCase();
        console.log("✅ isAdmin:", isAdmin);

        // Update Role Badge in UI
        updateRoleBadge();

        if (isAdmin) {
            adminLoginOverlay.classList.add('hidden');
            showToast('Admin access granted', 'success');
        } else {
            // Don't show overlay here - let switchTab handle it
            console.log("⚠️ User is not admin");
        }
    } catch (err) {
        console.error("❌ Failed to initialize contract:", err);
        showToast('Failed to connect to smart contract. Check console.', 'error');
    }
}


// =============================================================================
// CERTIFICATE VERIFICATION (with Modal Popup)
// =============================================================================

// Modal Control Functions
function openVerificationModal() {
    const modal = document.getElementById('certificateModal');
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closeVerificationModal() {
    const modal = document.getElementById('certificateModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll

    // Reset modal states after close animation
    setTimeout(() => {
        document.getElementById('modalVerificationResult')?.classList.add('hidden');
        document.getElementById('modalVerificationRevoked')?.classList.add('hidden');
        document.getElementById('modalVerificationError')?.classList.add('hidden');
    }, 300);
}

function closeModalOnOverlay(event) {
    if (event.target.id === 'certificateModal') {
        closeVerificationModal();
    }
}

function copyModalHash() {
    const hashText = document.getElementById('modalCertHash').textContent;
    navigator.clipboard.writeText(hashText).then(() => {
        showToast('Hash copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

async function verifyCertificate() {
    const input = document.getElementById('verifyInput').value.trim();
    if (!input) {
        showToast('Please enter a Hash or ID', 'warning');
        return;
    }

    const verifyBtn = document.getElementById('verifyBtn');
    const modalResult = document.getElementById('modalVerificationResult');
    const modalRevoked = document.getElementById('modalVerificationRevoked');
    const modalError = document.getElementById('modalVerificationError');

    // Hide all modal states
    modalResult.classList.add('hidden');
    modalRevoked.classList.add('hidden');
    modalError.classList.add('hidden');

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
            // Show modal with not-found state
            document.getElementById('modalErrorMessage').textContent = 'No certificate found with this Hash or ID.';
            modalError.classList.remove('hidden');
            openVerificationModal();
            showToast('Certificate not found', 'error');
            return;
        }

        // Check if revoked
        if (!cert.isValid) {
            // Show modal with revoked state
            modalRevoked.classList.remove('hidden');
            openVerificationModal();
            showToast('Certificate has been revoked', 'warning');
            return;
        }

        // Populate modal success UI (Diploma Style)
        document.getElementById('modalCertName').textContent = cert.studentName;

        // Extract Major from "Engineering Degree in [Major]"
        const diplomaText = cert.diploma;
        let major = diplomaText;
        if (diplomaText.includes("Engineering Degree in ")) {
            major = diplomaText.replace("Engineering Degree in ", "");
        }
        document.getElementById('modalCertMajor').textContent = major;

        // Handle ID format
        let displayIds = cert.studentId;
        if (displayIds.includes("|")) {
            displayIds = displayIds.replace("|", "/");
        }
        document.getElementById('modalCertIds').textContent = displayIds;

        document.getElementById('modalCertYear').textContent = cert.year.toString();
        document.getElementById('modalCertHash').textContent = hash;

        // Show success modal
        modalResult.classList.remove('hidden');
        openVerificationModal();

        showToast('Certificate verified successfully!', 'success');

    } catch (error) {
        console.error('Verification error:', error);
        document.getElementById('modalErrorMessage').textContent = error.reason || error.message || 'Verification failed';

        // Show modal with error state
        modalError.classList.remove('hidden');
        openVerificationModal();
        showToast('Verification failed', 'error');
    } finally {
        setButtonLoading(verifyBtn, false, `Verify`);
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

    // Get input values
    const name = document.getElementById('studentName').value.trim();
    const cni = document.getElementById('studentCni').value.trim();
    const apogee = document.getElementById('studentApogee').value.trim();
    const major = document.getElementById('majorSelect').value;
    const year = parseInt(document.getElementById('gradYear').value);

    // Validation
    if (!name || !cni || !apogee || !major || !year) {
        showToast('Please fill in all fields', 'warning');
        return;
    }

    // Combine IDs for storage (Platform constraint)
    // Format: "CNI: [CNI] | APOGEE: [APOGEE]"
    const combinedId = `CNI: ${cni} | APOGEE: ${apogee}`;
    const diplomaTitle = `Engineering Degree in ${major}`;

    const btn = document.getElementById('issueBtn');
    const resultBox = document.getElementById('issueResult');
    const msg = document.getElementById('issueMsg');
    const preview = document.getElementById('diplomaPreview');

    // Hide previous results
    resultBox.classList.add('hidden');
    preview.classList.add('hidden');

    setButtonLoading(btn, true);
    resultBox.classList.remove('hidden');
    resultBox.className = 'notification info';
    msg.textContent = 'Please confirm transaction in MetaMask...';

    try {
        // Estimate gas
        const gasEstimate = await contract.estimateGas.issueCertificate(name, combinedId, diplomaTitle, year);
        showToast(`Estimated gas: ${gasEstimate.toString()}`, 'info');

        const tx = await contract.issueCertificate(name, combinedId, diplomaTitle, year);
        msg.textContent = 'Transaction sent! Waiting for confirmation...';

        const receipt = await tx.wait();

        // Find Hash from event
        const event = receipt.events?.find(e => e.event === 'CertificateIssued');
        const hash = event?.args?.certificateHash;

        // Show Success Message
        resultBox.className = 'notification success';
        msg.innerHTML = `<strong>✅ Certificate Issued Successfully!</strong>`;

        // Update and Show Diploma Preview
        document.getElementById('previewName').textContent = name;
        document.getElementById('previewMajor').textContent = major; // Display just the major name e.g. "IRSI"
        document.getElementById('previewYear').textContent = year;
        document.getElementById('previewIds').textContent = `${cni} / ${apogee}`;
        document.getElementById('previewHash').textContent = hash;

        // Hide placeholder and show actual preview
        const placeholder = document.getElementById('diplomaPlaceholder');
        if (placeholder) placeholder.classList.add('hidden');

        preview.classList.remove('hidden');
        preview.scrollIntoView({ behavior: 'smooth' });

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

function copyHash() {
    const hashText = document.getElementById('previewHash').textContent;
    navigator.clipboard.writeText(hashText).then(() => {
        showToast('Hash copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

function downloadPDF(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Options for html2pdf
    const opt = {
        margin: 0.5,
        filename: 'ENIAD_Certificate.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
}

// =============================================================================
// GLOBAL SCOPE
// =============================================================================

// Expose functions for HTML onclick handlers
window.switchTab = switchTab;
window.downloadPDF = downloadPDF;
window.copyHash = copyHash;
window.closeVerificationModal = closeVerificationModal;
window.closeModalOnOverlay = closeModalOnOverlay;
window.copyModalHash = copyModalHash;
window.switchAdminTab = switchAdminTab;
window.lookupCertificateForUpdate = lookupCertificateForUpdate;
window.refreshStatistics = refreshStatistics;

// Initialize app
document.addEventListener('DOMContentLoaded', init);
