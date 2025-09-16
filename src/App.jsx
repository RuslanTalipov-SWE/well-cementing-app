import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import WellSchematic from "./components/WellSchematic";
import { calculateVolumes } from "./utils/volumeCalculations";

export default function App() {
  // Initialize geometry with empty arrays/objects to avoid null errors
  const [geometry, setGeometry] = useState({
    casings: [],
    openHole: { size: "", depth: "" },
    drillPipes: [],
  });

  // Calculate volumes safely
  const volumes = calculateVolumes(geometry);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Title bar */}
      <header className="bg-green-700 text-white text-center py-3 shadow-md flex-shrink-0">
        <h1 className="text-xl font-bold">Liner Cementing App</h1>
      </header>

      {/* Main layout: sidebar + schematic + volumes */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar onUpdateGeometry={setGeometry} />

        {/* Well schematic */}
        <div className="flex-1 p-4 overflow-auto">
          {geometry.casings.length > 0 ||
          geometry.drillPipes.length > 0 ||
          geometry.openHole.size ? (
            <WellSchematic geometry={geometry} />
          ) : (
            <p className="text-gray-500">
              Please input well geometry in the sidebar
            </p>
          )}
        </div>

        {/* Right panel for volumes */}
        <div className="w-64 bg-gray-100 p-4 overflow-auto">
          <h2 className="text-lg font-bold mb-2">Volumes (bbl)</h2>
          <p>Internal String: {volumes.internalStringVolume.toFixed(2)} bbl</p>
          <p>Liner: {volumes.linerVolume.toFixed(2)} bbl</p>
          <p>Well (no internal string): {volumes.wellVolume.toFixed(2)} bbl</p>
          <p>Annulus: {volumes.annulusVolume.toFixed(2)} bbl</p>
        </div>
      </div>
    </div>
  );
}
