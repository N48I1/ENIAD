require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.20",
    networks: {
        hardhat: {
            chainId: 1337 // Standard for local dev (MetaMask likes 1337)
        }
    },
    paths: {
        artifacts: "../frontend/artifacts" // Export artifacts directly to frontend for easy access
    }
};
