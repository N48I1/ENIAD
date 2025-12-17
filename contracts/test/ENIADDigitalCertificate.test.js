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

    describe("Revocation", function () {
        let certHash;
        let certId;

        beforeEach(async function () {
            const tx = await certContract.issueCertificate(
                "Bob Wilson",
                "BOB001",
                "PhD in AI",
                2024
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return certContract.interface.parseLog(log).name === 'CertificateIssued';
                } catch (e) {
                    return false;
                }
            });
            const parsedEvent = certContract.interface.parseLog(event);
            certHash = parsedEvent.args.certificateHash;
            certId = parsedEvent.args.certificateId;
        });

        it("Should allow admin to revoke a certificate", async function () {
            await certContract.revokeCertificate(certId);

            // Verification should now fail
            await expect(certContract.verifyCertificate(certHash))
                .to.be.revertedWith("Certificate does not exist or is invalid");
        });

        it("Should emit CertificateRevoked event", async function () {
            await expect(certContract.revokeCertificate(certId))
                .to.emit(certContract, "CertificateRevoked")
                .withArgs(certHash, certId);
        });

        it("Should fail if non-admin tries to revoke", async function () {
            await expect(
                certContract.connect(otherAccount).revokeCertificate(certId)
            ).to.be.revertedWith("Only admin can perform this action");
        });

        it("Should fail to revoke already revoked certificate", async function () {
            await certContract.revokeCertificate(certId);
            await expect(certContract.revokeCertificate(certId))
                .to.be.revertedWith("Certificate is already revoked");
        });

        it("Should still allow viewing revoked certificate via getCertificateByHash", async function () {
            await certContract.revokeCertificate(certId);

            const [exists, cert] = await certContract.getCertificateByHash(certHash);
            expect(exists).to.equal(true);
            expect(cert.isValid).to.equal(false);
            expect(cert.studentName).to.equal("Bob Wilson");
        });
    });

    describe("Certificate Count", function () {
        it("Should return correct certificate count", async function () {
            expect(await certContract.getCertificateCount()).to.equal(0);

            await certContract.issueCertificate("Test1", "ID1", "Degree1", 2024);
            expect(await certContract.getCertificateCount()).to.equal(1);

            await certContract.issueCertificate("Test2", "ID2", "Degree2", 2024);
            expect(await certContract.getCertificateCount()).to.equal(2);
        });
    });
});
