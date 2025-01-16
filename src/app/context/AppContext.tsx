"use client";
import React, { createContext, useState, useContext, Dispatch, SetStateAction, useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "../../contractABI.json";

interface AppContextType {
  walletAddress: string | undefined;
  setWalletAddress: Dispatch<SetStateAction<string | undefined>>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isWalletConnected: boolean;
  setWalletConnected: Dispatch<SetStateAction<boolean>>;
  contract: ethers.Contract | null;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // State for wallet connection
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
  const [isWalletConnected, setWalletConnected] = useState<boolean>(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  const contractAddress: any = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS; // Use NEXT_PUBLIC_ prefix for client-side access
  console.log(contractAddress);

  // Initialize provider, signer, and contract
  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum && contractAddress) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum as unknown as ethers.Eip1193Provider);
          const signer = await provider.getSigner();
          const initializedContract = new ethers.Contract(contractAddress, contractABI, signer);
          setContract(initializedContract);
          console.log(contract);
        } catch (error) {
          console.error("Error initializing contract:", error);
        }
      } else {
        console.error("Ethereum provider or contract address is missing");
      }
    };
    initContract();
  }, [contractAddress]);

  // Function to connect wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum as undefined as ethers.Eip1193Provider);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        console.log(`Connected account: ${address}`)
        setWalletAddress(address);
        setWalletConnected(true);
        console.log("Wallet Connected:", address);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      console.error("MetaMask is not installed");
    }
  };

  // Function to disconnect wallet
  const disconnectWallet = () => {
    setWalletAddress(undefined);
    setWalletConnected(false);
    console.log("Wallet Disconnected");
  };

  const value: AppContextType = {
    walletAddress,
    setWalletAddress,
    connectWallet,
    disconnectWallet,
    isWalletConnected,
    setWalletConnected,
    contract,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
