/* ===== VOX Cool: CALCULATION (PLACEHOLDER) =====
   Replace the numbers/logic in this file with the real formula later.
   app.js only calls VoxCalc.estimate(inputs) and needs { pct, monthlyKwh, annualUsd }.
   inputs = { sqft, temp, equip, cond, load, defType, defSched, solar, rateCents } */
window.VoxCalc = (function () {
  // kWh per sqft per month by equipment (placeholder)
  const BASE = { hfc35: 2.4, hfc25: 2.1, nh3screw25: 1.9, nh3two35: 2.0, nh3two25: 1.7, unknown: 2.0 };
  // % savings added per option (placeholder)
  const GAIN = {
    cond:     { water: 2, air: 6, unknown: 4 },
    load:     { onoff: 7, slide: 5, vfd: 2, unknown: 5 },
    defType:  { hotgas: 3, electric: 7, unknown: 5 },
    defSched: { timer: 4, smart: 1, unknown: 3 },
    solar:    { yes: 4, no: 0, unknown: 1 }
  };
  const MAX_PCT = 40;

  function estimate(i) {
    const tempAdj = 1 + (-25 - i.temp) * 0.01;            // colder than -25°F uses more
    const monthlyKwh = Math.round(i.sqft * (BASE[i.equip] || BASE.unknown) * tempAdj);
    const pct = Math.min(MAX_PCT, Math.round(
      GAIN.cond[i.cond] + GAIN.load[i.load] + GAIN.defType[i.defType] +
      GAIN.defSched[i.defSched] + GAIN.solar[i.solar]));
    const annualUsd = Math.round(monthlyKwh * 12 * (pct / 100) * (i.rateCents / 100));
    return { pct, monthlyKwh, annualUsd };
  }
  return { estimate };
})();
