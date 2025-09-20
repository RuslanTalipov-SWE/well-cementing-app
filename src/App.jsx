import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import WellSchematic from "./components/WellSchematic";
import { calculateVolumes, K } from "./utils/volumeCalculations";

/**
 * App: orchestrates geometry, queue of fluids to pump, and animated fluidState
 *
 * fluidState:
 *   dp: [ [ {type, volume}, ... ], ... ]   // each DP: top->bottom parcels
 *   annulus: [ {type, volume}, ... ]       // bottom->top parcels
 */
export default function App() {
  const [geometry, setGeometry] = useState({
    casings: [],
    openHole: { size: "", depth: "" },
    drillPipes: [],
  });

  // fluid state
  const [fluidState, setFluidState] = useState({
    dp: [],
    annulus: [],
  });

  // queue of fluids user added in Sidebar (each item { type, volume })
  const [fluidsQueue, setFluidsQueue] = useState([]);

  // ensure fluidState.dp array length matches number of drill pipes
  useEffect(() => {
    const n = geometry.drillPipes.length || 0;
    setFluidState((prev) => {
      // if count match keep current state (so we don't wipe on unrelated updates)
      if ((prev.dp || []).length === n) return prev;
      // otherwise reset dp arrays and annulus
      return {
        dp: new Array(n).fill(null).map(() => []), // each pipe: [] top->bottom
        annulus: [], // bottom->top
      };
    });
  }, [geometry.drillPipes.length]);

  // pump queue handler: whenever queue gets an item, pump them sequentially
  useEffect(() => {
    if (!fluidsQueue.length) return;

    let cancelled = false;

    const runQueue = async () => {
      while (!cancelled && fluidsQueue.length > 0) {
        // pick first
        const fluid = fluidsQueue[0];
        try {
          // await animation (fills/flows fluid fully)
          await animateFluid(fluid.type, fluid.volume);
        } catch (err) {
          console.error("animateFluid error:", err);
        }
        // remove first (we must use state setter to keep in sync)
        setFluidsQueue((prev) => prev.slice(1));
        // wait a short moment between fluids to make stacking visually distinct
        // (optional; can be removed)
        await new Promise((r) => setTimeout(r, 50));
      }
    };

    runQueue();

    return () => {
      cancelled = true;
    };
  }, [fluidsQueue, geometry]);

  /**
   * animateFluid: pumps a certain totalVolume (bbl) of given type from surface downwards,
   * moving fluids down the drill string, into liner (last DP), then into annulus (bottom->top).
   *
   * Behavior:
   * - Each animation tick we add 'step' bbl at surface (top of dp[0]).
   * - After adding we rebalance pipes left->right moving overflow from bottom of each pipe to top of next.
   * - Overflow from last pipe goes into annulus (unshift => bottom).
   *
   * Returns a Promise that resolves when the full `totalVolume` has been pumped.
   */
  const animateFluid = (type, totalVolume, rate = 5) => {
    return new Promise((resolve) => {
      if (!totalVolume || totalVolume <= 0) {
        resolve();
        return;
      }

      let remaining = totalVolume;
      const n = geometry.drillPipes.length;

      // if no drill pipes exist, deposit directly to annulus
      if (n === 0) {
        setFluidState((prev) => {
          const ann = [...(prev.annulus || [])];
          ann.unshift({ type, volume: remaining });
          return { dp: prev.dp || [], annulus: ann };
        });
        resolve();
        return;
      }

      const interval = setInterval(() => {
        if (remaining <= 0) {
          clearInterval(interval);
          resolve();
          return;
        }

        const step = Math.min(remaining, rate);
        remaining -= step;

        // functional update: compute new dp & annulus arrays
        setFluidState((prev) => {
          // ensure we have dp arrays for each pipe
          const prevDp = prev.dp || new Array(n).fill(null).map(() => []);
          const newDp = prevDp.map((arr) => arr.slice()); // shallow copy arrays

          // add new parcel at the top of the first pipe
          // pre-create parcel and add to start of dp[0]
          newDp[0].unshift({ type, volume: step });

          // rebalance: left -> right
          for (let i = 0; i < n; i++) {
            const dpGeom = geometry.drillPipes[i];
            const dpVol = dpGeom.id ** 2 * (dpGeom.length || 0) * K; // bbl
            // compute total used in this pipe
            let used = newDp[i].reduce((s, p) => s + (p.volume || 0), 0);

            if (used <= dpVol + 1e-9) {
              // within capacity
              continue;
            }

            // overflow amount that must move to next pipe (or to annulus if last)
            let overflow = used - dpVol;

            // move overflow from BOTTOM of newDp[i]
            while (overflow > 1e-9 && newDp[i].length > 0) {
              const bottomParcel = newDp[i].pop(); // bottommost
              const bottomVol = bottomParcel.volume || 0;

              if (bottomVol <= overflow + 1e-9) {
                // move whole parcel
                const moved = bottomVol;
                overflow -= moved;
                if (i < n - 1) {
                  // into top of next pipe
                  newDp[i + 1].unshift({
                    type: bottomParcel.type,
                    volume: moved,
                  });
                } else {
                  // into annulus (will handle after loop)
                  // we'll accumulate to tempAnnulus below
                  prev._annulusOverflow = (prev._annulusOverflow || 0) + moved;
                }
              } else {
                // split parcel: keep remainder in current pipe, move part
                const moveVol = overflow;
                const remainVol = bottomVol - moveVol;
                // put remainder back as bottommost
                newDp[i].push({ type: bottomParcel.type, volume: remainVol });
                // move the moved portion to next pipe/annulus
                if (i < n - 1) {
                  newDp[i + 1].unshift({
                    type: bottomParcel.type,
                    volume: moveVol,
                  });
                } else {
                  prev._annulusOverflow =
                    (prev._annulusOverflow || 0) + moveVol;
                }
                overflow = 0;
              }
            } // while overflow
          } // for pipes

          // prepare new annulus: start with previous annulus copy
          const newAnn = [...(prev.annulus || [])];

          // if we collected annulus overflow in prev._annulusOverflow, add it
          if (prev._annulusOverflow && prev._annulusOverflow > 0) {
            // prev._annulusOverflow is bottom-arriving => unshift to make it bottommost
            newAnn.unshift({ type, volume: prev._annulusOverflow });
            // clean temporary holder
            prev._annulusOverflow = 0;
          }

          return { dp: newDp, annulus: newAnn };
        });
      }, 80); // interval ms (adjust to speed up / slow down)
    });
  };

  // add fluid to queue (called by Sidebar)
  const handleAddFluid = (fluid) => {
    // queue the fluid object {type, volume}
    setFluidsQueue((prev) => [
      ...prev,
      { type: fluid.type, volume: fluid.volume },
    ]);
  };

  const handleResetFluids = () => {
    const n = geometry.drillPipes.length || 0;
    setFluidState({
      dp: new Array(n).fill(null).map(() => []),
      annulus: [],
    });
    setFluidsQueue([]);
  };

  const volumes = calculateVolumes(geometry);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="bg-green-700 text-white text-center py-3 shadow-md flex-shrink-0">
        <h1 className="text-xl font-bold">Liner Cementing App</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onUpdateGeometry={setGeometry}
          onAddFluid={handleAddFluid}
          onResetFluids={handleResetFluids}
          currentFluids={fluidState}
        />
        <div className="flex-1 p-4 overflow-auto">
          {geometry.casings.length ||
          geometry.drillPipes.length ||
          geometry.openHole.size ? (
            <WellSchematic geometry={geometry} fluidState={fluidState} />
          ) : (
            <p className="text-gray-500">
              Please input well geometry in the sidebar
            </p>
          )}
        </div>
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
          {(fluidState.dp || []).map((pipe, i) => (
            <p key={i}>
              DP {i + 1}:{" "}
              {pipe.map((f) => `${f.type}:${f.volume.toFixed(1)}`).join(", ")}
            </p>
          ))}
          <p>
            Annulus:{" "}
            {(fluidState.annulus || [])
              .map((f) => `${f.type}:${f.volume.toFixed(1)}`)
              .join(", ")}
          </p>

          <h4 className="text-sm font-medium mt-4">Queue</h4>
          <p>
            {fluidsQueue.length
              ? fluidsQueue
                  .map((f, i) => `${i + 1}. ${f.type} ${f.volume} bbl`)
                  .join("; ")
              : "Idle"}
          </p>
        </div>
      </div>
    </div>
  );
}
