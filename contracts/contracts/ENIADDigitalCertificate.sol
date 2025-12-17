// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ENIADDigitalCertificate
 * @notice A smart contract for issuing and verifying academic certificates on the Ethereum blockchain.
 * @dev Implements admin-only issuance and public verification logic.
 */
contract ENIADDigitalCertificate {
    address public admin;
    uint256 public certificateCount;

    struct Certificate {
        uint256 id;
        string studentName;
        string studentId;
        string diploma;
        uint256 year;
        address issuer;
        uint256 issuedAt;
        bool isValid;
    }

    // Mapping from certificate hash to Certificate data
    mapping(bytes32 => Certificate) public certificates;
    
    // Mapping from certificate ID to certificate hash (for ID lookup)
    mapping(uint256 => bytes32) public certificateIds;

    event CertificateIssued(bytes32 indexed certificateHash, uint256 indexed certificateId, string studentId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Issues a new digital certificate.
     * @dev Generates a unique hash based on certificate details and timestamp.
     * @param _studentName Name of the student
     * @param _studentId Unique student ID (e.g. university roll number)
     * @param _diploma Name of the diploma/degree
     * @param _year Year of graduation
     */
    function issueCertificate(
        string memory _studentName,
        string memory _studentId,
        string memory _diploma,
        uint256 _year
    ) external onlyAdmin returns (bytes32) {
        certificateCount++;
        uint256 _id = certificateCount;
        uint256 _issuedAt = block.timestamp;
        address _issuer = msg.sender;

        // Create a unique hash for the certificate
        // We include block.timestamp and certificateCount to ensure uniqueness even if details are same
        bytes32 _hash = keccak256(abi.encodePacked(_id, _studentName, _studentId, _diploma, _year, _issuedAt));

        require(!certificates[_hash].isValid, "Certificate already exists");

        Certificate memory newCert = Certificate({
            id: _id,
            studentName: _studentName,
            studentId: _studentId,
            diploma: _diploma,
            year: _year,
            issuer: _issuer,
            issuedAt: _issuedAt,
            isValid: true
        });

        certificates[_hash] = newCert;
        certificateIds[_id] = _hash;

        emit CertificateIssued(_hash, _id, _studentId);

        return _hash;
    }

    /**
     * @notice Verifies a certificate by its hash.
     * @param _hash The unique hash of the certificate
     * @return Certificate struct details
     */
    function verifyCertificate(bytes32 _hash) external view returns (Certificate memory) {
        require(certificates[_hash].isValid, "Certificate does not exist or is invalid");
        return certificates[_hash];
    }

    /**
     * @notice Verifies a certificate by its ID.
     * @param _id The unique ID of the certificate
     * @return Certificate struct details
     */
    function verifyCertificateById(uint256 _id) external view returns (Certificate memory) {
        bytes32 _hash = certificateIds[_id];
        require(certificates[_hash].isValid, "Certificate does not exist or is invalid");
        return certificates[_hash];
    }
}
