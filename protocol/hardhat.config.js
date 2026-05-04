require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

const PRIVATE_KEY      = process.env.PRIVATE_KEY      || "0x" + "0".repeat(64);
const MANTLE_API_KEY   = process.env.MANTLE_API_KEY   || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    hardhat: {
      chainId: 31337,
      gas: 12_000_000,
      blockGasLimit: 12_000_000,
    },

    // ── Mantle Sepolia (primary testnet for hackathon) ──────────────────────
    mantleSepolia: {
      url: "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      timeout: 120_000,
    },

    // ── Mantle Mainnet ──────────────────────────────────────────────────────
    mantle: {
      url: "https://rpc.mantle.xyz",
      chainId: 5000,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      timeout: 120_000,
    },
  },

  etherscan: {
    apiKey: {
      mantleSepolia: MANTLE_API_KEY,
      mantle:        MANTLE_API_KEY,
    },
    customChains: [
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL:     "https://api-sepolia.mantlescan.xyz/api",
          browserURL: "https://sepolia.mantlescan.xyz",
        },
      },
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL:     "https://api.mantlescan.xyz/api",
          browserURL: "https://mantlescan.xyz",
        },
      },
    ],
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    token: "MNT",
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 120_000,
  },
};
