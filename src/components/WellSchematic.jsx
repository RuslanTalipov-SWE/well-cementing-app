import React from "react";
import {
  getCasingVolume,
  getInternalStringVolume,
  getAnnulusVolume,
  cylinderVolume,
} from "../utils/volumeCalculations";

export default function WellSchematic({ geometry }) {
  if (!geometry) return <div className="p-4">No well data</div>;

  const { casings, openHole, drillPipes } = geometry;

  // --- Calculate total depth ---
  const totalDepth = Math.max(
    openHole?.depth || 0,
    ...casings.map((c) => c.bottom || 0),
    drillPipes.reduce((sum, dp) => sum + (dp.length || 0), 0)
  );

  const paddingTop = 20;
  const paddingBottom = 20;
  const viewportHeight = window.innerHeight - 100;
  const scale =
    (viewportHeight - paddingTop - paddingBottom) / (totalDepth || 1);

  const wellWidth = 200;
  const marginLeft = 50;

  let currentDPDepth = 0;

  return (
    <div className="flex-1 bg-white p-4 flex justify-center items-start overflow-auto">
      <svg
        width={wellWidth + marginLeft}
        height={viewportHeight}
        style={{ border: "1px solid #ccc" }}
      >
        {/* Vertical axis label */}
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

        {/* Depth scale ticks */}
        {[
          0,
          ...Array.from(
            { length: Math.ceil(totalDepth / 100) - 1 },
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
        {casings.map((c, idx) => {
          const y = c.top * scale + paddingTop;
          const h = (c.bottom - c.top) * scale;
          const w = c.od * 3;
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
              <title>
                Casing {idx + 1} Volume: {getCasingVolume(c).toFixed(2)} bbl
              </title>
            </g>
          );
        })}

        {/* Open hole */}
        {openHole && openHole.size && openHole.depth && (
          <g>
            <rect
              x={marginLeft + wellWidth / 2 - openHole.size * 1.5}
              y={
                (Math.max(...casings.map((c) => c.bottom)) || 0) * scale +
                paddingTop
              }
              width={openHole.size * 3}
              height={
                (openHole.depth -
                  (Math.max(...casings.map((c) => c.bottom)) || 0)) *
                scale
              }
              fill="none"
              stroke="brown"
              strokeDasharray="4"
            />
            <title>
              Open Hole Volume:{" "}
              {cylinderVolume(
                openHole.size,
                openHole.depth -
                  (Math.max(...casings.map((c) => c.bottom)) || 0)
              ).toFixed(2)}{" "}
              bbl
            </title>
          </g>
        )}

        {/* Internal string + liner */}
        {drillPipes.map((dp, idx) => {
          const y = currentDPDepth * scale + paddingTop;
          const h = dp.length * scale;
          const w = dp.od * 2;
          const x = marginLeft + wellWidth / 2 - w / 2;

          const isLiner = idx === drillPipes.length - 1;
          const fillColor = isLiner
            ? "rgba(0,0,200,0.5)"
            : "rgba(0,200,255,0.3)";
          const strokeColor = isLiner ? "blue" : "lightblue";

          const dpVolumeBbl = getInternalStringVolume(dp).toFixed(2);

          currentDPDepth += dp.length;

          return (
            <g key={`dp-${idx}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={fillColor}
                stroke={strokeColor}
              />
              <title>
                {isLiner
                  ? `Liner Volume: ${dpVolumeBbl} bbl`
                  : `Internal String Volume: ${dpVolumeBbl} bbl`}
              </title>
            </g>
          );
        })}

        {/* Annulus overlay */}
        {casings.map((c, idx) => {
          if (drillPipes[idx]) return null; // skip where DP occupies space
          const y = c.top * scale + paddingTop;
          const h = (c.bottom - c.top) * scale;
          const w = c.od * 3;
          const x = marginLeft + wellWidth / 2 - w / 2;
          return (
            <g key={`annulus-${idx}`}>
              <rect x={x} y={y} width={w} height={h} fill="rgba(200,0,0,0.1)" />
              <title>
                Annulus Volume:{" "}
                {getAnnulusVolume(c, drillPipes[idx]).toFixed(2)} bbl
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
