// ENIAD Digital Certificate System Configuration
// Contract deployed on zkSync Sepolia Testnet via Remix IDE

const CONFIG = {
  // Your deployed contract address on zkSync Sepolia
  contractAddress: "0x04DE8884006328Ce4862Ff5D1E6BcE95f7B6fC03",

  // Admin wallet (deployer)
  adminAddress: "0xbd3f5a66e602391e54CF9CA7DD307545219119fA",

  // zkSync Sepolia Testnet configuration
  chainId: 300,
  chainIdHex: "0x12c",
  networkName: "zkSync Sepolia Testnet",
  rpcUrl: "https://sepolia.era.zksync.dev",
  blockExplorerUrl: "https://sepolia.explorer.zksync.io",
  currencySymbol: "ETH"
};

// Contract ABI (from Remix IDE)
const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "certificateHash", "type": "bytes32" },
      { "indexed": true, "internalType": "uint256", "name": "certificateId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "studentId", "type": "string" }
    ],
    "name": "CertificateIssued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "certificateHash", "type": "bytes32" },
      { "indexed": true, "internalType": "uint256", "name": "certificateId", "type": "uint256" }
    ],
    "name": "CertificateRevoked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "certificateCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "certificateIds",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "name": "certificates",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "string", "name": "studentName", "type": "string" },
      { "internalType": "string", "name": "studentId", "type": "string" },
      { "internalType": "string", "name": "diploma", "type": "string" },
      { "internalType": "uint256", "name": "year", "type": "uint256" },
      { "internalType": "address", "name": "issuer", "type": "address" },
      { "internalType": "uint256", "name": "issuedAt", "type": "uint256" },
      { "internalType": "bool", "name": "isValid", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "_hash", "type": "bytes32" }],
    "name": "getCertificateByHash",
    "outputs": [
      { "internalType": "bool", "name": "exists", "type": "bool" },
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "string", "name": "studentName", "type": "string" },
          { "internalType": "string", "name": "studentId", "type": "string" },
          { "internalType": "string", "name": "diploma", "type": "string" },
          { "internalType": "uint256", "name": "year", "type": "uint256" },
          { "internalType": "address", "name": "issuer", "type": "address" },
          { "internalType": "uint256", "name": "issuedAt", "type": "uint256" },
          { "internalType": "bool", "name": "isValid", "type": "bool" }
        ],
        "internalType": "struct ENIADDigitalCertificate.Certificate",
        "name": "cert",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCertificateCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_studentName", "type": "string" },
      { "internalType": "string", "name": "_studentId", "type": "string" },
      { "internalType": "string", "name": "_diploma", "type": "string" },
      { "internalType": "uint256", "name": "_year", "type": "uint256" }
    ],
    "name": "issueCertificate",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "revokeCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "_hash", "type": "bytes32" }],
    "name": "verifyCertificate",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "string", "name": "studentName", "type": "string" },
          { "internalType": "string", "name": "studentId", "type": "string" },
          { "internalType": "string", "name": "diploma", "type": "string" },
          { "internalType": "uint256", "name": "year", "type": "uint256" },
          { "internalType": "address", "name": "issuer", "type": "address" },
          { "internalType": "uint256", "name": "issuedAt", "type": "uint256" },
          { "internalType": "bool", "name": "isValid", "type": "bool" }
        ],
        "internalType": "struct ENIADDigitalCertificate.Certificate",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "verifyCertificateById",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "string", "name": "studentName", "type": "string" },
          { "internalType": "string", "name": "studentId", "type": "string" },
          { "internalType": "string", "name": "diploma", "type": "string" },
          { "internalType": "uint256", "name": "year", "type": "uint256" },
          { "internalType": "address", "name": "issuer", "type": "address" },
          { "internalType": "uint256", "name": "issuedAt", "type": "uint256" },
          { "internalType": "bool", "name": "isValid", "type": "bool" }
        ],
        "internalType": "struct ENIADDigitalCertificate.Certificate",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
