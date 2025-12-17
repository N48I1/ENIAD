const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ENIADDigitalCertificate", function () {
    let certContract;
    let owner;
    let otherAccount;

    beforeEach(async function () {
        [owner, otherAccount] = await ethers.getSigners();
        const ENIADDigitalCertificate = await ethers.getContractFactory("ENIADDigitalCertificate");
        certContract = await ENIADDigitalCertificate.deploy();
    });

    describe("Issuance", function () {
        it("Should allow admin to issue a certificate", async function () {
            const tx = await certContract.issueCertificate(
                "John Doe",
                "ST12345",
                "Master in Blockchain",
                2024
            );
            await tx.wait();

            expect(await certContract.certificateCount()).to.equal(1);
        });

        it("Should fail if non-admin tries to issue", async function () {
            await expect(
                certContract.connect(otherAccount).issueCertificate(
                    "Jane Doe",
                    "ST67890",
                    "Bachelor in CS",
                    2024
                )
            ).to.be.revertedWith("Only admin can perform this action");
        });

        it("Should emit CertificateIssued event", async function () {
            await expect(certContract.issueCertificate("John Doe", "1", "Deg", 2024))
                .to.emit(certContract, "CertificateIssued");
        });
    });

    describe("Verification", function () {
        let certHash;

        beforeEach(async function () {
            const tx = await certContract.issueCertificate(
                "Alice Smith",
                "ALICE001",
                "Engineering Degree",
                2023
            );
            const receipt = await tx.wait();
            // Find event to get hash
            const event = receipt.logs.find(log => {
                try {
                    return certContract.interface.parseLog(log).name === 'CertificateIssued';
                } catch (e) {
                    return false;
                }
            });
            certHash = certContract.interface.parseLog(event).args.certificateHash;
        });

        it("Should verify valid certificate by hash", async function () {
            const cert = await certContract.verifyCertificate(certHash);
            expect(cert.studentName).to.equal("Alice Smith");
            expect(cert.isValid).to.equal(true);
        });

        it("Should verify valid certificate by ID", async function () {
            const cert = await certContract.verifyCertificateById(1);
            expect(cert.studentName).to.equal("Alice Smith");
        });

        it("Should fail verification for invalid hash", async function () {
            const invalidHash = ethers.id("invalid");
            await expect(certContract.verifyCertificate(invalidHash))
                .to.be.revertedWith("Certificate does not exist or is invalid");
        });
    });
});
