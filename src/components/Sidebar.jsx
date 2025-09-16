import React, { useState, useEffect } from "react";

export default function Sidebar({ onUpdateGeometry }) {
  const [casings, setCasings] = useState([]);
  const [newCasing, setNewCasing] = useState({
    od: "",
    id: "",
    top: "",
    bottom: "",
  });

  const [openHole, setOpenHole] = useState({});

  const [drillPipes, setDrillPipes] = useState([]);
  const [newDP, setNewDP] = useState({ od: "", id: "", length: "" });

  // Auto-update geometry
  useEffect(() => {
    if (casings.length > 0) {
      const lastCasingBottom = Math.max(...casings.map((c) => c.bottom));
      const ohDepth =
        openHole.depth > lastCasingBottom ? openHole.depth : lastCasingBottom;

      onUpdateGeometry({
        casings,
        openHole: { ...openHole, depth: ohDepth },
        drillPipes,
      });
    } else {
      onUpdateGeometry({ casings, openHole, drillPipes });
    }
  }, [casings, openHole, drillPipes, onUpdateGeometry]);

  // --- Casings ---
  const addCasing = () => {
    if (!newCasing.od || !newCasing.id || !newCasing.top || !newCasing.bottom)
      return;
    setCasings([
      ...casings,
      {
        ...newCasing,
        od: parseFloat(newCasing.od),
        id: parseFloat(newCasing.id),
        top: parseFloat(newCasing.top),
        bottom: parseFloat(newCasing.bottom),
      },
    ]);
    setNewCasing({ od: "", id: "", top: "", bottom: "" });
  };

  const updateCasing = (index, field, value) => {
    const updated = [...casings];
    updated[index][field] = parseFloat(value);
    setCasings(updated);
  };

  const deleteCasing = (index) => {
    setCasings(casings.filter((_, i) => i !== index));
  };

  // --- Drill Pipes ---
  const addDP = () => {
    if (!newDP.od || !newDP.id || !newDP.length) return;
    setDrillPipes([
      ...drillPipes,
      {
        ...newDP,
        od: parseFloat(newDP.od),
        id: parseFloat(newDP.id),
        length: parseFloat(newDP.length),
      },
    ]);
    setNewDP({ od: "", id: "", length: "" });
  };

  const updateDP = (index, field, value) => {
    const updated = [...drillPipes];
    updated[index][field] = parseFloat(value);
    setDrillPipes(updated);
  };

  const deleteDP = (index) => {
    setDrillPipes(drillPipes.filter((_, i) => i !== index));
  };

  // --- Open hole ---
  const handleOpenHoleChange = (field, value) => {
    setOpenHole((prev) => ({ ...prev, [field]: parseFloat(value) }));
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
              <td className="border px-1">
                <input
                  type="number"
                  value={c.od}
                  onChange={(e) => updateCasing(idx, "od", e.target.value)}
                  className="w-full p-1"
                />
              </td>
              <td className="border px-1">
                <input
                  type="number"
                  value={c.id}
                  onChange={(e) => updateCasing(idx, "id", e.target.value)}
                  className="w-full p-1"
                />
              </td>
              <td className="border px-1">
                <input
                  type="number"
                  value={c.top}
                  onChange={(e) => updateCasing(idx, "top", e.target.value)}
                  className="w-full p-1"
                />
              </td>
              <td className="border px-1">
                <input
                  type="number"
                  value={c.bottom}
                  onChange={(e) => updateCasing(idx, "bottom", e.target.value)}
                  className="w-full p-1"
                />
              </td>
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
            <td className="border px-1">
              <input
                type="number"
                value={newCasing.od}
                onChange={(e) =>
                  setNewCasing({ ...newCasing, od: e.target.value })
                }
                className="w-full p-1"
              />
            </td>
            <td className="border px-1">
              <input
                type="number"
                value={newCasing.id}
                onChange={(e) =>
                  setNewCasing({ ...newCasing, id: e.target.value })
                }
                className="w-full p-1"
              />
            </td>
            <td className="border px-1">
              <input
                type="number"
                value={newCasing.top}
                onChange={(e) =>
                  setNewCasing({ ...newCasing, top: e.target.value })
                }
                className="w-full p-1"
              />
            </td>
            <td className="border px-1">
              <input
                type="number"
                value={newCasing.bottom}
                onChange={(e) =>
                  setNewCasing({ ...newCasing, bottom: e.target.value })
                }
                className="w-full p-1"
              />
            </td>
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
              <td className="border px-1">
                <input
                  type="number"
                  value={dp.od}
                  onChange={(e) => updateDP(idx, "od", e.target.value)}
                  className="w-full p-1"
                />
              </td>
              <td className="border px-1">
                <input
                  type="number"
                  value={dp.id}
                  onChange={(e) => updateDP(idx, "id", e.target.value)}
                  className="w-full p-1"
                />
              </td>
              <td className="border px-1">
                <input
                  type="number"
                  value={dp.length}
                  onChange={(e) => updateDP(idx, "length", e.target.value)}
                  className="w-full p-1"
                />
              </td>
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
            <td className="border px-1">
              <input
                type="number"
                value={newDP.od}
                onChange={(e) => setNewDP({ ...newDP, od: e.target.value })}
                className="w-full p-1"
              />
            </td>
            <td className="border px-1">
              <input
                type="number"
                value={newDP.id}
                onChange={(e) => setNewDP({ ...newDP, id: e.target.value })}
                className="w-full p-1"
              />
            </td>
            <td className="border px-1">
              <input
                type="number"
                value={newDP.length}
                onChange={(e) => setNewDP({ ...newDP, length: e.target.value })}
                className="w-full p-1"
              />
            </td>
            <td className="border px-1 text-center">—</td>
          </tr>
        </tbody>
      </table>
      <button
        onClick={addDP}
        className="bg-green-700 text-white px-3 py-1 rounded w-full"
      >
        Add Pipes
      </button>
    </div>
  );
}
