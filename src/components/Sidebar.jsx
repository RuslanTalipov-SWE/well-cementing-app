import React, { useState, useEffect } from "react";

export default function Sidebar({
  onUpdateGeometry,
  onPumpCement,
  onPumpMudPush,
}) {
  const [casings, setCasings] = useState([]);
  const [newCasing, setNewCasing] = useState({
    od: "",
    id: "",
    top: "",
    bottom: "",
  });

  const [openHole, setOpenHole] = useState({ size: "", depth: "" });

  const [drillPipes, setDrillPipes] = useState([]);
  const [newDP, setNewDP] = useState({ od: "", id: "", length: "" });

  // Auto-update geometry
  useEffect(() => {
    const lastCasingBottom =
      casings.length > 0 ? Math.max(...casings.map((c) => c.bottom || 0)) : 0;
    const ohDepth =
      openHole.depth && openHole.depth > lastCasingBottom
        ? openHole.depth
        : lastCasingBottom;

    onUpdateGeometry({
      casings,
      openHole: { ...openHole, depth: ohDepth },
      drillPipes,
    });
  }, [casings, openHole, drillPipes, onUpdateGeometry]);

  // --- Casings ---
  const addCasing = () => {
    if (!newCasing.od || !newCasing.id || !newCasing.top || !newCasing.bottom)
      return;
    setCasings([
      ...casings,
      {
        od: parseFloat(newCasing.od) || 0,
        id: parseFloat(newCasing.id) || 0,
        top: parseFloat(newCasing.top) || 0,
        bottom: parseFloat(newCasing.bottom) || 0,
      },
    ]);
    setNewCasing({ od: "", id: "", top: "", bottom: "" });
  };

  const updateCasing = (index, field, value) => {
    const updated = [...casings];
    updated[index][field] = parseFloat(value) || 0;
    setCasings(updated);
  };

  const deleteCasing = (index) =>
    setCasings(casings.filter((_, i) => i !== index));

  // --- Drill Pipes ---
  const addDP = () => {
    if (!newDP.od || !newDP.id || !newDP.length) return;
    setDrillPipes([
      ...drillPipes,
      {
        od: parseFloat(newDP.od) || 0,
        id: parseFloat(newDP.id) || 0,
        length: parseFloat(newDP.length) || 0,
      },
    ]);
    setNewDP({ od: "", id: "", length: "" });
  };

  const updateDP = (index, field, value) => {
    const updated = [...drillPipes];
    updated[index][field] = parseFloat(value) || 0;
    setDrillPipes(updated);
  };

  const deleteDP = (index) =>
    setDrillPipes(drillPipes.filter((_, i) => i !== index));

  // --- Open Hole ---
  const handleOpenHoleChange = (field, value) => {
    setOpenHole((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  // --- Pumping Controls ---
  const handlePumpCement = () => {
    if (onPumpCement) onPumpCement(10); // example: 10 bbl per click
  };

  const handlePumpMudPush = () => {
    if (onPumpMudPush) onPumpMudPush(10); // example: 10 bbl per click
  };

  return (
    <div className="w-96 bg-gray-100 p-4 h-screen overflow-y-auto">
      {/* Casings */}
      <h2 className="text-lg font-bold mb-2">Casing</h2>
      <table className="w-full table-auto border-collapse mb-2 text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2">OD (in)</th>
            <th className="border px-2">ID (in)</th>
            <th className="border px-2">Top (m)</th>
            <th className="border px-2">Bottom (m)</th>
            <th className="border px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {casings.map((c, idx) => (
            <tr key={idx}>
              {["od", "id", "top", "bottom"].map((field) => (
                <td className="border px-1" key={field}>
                  <input
                    type="number"
                    value={c[field]}
                    onChange={(e) => updateCasing(idx, field, e.target.value)}
                    className="w-full p-1"
                  />
                </td>
              ))}
              <td className="border px-1 text-center">
                <button
                  onClick={() => deleteCasing(idx)}
                  className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {/* New casing row */}
          <tr>
            {["od", "id", "top", "bottom"].map((field) => (
              <td className="border px-1" key={field}>
                <input
                  type="number"
                  value={newCasing[field]}
                  onChange={(e) =>
                    setNewCasing({ ...newCasing, [field]: e.target.value })
                  }
                  className="w-full p-1"
                />
              </td>
            ))}
            <td className="border px-1 text-center">—</td>
          </tr>
        </tbody>
      </table>
      <button
        onClick={addCasing}
        className="bg-green-700 text-white px-3 py-1 rounded w-full mb-4"
      >
        Add Casing
      </button>

      {/* Open Hole */}
      <h2 className="text-lg font-bold mb-2">Open Hole</h2>
      <label className="block font-medium">Diameter (in)</label>
      <input
        type="number"
        value={openHole.size}
        onChange={(e) => handleOpenHoleChange("size", e.target.value)}
        className="border p-1 w-full mb-2"
      />
      <label className="block font-medium">Total Depth (m)</label>
      <input
        type="number"
        value={openHole.depth}
        onChange={(e) => handleOpenHoleChange("depth", e.target.value)}
        className="border p-1 w-full mb-4"
      />

      {/* Drill Pipes */}
      <h2 className="text-lg font-bold mt-6 mb-2">Internal String</h2>
      <table className="w-full table-auto border-collapse mb-2 text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2">OD (in)</th>
            <th className="border px-2">ID (in)</th>
            <th className="border px-2">Length (m)</th>
            <th className="border px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drillPipes.map((dp, idx) => (
            <tr key={idx}>
              {["od", "id", "length"].map((field) => (
                <td className="border px-1" key={field}>
                  <input
                    type="number"
                    value={dp[field]}
                    onChange={(e) => updateDP(idx, field, e.target.value)}
                    className="w-full p-1"
                  />
                </td>
              ))}
              <td className="border px-1 text-center">
                <button
                  onClick={() => deleteDP(idx)}
                  className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {/* New DP row */}
          <tr>
            {["od", "id", "length"].map((field) => (
              <td className="border px-1" key={field}>
                <input
                  type="number"
                  value={newDP[field]}
                  onChange={(e) =>
                    setNewDP({ ...newDP, [field]: e.target.value })
                  }
                  className="w-full p-1"
                />
              </td>
            ))}
            <td className="border px-1 text-center">—</td>
          </tr>
        </tbody>
      </table>
      <button
        onClick={addDP}
        className="bg-green-700 text-white px-3 py-1 rounded w-full mb-4"
      >
        Add Pipes
      </button>

      {/* Pumping Controls */}
      <h2 className="text-lg font-bold mt-6 mb-2">Pumping</h2>
      <button
        onClick={handlePumpCement}
        className="bg-blue-700 text-white px-3 py-1 rounded w-full mb-2"
      >
        Pump Cement
      </button>
      <button
        onClick={handlePumpMudPush}
        className="bg-light-blue-600 text-white px-3 py-1 rounded w-full"
      >
        Pump Mud Push
      </button>
    </div>
  );
}
