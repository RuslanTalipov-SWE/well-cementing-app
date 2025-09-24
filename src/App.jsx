import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import WellSchematic from "./components/WellSchematic";
import { calculateVolumes, K } from "./utils/volumeCalculations";

export default function App() {
  const [geometry, setGeometry] = useState({
    casings: [],
    openHole: { size: "", depth: "" },
    drillPipes: [],
  });

  // dp: array of arrays; each pipe => array of segments { type, volume } top -> bottom
  // annulus: array of segments { type, volume } bottom -> top
  const [fluidState, setFluidState] = useState({ dp: [], annulus: [] });
  const [fluidsQueue, setFluidsQueue] = useState([]); // queued fluids { type, volume }

  // Keep fluidState shape consistent when # of drill pipes changes
  useEffect(() => {
    const n = geometry.drillPipes.length;
    setFluidState((prev) => {
      if (prev.dp && prev.dp.length === n) return prev;
      return {
        dp: new Array(n).fill(null).map(() => []),
        annulus: [],
      };
    });
  }, [geometry.drillPipes.length]);

  // Process queue sequentially: pump each added fluid to completion
  useEffect(() => {
    if (!fluidsQueue.length) return;
    let cancelled = false;

    const runQueue = async () => {
      while (!cancelled && fluidsQueue.length) {
        const next = fluidsQueue[0];
        // animate that single fluid completely
        // eslint-disable-next-line no-await-in-loop
        await animateFluid(next.type, next.volume);
        setFluidsQueue((q) => q.slice(1));
        // small pause to allow render update
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 20));
      }
    };

    runQueue();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fluidsQueue]);

  /**
   * animateFluid
   * Pump `totalVolume` bbl of `type` from surface down drill string at `rate` bbl/tick.
   * Each tick:
   *  - add step to top of pipe0
   *  - propagate overflow from bottom of pipe i -> top of pipe i+1
   *  - overflow from last pipe -> annulus (bottom)
   *
   * Returns a Promise resolved when the full volume is pumped.
   */
  const animateFluid = (type, totalVolume, rate = 5) => {
    return new Promise((resolve) => {
      let remaining = totalVolume;
      const n = geometry.drillPipes.length;

      if (n === 0) {
        // If no drill pipe, everything goes directly to annulus
        setFluidState((prev) => {
          const newAnn = [...(prev.annulus || [])];
          newAnn.push({ type, volume: totalVolume });
          return {
            dp: prev.dp || [],
            annulus: compressSegmentsBottomToTop(newAnn),
          };
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

        setFluidState((prev) => {
          // clone dp arrays
          const newDP = (prev.dp || []).map((pipe) =>
            (pipe || []).map((seg) => ({ type: seg.type, volume: seg.volume }))
          );
          const newAnn = (prev.annulus || []).map((seg) => ({
            type: seg.type,
            volume: seg.volume,
          }));

          // 1) Add `step` to the TOP of pipe 0 (unshift)
          pushSegmentToPipeTop(newDP, 0, { type, volume: step });

          // 2) For each pipe top->bottom ensure capacity and move overflow to next pipe top (or annulus)
          for (let idx = 0; idx < n; idx++) {
            const dp = geometry.drillPipes[idx];
            const dpVol = dp.id ** 2 * (dp.length || 0) * K;
            let used = newDP[idx].reduce((s, f) => s + f.volume, 0);

            if (used <= dpVol + 1e-9) continue; // no overflow

            let overflow = used - dpVol;
            const poppedSegments = [];

            // Remove overflow from bottom (pop segments)
            while (overflow > 1e-9 && newDP[idx].length > 0) {
              const last = newDP[idx][newDP[idx].length - 1];
              if (last.volume > overflow + 1e-9) {
                // split
                last.volume = last.volume - overflow;
                poppedSegments.push({ type: last.type, volume: overflow });
                overflow = 0;
                break;
              } else {
                // take whole last
                const taken = newDP[idx].pop();
                poppedSegments.push({ type: taken.type, volume: taken.volume });
                overflow -= taken.volume;
              }
            }

            if (poppedSegments.length > 0) {
              // poppedSegments are in order bottom -> up (first popped is bottommost)
              if (idx < n - 1) {
                // move them to top of next pipe in the order they left (arrival order preserved)
                for (const seg of poppedSegments) {
                  pushSegmentToPipeTop(newDP, idx + 1, {
                    type: seg.type,
                    volume: seg.volume,
                  });
                }
              } else {
                // last pipe -> push to annulus bottom (push to end of annulus array)
                for (const seg of poppedSegments) {
                  newAnn.push({ type: seg.type, volume: seg.volume });
                }
              }
            }
          }

          // 3) compress adjacent same-type segments for each pipe (top->bottom)
          for (let pi = 0; pi < newDP.length; pi++) {
            newDP[pi] = compressSegmentsTopToBottom(newDP[pi]);
          }
          const compressedAnn = compressSegmentsBottomToTop(newAnn);

          return { dp: newDP, annulus: compressedAnn };
        });
      }, 80); // tick interval (ms)
    });
  };

  // helper: push segment to top of pipe (unshift) merging with top if same type
  function pushSegmentToPipeTop(dpArray, pipeIndex, segment) {
    if (!dpArray[pipeIndex]) dpArray[pipeIndex] = [];
    const top = dpArray[pipeIndex][0];
    if (top && top.type === segment.type) {
      // merge into existing top
      top.volume += segment.volume;
    } else {
      dpArray[pipeIndex].unshift({
        type: segment.type,
        volume: segment.volume,
      });
    }
  }

  // compress top->bottom segments (array is top->bottom)
  function compressSegmentsTopToBottom(pipeArr) {
    if (!pipeArr || pipeArr.length === 0) return [];
    const out = [];
    for (const seg of pipeArr) {
      if (out.length && out[out.length - 1].type === seg.type) {
        out[out.length - 1].volume += seg.volume;
      } else {
        out.push({ type: seg.type, volume: seg.volume });
      }
    }
    return out;
  }

  // compress annulus bottom->top
  function compressSegmentsBottomToTop(ann) {
    if (!ann || ann.length === 0) return [];
    const out = [];
    for (const seg of ann) {
      if (out.length && out[out.length - 1].type === seg.type) {
        out[out.length - 1].volume += seg.volume;
      } else {
        out.push({ type: seg.type, volume: seg.volume });
      }
    }
    return out;
  }

  // called by Sidebar to queue a fluid to pump
  const handleAddFluid = (fluid) => {
    setFluidsQueue((q) => [...q, fluid]);
  };

  // reset fluids and queue
  const handleResetFluids = () => {
    const n = geometry.drillPipes.length;
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
          {fluidState.dp.map((pipe, i) => (
            <p key={i}>
              DP {i + 1}:{" "}
              {pipe.map((f) => `${f.type}:${f.volume.toFixed(2)}`).join(", ")}
            </p>
          ))}
          <p>
            Annulus:{" "}
            {fluidState.annulus
              .map((f) => `${f.type}:${f.volume.toFixed(2)}`)
              .join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}
