"use client";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import Swal from "sweetalert2";

interface PhaseDetails {
    phaseName: string;
    phaseCoin: number;
    reamingCoin: number;
    phaseTarget: number;
    startingTime: string;
    endingTime: string;
    coinPrice: number;
    isActive: boolean;
    remainingTime: string;
}

export default function BuyCoin() {
    const [coin, setCoin] = useState<number>(0);
    const [amount, setAmount] = useState<number>(0); // ETH amount, calculated automatically
    const [currentPhase, setCurrentPhase] = useState<PhaseDetails | null>(null);
    const { contract, isWalletConnected, walletAddress } = useAppContext();

    // Fetch the current phase details from the smart contract
    async function fetchCurrentPhaseDetails() {
        try {
            if (contract) {
                const phaseDetails = await contract.getCurrentPhaseDetails();
                const [
                    phaseName,
                    phaseCoin,
                    reamingCoin,
                    phaseTarget,
                    startingTime,
                    endingTime,
                    phaseCoinPrice,
                    isActive,
                ] = phaseDetails;

                setCurrentPhase({
                    phaseName,
                    phaseCoin,
                    reamingCoin,
                    phaseTarget: Number(ethers.formatUnits(phaseTarget, 18)),
                    startingTime: new Date(Number(startingTime) * 1000).toLocaleString(),
                    endingTime: new Date(Number(endingTime) * 1000).toLocaleString(),
                    coinPrice: Number(ethers.formatUnits(phaseCoinPrice, 18)),
                    isActive,
                    remainingTime: "",
                });

                fetchRemainingTime();
            }
        } catch (error) {
            console.log("Error fetching phase details:", error.message);
        }
    }

    // Fetch the remaining time for the current phase
    const fetchRemainingTime = async () => {
        try {
            if (isWalletConnected && contract) {
                const remainingTimeInSeconds = await contract.getRemainingTimeInStage();
                const remainingTimeFormatted = formatRemainingTime(remainingTimeInSeconds);

                setCurrentPhase((prevPhase) => ({
                    ...prevPhase!,
                    remainingTime: remainingTimeFormatted,
                }));
            }
        } catch (error) {
            console.log("Error fetching remaining time:", error);
        }
    };

    // Format remaining time into user-friendly format
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

    // Update amount when user changes the number of coins
    const handleCoinInput = (value: number) => {
        setCoin(value);
        if (currentPhase) {
            setAmount(value * currentPhase.coinPrice); // Calculate ETH amount dynamically
        }
    };

    // Handle coin purchase
    const buyCoin = async () => {
        if (!isWalletConnected) {
            Swal.fire({
                icon: "warning",
                title: "Wallet Not Connected",
                text: "Please connect your wallet first.",
                confirmButtonColor: "#3085d6",
            });
            return;
        }
    
        if (!contract) {
            Swal.fire({
                icon: "error",
                title: "Contract Error",
                text: "Contract not initialized.",
                confirmButtonColor: "#d33",
            });
            return;
        }
    
        try {
            const amountInWei = ethers.parseUnits(amount.toString(), "ether");
    
            const result = await Swal.fire({
                title: "Are you sure?",
                text: `You are about to buy ${coin} coins for ${amount} ETH.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, buy it!",
            });
    
            if (!result.isConfirmed) {
                return;
            }
    
            const tx = await contract.buyCoin(coin, {
                value: amountInWei,
            });
    
            await tx.wait();
    
            Swal.fire({
                icon: "success",
                title: "Transaction Successful",
                text: "You have successfully bought the coin.",
                confirmButtonColor: "#3085d6",
            });
            console.log("Transaction successful:", tx);
        } catch (error: any) {
            // Check for "Sale has ended" error message
            if (error?.reason === "Sale has ended") {
                Swal.fire({
                    icon: "error",
                    title: "Sale has Ended",
                    text: "The sale for this phase has ended. Please check the next phase.",
                    confirmButtonColor: "#d33",
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Transaction Failed",
                    text: `Error buying coin: ${error.message || error}`,
                    confirmButtonColor: "#d33",
                });
            }
            console.error("Error buying coin:", error);
        }
    };
    

    // Apply for Seed Round
    const applySeedRound = async () => {
        if (!isWalletConnected) {
            Swal.fire({
                icon: "warning",
                title: "Wallet Not Connected",
                text: "Please connect your wallet first.",
                confirmButtonColor: "#3085d6",
            });
            return;
        }

        if (!contract) {
            Swal.fire({
                icon: "error",
                title: "Contract Error",
                text: "Contract not initialized.",
                confirmButtonColor: "#d33",
            });
            return;
        }

        try {
            const result = await Swal.fire({
                title: "Are you sure?",
                text: "You are about to apply for the Seed Round.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, apply!",
            });

            if (!result.isConfirmed) {
                return;
            }

            const tx = await contract.applySeedRound(walletAddress);

            await tx.wait();

            Swal.fire({
                icon: "success",
                title: "Seed Round Application Successful",
                text: "You have successfully applied for the Seed Round.",
                confirmButtonColor: "#3085d6",
            });
            console.log("Seed Round Application successful:", tx);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Application Failed",
                text: `Error applying for Seed Round: ${error.message || error}`,
                confirmButtonColor: "#d33",
            });
            console.error("Error applying for Seed Round:", error);
        }
    };

    useEffect(() => {
        fetchCurrentPhaseDetails();
    }, [isWalletConnected, contract]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
      
        const startTimer = async () => {
          if (contract) {
            await fetchRemainingTime(); // Fetch initial value
            interval = setInterval(fetchRemainingTime, 1000); // Update every second
          }
        };
      
        startTimer();
        return () => {
          if (interval) {
            clearInterval(interval);
          }
        };
      }, [contract]);

    if (!currentPhase) {
        return <p>Loading phase details...</p>;
    }

    if (coin > currentPhase.reamingCoin) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "The number of coins is too large.",
        });
        return;
    }



    return (
        <div className="w-full max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow sm:p-8 dark:bg-gray-800 dark:border-gray-700 absolute top-[100px] right-[430px] transform -translate-x-2">
            <h5 className="mb-4 text-xl font-medium text-gray-500 dark:text-gray-400">{currentPhase.phaseName}</h5>
            <div className="flex items-baseline text-gray-900 dark:text-white">
                <span className="text-3xl font-medium">ETH</span>
                <span className="text-5xl font-extrabold tracking-tight">{currentPhase.coinPrice}</span>
                <span className="ms-1 text-xl font-normal text-gray-500 dark:text-gray-400">/Coin</span>
            </div>
            <ul role="list" className="space-y-5 my-7">
                <li className="flex items-center">
                    <span className="text-base font-normal leading-tight text-gray-500 dark:text-gray-400 ms-3">
                        Allotted Coin: {currentPhase.phaseCoin}
                    </span>
                </li>
                <li className="flex">
                    <span className="text-base font-normal leading-tight text-gray-500 dark:text-gray-400 ms-3">
                        Phase Target: {currentPhase.phaseTarget} ETH
                    </span>
                </li>
                <li className="flex">
                    <span className="text-base font-normal leading-tight text-gray-500 dark:text-gray-400 ms-3">
                        Phase Starting Time: {currentPhase.startingTime}
                    </span>
                </li>
                <li className="flex">
                    <span className="text-base font-normal leading-tight text-gray-500 dark:text-gray-400 ms-3">
                        Remaining Time: {currentPhase.remainingTime}
                    </span>
                </li>
            </ul>
            <div className="mb-4">
                <label htmlFor="coinAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Number of Coins to Buy
                </label>
                <input
                    type="number"
                    id="coinAmount"
                    min="1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-black dark:bg-gray-700 dark:text-white"
                    placeholder="Enter number of coins"
                    value={coin}
                    onChange={(event) => handleCoinInput(Number(event.target.value))}
                />
            </div>
            <div className="mb-4">
                <label htmlFor="ETHAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Total ETH Amount
                </label>
                <input
                    type="text"
                    id="ETHAmount"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-black dark:bg-gray-700 dark:text-white"
                    value={amount.toFixed(5)} // Show ETH amount up to 5 decimals
                    readOnly
                />
            </div>
            <button
                type="button"
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-200 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 w-full text-lg font-semibold py-2.5 px-5 rounded-md"
                onClick={buyCoin}
            >
                Buy Coin
            </button>

            {/* Seed Round Section */}
            {currentPhase?.phaseName?.trim().toLowerCase() === "seed phase" && (
                <div className="mt-5 z-50">
                    <button
                        onClick={applySeedRound}
                        className="text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-200 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 w-full text-lg font-semibold py-2.5 px-5 rounded-md"
                    >
                        Apply for Seed Round
                    </button>
                </div>
            )}


        </div>
    );
}
