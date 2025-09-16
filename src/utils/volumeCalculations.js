// const INCH_TO_M = 0.0254;
// const M3_TO_BBL = 6.2898;

// export function calculateVolumes(geometry) {
//   const { casings, openHole, drillPipes } = geometry;
//   const internalString = drillPipes;
//   let totalInternal = 0;

//   // --- Internal string volume (m³) ---
//   internalString.forEach((dp) => {
//     if (dp.id && dp.length) {
//       const id_m = dp.id * INCH_TO_M;
//       totalInternal += Math.PI * (id_m / 2) ** 2 * dp.length;
//     }
//   });

//   // --- Liner volume (last internal string) ---
//   let linerVolume = 0;
//   if (internalString.length > 0) {
//     const last = internalString[internalString.length - 1];
//     if (last.id && last.length) {
//       const id_m = last.id * INCH_TO_M;
//       linerVolume = Math.PI * (id_m / 2) ** 2 * last.length;
//     }
//   }

//   // --- Well volume without internal string (using casing ID) ---
//   let wellVolume = 0;
//   casings.forEach((c) => {
//     if (c.id && c.top != null && c.bottom != null) {
//       const id_m = c.id * INCH_TO_M; // use inner diameter
//       const h = c.bottom - c.top;
//       wellVolume += Math.PI * (id_m / 2) ** 2 * h;
//     }
//   });
//   if (openHole && openHole.size && openHole.depth) {
//     const id_m = openHole.size * INCH_TO_M; // open hole diameter
//     const lastCasingBottom =
//       casings.length > 0 ? casings[casings.length - 1].bottom : 0;
//     const h = openHole.depth - lastCasingBottom;
//     wellVolume += Math.PI * (id_m / 2) ** 2 * h;
//   }

//   // --- Convert to barrels ---
//   return {
//     internalStringVolume: totalInternal * M3_TO_BBL,
//     linerVolume: linerVolume * M3_TO_BBL,
//     wellVolume: wellVolume * M3_TO_BBL,
//     annulusVolume: (wellVolume - totalInternal) * M3_TO_BBL,
//   };
// }

// Barrel conversion factor
const M3_TO_BBL = 6.2898;
const INCH_TO_M = 0.0254;

/**
 * Volume of a cylinder in bbl
 * @param {number} id - diameter in inches
 * @param {number} length - length in meters
 */
export function cylinderVolume(id, length) {
  if (!id || !length) return 0;
  const radiusM = (id * INCH_TO_M) / 2;
  const volumeM3 = Math.PI * radiusM ** 2 * length;
  return volumeM3 * M3_TO_BBL;
}

/**
 * Casing volume (internal volume only)
 */
export function getCasingVolume(casing) {
  return cylinderVolume(casing.id, casing.bottom - casing.top);
}

/**
 * Drill pipe (internal string) volume
 */
export function getInternalStringVolume(dp) {
  return cylinderVolume(dp.id, dp.length);
}

/**
 * Liner volume = last drill pipe volume
 */
export function getLinerVolume(drillPipes) {
  if (!drillPipes?.length) return 0;
  return getInternalStringVolume(drillPipes[drillPipes.length - 1]);
}

/**
 * Annulus volume = casing ID volume - internal string OD volume
 */
export function getAnnulusVolume(casing, dp) {
  if (!casing) return 0;
  const casingVol = cylinderVolume(casing.id, casing.bottom - casing.top);
  const dpVol = dp ? cylinderVolume(dp.od, dp.length) : 0;
  return Math.max(casingVol - dpVol, 0);
}

/**
 * Calculate all volumes summary
 */
export function calculateVolumes(geometry) {
  if (!geometry) {
    return {
      internalStringVolume: 0,
      linerVolume: 0,
      wellVolume: 0,
      annulusVolume: 0,
    };
  }

  const { casings = [], drillPipes = [], openHole } = geometry;

  const internalStringVolume = drillPipes.reduce(
    (sum, dp) => sum + getInternalStringVolume(dp),
    0
  );

  const linerVolume = getLinerVolume(drillPipes);

  const wellVolume =
    casings.reduce((sum, c) => sum + getCasingVolume(c), 0) +
    (openHole?.size && openHole?.depth
      ? cylinderVolume(openHole.size, openHole.depth)
      : 0);

  const annulusVolume = casings.reduce((sum, c, idx) => {
    const dp = drillPipes[idx];
    return sum + getAnnulusVolume(c, dp);
  }, 0);

  return {
    internalStringVolume,
    linerVolume,
    wellVolume,
    annulusVolume,
  };
}
