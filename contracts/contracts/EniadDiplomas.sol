// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EniadDiplomas {
    address public admin;

    struct Diploma {
        string studentName;
        string major;
        uint256 startYear;
        uint256 endYear;
        uint256 issueDate;
        bool isValid;
    }

    // Mapping from Certificate ID (Hash) -> Diploma Details
    mapping(bytes32 => Diploma) public diplomas;

    // Events
    event DiplomaIssued(bytes32 indexed certificateId, string studentName, string major, uint256 timestamp);
    event DiplomaRevoked(bytes32 indexed certificateId, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only Admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // Generate a new diploma
    // Returns the unique Certificate ID (Hash)
    function issueDiploma(
        string memory _studentName,
        string memory _major,
        uint256 _startYear,
        uint256 _endYear
    ) external onlyAdmin returns (bytes32) {
        
        // Create a unique ID by hashing content + timestamp + block info
        // This ensures uniqueness even for same student name
        bytes32 certId = keccak256(abi.encodePacked(
            _studentName, 
            _major, 
            _startYear, 
            _endYear, 
            block.timestamp, 
            msg.sender
        ));

        require(!diplomas[certId].isValid, "Diploma ID collision -- try again");

        diplomas[certId] = Diploma({
            studentName: _studentName,
            major: _major,
            startYear: _startYear,
            endYear: _endYear,
            issueDate: block.timestamp,
            isValid: true
        });

        emit DiplomaIssued(certId, _studentName, _major, block.timestamp);

        return certId;
    }

    // Verify a diploma by its ID
    function verifyDiploma(bytes32 _certificateId) external view returns (
        bool isValid,
        string memory studentName,
        string memory major,
        uint256 startYear,
        uint256 endYear,
        uint256 issueDate
    ) {
        Diploma memory d = diplomas[_certificateId];
        
        if (!d.isValid) {
            return (false, "", "", 0, 0, 0);
        }

        return (
            true,
            d.studentName,
            d.major,
            d.startYear,
            d.endYear,
            d.issueDate
        );
    }

    // Optional: Revoke a diploma in case of error
    function revokeDiploma(bytes32 _certificateId) external onlyAdmin {
        require(diplomas[_certificateId].isValid, "Diploma does not exist");
        diplomas[_certificateId].isValid = false;
        emit DiplomaRevoked(_certificateId, block.timestamp);
    }
}
