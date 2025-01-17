"use client";
import { useAppContext } from "../context/AppContext";
import Link from "next/link";
import { useState , useEffect } from "react";

type NavbarProps = {
  isadmin: boolean;
  setActiveSection: (section: string) => void;
  activeSection: string;
};

export default function Navbar({
  isadmin,
  setActiveSection,
  activeSection,
}: NavbarProps) {
  const {
    contract,
    walletAddress,
    isWalletConnected,
    connectWallet,
    disconnectWallet,
  } = useAppContext();

  const [adminAddress, setAdminAddress] = useState<string | null>(null);

  useEffect(() => {
    if (contract) {
        fetchAdminDetails();
    }
}, [contract]);

const fetchAdminDetails = async () => {
    if (!contract) return;

    try {
        const ownerAddress = await contract.owner();
        setAdminAddress(ownerAddress);
    } catch (error) {
        console.error("Error fetching admin address:", error);
    }
};


  // Function to trim the wallet address
  const trimWalletAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-5xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-12 items-center justify-between">
          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {/* Dashboard Link */}
            <Link
              href="#dashboard"
              onClick={() => setActiveSection("dashboard")}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                activeSection === "dashboard"
                  ? "bg-gray-900 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              } ${!isWalletConnected ? "text-gray-500 cursor-not-allowed" : ""}`}
            >
              Dashboard
            </Link>

            {/* Buy Coin Section */}
            <Link
              href="#buycoin"
              onClick={() => setActiveSection("buycoin")}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                activeSection === "buycoin"
                  ? "bg-gray-900 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              } ${!isWalletConnected ? "text-gray-500 cursor-not-allowed" : ""}`}
            >
              Buy Coin
            </Link>

            {/* Buyer Details Section */}
            <Link
              href="#buyerdetails"
              onClick={() => setActiveSection("buyerdetails")}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                activeSection === "buyerdetails"
                  ? "bg-gray-900 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              } ${!isWalletConnected ? "text-gray-500 cursor-not-allowed" : ""}`}
            >
              Buyer Details
            </Link>

            {/* Admin Panel Section */}
            {isWalletConnected && walletAddress === adminAddress && (
              <Link
                href="#admin"
                onClick={() => setActiveSection("admin")}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  activeSection === "admin"
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                } ${!isWalletConnected ? "text-gray-500 cursor-not-allowed" : ""}`}
              >
                Admin Panel
              </Link>
            )}
          </div>

          {/* Connect/Disconnect Wallet Button */}
          <div className="flex items-center space-x-4">
            {isWalletConnected && walletAddress && (
              <span className="text-sm font-medium text-gray-300">
                {trimWalletAddress(walletAddress)}
              </span>
            )}
            <button
              onClick={isWalletConnected ? disconnectWallet : connectWallet}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                isWalletConnected
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isWalletConnected ? "Disconnect" : "Connect Wallet"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}