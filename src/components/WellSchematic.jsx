import React from "react";
import { calculateVolumes, K } from "../utils/volumeCalculations";

/**
 * WellSchematic renders:
 *  - vertical depth axis
 *  - casings (envelope)
 *  - drill pipes stacked from surface down (each pipe draws fluid layers inside)
 *  - annulus fluid stack (bottom->top)
 *
 * fluidState:
 *   dp: [ [ {type,volume} (top->bottom), ... ], ... ]
 *   annulus: [ {type,volume} ... ]  // bottom->top
 */
const fluidColors = {
  Cement: "gray",
  "Mud Push": "lightblue",
  Spacer: "orange",
};

export default function WellSchematic({ geometry, fluidState }) {
  if (!geometry) return <div className="p-4">No well data</div>;

  const { casings = [], openHole = {}, drillPipes = [] } = geometry;
  const toNum = (v) => (isNaN(+v) ? 0 : +v);

  const safeGeometry = {
    casings: (casings || []).map((c) => ({
      od: toNum(c.od),
      id: toNum(c.id),
      top: toNum(c.top),
      bottom: toNum(c.bottom),
    })),
    openHole: { size: toNum(openHole.size), depth: toNum(openHole.depth) },
    drillPipes: (drillPipes || []).map((dp) => ({
      od: toNum(dp.od),
      id: toNum(dp.id),
      length: toNum(dp.length),
    })),
  };

  const volumes = calculateVolumes(safeGeometry);

  // total depth: use openHole depth, last casing bottom and sum of drill pipes lengths
  const totalDepth = Math.max(
    safeGeometry.openHole.depth || 0,
    ...(safeGeometry.casings.length
      ? safeGeometry.casings.map((c) => c.bottom)
      : [0]),
    safeGeometry.drillPipes.reduce((s, dp) => s + (dp.length || 0), 0)
  );

  const paddingTop = 20;
  const paddingBottom = 20;
  const viewportHeight = window.innerHeight - 100;
  const scale =
    (viewportHeight - paddingTop - paddingBottom) / (totalDepth || 1);

  const wellWidth = 200;
  const marginLeft = 50;

  // fluid arrays
  const dpFluids = fluidState?.dp || []; // top->bottom per pipe
  const annulusFluids = fluidState?.annulus || []; // bottom->top

  let currentDPDepth = 0;

  // depth ticks
  const depthTicks = [
    0,
    ...Array.from(
      { length: Math.max(0, Math.ceil(totalDepth / 100)) },
      (_, i) => (i + 1) * 100
    ),
    totalDepth,
  ];

  return (
    <div className="flex-1 bg-white p-4 flex justify-center items-start overflow-auto">
      <svg
        width={wellWidth + marginLeft + 40}
        height={viewportHeight}
        style={{ border: "1px solid #ccc" }}
      >
        {/* vertical axis */}
        <line
          x1={marginLeft}
          y1={paddingTop}
          x2={marginLeft}
          y2={viewportHeight - paddingBottom}
          stroke="black"
          strokeWidth="2"
        />
        <text
          x={marginLeft - 20}
          y={paddingTop - 5}
          fontSize="12"
          fontWeight="bold"
        >
          Depth, m
        </text>

        {depthTicks.map((d, i) => {
          const y = d * scale + paddingTop;
          return (
            <g key={`tick-${i}`}>
              <line
                x1={marginLeft - 5}
                x2={marginLeft + 5}
                y1={y}
                y2={y}
                stroke="black"
              />
              <text
                x={marginLeft - 10}
                y={y + 3}
                fontSize="10"
                textAnchor="end"
              >
                {Math.round(d)}
              </text>
            </g>
          );
        })}

        {/* casings (drawn as cylinders) */}
        {safeGeometry.casings.map((c, idx) => {
          const y = c.top * scale + paddingTop;
          const h = Math.max((c.bottom - c.top) * scale, 1);
          const w = Math.max(c.od * 3, 1);
          const x = marginLeft + wellWidth / 2 - w / 2;
          return (
            <g key={`casing-${idx}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="lightgray"
                stroke="black"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* drill pipes and fluids inside */}
        {safeGeometry.drillPipes.map((dp, idx) => {
          const y = currentDPDepth * scale + paddingTop;
          const h = Math.max(dp.length * scale, 1);
          const w = Math.max(dp.od * 2, 1);
          const x = marginLeft + wellWidth / 2 - w / 2;

          // fluids stack drawing: dpFluids is TOP -> BOTTOM; draw bottom->top
          const pipeParcels = dpFluids[idx] || [];
          let fluidY = y + h; // start from bottom

          // iterate from bottommost to topmost
          const rects = [];
          for (let j = pipeParcels.length - 1; j >= 0; j--) {
            const p = pipeParcels[j];
            const dpVol = dp.id ** 2 * (dp.length || 0) * K || 1;
            const rectHeight = ((p.volume || 0) / dpVol) * h;
            // protect against tiny negative/NaN
            const hRect = Math.max(0, rectHeight || 0);
            fluidY -= hRect;
            rects.push(
              <rect
                key={`dp-${idx}-p-${j}`}
                x={x}
                y={fluidY}
                width={w}
                height={hRect}
                fill={fluidColors[p.type] || "gray"}
                fillOpacity={p.type === "Mud Push" ? 0.4 : 1}
                stroke="none"
              />
            );
          }

          currentDPDepth += dp.length;
          return (
            <g key={`dp-${idx}`}>
              {rects}
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

        {/* annulus: bottom -> top (annulusFluids is stored bottom->top) */}
        {safeGeometry.casings.length > 0 &&
          safeGeometry.openHole.depth > 0 &&
          (() => {
            const lastCasing =
              safeGeometry.casings[safeGeometry.casings.length - 1];
            const annX = marginLeft + wellWidth / 2 - lastCasing.od * 1.5;
            const annY = lastCasing.bottom * scale + paddingTop;
            const annWidth = lastCasing.od * 3;
            const annHeight = Math.max(
              (safeGeometry.openHole.depth - lastCasing.bottom) * scale,
              1
            );

            let fluidY = annY + annHeight;

            return annulusFluids.map((f, i) => {
              const rectHeight =
                ((f.volume || 0) / (volumes.annulusVolume || 1)) * annHeight;
              const hRect = Math.max(0, rectHeight || 0);
              fluidY -= hRect;
              return (
                <rect
                  key={`ann-${i}`}
                  x={annX}
                  y={fluidY}
                  width={annWidth}
                  height={hRect}
                  fill={fluidColors[f.type] || "gray"}
                  fillOpacity={f.type === "Mud Push" ? 0.4 : 1}
                  stroke="none"
                />
              );
            });
          })()}
      </svg>
    </div>
  );
}
