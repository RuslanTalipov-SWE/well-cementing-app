import React, { useState, useEffect } from "react";
import {
  calculateVolumes,
  calculateFluidHeights,
  calculateAnnulusFluidHeight,
} from "../utils/volumeCalculations";

export default function WellSchematic({ geometry }) {
  if (!geometry) return <div className="p-4">No well data</div>;

  const { casings = [], openHole = {}, drillPipes = [] } = geometry;

  // --- Safe number helper ---
  const toNum = (value) => (isNaN(parseFloat(value)) ? 0 : parseFloat(value));

  // --- Calculate well volumes ---
  const safeGeometry = {
    casings: casings.map((c) => ({
      od: toNum(c.od),
      id: toNum(c.id),
      top: toNum(c.top),
      bottom: toNum(c.bottom),
    })),
    openHole: {
      size: toNum(openHole.size),
      depth: toNum(openHole.depth),
    },
    drillPipes: drillPipes.map((dp) => ({
      od: toNum(dp.od),
      id: toNum(dp.id),
      length: toNum(dp.length),
    })),
  };

  const volumes = calculateVolumes(safeGeometry);

  const totalDepth = Math.max(
    safeGeometry.openHole.depth || 0,
    ...safeGeometry.casings.map((c) => c.bottom),
    safeGeometry.drillPipes.reduce((sum, dp) => sum + dp.length, 0)
  );

  const paddingTop = 20;
  const paddingBottom = 20;
  const viewportHeight = window.innerHeight - 100;
  const scale =
    (viewportHeight - paddingTop - paddingBottom) / (totalDepth || 1);

  const wellWidth = 200;
  const marginLeft = 50;

  // --- Fluid state ---
  const [fluidState, setFluidState] = useState({
    dp: {
      cement: drillPipes.map(() => 0),
      mudPush: drillPipes.map(() => 0),
    },
    annulus: { cement: 0 },
  });

  // --- Pumping animation ---
  useEffect(() => {
    const interval = setInterval(() => {
      setFluidState((prev) => {
        const newCement = [...prev.dp.cement];
        let cementRemaining = 50; // bbl pumped per tick

        for (let i = 0; i < safeGeometry.drillPipes.length; i++) {
          const dp = safeGeometry.drillPipes[i];
          const dpVolume =
            Math.PI * ((dp.id * 0.0254) / 2) ** 2 * dp.length * 6.2898;
          const available = dpVolume - newCement[i];
          const added = Math.min(available, cementRemaining);
          newCement[i] += added;
          cementRemaining -= added;
          if (cementRemaining <= 0) break;
        }

        const annulusCement = Math.max(cementRemaining, 0);

        return {
          dp: { cement: newCement, mudPush: prev.dp.mudPush },
          annulus: {
            cement: Math.min(
              prev.annulus.cement + annulusCement,
              volumes.annulusVolume
            ),
          },
        };
      });
    }, 500);

    return () => clearInterval(interval);
  }, [safeGeometry.drillPipes, volumes.annulusVolume]);

  let currentDPDepth = 0;

  return (
    <div className="flex-1 bg-white p-4 flex justify-center items-start overflow-auto">
      <svg
        width={wellWidth + marginLeft}
        height={viewportHeight}
        style={{ border: "1px solid #ccc" }}
      >
        {/* Depth axis */}
        <text
          x={marginLeft / 4}
          y={viewportHeight / 2}
          fontSize="16"
          fontWeight="bold"
          fill="black"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90, ${marginLeft / 4}, ${viewportHeight / 2})`}
        >
          Depth, m
        </text>

        {/* Depth ticks */}
        {[
          0,
          ...Array.from(
            { length: Math.ceil(totalDepth / 100) },
            (_, i) => (i + 1) * 100
          ),
          totalDepth,
        ].map((depth, i) => {
          const y = depth * scale + paddingTop;
          return (
            <g key={`tick-${i}`}>
              <line
                x1={marginLeft - 10}
                x2={marginLeft}
                y1={y}
                y2={y}
                stroke="black"
              />
              <text
                x={marginLeft - 15}
                y={y + 4}
                fontSize="10"
                textAnchor="end"
                fill="black"
              >
                {depth}
              </text>
            </g>
          );
        })}

        {/* Casings */}
        {safeGeometry.casings.map((c, idx) => {
          const y = c.top * scale + paddingTop;
          const h = Math.max((c.bottom - c.top) * scale, 1); // minimum height 1
          const w = Math.max(c.od * 3, 1);
          const x = marginLeft + wellWidth / 2 - w / 2;

          return (
            <g key={`casing-${idx}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="none"
                stroke="black"
                strokeWidth="2"
              />
              <title>{`Casing ${idx + 1} Volume: ${(
                Math.PI *
                ((c.id * 0.0254) / 2) ** 2 *
                (c.bottom - c.top) *
                6.2898
              ).toFixed(2)} bbl`}</title>
            </g>
          );
        })}

        {/* Open Hole */}
        {safeGeometry.openHole.size &&
          safeGeometry.openHole.depth &&
          safeGeometry.casings.length > 0 && (
            <g>
              <rect
                x={
                  marginLeft + wellWidth / 2 - safeGeometry.openHole.size * 1.5
                }
                y={
                  safeGeometry.casings[safeGeometry.casings.length - 1].bottom *
                    scale +
                  paddingTop
                }
                width={safeGeometry.openHole.size * 3}
                height={Math.max(
                  (safeGeometry.openHole.depth -
                    safeGeometry.casings[safeGeometry.casings.length - 1]
                      .bottom) *
                    scale,
                  1
                )}
                fill="blue"
                fillOpacity="0.2"
                stroke="brown"
                strokeDasharray="4"
              />
              <title>{`Open Hole Volume: ${volumes.openHoleVolume.toFixed(
                2
              )} bbl`}</title>
            </g>
          )}

        {/* Drill Pipes with fluid layers */}
        {safeGeometry.drillPipes.map((dp, idx) => {
          const y = currentDPDepth * scale + paddingTop;
          const h = Math.max(dp.length * scale, 1);
          const w = Math.max(dp.od * 2, 1);
          const x = marginLeft + wellWidth / 2 - w / 2;

          const { hMud, hMudPush, hCement } = calculateFluidHeights(
            dp,
            fluidState.dp.cement[idx],
            fluidState.dp.mudPush[idx]
          );

          currentDPDepth += dp.length;

          return (
            <g key={`dp-${idx}`}>
              {/* Mud */}
              <rect
                x={x}
                y={y + h - hMud * scale}
                width={w}
                height={hMud * scale}
                fill="blue"
                fillOpacity="0.3"
              />
              {/* Mud push */}
              <rect
                x={x}
                y={y + h - (hMud + hMudPush) * scale}
                width={w}
                height={hMudPush * scale}
                fill="lightblue"
              />
              {/* Cement */}
              <rect
                x={x}
                y={y + h - (hMud + hMudPush + hCement) * scale}
                width={w}
                height={hCement * scale}
                fill="gray"
              />
              {/* DP outline */}
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="none"
                stroke="black"
              />
            </g>
          );
        })}

        {/* Annulus fluid layers */}
        {safeGeometry.casings.length > 0 && safeGeometry.openHole.depth > 0 && (
          <g>
            {(() => {
              const { hMud, hCement } = calculateAnnulusFluidHeight(
                volumes.annulusVolume,
                fluidState.annulus.cement
              );
              const annX =
                marginLeft +
                wellWidth / 2 -
                safeGeometry.casings[safeGeometry.casings.length - 1].od * 1.5;
              const annY =
                safeGeometry.casings[safeGeometry.casings.length - 1].bottom *
                  scale +
                paddingTop;
              const annWidth =
                safeGeometry.casings[safeGeometry.casings.length - 1].od * 3;
              const annHeight = Math.max(
                (safeGeometry.openHole.depth -
                  safeGeometry.casings[safeGeometry.casings.length - 1]
                    .bottom) *
                  scale,
                1
              );

              return (
                <>
                  <rect
                    x={annX}
                    y={annY + (annHeight - hMud * scale)}
                    width={annWidth}
                    height={hMud * scale}
                    fill="blue"
                    fillOpacity="0.3"
                  />
                  <rect
                    x={annX}
                    y={annY + (annHeight - (hMud + hCement) * scale)}
                    width={annWidth}
                    height={hCement * scale}
                    fill="gray"
                  />
                </>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
}
