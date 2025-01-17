"use client"
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Swal from 'sweetalert2';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, ChartData } from 'chart.js';
import { useAppContext } from '../context/AppContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface PhaseDetails {
  phaseName: string;
  phaseCoin: string;
  remainingCoin: string;
  phaseTarget: string;
  startingTime: string;
  endingTime: string;
  phaseCoinPrice: string;
  isActive: boolean;
  remainingTime: string;
  phaseCollectedFund: number;
}

interface Buyer {
  buyerAddress: string;
  totalCoinsPurchased: string;
  totalAmountSpent: string;
}

interface PhaseOverview {
  phaseName: string;
  phaseCoin: string;
  remainingCoin: string;
  phaseTarget: string;
  startingTime: string;
  endingTime: string;
  coinPrice: string;
  isActive: boolean;
  collectedFund: string;
}

export default function AdminPanel() {
  // State variables
  const [phaseDetails, setPhaseDetails] = useState<PhaseDetails | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [seedRoundBuyers, setSeedRoundBuyers] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [extraTime, setExtraTime] = useState<number>();
  const [totalCollectedFunds, setTotalCollectedFunds] = useState<number>();
  const [coinsSold, setCoinsSold] = useState<number>(0);
  const [phaseOverview, setPhaseOverview] = useState<PhaseOverview[]>([]);
  const [confirmedBuyers, setConfirmedBuyers] = useState<string[]>([]);
  const [storedAddress, setStoredAddress] = useState<string[]>([]);
  const { walletAddress, contract } = useAppContext();

  useEffect(() => {
    if (contract) {
      fetchPhaseDetails();
      fetchBuyers();
      fetchSeedRoundBuyers();
      fetchPhaseOverview();
      fetchStoredAddress();
      fetchConfirmedBuyers();
      fetchTotalCollectedFund();
      fetchTotalCoinSold();
      fetchRemainingTime();
    }
  }, [contract]);

  const fetchPhaseDetails = async () => {
    if (!contract) return;
    try {
      const details = await contract.getCurrentPhaseDetails();
      setPhaseDetails({
        phaseName: details[0],
        phaseCoin: details[1],
        remainingCoin: details[2],
        phaseTarget: ethers.formatEther(details[3]),
        startingTime: new Date(Number(details[4]) * 1000).toLocaleString(),
        endingTime: new Date(Number(details[5]) * 1000).toLocaleString(),
        phaseCoinPrice: ethers.formatEther(details[6]),
        isActive: details[7],
        remainingTime: "",
        phaseCollectedFund: parseFloat(ethers.formatEther(details[8])),
      });
      setCurrentPhase(details[0]);
    } catch (error) {
      console.error("Error fetching phase details", error);
    }
  };

  const updatePhase = async () => {
    if (contract) {
      try {
        await contract.updateStage();
        await fetchPhaseDetails();
        Swal.fire({
          icon: 'success',
          title: 'Phase Updated',
          text: 'The phase has been successfully updated.',
        });
      } catch (error) {
        console.error("Error updating phase", error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'There was an error updating the phase. Please try again.',
        });
      }
    }
  };

  const extendPhase = async () => {
    if (contract && extraTime > 0) {
      try {
        await contract.extendPhaseDuration(extraTime);
        await fetchPhaseDetails();
        Swal.fire({
          icon: 'success',
          title: 'Phase Extended',
          text: `The phase has been extended by ${extraTime} seconds.`,
        });
      } catch (error) {
        console.error("Error extending phase", error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'There was an error extending the phase. Please try again.',
        });
      }
    }
  };

  const fetchBuyers = async () => {
    if (!contract) return;
    try {
      const buyerAddresses: string[] = await contract.getBuyerAddresses();
      const buyerDetails = await Promise.all(
        buyerAddresses.map(async (address) => {
          const details = await contract.getBuyerDetails(address);
          return {
            buyerAddress: address,
            totalCoinsPurchased: details[0].toString(),
            totalAmountSpent: ethers.formatEther(details[1]),
          };
        })
      );
      setBuyers(buyerDetails);
    } catch (error) {
      console.error("Error fetching buyer details", error);
    }
  };

  const fetchSeedRoundBuyers = async () => {
    if (!contract) return;
    try {
      const seedRoundBuyerAddresses: string[] = await contract.getApplySeedRoundBuyer();
      setSeedRoundBuyers(seedRoundBuyerAddresses);
    } catch (error) {
      console.error("Error fetching seed round buyers", error);
    }
  };

  const handleConfirmSeedBuyer = async (buyerAddress: string) => {
    if (contract) {
      try {
        const result = await Swal.fire({
          title: 'Are you sure?',
          text: `You are about to confirm ${buyerAddress} as a buyer.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, confirm!',
          cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
          await contract.addAllowedBuyer(buyerAddress);
          setSeedRoundBuyers((prevBuyers) =>
            prevBuyers.filter((address) => address !== buyerAddress)
          );
          setStoredAddress((prevAdd) =>
            prevAdd.filter((address) => address !== buyerAddress)
          );
          await fetchSeedRoundBuyers();
          fetchConfirmedBuyers();

          await Swal.fire({
            title: 'Confirmed!',
            text: `${buyerAddress} has been added as a buyer.`,
            icon: 'success',
          });
        }
      } catch (error) {
        console.error('Error confirming seed buyer', error);
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
          setSeedRoundBuyers((prevBuyers) =>
            prevBuyers.filter((address) => address !== buyerAddress)
          );
          setStoredAddress((prevAdd) =>
            prevAdd.filter((address) => address !== buyerAddress)
          );
          await fetchSeedRoundBuyers();

          await Swal.fire({
            title: 'Canceled!',
            text: `${buyerAddress} has been removed from the applicants' list.`,
            icon: 'success',
          });
        }
      } catch (error) {
        console.error('Error canceling seed buyer', error);
        await Swal.fire({
          title: 'Error',
          text: 'There was an error canceling the buyer. Please try again.',
          icon: 'error',
        });
      }
    }
  };

  const fetchConfirmedBuyers = async () => {
    if (!contract) return;
    try {
      const confirmedBuyerAddresses: string[] = await contract.getAllowedSheedphaseBuyers();
      setConfirmedBuyers(confirmedBuyerAddresses);
    } catch (error) {
      console.error("Error fetching confirmed buyers", error);
    }
  };

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
        text: `An error occurred: ${(error as Error).message || error}`,
        confirmButtonColor: "#d33",
      });
      console.error("Error finalizing sale:", error);
    }
  };

  const fetchTotalCollectedFund = async () => {
    if (!contract) return;
    try {
      const totalFund = await contract.totalCollectedFunds();
      setTotalCollectedFunds(parseFloat(ethers.formatEther((totalFund))));
    } catch (error) {
      console.error("Error fetching Total Collected Fund", error);
    }
  };

  const fetchTotalCoinSold = async () => {
    if (!contract) return;
    try {
      const totalCoin = await contract.coinsSold();
      setCoinsSold(parseFloat(totalCoin));
    } catch (error) {
      console.error("Error fetching Total Coin Sold", error);
    }
  };

  const fetchPhaseOverview = async () => {
    if (!contract) return;
    try {
      const phases = ["seedPhase", "PreICO", "ICO", "Completed"];
      const overview = await Promise.all(
        phases.map(async (_, index) => {
          const phaseDetails = await contract.getPhaseDetails(index);
          return {
            phaseName: phaseDetails[0],
            phaseCoin: phaseDetails[1],
            remainingCoin: ethers.formatEther(phaseDetails[2]),
            phaseTarget: ethers.formatEther(phaseDetails[3]),
            startingTime: new Date(Number(phaseDetails[4]) * 1000).toLocaleString(),
            endingTime: new Date(Number(phaseDetails[5]) * 1000).toLocaleString(),
            coinPrice: ethers.formatEther(phaseDetails[6]),
            isActive: phaseDetails[7],
            collectedFund: ethers.formatEther(phaseDetails[8].toString()),
          };
        })
      );
      setPhaseOverview(overview);
    } catch (error) {
      console.error("Error fetching phase overview", error);
    }
  };

  const fetchStoredAddress = async () => {
    if (!contract) return;
    try {
      const storedAddresses: string[] = await contract.getStoreAddress();
      setStoredAddress(storedAddresses);
    } catch (error) {
      console.error("Error fetching stored address", error);
    }
  };

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

  const formatRemainingTime = (remainingTimeInSeconds: number): string => {
    const seconds = Number(remainingTimeInSeconds);
    if (seconds <= 0) {
      return "Phase has ended";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secondsLeft = seconds % 60;

    return `${hours}h ${minutes}m ${secondsLeft}s`;
  };

  const endPhase = async () => {
    if (!contract) return;

    try {
      await contract.endSale();
      Swal.fire({
        icon: 'success',
        title: 'Sale Stopped',
        text: 'The sale has been successfully paused.',
      });
    } catch (error) {
      const errorMessage = error?.reason || error?.data?.message || error?.message;

      if (errorMessage === "Sale is already stopped") {
        Swal.fire({
          icon: "error",
          title: "Sale is already stopped",
          text: "", // No extra text
          confirmButtonColor: "#d33",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Transaction Failed",
          text: errorMessage,
          confirmButtonColor: "#d33",
        });
      }

      console.error("Error stopping sale:", error);
    }
  };

  // Chart data
  const saleOverviewData: ChartData<"pie"> = {
    labels: ['Total Collected Funds (ETH)', 'Coins Sold'],
    datasets: [
      {
        data: [totalCollectedFunds, coinsSold],
        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
      },
    ],
  };

  const phaseOverviewData: ChartData<"bar"> = {
    labels: phaseOverview.map(phase => phase.phaseName),
    datasets: [
      {
        label: 'Collected Funds',
        data: phaseOverview.map(phase => parseFloat((phase.collectedFund))),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Target Funds',
        data: phaseOverview.map(phase => parseFloat(phase.phaseTarget)), // Assuming targetFund is a property in your phase data
        backgroundColor: 'rgba(153, 102, 255, 0.6)', // Color for target funds
      },
    ],
  };

  return (
    // <div className="min-h-screen bg-gray-100 p-4">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-center font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Update, Extend, End Phase */}
        <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-center font-bold text-gray-800 mb-6">Access in One Click</h1>
          <div className="flex flex-col space-y-8">
            <button onClick={updatePhase} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Update Phase
            </button>
            <div className="flex space-x-2">
              <input
                type="number"
                value={extraTime}
                onChange={(e) => setExtraTime(Number(e.target.value))}
                className="flex-grow border text-gray-800 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Time in seconds"
              />
              <button onClick={extendPhase} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                Extend Phase
              </button>
            </div>
            <button
              onClick={endPhase}
              className={"w-full px-4 py-2 text-white rounded-md bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 'bg-red-600 hover:bg-red-700 focus:ring-red-500"}
            >
              End Current Phase
            </button>
          </div>
        </div>

        {/* Current Phase Details */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Current Phase Details</h2>
          {phaseDetails && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Phase Name</p>
                <p className="text-lg font-semibold text-gray-800">{phaseDetails.phaseName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Starting Time</p>
                <p className="text-lg font-semibold text-gray-800">{phaseDetails.startingTime}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phase Target</p>
                <p className="text-lg font-semibold text-gray-800">{phaseDetails.phaseTarget}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Ending Time</p>
                <p className="text-lg font-semibold text-gray-800">{phaseDetails.endingTime}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Remaining Coin</p>
                <p className="text-lg font-semibold text-gray-800">{phaseDetails.remainingCoin}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Remaining Time</p>
                <p className="text-lg font-semibold text-gray-800">{phaseDetails.remainingTime}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sale Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Sale Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2">
            <Pie data={saleOverviewData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
          <div className="flex flex-col justify-center">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500">Total Collected Funds</p>
              <p className="text-2xl font-bold text-gray-800">{totalCollectedFunds} ETH</p>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500">Coins Sold</p>
              <p className="text-2xl font-bold text-gray-800">{coinsSold}</p>
            </div>
            <button onClick={finalizeSale} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
              Finalize Sale
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Seed Round Applicants */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Seed Round Applicants</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {seedRoundBuyers.map((buyer, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{buyer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleConfirmSeedBuyer(buyer)} className="text-green-600 hover:text-green-900 mr-4">Confirm</button>
                      <button onClick={() => handleCancelSeedBuyer(buyer)} className="text-red-600 hover:text-red-900">Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stored Addresses */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Stored Addresses</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {storedAddress.map((address, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleConfirmSeedBuyer(address)} className="text-green-600 hover:text-green-900 mr-4">Allow</button>
                      <button onClick={() => handleCancelSeedBuyer(address)} className="text-red-600 hover:text-red-900">Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmed Buyers */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Confirmed Buyers</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {confirmedBuyers.map((buyer, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{buyer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Phase Overview</h2>
        {/* Bar Chart Section */}
        <div className="mb-6 flex justify-center">
          <div style={{ height: '300px', width: '600px' }}>
            <Bar
              data={phaseOverviewData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coin Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collected</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {phaseOverview.map((phase, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{phase.phaseName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{phase.phaseTarget}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{phase.startingTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{phase.endingTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{phase.coinPrice}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${phase.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {phase.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{phase.collectedFund}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    // </div>
  );
}

