import { ethers } from "ethers";
import * as dotenv from "dotenv";

// load environment variables
dotenv.config();

// import the compiled contract artifact directly
import artifact from "../artifacts/contracts/SafeVault.sol/SafeVault.json" with { type: "json" };

async function main() {
  console.log("🚀 Deploying SafeVault to Somnia Testnet...");

  // Updated 2026 Somnia RPC endpoints
  const rpcUrls = [
    "https://shannon-testnet.somnia.network", 
    "https://dream-rpc.somnia.network",
    "https://somnia-testnet.rpc.thirdweb.com"
  ];

  let provider;
  for (const url of rpcUrls) {
    try {
      provider = new ethers.JsonRpcProvider(url);
      await provider.getNetwork(); 
      console.log(`✅ Connected to: ${url}`);
      break;
    } catch (error) {
      console.log(`📡 Skipping ${url}: Connection failed.`);
      provider = null;
    }
  }

  if (!provider) {
    throw new Error("All Somnia RPC endpoints failed. Check your internet or the Somnia status page.");
  }

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY ?? "", provider);
  const threshold = ethers.parseUnits("2500", 18);

  console.log("⏳ Sending deployment transaction...");

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  
  // Deploy the contract
  const vault = await factory.deploy(threshold);

  console.log("📡 Transaction sent! Waiting for confirmation on Somnia...");
  
  // ethers v6/v7 standard for 2026
  await vault.waitForDeployment(); 
  
  // Must use getAddress() in ethers v6+
  const deployedAddress = await vault.getAddress();

  console.log("--------------------------------------------------");
  console.log(`✅ SafeVault successfully deployed!`);
  console.log(`📍 Contract Address: ${deployedAddress}`);
  console.log(`🔗 Explorer: https://shannon-explorer.somnia.network/address/${deployedAddress}`);
  console.log("--------------------------------------------------");
}

// Fixed: Only call main once
main().catch((error) => {
  console.error("❌ Deployment failed:");
  console.error(error);
  process.exitCode = 1;
});