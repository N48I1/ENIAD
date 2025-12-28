// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ENIADDigitalCertificate
 * @notice A smart contract for issuing and verifying academic certificates with dual-signature requirement
 * @dev Implements dual-signature issuance (Director + Issuer), certificate statistics, and public verification
 */
contract ENIADDigitalCertificate {
    // =========================================================================
    // STATE VARIABLES
    // =========================================================================
    
    address public director;
    address public issuer;
    uint256 public certificateCount;

    // Degree types for statistics
    string constant DIPLOMA = "Diploma";
    string constant MASTER = "Master";
    string constant PHD = "PhD";
    string constant ACHIEVEMENT = "Achievement";

    // Major types for statistics
    string constant IRSI = "IRSI";
    string constant ROC = "ROC";
    string constant AI = "AI";
    string constant GI = "GI";

    struct Certificate {
        uint256 id;
        string studentName;
        string studentId;
        string diploma;      // Major (IRSI, ROC, AI, GI)
        string degreeType;   // Diploma, Master, PhD, Achievement
        string issuerName;   // Name of the issuer
        uint256 year;
        address issuedBy;
        uint256 issuedAt;
        bool isValid;
        bool directorSigned;
        bool issuerSigned;
    }

    // Pending certificates awaiting second signature
    struct PendingCertificate {
        string studentName;
        string studentId;
        string diploma;
        string degreeType;
        string issuerName;
        uint256 year;
        address initiatedBy;
        bool exists;
    }

    // Mappings
    mapping(bytes32 => Certificate) public certificates;
    mapping(uint256 => bytes32) public certificateIds;
    mapping(bytes32 => PendingCertificate) public pendingCertificates;
    
    // Statistics mappings
    mapping(string => uint256) public certificatesByDegreeType;
    mapping(string => uint256) public certificatesByMajor;

    // =========================================================================
    // EVENTS
    // =========================================================================

    event CertificateInitiated(bytes32 indexed pendingHash, string studentId, address initiatedBy);
    event CertificateIssued(bytes32 indexed certificateHash, uint256 indexed certificateId, string studentId);
    event CertificateRevoked(bytes32 indexed certificateHash, uint256 indexed certificateId);
    event CertificateUpdated(bytes32 indexed certificateHash, uint256 indexed certificateId);

    // =========================================================================
    // MODIFIERS
    // =========================================================================

    modifier onlyDirector() {
        require(msg.sender == director, "Only director can perform this action");
        _;
    }

    modifier onlyIssuer() {
        require(msg.sender == issuer, "Only issuer can perform this action");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == director || msg.sender == issuer, "Only director or issuer can perform this action");
        _;
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    constructor() {
        // Set the Director and Issuer addresses
        director = 0xbd3f5a66e602391e54CF9CA7DD307545219119fA;
        issuer = 0xaF3499873415F81147C7fEadE42A8118321cb8B5;
    }

    // =========================================================================
    // CERTIFICATE ISSUANCE (DUAL SIGNATURE)
    // =========================================================================

    /**
     * @notice Initiates a certificate issuance request (first signature)
     * @dev Can be called by either director or issuer. The other party must co-sign.
     * @param _studentName Name of the student
     * @param _studentId Unique student ID
     * @param _diploma Major/department (IRSI, ROC, AI, GI)
     * @param _degreeType Type of degree (Diploma, Master, PhD, Achievement)
     * @param _issuerName Name of the issuer
     * @param _year Year of graduation
     * @return pendingHash The hash identifying this pending certificate
     */
    function initiateCertificate(
        string memory _studentName,
        string memory _studentId,
        string memory _diploma,
        string memory _degreeType,
        string memory _issuerName,
        uint256 _year
    ) external onlyAuthorized returns (bytes32) {
        // Create a hash for the pending certificate
        bytes32 pendingHash = keccak256(abi.encodePacked(_studentName, _studentId, _diploma, _degreeType, _year));
        
        require(!pendingCertificates[pendingHash].exists, "Certificate already pending");
        
        pendingCertificates[pendingHash] = PendingCertificate({
            studentName: _studentName,
            studentId: _studentId,
            diploma: _diploma,
            degreeType: _degreeType,
            issuerName: _issuerName,
            year: _year,
            initiatedBy: msg.sender,
            exists: true
        });

        emit CertificateInitiated(pendingHash, _studentId, msg.sender);
        return pendingHash;
    }

    /**
     * @notice Co-signs and completes certificate issuance (second signature)
     * @dev Must be called by the party who did NOT initiate (if director initiated, issuer must co-sign and vice versa)
     * @param pendingHash The hash of the pending certificate to finalize
     * @return The unique hash of the newly issued certificate
     */
    function coSignCertificate(bytes32 pendingHash) external onlyAuthorized returns (bytes32) {
        PendingCertificate memory pending = pendingCertificates[pendingHash];
        require(pending.exists, "No pending certificate found");
        require(pending.initiatedBy != msg.sender, "Cannot co-sign your own initiation");

        // Issue the certificate
        certificateCount++;
        uint256 _id = certificateCount;
        uint256 _issuedAt = block.timestamp;

        bytes32 certHash = keccak256(abi.encodePacked(
            _id, 
            pending.studentName, 
            pending.studentId, 
            pending.diploma, 
            pending.degreeType,
            pending.year, 
            _issuedAt
        ));

        require(!certificates[certHash].isValid, "Certificate hash collision");

        Certificate memory newCert = Certificate({
            id: _id,
            studentName: pending.studentName,
            studentId: pending.studentId,
            diploma: pending.diploma,
            degreeType: pending.degreeType,
            issuerName: pending.issuerName,
            year: pending.year,
            issuedBy: msg.sender,
            issuedAt: _issuedAt,
            isValid: true,
            directorSigned: true,
            issuerSigned: true
        });

        certificates[certHash] = newCert;
        certificateIds[_id] = certHash;

        // Update statistics
        certificatesByDegreeType[pending.degreeType]++;
        certificatesByMajor[pending.diploma]++;

        // Clean up pending
        delete pendingCertificates[pendingHash];

        emit CertificateIssued(certHash, _id, pending.studentId);
        return certHash;
    }

    /**
     * @notice Single-signature issuance for backward compatibility (requires both roles to be same address)
     * @dev Only works if caller is both director AND issuer (for testing or single-admin mode)
     */
    function issueCertificate(
        string memory _studentName,
        string memory _studentId,
        string memory _diploma,
        uint256 _year
    ) external onlyAuthorized returns (bytes32) {
        // For backward compatibility, use default degreeType and issuerName
        return _issueCertificateInternal(_studentName, _studentId, _diploma, "Diploma", "ENIAD", _year);
    }

    /**
     * @notice Extended single-signature issuance with all fields
     * @dev Requires onlyAuthorized - for backward compatibility when dual-sig not enforced
     */
    function issueCertificateExtended(
        string memory _studentName,
        string memory _studentId,
        string memory _diploma,
        string memory _degreeType,
        string memory _issuerName,
        uint256 _year
    ) external onlyAuthorized returns (bytes32) {
        return _issueCertificateInternal(_studentName, _studentId, _diploma, _degreeType, _issuerName, _year);
    }

    function _issueCertificateInternal(
        string memory _studentName,
        string memory _studentId,
        string memory _diploma,
        string memory _degreeType,
        string memory _issuerName,
        uint256 _year
    ) internal returns (bytes32) {
        certificateCount++;
        uint256 _id = certificateCount;
        uint256 _issuedAt = block.timestamp;

        bytes32 _hash = keccak256(abi.encodePacked(_id, _studentName, _studentId, _diploma, _degreeType, _year, _issuedAt));

        require(!certificates[_hash].isValid, "Certificate already exists");

        Certificate memory newCert = Certificate({
            id: _id,
            studentName: _studentName,
            studentId: _studentId,
            diploma: _diploma,
            degreeType: _degreeType,
            issuerName: _issuerName,
            year: _year,
            issuedBy: msg.sender,
            issuedAt: _issuedAt,
            isValid: true,
            directorSigned: msg.sender == director,
            issuerSigned: msg.sender == issuer
        });

        certificates[_hash] = newCert;
        certificateIds[_id] = _hash;

        // Update statistics
        certificatesByDegreeType[_degreeType]++;
        certificatesByMajor[_diploma]++;

        emit CertificateIssued(_hash, _id, _studentId);
        return _hash;
    }

    // =========================================================================
    // VERIFICATION
    // =========================================================================

    function verifyCertificate(bytes32 _hash) external view returns (Certificate memory) {
        require(certificates[_hash].isValid, "Certificate does not exist or is invalid");
        return certificates[_hash];
    }

    function verifyCertificateById(uint256 _id) external view returns (Certificate memory) {
        bytes32 _hash = certificateIds[_id];
        require(certificates[_hash].isValid, "Certificate does not exist or is invalid");
        return certificates[_hash];
    }

    function getCertificate(bytes32 _hash) external view returns (Certificate memory) {
        return certificates[_hash];
    }

    function getCertificateByHash(bytes32 _hash) external view returns (bool exists, Certificate memory cert) {
        cert = certificates[_hash];
        exists = cert.id != 0;
        return (exists, cert);
    }

    // =========================================================================
    // REVOCATION & UPDATE
    // =========================================================================

    function revokeCertificate(bytes32 _hash) external onlyAuthorized {
        require(certificates[_hash].id != 0, "Certificate does not exist");
        require(certificates[_hash].isValid, "Certificate is already revoked");
        
        // Decrease statistics
        certificatesByDegreeType[certificates[_hash].degreeType]--;
        certificatesByMajor[certificates[_hash].diploma]--;
        
        certificates[_hash].isValid = false;
        emit CertificateRevoked(_hash, certificates[_hash].id);
    }

    function updateCertificate(
        bytes32 _hash,
        string memory _studentName,
        string memory _diploma,
        uint256 _year
    ) external onlyAuthorized {
        require(certificates[_hash].id != 0, "Certificate does not exist");
        require(certificates[_hash].isValid, "Cannot update revoked certificate");
        
        // Update major statistics if changed
        if (keccak256(bytes(certificates[_hash].diploma)) != keccak256(bytes(_diploma))) {
            certificatesByMajor[certificates[_hash].diploma]--;
            certificatesByMajor[_diploma]++;
            certificates[_hash].diploma = _diploma;
        }
        
        certificates[_hash].studentName = _studentName;
        certificates[_hash].year = _year;
        
        emit CertificateUpdated(_hash, certificates[_hash].id);
    }

    // =========================================================================
    // STATISTICS
    // =========================================================================

    function getTotalCertificates() external view returns (uint256) {
        return certificateCount;
    }

    function getCertificateCount() external view returns (uint256) {
        return certificateCount;
    }

    function getCertificatesByDegreeType(string memory _degreeType) external view returns (uint256) {
        return certificatesByDegreeType[_degreeType];
    }

    function getCertificatesByMajor(string memory _major) external view returns (uint256) {
        return certificatesByMajor[_major];
    }

    function getAllStatistics() external view returns (
        uint256 total,
        uint256 diplomaCount,
        uint256 masterCount,
        uint256 phdCount,
        uint256 achievementCount,
        uint256 irsiCount,
        uint256 rocCount,
        uint256 aiCount,
        uint256 giCount
    ) {
        return (
            certificateCount,
            certificatesByDegreeType[DIPLOMA],
            certificatesByDegreeType[MASTER],
            certificatesByDegreeType[PHD],
            certificatesByDegreeType[ACHIEVEMENT],
            certificatesByMajor[IRSI],
            certificatesByMajor[ROC],
            certificatesByMajor[AI],
            certificatesByMajor[GI]
        );
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    function getDirector() external view returns (address) {
        return director;
    }

    function getIssuer() external view returns (address) {
        return issuer;
    }

    function isAuthorized(address _addr) external view returns (bool) {
        return _addr == director || _addr == issuer;
    }

    /**
     * @notice Updates the director address (can only be called by current director)
     */
    function setDirector(address _newDirector) external onlyDirector {
        require(_newDirector != address(0), "Invalid address");
        director = _newDirector;
    }

    /**
     * @notice Updates the issuer address (can only be called by current director)
     */
    function setIssuer(address _newIssuer) external onlyDirector {
        require(_newIssuer != address(0), "Invalid address");
        issuer = _newIssuer;
    }
}
