const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying ENIADDigitalCertificate...");

    const ENIADDigitalCertificate = await hre.ethers.getContractFactory("ENIADDigitalCertificate");
    const certContract = await ENIADDigitalCertificate.deploy();

    await certContract.waitForDeployment();

    const address = await certContract.getAddress();

    console.log(`ENIADDigitalCertificate deployed to: ${address}`);

    // Update frontend config
    const configPath = path.join(__dirname, "../../frontend/config.js");
    const configContent = `const CONFIG = {\n  contractAddress: "${address}"\n};\n`;

    fs.writeFileSync(configPath, configContent);
    console.log(`Contract address saved to: ${configPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
