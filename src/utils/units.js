export function inchToMeter(inch) {
  return inch * 0.0254;
}

export function areaFromID(idInches) {
  const r = inchToMeter(idInches) / 2;
  return Math.PI * r * r;
}
