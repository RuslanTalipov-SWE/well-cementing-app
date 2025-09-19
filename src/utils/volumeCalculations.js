const INCH_TO_M = 0.0254;
const M3_TO_BBL = 6.2898;
// precise conversion constant
const K = (Math.PI / 4) * INCH_TO_M ** 2 * M3_TO_BBL;

/**
 * Calculates well volumes in bbl
 */
export function calculateVolumes(geometry) {
  if (!geometry)
    return {
      wellVolume: 0,
      openHoleVolume: 0,
      internalStringVolume: 0,
      linerVolume: 0,
      internalStringDisplacement: 0,
      annulusVolume: 0,
    };

  const { casings = [], openHole, drillPipes = [] } = geometry;

  // --- Casing volumes ---
  const casingVolumes = casings.map((c) => c.id ** 2 * (c.bottom - c.top) * K);
  const wellVolume = casingVolumes.reduce((sum, v) => sum + v, 0);

  // --- Open hole ---
  let openHoleVolume = 0;
  if (openHole?.size && openHole?.depth && casings.length) {
    const lastCasingBottom = casings[casings.length - 1].bottom;
    const L_OH = openHole.depth - lastCasingBottom;
    if (L_OH > 0) {
      openHoleVolume = openHole.size ** 2 * L_OH * K;
    }
  }

  const totalWellVolume = wellVolume + openHoleVolume;

  // --- Drill pipes (internal string) ---
  const internalStringVolumes = drillPipes.map(
    (dp) => dp.id ** 2 * dp.length * K
  );
  const internalStringVolume = internalStringVolumes.reduce(
    (sum, v) => sum + v,
    0
  );

  // --- Liner (last DP) ---
  const linerVolume = drillPipes.length
    ? drillPipes[drillPipes.length - 1].id ** 2 *
      drillPipes[drillPipes.length - 1].length *
      K
    : 0;

  // --- Internal string metal displacement ---
  const internalStringDisplacement = drillPipes
    .map((dp) => (dp.od ** 2 - dp.id ** 2) * dp.length * K)
    .reduce((sum, v) => sum + v, 0);

  // --- Annulus volume ---
  const annulusVolume =
    totalWellVolume -
    drillPipes
      .map((dp) => dp.od ** 2 * dp.length * K)
      .reduce((sum, v) => sum + v, 0);

  return {
    wellVolume: totalWellVolume,
    openHoleVolume,
    internalStringVolume,
    linerVolume,
    internalStringDisplacement,
    annulusVolume,
  };
}
export function calculateFluidHeights(dp, cementVolume, mudPushVolume) {
  const K = (Math.PI / 4) * 0.0254 ** 2 * 6.2898; // bbl per m and inch^2
  const dpVolume = dp.id ** 2 * dp.length * K;
  const mudVolume = Math.max(dpVolume - cementVolume - mudPushVolume, 0);
  const hMud = (mudVolume / dpVolume) * dp.length;
  const hMudPush = (mudPushVolume / dpVolume) * dp.length;
  const hCement = (cementVolume / dpVolume) * dp.length;
  return { hMud, hMudPush, hCement };
}

export function calculateAnnulusFluidHeight(annulusVolume, cementVolume) {
  const mudVolume = Math.max(annulusVolume - cementVolume, 0);
  const hCement = cementVolume / annulusVolume;
  const hMud = mudVolume / annulusVolume;
  return { hMud, hCement };
}

/**
 * Pump fluids down the drill string and into the annulus.
 * @param {Object} geometry - Well geometry
 * @param {Object} currentFluid - Current fluid volumes
 *   { dp: { cement: [], mudPush: [] }, annulus: { cement: 0 } }
 * @param {Object} pumpVolumes - Volumes to pump in bbl
 *   { cement: bbl, mudPush: bbl }
 * @returns {Object} updatedFluidState
 */
export function pumpFluids(geometry, currentFluid, pumpVolumes) {
  const { drillPipes = [], casings = [], openHole } = geometry;

  // Initialize fluid state if missing
  const fluidState = {
    dp: drillPipes.map((_) => ({ cement: 0, mudPush: 0 })),
    annulus: { cement: 0 },
    ...currentFluid,
  };

  let cementRemaining = pumpVolumes.cement || 0;
  let mudPushRemaining = pumpVolumes.mudPush || 0;

  // --- Step 1: Pump cement down drill pipes ---
  for (let i = 0; i < drillPipes.length; i++) {
    const dp = drillPipes[i];
    const dpVolume = dp.id ** 2 * dp.length * K;
    const filledCement = fluidState.dp[i].cement || 0;
    const availableSpace =
      dpVolume - filledCement - (fluidState.dp[i].mudPush || 0);

    const cementToPump = Math.min(availableSpace, cementRemaining);
    fluidState.dp[i].cement = (fluidState.dp[i].cement || 0) + cementToPump;
    cementRemaining -= cementToPump;

    if (cementRemaining <= 0) break;
  }

  // --- Step 2: Pump mud push to push cement down the pipes ---
  for (let i = 0; i < drillPipes.length; i++) {
    const dp = drillPipes[i];
    const dpVolume = dp.id ** 2 * dp.length * K;
    const filledCement = fluidState.dp[i].cement || 0;
    const filledMudPush = fluidState.dp[i].mudPush || 0;
    const availableSpace = dpVolume - filledCement - filledMudPush;

    const mudPushToPump = Math.min(availableSpace, mudPushRemaining);
    fluidState.dp[i].mudPush = (fluidState.dp[i].mudPush || 0) + mudPushToPump;
    mudPushRemaining -= mudPushToPump;

    if (mudPushRemaining <= 0) break;
  }

  // --- Step 3: Move cement into annulus if liner reached ---
  if (drillPipes.length && cementRemaining <= 0) {
    const lastDP = drillPipes[drillPipes.length - 1];
    const linerVolume = lastDP.id ** 2 * lastDP.length * K;

    const annulusVolume = calculateVolumes(geometry).annulusVolume;
    const cementInAnnulus = Math.min(
      annulusVolume,
      fluidState.annulus.cement + fluidState.dp[drillPipes.length - 1].cement
    );
    fluidState.annulus.cement = cementInAnnulus;

    // Remove cement from last DP as it enters annulus
    fluidState.dp[drillPipes.length - 1].cement -= cementInAnnulus;
  }

  return fluidState;
}
