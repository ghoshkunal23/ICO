"use client";
import { useState } from "react";
import Navbar from "./component/Navbar";
import Dashboard from "./component/Dashboard";
import BuyCoin from "./component/BuyCoin";
import BuyerDetails from "./component/BuyerDetails";
import Admin from "./component/Admin";
import { useAppContext } from "./context/AppContext"

export default function Home( { isAdmin: boolean }) {
  const [activeSection, setActiveSection] = useState("dashboard"); // State for active section
  const { contract, walletAddress , isWalletConnected } = useAppContext();
  const [ isAdmin , setIsadmin] = useState<boolean>(false);

  const adminCheck = async ()=> {
    const owner = await contract.owner();
    console.log(owner);
    if(walletAddress == owner){
      setIsadmin(true)
    }else{
      setIsadmin(false)
    }
  }

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard />;
      case "buycoin":
        return <BuyCoin />;
      case "buyerdetails":
        return <BuyerDetails />;
      case "admin":
          return <Admin />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
  {/* Navbar always visible at the top */}
  <Navbar 
    isadmin={true} 
    activeSection={activeSection} 
    setActiveSection={setActiveSection} 
  />

  <main className="flex-1 bg-gray-800 bg-opacity-70 text-white p-4">
    {/* Show a message when the wallet is not connected */}
    {!isWalletConnected ? (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center bg-gray-900 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold">
            Noteworthy Technology Launch: Best Wallet Coin Presale 2025
          </h2>
          <p className="mt-4 text-lg">
            Get the Best Next Gen Wallet Coin of 2025 in the upcoming phase order.
            <br />
            Please connect your wallet for more details about our coin.
          </p>
        </div>
      </div>
    ) : (
      <div className="flex flex-1 items-center justify-center">
        {/* Render the selected section */}
        {/* <div className="w-full max-w-4xl bg-gray-900 p-6 rounded-lg shadow-lg"> */}
          {renderSection()}
          {/* {activeSection === "dashboard" && (
              <Dashboard />
          )} */}
          {/* {activeSection === "buycoin" && (
              <BuyCoin />
          )}
          {activeSection === "buyerdetails" && (
              <BuyerDetails />
          )} */}
        </div>
      // </div>
    )}
  </main>
</div>

  );
}
