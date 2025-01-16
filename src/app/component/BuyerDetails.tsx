"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAppContext } from "../context/AppContext";

interface BuyerDetailsData {
    buyerAddress: string;
    totalCoinsPurchased: string;
    totalAmountSpent: string;
}

export default function BuyerDetails() {
    const [buyerDetails, setBuyersDetails] = useState<BuyerDetailsData[]>([]);
    const { contract, isWalletConnected, walletAddress } = useAppContext();

    const fetchBuyerDetails = async (address: string) => {
        if (!contract) return; // Ensure contract is initialized
        try {
            const buyerDetails = await contract.getBuyerDetails(address);
            const [totalCoinsPurchased, totalAmountSpent] = buyerDetails;

            const newDetails = {
                buyerAddress: address,
                totalCoinsPurchased: totalCoinsPurchased.toString(),
                totalAmountSpent: ethers.formatEther(totalAmountSpent),
            };

            // Check if the buyer address already exists in the state
            setBuyersDetails((prevDetails) => {
                const existingIndex = prevDetails.findIndex((b) => b.buyerAddress === address);

                if (existingIndex >= 0) {
                    // Update existing buyer data
                    const updatedDetails = [...prevDetails];
                    updatedDetails[existingIndex] = newDetails;
                    return updatedDetails;
                } else {
                    // Add new buyer data
                    return [...prevDetails, newDetails];
                }
            });
        } catch (error) {
            console.error("Error fetching buyer details:", error);
        }
    };

    const listenForPurchaseEvent = () => {
        if (!contract) return; // Ensure contract is initialized
        // Listen for the CoinPurchased event
        contract.on("PurchaseUpdated", (buyer: string, amount: ethers.BigNumberish, totalSpent: ethers.BigNumberish) => {
            console.log("Coin purchased event detected:", { buyer, amount, totalSpent });

            // Fetch and update buyer details
            fetchBuyerDetails(buyer);
        });
    };

    useEffect(() => {
        if (!isWalletConnected || !walletAddress) return; // Check if wallet is connected

        // Fetch buyer details for the connected wallet
        fetchBuyerDetails(walletAddress);

        // Start listening for events
        listenForPurchaseEvent();

        return () => {
            // Cleanup the event listener
            if (contract) {
                contract.removeAllListeners("PurchaseUpdated");
            }
        };
    }, [contract, isWalletConnected, walletAddress]);

    if (buyerDetails.length === 0) {
        return <div>Loading buyer details...</div>;
    }

    return (
        <div className="w-full max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow sm:p-8 dark:bg-gray-800 dark:border-gray-700 absolute top-[100px] right-[430px] transform -translate-x-2">
            {buyerDetails.map((buyer, index) => (
                <div key={index} className="mb-6">
                    <h5 className="mb-4 text-xl font-medium text-gray-500 dark:text-gray-400">
                        {buyer.buyerAddress.slice(0, 6)}...{buyer.buyerAddress.slice(-4)} Purchase Details
                    </h5>
                    <div className="flex items-baseline text-gray-900 dark:text-white">
                        <span className="text-3xl font-medium">ETH</span>
                        <span className="text-5xl font-extrabold tracking-tight">
                            {buyer.totalAmountSpent}
                        </span>
                        <span className="ms-1 text-xl font-normal text-gray-500 dark:text-gray-400">
                            /Total Spent
                        </span>
                    </div>
                    <ul role="list" className="space-y-5 my-7">
                        <li className="flex items-center">
                            <svg
                                className="flex-shrink-0 w-4 h-4 text-blue-700 dark:text-blue-500"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
                            </svg>
                            <span className="text-base font-normal leading-tight text-gray-500 dark:text-gray-400 ms-3">
                                ICO Coin Purchased: {buyer.totalCoinsPurchased}
                            </span>
                        </li>
                    </ul>
                </div>
            ))}
        </div>
    );
}
