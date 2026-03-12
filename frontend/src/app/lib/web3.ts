// src/lib/web3.ts
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Somnia Shannon Testnet Configuration
export const SOMNIA_CHAIN_ID = "0xc488"; // Hex for 50312
export const RPC_URL = "https://dream-rpc.somnia.network";

export const connectWallet = async () => {
  // Check if MetaMask (or any EIP-1193 provider) exists
  if (typeof window.ethereum === "undefined") {
    throw new Error("MetaMask not found. Please install the extension!");
  }

  // Ethers v6/v7 uses BrowserProvider for MetaMask
  const provider = new ethers.BrowserProvider(window.ethereum);
  
  // Request account access from the user
  const accounts = await provider.send("eth_requestAccounts", []);
  
  // A Signer is required to send transactions (write to the blockchain)
  const signer = await provider.getSigner();
  
  return { 
    provider, 
    signer, 
    address: accounts[0] 
  };
};