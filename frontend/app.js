const CONTRACT_ARTIFACT_PATH = './artifacts/contracts/ENIADDigitalCertificate.sol/ENIADDigitalCertificate.json';

// Global State
let provider;
let signer;
let contract;
let userAddress;
let contractABI;
let isAdmin = false;

// UI Elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const networkStatus = document.getElementById('networkStatus');
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const adminLoginOverlay = document.getElementById('adminLoginOverlay');

// Init
async function init() {
    await loadABI();
    setupEventListeners();
    checkWalletConnection();
}

async function loadABI() {
    try {
        const response = await fetch(CONTRACT_ARTIFACT_PATH);
        const data = await response.json();
        contractABI = data.abi;
    } catch (error) {
        console.error("Failed to load contract ABI:", error);
    }
}

function setupEventListeners() {
    // Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            switchTab(target);
        });
    });

    // Wallet
    connectWalletBtn.addEventListener('click', connectWallet);

    // Verify
    document.getElementById('verifyBtn').addEventListener('click', verifyCertificate);

    // Issue
    document.getElementById('issueForm').addEventListener('submit', issueCertificate);
}

function switchTab(tabName) {
    // Update Nav
    navBtns.forEach(btn => {
        if (btn.dataset.tab === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Update View
    views.forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${tabName}View`).classList.add('active');
}

// Wallet Functions
async function checkWalletConnection() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                connectWallet();
            }
        } catch (err) {
            console.error(err);
        }
    }
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert("Please install MetaMask!");
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        updateWalletUI(userAddress);
        await initContract();

    } catch (error) {
        console.error(error);
        alert("Failed to connect wallet.");
    }
}

function updateWalletUI(address) {
    const shortAddr = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    connectWalletBtn.innerHTML = `
        <ion-icon name="wallet"></ion-icon>
        <span>${shortAddr}</span>
    `;
    connectWalletBtn.classList.add('connected');

    networkStatus.innerText = "Connected";
    networkStatus.classList.add('connected');
}

async function initContract() {
    if (!CONFIG || !CONFIG.contractAddress || !contractABI) {
        console.error("Config or ABI missing");
        return;
    }

    contract = new ethers.Contract(CONFIG.contractAddress, contractABI, signer);

    // Check Admin Status
    try {
        const adminAddress = await contract.admin();
        if (adminAddress.toLowerCase() === userAddress.toLowerCase()) {
            isAdmin = true;
            adminLoginOverlay.classList.add('hidden');
        } else {
            isAdmin = false;
            adminLoginOverlay.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Failed to check admin status", err);
    }
}

// Verification Logic
async function verifyCertificate() {
    const input = document.getElementById('verifyInput').value.trim();
    if (!input) return alert("Please enter a Hash or ID");

    // We can use a default provider if wallet not connected, 
    // but for simplicity let's require connection or create a read-only provider
    // If not connected, let's try to verify using read-only provider if possible, 
    // but user probably needs to connect to local hardhat node? 
    // For this demo, we assume user connects wallet or we use a JsonRpcProvider.

    // Fallback if no wallet connected
    let readContract = contract;
    if (!readContract) {
        // Try connecting to localhost:8545 directly for read-only
        try {
            const localProvider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
            readContract = new ethers.Contract(CONFIG.contractAddress, contractABI, localProvider);
        } catch (e) {
            return alert("Please connect wallet first.");
        }
    }

    const resultCard = document.getElementById('verificationResult');
    const errorCard = document.getElementById('verificationError');
    resultCard.classList.add('hidden');
    errorCard.classList.add('hidden');

    try {
        let cert;
        // Check if input is ID (numeric) or Hash (0x...)
        if (input.startsWith("0x")) {
            cert = await readContract.verifyCertificate(input);
        } else {
            // Assume ID
            cert = await readContract.verifyCertificateById(input);
        }

        // Populate UI
        document.getElementById('certName').innerText = cert.studentName;
        document.getElementById('certDiploma').innerText = cert.diploma;
        document.getElementById('certStudentId').innerText = cert.studentId;
        document.getElementById('certYear').innerText = cert.year.toString();

        // Hash (we might need to calculate it or fetch it if verifying by ID)
        // If verifyById, we don't get the hash in the struct? 
        // Wait, the struct doesn't contain the hash itself? 
        // Added id to struct, but hash is the key. 
        // We can display "Verified by ID" or similar.
        document.getElementById('certHashDisplay').innerText = input.startsWith("0x") ? input : `ID: ${input}`;

        const date = new Date(cert.issuedAt.toNumber() * 1000);
        document.getElementById('certDate').innerText = date.toLocaleDateString();

        resultCard.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        errorCard.classList.remove('hidden');
    }
}

// Issuance Logic
async function issueCertificate(e) {
    e.preventDefault();
    if (!contract || !isAdmin) return alert("Unauthorized or not connected");

    const name = document.getElementById('studentName').value;
    const sId = document.getElementById('studentId').value;
    const diploma = document.getElementById('diplomaTitle').value;
    const year = document.getElementById('gradYear').value;

    const btn = document.getElementById('issueBtn');
    const msg = document.getElementById('issueMsg');
    const resultBox = document.getElementById('issueResult');

    try {
        btn.disabled = true;
        btn.innerText = "Processing...";

        resultBox.classList.remove('hidden');
        msg.innerText = "Please confirm transaction in MetaMask...";

        const tx = await contract.issueCertificate(name, sId, diploma, year);
        msg.innerText = "Transaction sent! Waiting for confirmation...";

        const receipt = await tx.wait();

        // Find Hash from event
        // Event: CertificateIssued(bytes32 indexed certificateHash, uint256 indexed certificateId, string studentId);
        // Ethers v5 Receipt: receipt.events
        const event = receipt.events.find(e => e.event === 'CertificateIssued');
        const hash = event.args.certificateHash;

        msg.innerHTML = `Success! Certificate Issued.<br><strong>Hash:</strong> ${hash}`;
        // clear form
        document.getElementById('issueForm').reset();

    } catch (error) {
        console.error(error);
        msg.innerText = "Error: " + (error.reason || error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Issue Certificate";
    }
}

// Global scope for HTML onclicks if needed (though we used event listeners)
window.switchTab = switchTab;

init();
