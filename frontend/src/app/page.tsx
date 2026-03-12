"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { connectWallet, RPC_URL } from "./lib/web3";
import vaultData from "./lib/abi.json";
import { ShieldCheck, Activity, Wallet, Landmark, ArrowUpRight } from "lucide-react";

const CONTRACT_ADDRESS = "0x95E6b1f68aD870C13C94dbB8AEE285AfC7d19749";

interface ProtectionEvent {
  price: string;
  emitter: string;
  timestamp: string;
}

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<string>("...");
  const [vaultBalance, setVaultBalance] = useState<string>("0.00");
  const [depositValue, setDepositValue] = useState<string>("0.01");
  const [withdrawValue, setWithdrawValue] = useState<string>("0.01");
  const [newThreshold, setNewThreshold] = useState<string>("");
  const [events, setEvents] = useState<ProtectionEvent[]>([]);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadBlockchainData = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const abiArray = ((vaultData as any).abi ? (vaultData as any).abi : vaultData) as any;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abiArray, provider);

      const rawThreshold = await contract.safetyThreshold();
      setThreshold(ethers.formatUnits(rawThreshold, 18));

      const contractOwner = await contract.owner();
      setOwner(contractOwner);

      const balance = await provider.getBalance(CONTRACT_ADDRESS);
      setVaultBalance(ethers.formatEther(balance));

      const latestBlock = await provider.getBlockNumber();
      const startBlock = Math.max(latestBlock - 10000, 0);
      const chunkSize = 1000;
      const iface = new ethers.Interface(abiArray);
      const eventTopic = ethers.id("ProtectionTriggered(uint256,address,uint256)");

      let allLogs: ethers.Log[] = [];
      for (let from = startBlock; from <= latestBlock; from += chunkSize) {
        const to = Math.min(from + chunkSize - 1, latestBlock);
        const batchLogs = await provider.getLogs({
          address: CONTRACT_ADDRESS,
          fromBlock: from,
          toBlock: to,
          topics: [eventTopic],
        });
        allLogs = allLogs.concat(batchLogs);
      }

      const parsedEvents = allLogs
        .map((log) => {
          const parsed = iface.parseLog(log);
          if (!parsed) return null;
          return {
            price: ethers.formatUnits(parsed.args.price, 18),
            emitter: parsed.args.emitter,
            timestamp: new Date(parsed.args.timestamp.toNumber() * 1000).toLocaleString(),
          };
        })
        .filter((e): e is ProtectionEvent => e !== null)
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
        .slice(0, 20);

      setEvents(parsedEvents);
    } catch (e: any) {
      console.error("❌ Blockchain Load Error:", e);
      setFetchError(e?.message || "Failed to read contract data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  const handleConnect = async () => {
    try {
      const { address } = await connectWallet();
      setAccount(address);
      return address;
    } catch (e: any) {
      alert(e?.message || "Wallet connection failed");
      throw e;
    }
  };

  const handleDeposit = async () => {
    if (!depositValue || Number(depositValue) <= 0) {
      alert("Enter a deposit amount greater than 0");
      return;
    }

    try {
      setTxStatus("Waiting for wallet confirmation...");
      const currentAccount = account || (await handleConnect());
      if (!currentAccount) return;

      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask not found. Please install the extension!");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: CONTRACT_ADDRESS,
        value: ethers.parseEther(depositValue),
      });

      setTxStatus(`Transaction submitted (${tx.hash}), waiting confirmation...`);
      await tx.wait();

      setTxStatus(`Deposit successful: ${depositValue} STT (tx: ${tx.hash})`);
      await loadBlockchainData();
    } catch (e: any) {
      console.error("❌ Deposit Error:", e);
      setTxStatus(e?.message || "Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawValue || Number(withdrawValue) <= 0) {
      alert("Enter a withdrawal amount greater than 0");
      return;
    }

    const currentAccount = account || (await handleConnect());
    if (!currentAccount) return;

    if (currentAccount.toLowerCase() !== owner?.toLowerCase()) {
      alert("Only owner can withdraw funds.");
      return;
    }

    try {
      setTxStatus("Waiting for withdrawal confirmation...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const abiArray = ((vaultData as any).abi ? (vaultData as any).abi : vaultData) as any;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abiArray, signer);

      const tx = await contract.withdraw(ethers.parseUnits(withdrawValue, 18));
      setTxStatus(`Withdrawal submitted (tx: ${tx.hash})`);
      await tx.wait();

      setTxStatus(`Withdrawal successful: ${withdrawValue} STT`);
      await loadBlockchainData();
    } catch (e: any) {
      console.error("❌ Withdraw Error:", e);
      setTxStatus(e?.message || "Withdraw failed");
    }
  };

  const handleUpdateThreshold = async () => {
    if (!newThreshold || Number(newThreshold) <= 0) {
      alert("Enter a threshold greater than 0");
      return;
    }

    const currentAccount = account || (await handleConnect());
    if (!currentAccount) return;

    if (currentAccount.toLowerCase() !== owner?.toLowerCase()) {
      alert("Only owner can update threshold.");
      return;
    }

    try {
      setTxStatus("Waiting for threshold update confirmation...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const abiArray = ((vaultData as any).abi ? (vaultData as any).abi : vaultData) as any;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abiArray, signer);

      const tx = await contract.setSafetyThreshold(ethers.parseUnits(newThreshold, 18));
      setTxStatus(`Threshold update submitted (tx: ${tx.hash})`);
      await tx.wait();

      setTxStatus(`Threshold updated to ${newThreshold} STT`);
      setNewThreshold("");
      await loadBlockchainData();
    } catch (e: any) {
      console.error("❌ Threshold Update Error:", e);
      setTxStatus(e?.message || "Threshold update failed");
    }
  };

  const accountIsOwner = account?.toLowerCase() === owner?.toLowerCase();

  return (
    <main className="min-h-screen bg-[#050505] text-slate-100 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">SafeVault</h1>
            <p className="text-slate-500 text-sm font-mono tracking-widest">SOMNIA SHANNON TESTNET</p>
            <p className="text-xs text-slate-400 mt-1">Owner: {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : "loading..."}</p>
          </div>
          <button
            onClick={handleConnect}
            className="group flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-full hover:bg-emerald-400 transition-all duration-300 active:scale-95"
          >
            <Wallet size={18} />
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "CONNECT WALLET"}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldCheck size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-emerald-400 mb-8 bg-emerald-500/10 w-fit px-3 py-1 rounded-full border border-emerald-500/20">
                <Activity size={14} className="animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest uppercase">Live Protection Active</span>
              </div>
              <p className="text-slate-500 font-medium">Total Assets Protected</p>
              <h2 className="text-6xl font-black text-white mt-2 mb-6 tracking-tight">
                {vaultBalance} <span className="text-2xl text-slate-600 font-normal italic">STT</span>
              </h2>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={depositValue}
                  onChange={(e) => setDepositValue(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl w-32"
                  placeholder="0.01"
                />
                <button
                  onClick={handleDeposit}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-colors"
                >
                  DEPOSIT <ArrowUpRight size={16} />
                </button>
              </div>
              {txStatus && <p className="text-xs text-slate-300 mt-3">{txStatus}</p>}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <Landmark className="text-slate-700 mb-6" size={40} />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Safety Threshold</p>
              <p className="text-4xl font-black mt-2 text-white italic">${threshold}</p>
              {isLoading && <p className="text-xs text-sky-400 mt-1">Refreshing values...</p>}
              {fetchError && <p className="text-xs text-rose-400 mt-1">Error: {fetchError}</p>}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-4 font-medium">
              Vault triggers automated protection when the monitored asset drops below this price point.
            </p>
          </div>
        </div>

        <section className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <h3 className="text-sm uppercase tracking-widest text-slate-400 mb-4">Owner Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-500">Withdraw</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={withdrawValue}
                onChange={(e) => setWithdrawValue(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl w-full"
                placeholder="Withdraw amount"
              />
              <button
                onClick={handleWithdraw}
                disabled={!accountIsOwner}
                className="w-full bg-rose-500 hover:bg-rose-400 text-black px-6 py-2.5 rounded-xl text-sm font-black transition-colors disabled:opacity-50"
              >
                WITHDRAW (Owner-only)
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-500">Safety Threshold</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl w-full"
                placeholder="New safety threshold"
              />
              <button
                onClick={handleUpdateThreshold}
                disabled={!accountIsOwner}
                className="w-full bg-blue-500 hover:bg-blue-400 text-black px-6 py-2.5 rounded-xl text-sm font-black transition-colors disabled:opacity-50"
              >
                UPDATE THRESHOLD (Owner-only)
              </button>
            </div>
          </div>
          {!accountIsOwner && <p className="text-xs text-rose-300 mt-3">Connect as owner to use these controls.</p>}
        </section>

        <section className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <h3 className="text-sm uppercase tracking-widest text-slate-400 mb-4">ProtectionTriggered Events (latest 20)</h3>
          {events.length === 0 ? (
            <p className="text-xs text-slate-500">No protection events yet.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-auto">
              {events.map((ev, idx) => (
                <div key={`${ev.timestamp}-${idx}`} className="bg-slate-950/50 border border-slate-800 p-3 rounded-xl text-xs">
                  <p>price: <span className="font-bold text-white">{ev.price}</span> STT</p>
                  <p>emitter: {ev.emitter}</p>
                  <p>timestamp: {ev.timestamp}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="bg-slate-900/30 border border-slate-800/50 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[10px] font-mono text-slate-500 select-all">CONTRACT: {CONTRACT_ADDRESS}</span>
          </div>
          <a
            href={`https://shannon-explorer.somnia.network/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 tracking-tighter uppercase border-b border-emerald-500/30 pb-0.5 transition-colors"
          >
            Verify on Explorer ↗
          </a>
        </div>
      </div>
    </main>
  );
}

