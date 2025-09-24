const INCH_TO_M = 0.0254;
const M3_TO_BBL = 6.2898;
// precise conversion constant
export const K = (Math.PI / 4) * INCH_TO_M ** 2 * M3_TO_BBL;

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

  // Casing internal volume
  const casingVolumes = casings.map(
    (c) => c.id ** 2 * ((c.bottom || 0) - (c.top || 0)) * K
  );
  const wellVol = casingVolumes.reduce((s, v) => s + v, 0);

  // Open hole
  let openHoleVolume = 0;
  if (openHole?.size && openHole?.depth && casings.length > 0) {
    const lastBottom = casings[casings.length - 1].bottom || 0;
    const L_OH = (openHole.depth || 0) - lastBottom;
    if (L_OH > 0) {
      openHoleVolume = openHole.size ** 2 * L_OH * K;
    }
  }

  const totalWellVolume = wellVol + openHoleVolume;

  // Drill pipes internal fluid capacity
  const dpVolumes = drillPipes.map((dp) => dp.id ** 2 * (dp.length || 0) * K);
  const internalStringVolume = dpVolumes.reduce((s, v) => s + v, 0);

  // Liner = last DP fluid capacity
  const linerVolume =
    drillPipes.length > 0
      ? drillPipes[drillPipes.length - 1].id ** 2 *
        (drillPipes[drillPipes.length - 1].length || 0) *
        K
      : 0;

  // Internal string metal displacement
  const metalDisplacement = drillPipes
    .map((dp) => (dp.od ** 2 - dp.id ** 2) * (dp.length || 0) * K)
    .reduce((s, v) => s + v, 0);

  // External envelope of drill pipes
  const externalDPVolumes = drillPipes
    .map((dp) => dp.od ** 2 * (dp.length || 0) * K)
    .reduce((s, v) => s + v, 0);

  const annulusVolume = totalWellVolume - externalDPVolumes;

  return {
    wellVolume: totalWellVolume,
    openHoleVolume,
    internalStringVolume,
    linerVolume,
    internalStringDisplacement: metalDisplacement,
    annulusVolume,
  };
}

/**
 * Given a single drill pipe segment and fluid volumes inside it (cement, mudPush),
 * compute the heights of mud, mudPush, cement (in meters).
 */
export function calculateFluidHeights(dp, cementVol = 0, mudPushVol = 0) {
  const dpLength = dp.length || 0;
  if (dpLength <= 0 || !dp.id) return { hMud: 0, hMudPush: 0, hCement: 0 };

  const dpVol = dp.id ** 2 * dpLength * K;
  const used = (cementVol || 0) + (mudPushVol || 0);
  const mudVol = Math.max(dpVol - used, 0);

  const hCement = (cementVol / dpVol) * dpLength;
  const hMudPush = (mudPushVol / dpVol) * dpLength;
  const hMud = dpLength - hCement - hMudPush;

  return { hMud, hMudPush, hCement };
}

/**
 * For annulus: given annulus total volume and cement in it, compute fraction heights
 */
export function calculateAnnulusFluidHeight(annulusVolume, cementVol = 0) {
  if (annulusVolume <= 0) return { hMud: 0, hCement: 0 };
  const cement = cementVol || 0;
  const mud = Math.max(annulusVolume - cement, 0);
  const hCement = cement / annulusVolume;
  const hMud = mud / annulusVolume;
  return { hMud, hCement };
}
