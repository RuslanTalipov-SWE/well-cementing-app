import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import WellSchematic from "./components/WellSchematic";
import { calculateVolumes } from "./utils/volumeCalculations";

export default function App() {
  // Geometry state
  const [geometry, setGeometry] = useState({
    casings: [],
    openHole: { size: "", depth: "" },
    drillPipes: [],
  });

  // --- Fluid state ---
  // Tracks volumes in drill pipes and annulus
  const [fluidState, setFluidState] = useState({
    drillPipeVolumeFilled: 0, // bbl of cement/mud inside drill pipes
    annulusVolumeFilled: 0, // bbl of cement/mud inside annulus
  });

  // Reset fluid state when geometry changes
  useEffect(() => {
    setFluidState({ drillPipeVolumeFilled: 0, annulusVolumeFilled: 0 });
  }, [geometry]);

  // Calculate well volumes
  const volumes = calculateVolumes(geometry);

  // --- Pumping functions ---
  const handlePumpCement = (bbl) => {
    // Cement goes inside drill pipes first
    const remainingDPVolume =
      volumes.internalStringVolume - fluidState.drillPipeVolumeFilled;
    const pumpVolume = Math.min(bbl, remainingDPVolume);

    setFluidState((prev) => ({
      ...prev,
      drillPipeVolumeFilled: prev.drillPipeVolumeFilled + pumpVolume,
    }));
  };

  const handlePumpMudPush = (bbl) => {
    // Mud push displaces cement down to liner shoe, then into annulus
    const remainingAnnulusVolume =
      volumes.annulusVolume - fluidState.annulusVolumeFilled;
    const pumpVolume = Math.min(bbl, remainingAnnulusVolume);

    setFluidState((prev) => {
      // All cement in drill pipes is pushed down
      const totalDrillPipe = prev.drillPipeVolumeFilled;
      const toAnnulus = Math.min(
        totalDrillPipe + pumpVolume,
        remainingAnnulusVolume
      );

      return {
        drillPipeVolumeFilled: Math.max(totalDrillPipe - toAnnulus, 0),
        annulusVolumeFilled: prev.annulusVolumeFilled + toAnnulus,
      };
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-green-700 text-white text-center py-3 shadow-md flex-shrink-0">
        <h1 className="text-xl font-bold">Liner Cementing App</h1>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          onUpdateGeometry={setGeometry}
          onPumpCement={handlePumpCement}
          onPumpMudPush={handlePumpMudPush}
        />

        {/* Well Schematic */}
        <div className="flex-1 p-4 overflow-auto">
          {geometry.casings.length > 0 ||
          geometry.drillPipes.length > 0 ||
          geometry.openHole.size ? (
            <WellSchematic geometry={geometry} fluidState={fluidState} />
          ) : (
            <p className="text-gray-500">
              Please input well geometry in the sidebar
            </p>
          )}
        </div>

        {/* Right panel for volumes */}
        <div className="w-64 bg-gray-100 p-4 overflow-auto">
          <h2 className="text-sm font-bold mb-2">Volumes (bbl)</h2>
          <p>Well (no internal string): {volumes.wellVolume.toFixed(2)} bbl</p>
          <p>Drill Pipes: {volumes.internalStringVolume.toFixed(2)} bbl</p>
          <p>Liner: {volumes.linerVolume.toFixed(2)} bbl</p>
          <p>
            Internal string displacement:{" "}
            {volumes.internalStringDisplacement.toFixed(2)} bbl
          </p>
          <p>Annulus: {volumes.annulusVolume.toFixed(2)} bbl</p>

          <h3 className="text-sm font-bold mt-4 mb-1">Fluid State</h3>
          <p>
            Drill Pipe Filled: {fluidState.drillPipeVolumeFilled.toFixed(2)} bbl
          </p>
          <p>Annulus Filled: {fluidState.annulusVolumeFilled.toFixed(2)} bbl</p>
        </div>
      </div>
    </div>
  );
}
