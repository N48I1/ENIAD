const hre = require("hardhat");

async function main() {
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const Notary = await hre.ethers.getContractFactory("Notary");
    const notary = Notary.attach(contractAddress);

    // Test Data
    const text = "Hello World " + Date.now();
    const hash = hre.ethers.id(text); // ethers v6 syntax in hardhat toolbox v4 probably, or utils.id in v5
    // Actually Hardhat Toolbox v4 usually defaults to ethers v6. Let's check.
    // If v6: ethers.id(text). If v5: ethers.utils.id(text).
    // I'll try ethers.id first (v6), fallback or check. 
    // Toolbox usually brings ethers v6.

    console.log(`Hashing text: "${text}" -> ${hash}`);

    // 1. Verify before notarizing (Should be false)
    console.log("Verifying before...", hash);
    let result = await notary.verify(hash);
    console.log("Exists?", result[0]);

    if (result[0] === true) {
        throw new Error("Document should NOT exist yet.");
    }

    // 2. Notarize
    console.log("Notarizing...");
    const tx = await notary.notarize(hash);
    await tx.wait();
    console.log("Transaction confirmed:", tx.hash);

    // 3. Verify after (Should be true)
    console.log("Verifying after...");
    result = await notary.verify(hash);
    console.log("Exists?", result[0]);
    console.log("Timestamp:", result[1].toString());
    console.log("Owner:", result[2]);

    if (result[0] !== true) {
        throw new Error("Document SHOULD exist now.");
    }

    console.log("VERIFICATION SUCCESSFUL!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
