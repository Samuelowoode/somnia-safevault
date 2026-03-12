import { defineConfig } from "hardhat/config";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  // 1. MANDATORY: Register the verification plugin
  plugins: [hardhatVerify],

  solidity: {
    version: "0.8.30", 
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Paris is the standard EVM target for Somnia Shannon
      evmVersion: "paris" 
    },
  },

  networks: {
    somniaTestnet: {
      type: "http",
      url: "https://dream-rpc.somnia.network", 
      chainId: 50312,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
    },
  },

  // 2. Verification configuration
  verify: {
    etherscan: {
      apiKey: "somnia", // Placeholder string required by the plugin
    },
  },

  // 3. Custom Chain Descriptor for Somnia (Required for 2026)
  chainDescriptors: {
    50312: {
      name: "somniaTestnet",
      blockExplorers: {
        etherscan: {
          name: "Somnia Shannon Explorer",
          url: "https://shannon-explorer.somnia.network",
          apiUrl: "https://shannon-explorer.somnia.network/api",
        },
      },
    },
  },
});