import React, { useEffect, useState } from "react";

/**
 * Sidebar: geometry editor + Fluids table + Pumping controls
 *
 * Props:
 *  - onUpdateGeometry({ casings, openHole, drillPipes })
 *  - onAddFluid({ type, volume })
 *  - onResetFluids()
 *  - currentFluids (read-only visualization)
 */
export default function Sidebar({
  onUpdateGeometry,
  onAddFluid,
  onResetFluids,
  currentFluids,
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

  // Fluids table local list (for UI) — we also call onAddFluid to queue
  const [fluidsList, setFluidsList] = useState([]);
  const [newFluid, setNewFluid] = useState({ type: "", volume: "" });

  // auto-update geometry upstream
  useEffect(() => {
    const lastCasingBottom = casings.length
      ? Math.max(...casings.map((c) => c.bottom || 0))
      : 0;
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

  // --- Casings CRUD ---
  const addCasing = () => {
    if (!newCasing.od || !newCasing.id || !newCasing.top || !newCasing.bottom)
      return;
    setCasings((s) => [
      ...s,
      {
        od: +newCasing.od,
        id: +newCasing.id,
        top: +newCasing.top,
        bottom: +newCasing.bottom,
      },
    ]);
    setNewCasing({ od: "", id: "", top: "", bottom: "" });
  };
  const updateCasing = (idx, field, value) => {
    setCasings((prev) => {
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], [field]: parseFloat(value) || 0 };
      return copy;
    });
  };
  const deleteCasing = (idx) =>
    setCasings((prev) => prev.filter((_, i) => i !== idx));

  // --- Drill pipes CRUD ---
  const addDP = () => {
    if (!newDP.od || !newDP.id || !newDP.length) return;
    setDrillPipes((s) => [
      ...s,
      { od: +newDP.od, id: +newDP.id, length: +newDP.length },
    ]);
    setNewDP({ od: "", id: "", length: "" });
  };
  const updateDP = (idx, field, value) => {
    setDrillPipes((prev) => {
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], [field]: parseFloat(value) || 0 };
      return copy;
    });
  };
  const deleteDP = (idx) =>
    setDrillPipes((prev) => prev.filter((_, i) => i !== idx));

  // --- Open hole ---
  const handleOpenHoleChange = (field, value) => {
    setOpenHole((p) => ({ ...p, [field]: parseFloat(value) || 0 }));
  };

  // --- Fluids UI ---
  const handleAddFluidClick = () => {
    if (!newFluid.type || !newFluid.volume) return;
    const f = { type: newFluid.type, volume: parseFloat(newFluid.volume) };
    setFluidsList((prev) => [...prev, f]);
    onAddFluid(f);
    setNewFluid({ type: "", volume: "" });
  };

  // display current fluid state summary (optional)
  const cur = currentFluids || { dp: [], annulus: [] };

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
              {["od", "id", "top", "bottom"].map((f) => (
                <td key={f} className="border px-1">
                  <input
                    type="number"
                    value={c[f]}
                    onChange={(e) => updateCasing(idx, f, e.target.value)}
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
          <tr>
            {["od", "id", "top", "bottom"].map((f) => (
              <td key={f} className="border px-1">
                <input
                  type="number"
                  value={newCasing[f]}
                  onChange={(e) =>
                    setNewCasing({ ...newCasing, [f]: e.target.value })
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
              {["od", "id", "length"].map((f) => (
                <td key={f} className="border px-1">
                  <input
                    type="number"
                    value={dp[f]}
                    onChange={(e) => updateDP(idx, f, e.target.value)}
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
          <tr>
            {["od", "id", "length"].map((f) => (
              <td key={f} className="border px-1">
                <input
                  type="number"
                  value={newDP[f]}
                  onChange={(e) => setNewDP({ ...newDP, [f]: e.target.value })}
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

      {/* Fluids table */}
      <h2 className="text-lg font-bold mt-6 mb-2">Fluids</h2>
      <table className="w-full table-auto border-collapse mb-2 text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2">#</th>
            <th className="border px-2">Fluid type</th>
            <th className="border px-2">Volume, bbl</th>
          </tr>
        </thead>
        <tbody>
          {fluidsList.map((f, idx) => (
            <tr key={idx}>
              <td className="border px-1 text-center">{idx + 1}</td>
              <td className="border px-1">{f.type}</td>
              <td className="border px-1">{f.volume}</td>
            </tr>
          ))}

          {/* input row */}
          <tr>
            <td className="border px-1 text-center">
              {newFluid.type ? fluidsList.length + 1 : ""}
            </td>
            <td className="border px-1">
              <select
                value={newFluid.type}
                onChange={(e) =>
                  setNewFluid({ ...newFluid, type: e.target.value })
                }
                className="w-full p-1 border"
              >
                <option value="">Select</option>
                <option value="Cement">Cement</option>
                <option value="Spacer">Spacer</option>
                <option value="Mud Push">Mud push</option>
              </select>
            </td>
            <td className="border px-1">
              <input
                type="number"
                value={newFluid.volume}
                onChange={(e) =>
                  setNewFluid({ ...newFluid, volume: e.target.value })
                }
                className="w-full p-1 border"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <button
        onClick={handleAddFluidClick}
        className="bg-blue-700 text-white px-3 py-1 rounded w-full mb-4"
      >
        Add Fluid
      </button>

      {/* Reset fluids */}
      <button
        onClick={onResetFluids}
        className="bg-red-600 text-white px-3 py-1 rounded w-full mb-4"
      >
        Reset Fluids
      </button>

      {/* Current fluid summary (optional) */}
      {/* <div className="mt-4">
        <h3 className="font-bold">Current Fluid State</h3>
        {(currentFluids?.dp || []).map((pipe, i) => (
          <p key={i}>
            DP {i + 1}:{" "}
            {pipe.map((f) => `${f.type}:${f.volume.toFixed(1)}`).join(", ") ||
              "empty"}
          </p>
        ))}
        <p>
          Annulus:{" "}
          {(currentFluids?.annulus || [])
            .map((f) => `${f.type}:${f.volume.toFixed(1)}`)
            .join(", ") || "empty"}
        </p>
      </div> */}
    </div>
  );
}
