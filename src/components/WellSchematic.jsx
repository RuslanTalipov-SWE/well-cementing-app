import React from "react";
import { calculateVolumes, K } from "../utils/volumeCalculations";

const fluidColors = {
  Cement: "#8b8b8b",
  "Mud Push": "#9ed7ff",
  Spacer: "#ffae42",
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

  const totalDepth = Math.max(
    safeGeometry.openHole.depth || 0,
    ...(safeGeometry.casings.length
      ? safeGeometry.casings.map((c) => c.bottom)
      : [0]),
    safeGeometry.drillPipes.reduce((s, dp) => s + (dp.length || 0), 0)
  );

  const paddingTop = 20,
    paddingBottom = 20;
  const viewportHeight = window.innerHeight - 100;
  const scale =
    (viewportHeight - paddingTop - paddingBottom) / (totalDepth || 1);

  const wellWidth = 200,
    marginLeft = 50;

  const dpFluids = fluidState?.dp || []; // top -> bottom per pipe
  const annulusFluids = fluidState?.annulus || []; // bottom -> top

  let currentDPDepth = 0;

  const depthTicks = [
    0,
    ...Array.from(
      { length: Math.ceil(totalDepth / 100) },
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
        {/* Depth axis */}
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
        {depthTicks.map((d, i) => (
          <g key={i}>
            <line
              x1={marginLeft - 5}
              x2={marginLeft + 5}
              y1={d * scale + paddingTop}
              y2={d * scale + paddingTop}
              stroke="black"
            />
            <text
              x={marginLeft - 10}
              y={d * scale + paddingTop + 3}
              fontSize="10"
              textAnchor="end"
            >
              {Math.round(d)}
            </text>
          </g>
        ))}

        {/* Casings */}
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

        {/* Drill Pipes (draw top -> bottom) */}
        {safeGeometry.drillPipes.map((dp, idx) => {
          const y = currentDPDepth * scale + paddingTop;
          const h = Math.max(dp.length * scale, 1);
          const w = Math.max(dp.od * 2, 1);
          const x = marginLeft + wellWidth / 2 - w / 2;

          const pipeFluids = dpFluids[idx] || []; // top->bottom
          const dpVol = dp.id ** 2 * (dp.length || 0) * K;

          // draw from top to bottom
          let fluidY = y;
          const rects = pipeFluids.map((f, i) => {
            const rectH = dpVol > 0 ? (f.volume / dpVol) * h : 0;
            const r = (
              <rect
                key={i}
                x={x}
                y={fluidY}
                width={w}
                height={rectH}
                fill={fluidColors[f.type] || "gray"}
                fillOpacity={f.type === "Mud Push" ? 0.35 : 1}
              />
            );
            fluidY += rectH;
            return r;
          });

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

        {/* Annulus (bottom -> top) */}
        {safeGeometry.casings.length > 0 &&
          safeGeometry.openHole.depth > 0 &&
          (() => {
            const lastCasing =
              safeGeometry.casings[safeGeometry.casings.length - 1];
            const annX = marginLeft + wellWidth / 2 - lastCasing.od * 1.5;
            const annY = lastCasing.bottom * scale + paddingTop;
            const annHeight = Math.max(
              (safeGeometry.openHole.depth - lastCasing.bottom) * scale,
              1
            );
            const annVol = volumes.annulusVolume || 1e-9;

            let fluidY = annY + annHeight; // start from bottom
            return annulusFluids.map((f, i) => {
              const rectH = (f.volume / annVol) * annHeight;
              fluidY -= rectH;
              return (
                <rect
                  key={i}
                  x={annX}
                  y={fluidY}
                  width={lastCasing.od * 3}
                  height={rectH}
                  fill={fluidColors[f.type] || "gray"}
                  fillOpacity={f.type === "Mud Push" ? 0.35 : 1}
                />
              );
            });
          })()}
      </svg>
    </div>
  );
}
