"use client";
import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { ethers } from "ethers";

interface PhaseInfo {
  id: number;
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

export default function Dashboard() {
  const { contract } = useAppContext();
  const [phaseDetails, setPhaseDetails] = useState<PhaseInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchPhaseDetails = async () => {
    if (!contract) {
      console.error("Contract not initialized.");
      return;
    }

    setLoading(true);

    try {
      const phases: PhaseInfo[] = [];
      for (let i = 0; i < 3; i++) {
        const phase = await contract.getPhaseDetails(i);
        const phaseData: PhaseInfo = {
          id: i,
          phaseName: phase[0],
          phaseCoin: phase[1],
          remainingCoin: phase[2],
          phaseTarget: ethers.formatEther(phase[3].toString()),
          startingTime: new Date(Number(phase[4]) * 1000).toLocaleString(),
          endingTime: new Date(Number(phase[5]) * 1000).toLocaleString(),
          coinPrice: ethers.formatEther(phase[6].toString()),
          isActive: phase[7],
          collectedFund: phase[8]
        };

        phases.push(phaseData);
      }

      setPhaseDetails(phases);
    } catch (error) {
      console.error("Error fetching phase details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract) {
      fetchPhaseDetails();
    }
  }, [contract]);

  return (
    <div className="mt-8 flex flex-wrap gap-20 justify-center">
      {loading ? (
        <div
        className="inline-block h-8 w-8 animate-[spinner-grow_0.75s_linear_infinite] rounded-full bg-current align-[-0.125em] text-surface opacity-0 motion-reduce:animate-[spinner-grow_1.5s_linear_infinite] dark:text-white"
        role="status">
        <span
          className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]"
          >Loading...</span
        >
        </div>
      ) : (
        phaseDetails.map((phase) => (
          <div
            key={phase.id}
            className="w-full sm:w-1 md:w-1/4 p-6 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="text-center">
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {phase.phaseName}
              </h5>
              <p className="mt-4 text-gray-700 dark:text-gray-400">
                <strong>Allotted Coin:</strong> {phase.phaseCoin}
                <br />
                <strong>Phase Target:</strong> {phase.phaseTarget} ETH
                <br />
                <strong>Starting Time:</strong> {phase.startingTime}
                <br />
                <strong>Ending Time:</strong> {phase.endingTime}
                <br />
                <strong>Coin Price:</strong> {phase.coinPrice} ETH
              </p>
              <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600">
                <p className="text-gray-700 dark:text-gray-300">
                  {phase.isActive ? (
                    <span className="text-green-500 font-semibold">This phase is active</span>
                  ) : (
                    <span className="text-red-500 font-semibold">This phase is not active</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>

  );
}
