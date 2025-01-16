"use client";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAppContext } from "../context/AppContext";
import Swal from "sweetalert2";

interface PhaseDetails {
  phaseName: string;
  phaseCoin: string;
  remainingCoin: string;
  phaseTarget: string;
  startingTime: number;
  endingTime: number;
  phaseCoinPrice: string;
  isActive: boolean;
  remainingTime: string;
  phaseCollectedFund: string;
}

interface BuyerDetails {
  buyerAddress: string;
  totalCoinsPurchased: string;
  totalAmountSpent: string;
}

interface PhaseOverview {
  phaseName: string;
  phaseCoin: string;
  remainingCoin: string;
  collectedFund: string;
}


export default function Admin() {
  const { walletAddress, contract } = useAppContext();
  const [phaseDetails, setPhaseDetails] = useState<PhaseDetails | null>(null);
  const [buyers, setBuyers] = useState<BuyerDetails[]>([]);
  const [seedRoundBuyers, setSeedRoundBuyers] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<PhaseDetails | null>(null);
  const [extraTime, setExtraTime] = useState<number>(0);
  const [totalCollectedFunds, setTotalCollectedFunds] = useState<string>();
  const [coinsSold, setCoinsSold] = useState<number>();
  const [phaseOverview, setPhaseOverview] = useState<PhaseOverview[]>([]);
  const [confirmedBuyers, setConfirmedBuyers] = useState<string[]>([]);
  const [storedAddress, SetStoredAddress] = useState<string[]>([]);


  useEffect(() => {
    const fetchDetails = async () => {
      if (contract) {
        await fetchPhaseDetails(contract);
        await fetchBuyers(contract);
        await fetchSeedRoundBuyers(contract);
        await fetchPhaseOverview(contract);
        await fetchStoredAddress(contract);
        await fetchConfirmedBuyers(contract)

        // const handleSeedRoundApplication = (buyer: string) => {
        //   console.log(`New seed round application from: ${buyer}`);

        //   // Avoid duplicates in the list
        //   setSeedRoundBuyers((prevBuyers) => {
        //     if (!prevBuyers.includes(buyer)) {
        //       return [...prevBuyers, buyer];
        //     }
        //     return prevBuyers;
        //   });
        // };

        // // Attach event listener to the contract
        // contract.on("SeedRoundApplication", handleSeedRoundApplication);

        // // Cleanup function to remove the listener
        // return () => {
        //   contract.off("SeedRoundApplication", handleSeedRoundApplication);
        // };
      }
    };
    fetchDetails();
    fetchTotalCollectedFund();
    fetchTotalCoinSold();
    fetchRemainingTime();
  }, [contract]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
  
    const startTimer = async () => {
      if (contract) {
        await fetchRemainingTime(); // Fetch initial value
        interval = setInterval(fetchRemainingTime, 1000); // Update every second
      }
    };
  
    startTimer();
  
    // Cleanup interval on component unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [contract]);
  

  // Current Phase Deatsils Section
  const fetchPhaseDetails = async (contract: ethers.Contract) => {
    try {
      const details = await contract.getCurrentPhaseDetails();

      setPhaseDetails({
        phaseName: details[0],
        phaseCoin: details[1],
        remainingCoin: ethers.formatEther(details[2]),
        phaseTarget: ethers.formatEther(details[3]),
        startingTime: Number(details[4]),
        endingTime: Number(details[5]),
        phaseCoinPrice: ethers.formatEther(details[6]),
        isActive: details[7],
        remainingTime: "",
        phaseCollectedFund: ethers.formatEther(details[8]),
      });
      setCurrentPhase(details[0]);
    } catch (error) {
      console.error("Error fetching phase details", error);
    }
  };
  // Remaining Time Part
  const fetchRemainingTime = async () => {
    try {
      if (contract) {
        const remainingTimeInSeconds = await contract.getRemainingTimeInStage();
        const remainingTimeFormatted = formatRemainingTime(remainingTimeInSeconds);

        setPhaseDetails((prevDetails) =>
          prevDetails
            ? { ...prevDetails, remainingTime: remainingTimeFormatted }
            : null
        );
      }
    } catch (error) {
      console.error("Error fetching remaining time:", error);
    }
  };

  const formatRemainingTime = (remainingTimeInSeconds: ethers.BigNumberish): string => {
    const seconds = Number(remainingTimeInSeconds);
    if (seconds <= 0) {
      return "Phase has ended";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secondsLeft = seconds % 60;

    return `${hours}h ${minutes}m ${secondsLeft}s`;
  };

  // Change The Phase
  const updatePhase = async () => {
    if (contract) {
      try {
        await contract.updateStage();
        await fetchPhaseDetails(contract);
      } catch (error) {
        console.error("Error updating phase", error);
      }
    }
  };

  // Extend Phase Time
  const extendPhase = async () => {
    if (contract && extraTime > 0) {
      try {
        await contract.extendPhaseDuration(extraTime);
        await fetchPhaseDetails(contract);
      } catch (error) {
        console.error("Error extending phase", error);
      }
    }
  };

  // Buyers Details Section

  const fetchBuyers = async (contract: ethers.Contract) => {
    try {
      const buyerAddresses = await contract.getBuyerAddresses();
      const buyerDetails = await Promise.all(
        buyerAddresses.map(async (address: string) => {
          const details = await contract.getBuyerDetails(address);
          return {
            buyerAddress: address,
            totalCoinsPurchased: details[0],
            totalAmountSpent: ethers.formatEther(details[1]),
          };
        })
      );
      setBuyers(buyerDetails);
    } catch (error) {
      console.error("Error fetching buyer details", error);
    }
  };

  //  Applyed Buyer Section for Seed Phase

  const fetchSeedRoundBuyers = async (contract: ethers.Contract) => {
    try {
      const seedRoundBuyerAddresses = await contract.getApplySeedRoundBuyer();
      setSeedRoundBuyers(seedRoundBuyerAddresses);
    } catch (error) {
      console.error("Error fetching seed round buyers", error);
    }
  };

  const handleConfirmSeedBuyer = async (buyerAddress: string) => {
    if (contract) {
        try {
            // Confirmation dialog
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: `You are about to confirm ${buyerAddress} as a buyer.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, confirm!',
                cancelButtonText: 'Cancel',
            });

            if (result.isConfirmed) {
                // Add buyer to the contract's allowed list
                await contract.addAllowedBuyer(buyerAddress);

                // Update local states
                setSeedRoundBuyers((prevBuyers) =>
                    prevBuyers.filter((address) => address !== buyerAddress)
                );

                SetStoredAddress((prevAdd) =>
                    prevAdd.filter((address) => address !== buyerAddress)
                );

                // Sync the front-end state with the contract's state
                await fetchSeedRoundBuyers(contract);
                fetchConfirmedBuyers(contract);

                // Success notification
                await Swal.fire({
                    title: 'Confirmed!',
                    text: `${buyerAddress} has been added as a buyer.`,
                    icon: 'success',
                });
            }
        } catch (error) {
            console.error('Error confirming seed buyer', error);

            // Error notification
            await Swal.fire({
                title: 'Error',
                text: 'There was an error confirming the buyer. Please try again.',
                icon: 'error',
            });
        }
    }
};


const handleCancelSeedBuyer = async (buyerAddress: string) => {
  if (contract) {
      try {
          const result = await Swal.fire({
              title: 'Are you sure?',
              text: `You are about to cancel ${buyerAddress} as a buyer.`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Yes, cancel!',
              cancelButtonText: 'Cancel',
          });

          if (result.isConfirmed) {
              // Remove the buyer from the list in the front-end
              setSeedRoundBuyers((prevBuyers) =>
                  prevBuyers.filter((address) => address !== buyerAddress)
              );

              SetStoredAddress((prevAdd) =>
                  prevAdd.filter((address) => address !== buyerAddress)
              );

              // Sync front-end state with the contract's state
              await fetchSeedRoundBuyers(contract);

              // Success notification
              await Swal.fire({
                  title: 'Canceled!',
                  text: `${buyerAddress} has been removed from the applicants' list.`,
                  icon: 'success',
              });
          }
      } catch (error) {
          console.error('Error canceling seed buyer', error);

          // Error notification
          await Swal.fire({
              title: 'Error',
              text: 'There was an error canceling the buyer. Please try again.',
              icon: 'error',
          });
      }
  }
};



  // Confirm Buyer List For Seed Phase

  const fetchConfirmedBuyers = async (contract: ethers.Contract) => {
    try {
      const confirmedBuyerAddresses = await contract.getAllowedSheedphaseBuyers();
      setConfirmedBuyers(confirmedBuyerAddresses);
    } catch (error) {
      console.error("Error fetching confirmed buyers", error);
    }
  };

  // Sale Finalized Section

  const finalizeSale = async () => {
    if (!contract) {
      Swal.fire({
        icon: "error",
        title: "Contract Error",
        text: "Contract is not initialized.",
        confirmButtonColor: "#d33",
      });
      return;
    }

    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You are about to finalize the sale. This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, finalize it!",
      });

      if (!result.isConfirmed) {
        return;
      }

      const tx = await contract.finalizeSale();
      await tx.wait();

      Swal.fire({
        icon: "success",
        title: "Sale Finalized",
        text: "The sale has been successfully finalized.",
        confirmButtonColor: "#3085d6",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Finalization Failed",
        text: `An error occurred: ${error.message || error}`,
        confirmButtonColor: "#d33",
      });
      console.error("Error finalizing sale:", error);
    }
  };
  // Total Collected FUnd 
  const fetchTotalCollectedFund = async () => {
    try {
      const totalFund = await contract.totalCollectedFunds();
      setTotalCollectedFunds(ethers.formatEther(totalFund.toString()),);
    } catch (error) {
      console.error("Error fetching Total Collected Fund", error);
    }
  };
  // Total Sold Coin
  const fetchTotalCoinSold = async () => {
    try {
      const totalCoin = await contract.coinsSold();
      setCoinsSold(totalCoin);
    } catch (error) {
      console.error("Error fetching Total Coin Sold", error);
    }
  };

  // Sale Over View Section

  const fetchPhaseOverview = async (contract) => {
    try {
      const phases = ["seedPhase", "PreICO", "ICO", "Completed"];


      const overview = await Promise.all(
        phases.map(async (_phaseKey, index) => {
          const phaseDetails = await contract.getPhaseDetails(index);
          console.log('Phase Details:', phaseDetails);

          return {
            phaseName: phaseDetails[0],
            phaseCoin: phaseDetails[1],
            remainingCoin: phaseDetails[2],
            phaseTarget: phaseDetails[3],
            startingTime: new Date(Number(phaseDetails[4]) * 1000).toLocaleString(),
            endingTime: new Date(Number(phaseDetails[5]) * 1000).toLocaleString(),
            coinPrice: phaseDetails[6],
            isActive: phaseDetails[7],
            collectedFund: ethers.formatEther(phaseDetails[8].toString()),
          }
        })
      );
      setPhaseOverview(overview);
    } catch (error) {
      console.error("Error fetching phase overview", error);
    }
  };

  // Stored Address List Section

  const fetchStoredAddress = async (contract) => {
    try {
      const storedAddress = await contract.getStoreAddress();
      console.log(storedAddress);
      SetStoredAddress(storedAddress);
    } catch (error) {
      console.error("Error fetching stored address", error);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-5xl font-bold text-center text-gray-900">CoinSale Admin Panel</h1>
      {walletAddress && <p className="text-center text-lg text-gray-700 mt-2">Connected: {walletAddress}</p>}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Current Phase */}
        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-slate-800">Current Phase</h2>
          {phaseDetails ? (
            <>
              <p className="mt-2 text-gray-700">Phase: {phaseDetails.phaseName}</p>
              <p className="text-gray-700">Remaining Time: {phaseDetails.remainingTime}</p>
              <button
                onClick={updatePhase}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Update Phase
              </button>

              <div className="mt-4 text-slate-800">
                <input
                  type="number"
                  placeholder="Enter extra time in seconds"
                  value={extraTime}
                  onChange={(e) => setExtraTime(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={extendPhase}
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Extend Phase
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Loading phase details...</p>
          )}
        </div>

        {/* Buyers */}
        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-slate-800">Buyers Details</h2>
          <ul className="mt-4">
            {buyers.map((buyer, index) => (
              <li key={index} className="text-gray-700 border-b py-2">
                {buyer.buyerAddress} - Coins: {buyer.totalCoinsPurchased}, Spent: {buyer.totalAmountSpent} ETH
              </li>
            ))}
          </ul>
        </div>

        {/* Seed Round Buyers */}
        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-slate-800">Seed Round Buyers</h2>
          <ul className="mt-4">
            {seedRoundBuyers.map((address, index) => (
              <li key={index}
                className="text-gray-700 border-b py-2"
              >
                {address}
                <button
                  onClick={() => handleConfirmSeedBuyer(address)}
                  className="ml-4 px-3 py-1 bg-green-500 text-white rounded-lg"
                >
                  Confirm
                </button>
                <button
                  onClick={() => handleCancelSeedBuyer(address)}
                  className="ml-2 px-3 py-1 bg-red-500 text-white rounded-lg"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirmed Buyers List */}
        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-slate-800">Confirmed Buyers</h2>
          <ul className="mt-4">
            {confirmedBuyers.map((buyerAddress, index) => (
              <li key={index} className="text-gray-700 border-b py-2">
                {buyerAddress}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-slate-800">Stored Address Details</h2>
          <ul className="mt-4">
            {storedAddress.map((buyerAddress, index) => (
              <li key={index}
                className="text-gray-700 border-b py-2"
              >
                {buyerAddress}
                <button
                  onClick={() => handleConfirmSeedBuyer(buyerAddress)}
                  className="ml-4 px-3 py-1 bg-green-500 text-white rounded-lg"
                >
                  Allow
                </button>
                <button
                  onClick={() => handleCancelSeedBuyer(buyerAddress)}
                  className="ml-2 px-3 py-1 bg-red-500 text-white rounded-lg"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-slate-800">Sale Overview</h2>
          <ul className="mt-4">
            {phaseOverview.map((phase, index) => (
              <li key={index} className="text-gray-700 border-b py-2">
                <strong>{phase.phaseName}</strong>: Allotted: {phase.phaseCoin}, Remaining: {phase.remainingCoin}, Collected Fund: {phase.collectedFund} ETH
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center py-8">
        <div className="bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-slate-800">Finalize Sale</h2>
          <p className="mt-2 text-gray-700">Total Coin Sold: {coinsSold}</p>
          <p className="mt-2 text-gray-700">Total Collected Fund: {totalCollectedFunds} ETH</p>
          <button
            onClick={finalizeSale}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Finalize Sale
          </button>
        </div>
      </div>

    </div>
  );
}