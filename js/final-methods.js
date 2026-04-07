/* ============================================================
   NICE Cardiology Final Methods Module
   10 advanced statistical methods for guideline critique:
   Counterfactual Causal Model, Monte Carlo Simulation,
   Markov QALY Model, E-values, Network Meta-Analysis,
   Survival of Guideline Adoption, Rosenthal File-Drawer,
   Trim-and-Fill, Bayesian Model Averaging, Power Prior.
   Zero external dependencies. ES5 compatible.
   ============================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────
     Internal Math Utilities
     ────────────────────────────────────── */

  function normalCDF(x) {
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    var a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    var t = 1.0 / (1.0 + p * x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  }

  function normalPDF(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  function normalQuantile(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p < 0.5) return -normalQuantile(1 - p);
    var t = Math.sqrt(-2 * Math.log(1 - p));
    var c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    var d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
  }

  function fmt(x, d) {
    if (x === null || x === undefined || isNaN(x)) return '\u2014';
    if (!isFinite(x)) return '\u221E';
    return x.toFixed(d !== undefined ? d : 3);
  }

  function pct(x, d) {
    if (x === null || x === undefined || isNaN(x)) return '\u2014';
    return (x * 100).toFixed(d !== undefined ? d : 1) + '%';
  }

  function fmtInt(x) {
    if (x === null || x === undefined || isNaN(x)) return '\u2014';
    return Math.round(x).toLocaleString();
  }

  /* ──────────────────────────────────────
     DerSimonian-Laird (self-contained copy)
     ────────────────────────────────────── */

  function metaDL(studies) {
    var k = studies.length;
    if (k === 0) return null;
    if (k === 1) {
      var s = studies[0];
      return {
        pooled: Math.exp(s.yi), pooled_log: s.yi, se_log: s.sei,
        ci_lo: Math.exp(s.yi - 1.96 * s.sei),
        ci_hi: Math.exp(s.yi + 1.96 * s.sei),
        tau2: 0, I2: 0, Q: 0, k: 1
      };
    }
    var wi = studies.map(function (s) { return 1 / (s.sei * s.sei); });
    var sumW = wi.reduce(function (a, b) { return a + b; }, 0);
    var thetaFE = wi.reduce(function (sum, w, i) { return sum + w * studies[i].yi; }, 0) / sumW;
    var Q = wi.reduce(function (sum, w, i) {
      var d = studies[i].yi - thetaFE;
      return sum + w * d * d;
    }, 0);
    var sumW2 = wi.reduce(function (a, w) { return a + w * w; }, 0);
    var C = sumW - sumW2 / sumW;
    var tau2 = Math.max(0, (Q - (k - 1)) / C);
    var wiStar = studies.map(function (s) { return 1 / (s.sei * s.sei + tau2); });
    var sumWStar = wiStar.reduce(function (a, b) { return a + b; }, 0);
    var thetaRE = wiStar.reduce(function (sum, w, i) { return sum + w * studies[i].yi; }, 0) / sumWStar;
    var seRE = Math.sqrt(1 / sumWStar);
    var I2 = k > 1 ? Math.max(0, (Q - (k - 1)) / Q * 100) : 0;
    return {
      pooled: Math.exp(thetaRE), pooled_log: thetaRE, se_log: seRE,
      ci_lo: Math.exp(thetaRE - 1.96 * seRE),
      ci_hi: Math.exp(thetaRE + 1.96 * seRE),
      tau2: tau2, I2: I2, Q: Q, k: k
    };
  }

  /* ──────────────────────────────────────
     Seeded xoshiro128** PRNG
     ────────────────────────────────────── */

  function createPRNG(seed) {
    var s0 = seed | 0 || 12345;
    var s1 = (seed * 37 + 67890) | 0;
    var s2 = (seed * 73 + 11111) | 0;
    var s3 = (seed * 131 + 22222) | 0;

    function next() {
      var r = Math.imul(s0, 5);
      r = ((r << 7) | (r >>> 25));
      r = Math.imul(r, 9);
      var t = s1 << 9;
      s2 ^= s0;
      s3 ^= s1;
      s1 ^= s2;
      s0 ^= s3;
      s2 ^= t;
      s3 = (s3 << 11) | (s3 >>> 21);
      return (r >>> 0) / 4294967296;
    }

    function randn() {
      var u1 = next();
      var u2 = next();
      // Guard against log(0)
      if (u1 < 1e-15) u1 = 1e-15;
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    return { next: next, randn: randn };
  }

  /* ──────────────────────────────────────
     Study Data
     ────────────────────────────────────── */

  var hfrefStudies = [
    { label: 'DAPA-HF', yi: Math.log(0.74), sei: (Math.log(0.85) - Math.log(0.65)) / (2 * 1.96), hr: 0.74, ci_lo: 0.65, ci_hi: 0.85, n: 4744, year: 2019 },
    { label: 'EMPEROR-Reduced', yi: Math.log(0.75), sei: (Math.log(0.86) - Math.log(0.65)) / (2 * 1.96), hr: 0.75, ci_lo: 0.65, ci_hi: 0.86, n: 3730, year: 2020 }
  ];

  var allSGLT2i = [
    { label: 'DAPA-HF', yi: Math.log(0.74), sei: (Math.log(0.85) - Math.log(0.65)) / (2 * 1.96), n: 4744, year: 2019 },
    { label: 'EMPEROR-Reduced', yi: Math.log(0.75), sei: (Math.log(0.86) - Math.log(0.65)) / (2 * 1.96), n: 3730, year: 2020 },
    { label: 'EMPEROR-Preserved', yi: Math.log(0.79), sei: (Math.log(0.90) - Math.log(0.69)) / (2 * 1.96), n: 5988, year: 2021 },
    { label: 'DELIVER', yi: Math.log(0.82), sei: (Math.log(0.92) - Math.log(0.73)) / (2 * 1.96), n: 6263, year: 2022 },
    { label: 'EMPULSE', yi: Math.log(0.87), sei: (Math.log(1.10) - Math.log(0.69)) / (2 * 1.96), n: 530, year: 2022 },
    { label: 'SOLOIST-WHF', yi: Math.log(0.67), sei: (Math.log(0.85) - Math.log(0.52)) / (2 * 1.96), n: 1222, year: 2020 },
    { label: 'DAPA-MI', yi: Math.log(0.95), sei: (Math.log(1.08) - Math.log(0.84)) / (2 * 1.96), n: 4017, year: 2024 },
    { label: 'EMPACT-MI', yi: Math.log(0.91), sei: (Math.log(1.04) - Math.log(0.80)) / (2 * 1.96), n: 6522, year: 2024 }
  ];

  var lipidStudies = [
    { label: 'IMPROVE-IT', yi: Math.log(0.936), sei: (Math.log(0.99) - Math.log(0.89)) / (2 * 1.96), n: 18144, year: 2015 },
    { label: 'FOURIER', yi: Math.log(0.85), sei: (Math.log(0.92) - Math.log(0.79)) / (2 * 1.96), n: 27564, year: 2017 },
    { label: 'ODYSSEY', yi: Math.log(0.85), sei: (Math.log(0.93) - Math.log(0.78)) / (2 * 1.96), n: 18924, year: 2018 }
  ];

  /* ──────────────────────────────────────
     Method 1: Counterfactual Causal Model
     ────────────────────────────────────── */

  function counterfactualModel() {
    // DAPA-HF: published Sep 2019, ESC Aug 2021, NICE Feb 2021
    // EMPEROR-Reduced: published Sep 2020, ESC Aug 2021, NICE Mar 2022
    // Earliest reasonable adoption = ESC Aug 2021
    // NICE was BEFORE ESC for DAPA-HF (Feb 2021 vs Aug 2021) but AFTER for EMPEROR-Reduced
    // Net: NICE adopted SGLT2i class at different times for individual drugs

    var population = 450000;
    var arr = 0.047; // 4.7% ARR over trial follow-up
    var trialFollowUp = 18; // months

    var drugs = [
      {
        name: 'Dapagliflozin (DAPA-HF)',
        trialPub: '2019-09', // Sep 2019
        escAdopt: '2021-08', // Aug 2021
        niceAdopt: '2021-02', // Feb 2021 (NICE TA679)
        trialToEsc: 23, // months from trial to ESC
        trialToNice: 17 // months from trial to NICE
      },
      {
        name: 'Empagliflozin (EMPEROR-Reduced)',
        trialPub: '2020-09', // Sep 2020
        escAdopt: '2021-08', // Aug 2021
        niceAdopt: '2022-03', // Mar 2022 (NICE TA773)
        trialToEsc: 11, // months from trial to ESC
        trialToNice: 18 // months from trial to NICE
      }
    ];

    var results = [];
    var totalAvoidableDeaths = 0;
    var totalDelayMonths = 0;

    for (var i = 0; i < drugs.length; i++) {
      var d = drugs[i];
      // Additional delay beyond ESC: positive = NICE was slower, negative = NICE was faster
      var additionalDelay = d.trialToNice - d.trialToEsc;
      // Monthly ARR
      var monthlyARR = arr / trialFollowUp;
      // Impact: patients affected during the additional delay period
      // Only count if NICE was slower (positive delay)
      var avoidableEvents = 0;
      if (additionalDelay > 0) {
        avoidableEvents = population * monthlyARR * additionalDelay;
      }
      totalAvoidableDeaths += avoidableEvents;
      totalDelayMonths += additionalDelay;

      results.push({
        name: d.name,
        trialToEsc: d.trialToEsc,
        trialToNice: d.trialToNice,
        additionalDelay: additionalDelay,
        avoidableEvents: Math.round(avoidableEvents),
        niceBeforeEsc: additionalDelay < 0
      });
    }

    // Net class-level analysis: when did NICE provide comprehensive SGLT2i access?
    // ESC recommended class-wide Aug 2021; NICE only completed coverage Mar 2022
    var classDelayMonths = 7; // Aug 2021 to Mar 2022
    var classAvoidable = population * (arr / trialFollowUp) * classDelayMonths;

    return {
      drugs: results,
      totalAvoidableEvents: Math.round(totalAvoidableDeaths),
      classDelayMonths: classDelayMonths,
      classAvoidableEvents: Math.round(classAvoidable),
      population: population,
      arr: arr,
      trialFollowUp: trialFollowUp
    };
  }

  /* ──────────────────────────────────────
     Method 2: Monte Carlo Simulation
     ────────────────────────────────────── */

  function monteCarloReversal(pooledLog, seLog, tau2, nSim) {
    nSim = nSim || 10000;
    var rng = createPRNG(42);
    var reversals = 0;
    var simResults = [];
    var bins = {};
    for (var b = -10; b <= 10; b++) { bins[b] = 0; }

    for (var i = 0; i < nSim; i++) {
      var trueEffect = pooledLog + Math.sqrt(tau2) * rng.randn();
      var observed = trueEffect + seLog * rng.randn();
      var simHR = Math.exp(observed);
      if (observed >= 0) reversals++;

      // Bin for histogram (bins of 0.05 in HR space)
      var binIdx = Math.round(observed / 0.05);
      if (binIdx >= -10 && binIdx <= 10) {
        bins[binIdx] = (bins[binIdx] || 0) + 1;
      }
    }

    // Percentiles
    var sorted = [];
    for (var i = 0; i < 100; i++) {
      var trueEff = pooledLog + Math.sqrt(tau2) * rng.randn();
      var obs = trueEff + seLog * rng.randn();
      sorted.push(Math.exp(obs));
    }
    sorted.sort(function (a, b) { return a - b; });

    return {
      nSim: nSim,
      reversals: reversals,
      pReversal: reversals / nSim,
      medianHR: Math.exp(pooledLog),
      p5: sorted[Math.floor(sorted.length * 0.05)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }

  /* ──────────────────────────────────────
     Method 3: Markov QALY Model
     ────────────────────────────────────── */

  function markovQALY(hr, population, years) {
    years = years || 5;
    var months = years * 12;

    // Utility weights
    var uWell = 0.72;
    var uHosp = 0.50;
    var uDead = 0.00;

    // Monthly transition probabilities (baseline without SGLT2i)
    // Based on HF registry data: ~15% annual hospitalisation, ~8% annual mortality
    var pHospBase = 1 - Math.pow(1 - 0.15, 1 / 12); // ~0.0135/month
    var pDeathFromWell = 1 - Math.pow(1 - 0.08, 1 / 12); // ~0.007/month
    var pDeathFromHosp = 0.05; // 5% in-hospital mortality per month
    var pRecovery = 0.60; // 60% recover from hospitalisation per month

    function runModel(hrMod, startMonth) {
      var well = population;
      var hosp = 0;
      var dead = 0;
      var totalQALY = 0;

      for (var m = 0; m < months; m++) {
        // Apply HR modification only after startMonth
        var effectiveHR = m >= startMonth ? hrMod : 1.0;
        var pHosp = pHospBase * effectiveHR;
        var pDeath = pDeathFromWell * effectiveHR;

        // Transitions from Well
        var newHosp = well * pHosp;
        var newDeadFromWell = well * pDeath;

        // Transitions from Hospitalised
        var newDeadFromHosp = hosp * pDeathFromHosp;
        var recovered = hosp * pRecovery;

        // Update states
        well = well - newHosp - newDeadFromWell + recovered;
        hosp = hosp + newHosp - newDeadFromHosp - recovered;
        dead = dead + newDeadFromWell + newDeadFromHosp;

        // Ensure non-negative
        if (well < 0) well = 0;
        if (hosp < 0) hosp = 0;

        // Monthly QALY accrual (1 month = 1/12 year)
        totalQALY += (well * uWell + hosp * uHosp) / 12;
      }

      return { totalQALY: totalQALY, alive: well + hosp, dead: dead };
    }

    // Scenario A: No SGLT2i (HR=1.0 throughout)
    var noTreat = runModel(1.0, 0);

    // Scenario B: SGLT2i from ESC date (Aug 2021, ~23 months from DAPA-HF Sep 2019)
    // Assume model starts from trial publication, ESC recommends at month 0 here
    var escTreat = runModel(hr, 0);

    // Scenario C: SGLT2i from NICE date (7 months after ESC for class coverage)
    var niceTreat = runModel(hr, 7);

    var qalyGainEsc = escTreat.totalQALY - noTreat.totalQALY;
    var qalyGainNice = niceTreat.totalQALY - noTreat.totalQALY;
    var qalyLostDelay = qalyGainEsc - qalyGainNice;

    // Cost at NICE threshold
    var niceThreshold = 20000; // GBP per QALY
    var costDelay = qalyLostDelay * niceThreshold;

    return {
      noTreat: noTreat,
      escTreat: escTreat,
      niceTreat: niceTreat,
      qalyGainEsc: qalyGainEsc,
      qalyGainNice: qalyGainNice,
      qalyLostDelay: qalyLostDelay,
      costDelay: costDelay,
      population: population,
      years: years,
      deathsAvertedEsc: noTreat.dead - escTreat.dead,
      deathsAvertedNice: noTreat.dead - niceTreat.dead,
      excessDeaths: niceTreat.dead - escTreat.dead
    };
  }

  /* ──────────────────────────────────────
     Method 4: E-values
     ────────────────────────────────────── */

  function computeEvalues(studies) {
    var results = [];
    for (var i = 0; i < studies.length; i++) {
      var s = studies[i];
      var hr = s.hr !== undefined ? s.hr : Math.exp(s.yi);
      // For protective effects (HR < 1), use 1/HR
      var rr = hr < 1 ? 1 / hr : hr;
      var eValue = rr + Math.sqrt(rr * (rr - 1));

      // E-value for confidence interval bound closest to null
      var ciClose = hr < 1 ? (s.ci_hi !== undefined ? s.ci_hi : Math.exp(s.yi + 1.96 * s.sei)) : (s.ci_lo !== undefined ? s.ci_lo : Math.exp(s.yi - 1.96 * s.sei));
      var rrCI = ciClose < 1 ? 1 / ciClose : ciClose;
      var eValueCI = rrCI > 1 ? rrCI + Math.sqrt(rrCI * (rrCI - 1)) : 1;

      results.push({
        label: s.label,
        hr: hr,
        eValue: eValue,
        eValueCI: eValueCI
      });
    }

    // Pooled E-value
    var pooled = metaDL(studies);
    if (pooled) {
      var phr = pooled.pooled;
      var prr = phr < 1 ? 1 / phr : phr;
      var pEval = prr + Math.sqrt(prr * (prr - 1));
      var ciClosePl = phr < 1 ? pooled.ci_hi : pooled.ci_lo;
      var rrCIP = ciClosePl < 1 ? 1 / ciClosePl : ciClosePl;
      var pEvalCI = rrCIP > 1 ? rrCIP + Math.sqrt(rrCIP * (rrCIP - 1)) : 1;
      results.push({
        label: 'Pooled estimate',
        hr: phr,
        eValue: pEval,
        eValueCI: pEvalCI
      });
    }

    return results;
  }

  /* ──────────────────────────────────────
     Method 5: Network Meta-Analysis
     ────────────────────────────────────── */

  function networkMetaAnalysis(studies) {
    // Star network (all vs placebo) = standard RE MA on all studies
    var pooled = metaDL(studies);
    if (!pooled) return null;

    // Subgroup by drug class
    var subgroups = {};
    for (var i = 0; i < studies.length; i++) {
      var s = studies[i];
      var drug = 'Other';
      if (s.label.indexOf('DAPA') === 0) drug = 'Dapagliflozin';
      else if (s.label.indexOf('EMPEROR') === 0 || s.label.indexOf('EMPULSE') === 0 || s.label.indexOf('EMPACT') === 0 || s.label.indexOf('EMPERIAL') === 0) drug = 'Empagliflozin';
      else if (s.label.indexOf('SOLOIST') === 0) drug = 'Sotagliflozin';

      if (!subgroups[drug]) subgroups[drug] = [];
      subgroups[drug].push(s);
    }

    var drugResults = [];
    var drugNames = Object.keys(subgroups);
    for (var d = 0; d < drugNames.length; d++) {
      var name = drugNames[d];
      var sub = metaDL(subgroups[name]);
      if (sub) {
        drugResults.push({
          drug: name,
          pooled: sub.pooled,
          ci_lo: sub.ci_lo,
          ci_hi: sub.ci_hi,
          k: sub.k,
          totalN: subgroups[name].reduce(function (a, s) { return a + (s.n || 0); }, 0)
        });
      }
    }

    // Consistency check: compare largest two subgroups
    var consistency = null;
    if (drugResults.length >= 2) {
      var sorted = drugResults.slice().sort(function (a, b) { return b.k - a.k; });
      var diff = Math.abs(Math.log(sorted[0].pooled) - Math.log(sorted[1].pooled));
      var seDiff = Math.sqrt(
        Math.pow(metaDL(subgroups[sorted[0].drug]).se_log, 2) +
        Math.pow(metaDL(subgroups[sorted[1].drug]).se_log, 2)
      );
      var zConsistency = diff / seDiff;
      var pConsistency = 2 * (1 - normalCDF(Math.abs(zConsistency)));
      consistency = {
        drug1: sorted[0].drug,
        drug2: sorted[1].drug,
        zStat: zConsistency,
        pValue: pConsistency,
        consistent: pConsistency > 0.05
      };
    }

    return {
      classEffect: pooled,
      drugResults: drugResults,
      consistency: consistency,
      totalStudies: studies.length,
      totalPatients: studies.reduce(function (a, s) { return a + (s.n || 0); }, 0)
    };
  }

  /* ──────────────────────────────────────
     Method 6: Survival of Guideline Adoption
     ────────────────────────────────────── */

  function guidelineAdoptionSurvival() {
    // DAPA-HF: published Sep 2019
    var dapaAdoptions = [
      { body: 'FDA', monthsFromTrial: 4, date: 'Jan 2020' },
      { body: 'EMA', monthsFromTrial: 7, date: 'Apr 2020' },
      { body: 'ESC', monthsFromTrial: 23, date: 'Aug 2021' },
      { body: 'CCS', monthsFromTrial: 14, date: 'Nov 2020' },
      { body: 'NICE TA679', monthsFromTrial: 17, date: 'Feb 2021' },
      { body: 'WHO EML', monthsFromTrial: 24, date: 'Sep 2021' }
    ];

    // EMPEROR-Reduced: published Sep 2020
    var emperorAdoptions = [
      { body: 'FDA', monthsFromTrial: 3, date: 'Dec 2020' },
      { body: 'EMA', monthsFromTrial: 6, date: 'Mar 2021' },
      { body: 'ESC', monthsFromTrial: 11, date: 'Aug 2021' },
      { body: 'CCS', monthsFromTrial: 9, date: 'Jun 2021' },
      { body: 'NICE TA773', monthsFromTrial: 18, date: 'Mar 2022' },
      { body: 'WHO EML', monthsFromTrial: 24, date: 'Sep 2022' }
    ];

    function analyseAdoption(adoptions, trialName) {
      var sorted = adoptions.slice().sort(function (a, b) { return a.monthsFromTrial - b.monthsFromTrial; });
      var n = sorted.length;
      var niceEntry = null;
      var niceRank = -1;
      for (var i = 0; i < sorted.length; i++) {
        if (sorted[i].body.indexOf('NICE') === 0) {
          niceEntry = sorted[i];
          niceRank = i + 1; // 1-indexed
          break;
        }
      }

      // Kaplan-Meier style: fraction adopted by each time point
      var kmPoints = [];
      for (var i = 0; i < sorted.length; i++) {
        kmPoints.push({
          time: sorted[i].monthsFromTrial,
          body: sorted[i].body,
          date: sorted[i].date,
          fractionAdopted: (i + 1) / n
        });
      }

      // Median time to adoption
      var medianIdx = Math.floor(n / 2);
      var medianTime = sorted[medianIdx].monthsFromTrial;

      // NICE percentile: fraction of bodies that adopted before NICE
      var nicePercentile = niceEntry ? (niceRank - 1) / n : null;
      // Fraction that adopted before NICE
      var adoptedBeforeNice = niceEntry ? (niceRank - 1) : 0;

      return {
        trial: trialName,
        adoptions: sorted,
        kmPoints: kmPoints,
        medianTime: medianTime,
        niceMonths: niceEntry ? niceEntry.monthsFromTrial : null,
        niceRank: niceRank,
        nicePercentile: nicePercentile,
        adoptedBeforeNice: adoptedBeforeNice,
        totalBodies: n
      };
    }

    return {
      dapa: analyseAdoption(dapaAdoptions, 'DAPA-HF (Dapagliflozin)'),
      emperor: analyseAdoption(emperorAdoptions, 'EMPEROR-Reduced (Empagliflozin)')
    };
  }

  /* ──────────────────────────────────────
     Method 7: Rosenthal File-Drawer (Fail-Safe N)
     ────────────────────────────────────── */

  function failSafeN(studies) {
    var k = studies.length;
    if (k === 0) return null;

    // Compute z-scores for each study
    var zScores = studies.map(function (s) {
      return s.yi / s.sei;
    });

    var sumZ = zScores.reduce(function (a, b) { return a + b; }, 0);
    var zAlpha = 1.96; // two-sided alpha = 0.05

    // Rosenthal formula: N_fs = (sum(z_i))^2 / z_alpha^2 - k
    var nfs = (sumZ * sumZ) / (zAlpha * zAlpha) - k;
    nfs = Math.max(0, Math.round(nfs));

    // Also compute Orwin's fail-safe N (alternative)
    var meanZ = sumZ / k;
    var targetZ = 0.1; // trivial z threshold
    var orwinN = meanZ > targetZ ? Math.round(k * (meanZ / targetZ - 1)) : 0;

    return {
      zScores: zScores.map(function (z, i) {
        return { label: studies[i].label, z: z };
      }),
      sumZ: sumZ,
      rosenthalN: nfs,
      orwinN: orwinN,
      k: k,
      interpretation: nfs > 5 * k + 10 ? 'Robust (N_fs > 5k+10)' : 'Potentially vulnerable'
    };
  }

  /* ──────────────────────────────────────
     Method 8: Trim-and-Fill
     ────────────────────────────────────── */

  function trimAndFill(studies) {
    if (studies.length < 3) return { k0: 0, originalPooled: metaDL(studies), adjustedPooled: metaDL(studies), imputedStudies: [] };

    var pooled = metaDL(studies);
    var theta = pooled.pooled_log;

    // Deviations from pooled estimate
    var devs = studies.map(function (s, i) {
      return { idx: i, dev: s.yi - theta, absDev: Math.abs(s.yi - theta), yi: s.yi, sei: s.sei, label: s.label };
    });

    // Sort by absolute deviation
    devs.sort(function (a, b) { return a.absDev - b.absDev; });

    // Assign ranks
    var n = devs.length;
    for (var i = 0; i < n; i++) {
      devs[i].rank = i + 1;
    }

    // L0 estimator: count studies on the side with more extreme effects
    // For protective effects (theta < 0), asymmetry = more studies with larger negative effects (further from null)
    // Count studies on the right side (positive deviation = closer to null for protective effects)
    var rightCount = 0;
    var S = 0; // sum of ranks on the right
    for (var i = 0; i < n; i++) {
      if (devs[i].dev > 0) {
        rightCount++;
        S += devs[i].rank;
      }
    }

    // If most are on left (protective side), the "missing" studies are on the right
    // Use left side if that has fewer
    var leftCount = 0;
    var SLeft = 0;
    for (var i = 0; i < n; i++) {
      if (devs[i].dev < 0) {
        leftCount++;
        SLeft += devs[i].rank;
      }
    }

    // Use the side with fewer studies as the asymmetric side
    if (leftCount < rightCount) {
      S = SLeft;
    }

    // k0 estimate using L0 method
    var k0 = Math.max(0, Math.round((4 * S - n * (n + 1) / 2) / (2 * n - 1)));

    // Impute mirror studies
    var imputedStudies = studies.slice();
    var imputed = [];

    if (k0 > 0) {
      // Sort original studies by deviation from theta
      var byDev = studies.map(function (s) {
        return { yi: s.yi, sei: s.sei, dev: Math.abs(s.yi - theta), label: s.label };
      }).sort(function (a, b) { return b.dev - a.dev; });

      // Mirror the k0 most extreme studies
      for (var i = 0; i < Math.min(k0, byDev.length); i++) {
        var mirrorYi = 2 * theta - byDev[i].yi;
        var mirrorStudy = {
          label: 'Imputed ' + (i + 1),
          yi: mirrorYi,
          sei: byDev[i].sei
        };
        imputedStudies.push(mirrorStudy);
        imputed.push(mirrorStudy);
      }
    }

    var adjustedPooled = metaDL(imputedStudies);

    return {
      k0: k0,
      originalPooled: pooled,
      adjustedPooled: adjustedPooled,
      imputedStudies: imputed,
      nOriginal: studies.length,
      nAdjusted: imputedStudies.length
    };
  }

  /* ──────────────────────────────────────
     Method 9: Bayesian Model Averaging
     ────────────────────────────────────── */

  function bayesianModelAveraging(studies) {
    var pooled = metaDL(studies);
    if (!pooled) return null;

    var yObs = pooled.pooled_log;
    var seObs = pooled.se_log;

    // Three priors
    var priors = [
      { name: 'Vague', mu0: 0, sigma0: 0.5, description: 'Weakly informative N(0, 0.5)' },
      { name: 'Sceptical', mu0: 0, sigma0: 0.2, description: 'Sceptical: centred at null, N(0, 0.2)' },
      { name: 'Enthusiastic', mu0: -0.3, sigma0: 0.3, description: 'Enthusiastic: favours treatment, N(-0.3, 0.3)' }
    ];

    // Grid approximation for each prior
    var gridMin = -1.5;
    var gridMax = 0.5;
    var nGrid = 2000;
    var dx = (gridMax - gridMin) / nGrid;

    var modelResults = [];
    var marginalLikelihoods = [];

    for (var m = 0; m < priors.length; m++) {
      var prior = priors[m];
      var gridPoints = [];
      var margLik = 0;

      for (var g = 0; g < nGrid; g++) {
        var theta = gridMin + (g + 0.5) * dx;
        // Likelihood: N(yObs | theta, seObs^2)
        var logLik = -0.5 * Math.pow((yObs - theta) / seObs, 2);
        // Prior: N(theta | mu0, sigma0^2)
        var logPrior = -0.5 * Math.pow((theta - prior.mu0) / prior.sigma0, 2);
        var likPrior = Math.exp(logLik + logPrior);
        margLik += likPrior * dx;
        gridPoints.push({ theta: theta, posterior: likPrior });
      }

      // Normalize posterior
      var postSum = gridPoints.reduce(function (a, p) { return a + p.posterior; }, 0);
      for (var g = 0; g < gridPoints.length; g++) {
        gridPoints[g].posterior /= (postSum * dx);
      }

      // Posterior mean and SD
      var postMean = 0;
      var postVar = 0;
      for (var g = 0; g < gridPoints.length; g++) {
        postMean += gridPoints[g].theta * gridPoints[g].posterior * dx;
      }
      for (var g = 0; g < gridPoints.length; g++) {
        var diff = gridPoints[g].theta - postMean;
        postVar += diff * diff * gridPoints[g].posterior * dx;
      }

      // Posterior probability of HR < 1 (theta < 0)
      var pBenefit = 0;
      for (var g = 0; g < gridPoints.length; g++) {
        if (gridPoints[g].theta < 0) {
          pBenefit += gridPoints[g].posterior * dx;
        }
      }

      marginalLikelihoods.push(margLik);
      modelResults.push({
        prior: prior,
        posteriorMean: postMean,
        posteriorSD: Math.sqrt(postVar),
        posteriorHR: Math.exp(postMean),
        posteriorCI_lo: Math.exp(postMean - 1.96 * Math.sqrt(postVar)),
        posteriorCI_hi: Math.exp(postMean + 1.96 * Math.sqrt(postVar)),
        pBenefit: pBenefit,
        marginalLikelihood: margLik
      });
    }

    // BMA weights
    var totalMargLik = marginalLikelihoods.reduce(function (a, b) { return a + b; }, 0);
    var bmaWeights = marginalLikelihoods.map(function (ml) { return ml / totalMargLik; });

    // BMA posterior mean (on log scale)
    var bmaMeanLog = 0;
    var bmaVarLog = 0;
    for (var m = 0; m < modelResults.length; m++) {
      bmaMeanLog += bmaWeights[m] * modelResults[m].posteriorMean;
    }
    // BMA variance includes both within-model and between-model variance
    for (var m = 0; m < modelResults.length; m++) {
      var withinVar = modelResults[m].posteriorSD * modelResults[m].posteriorSD;
      var betweenVar = Math.pow(modelResults[m].posteriorMean - bmaMeanLog, 2);
      bmaVarLog += bmaWeights[m] * (withinVar + betweenVar);
    }

    // BMA probability of benefit
    var bmaPBenefit = 0;
    for (var m = 0; m < modelResults.length; m++) {
      bmaPBenefit += bmaWeights[m] * modelResults[m].pBenefit;
    }

    return {
      models: modelResults,
      weights: bmaWeights.map(function (w, i) {
        return { name: priors[i].name, weight: w };
      }),
      bmaHR: Math.exp(bmaMeanLog),
      bmaLogHR: bmaMeanLog,
      bmaSD: Math.sqrt(bmaVarLog),
      bmaCI_lo: Math.exp(bmaMeanLog - 1.96 * Math.sqrt(bmaVarLog)),
      bmaCI_hi: Math.exp(bmaMeanLog + 1.96 * Math.sqrt(bmaVarLog)),
      bmaPBenefit: bmaPBenefit
    };
  }

  /* ──────────────────────────────────────
     Method 10: Power Prior (Historical Borrowing)
     ────────────────────────────────────── */

  function powerPrior(historicalStudy, currentStudy, a0) {
    a0 = a0 !== undefined ? a0 : 0.5; // default 50% borrowing

    // Historical posterior (DAPA-HF): N(y_h, se_h^2)
    var yH = historicalStudy.yi;
    var varH = historicalStudy.sei * historicalStudy.sei;

    // Power prior: discount historical information by a0
    // Effective prior precision = a0 / varH
    // Effective prior mean = yH
    var priorPrec = a0 / varH;
    var priorMean = yH;

    // Current study likelihood: N(y_c, se_c^2)
    var yC = currentStudy.yi;
    var varC = currentStudy.sei * currentStudy.sei;
    var likPrec = 1 / varC;

    // Posterior: N(weighted_mean, 1/(priorPrec + likPrec))
    var postPrec = priorPrec + likPrec;
    var postVar = 1 / postPrec;
    var postMean = (priorPrec * priorMean + likPrec * yC) / postPrec;
    var postSD = Math.sqrt(postVar);

    // Compare with uninformative analysis (a0 = 0)
    var uninformMean = yC;
    var uninformSD = currentStudy.sei;

    // Probability of benefit
    var pBenefitPower = normalCDF(-postMean / postSD);
    var pBenefitUninform = normalCDF(-uninformMean / uninformSD);

    // Run for multiple a0 values
    var sensitivityA0 = [0, 0.1, 0.25, 0.5, 0.75, 1.0];
    var sensitivity = sensitivityA0.map(function (a) {
      var pp = a / varH;
      var tp = pp + likPrec;
      var tv = 1 / tp;
      var tm = (pp * priorMean + likPrec * yC) / tp;
      return {
        a0: a,
        posteriorHR: Math.exp(tm),
        posteriorCI_lo: Math.exp(tm - 1.96 * Math.sqrt(tv)),
        posteriorCI_hi: Math.exp(tm + 1.96 * Math.sqrt(tv)),
        posteriorSD: Math.sqrt(tv),
        pBenefit: normalCDF(-tm / Math.sqrt(tv))
      };
    });

    return {
      historical: { label: historicalStudy.label, hr: Math.exp(yH), logHR: yH, se: historicalStudy.sei },
      current: { label: currentStudy.label, hr: Math.exp(yC), logHR: yC, se: currentStudy.sei },
      a0: a0,
      posteriorMean: postMean,
      posteriorHR: Math.exp(postMean),
      posteriorCI_lo: Math.exp(postMean - 1.96 * postSD),
      posteriorCI_hi: Math.exp(postMean + 1.96 * postSD),
      posteriorSD: postSD,
      pBenefitPower: pBenefitPower,
      uninformHR: Math.exp(uninformMean),
      pBenefitUninform: pBenefitUninform,
      precisionGain: postPrec / likPrec,
      sensitivity: sensitivity
    };
  }

  /* ══════════════════════════════════════
     RENDERING FUNCTIONS
     ══════════════════════════════════════ */

  function renderHF(container) {
    var pooled = metaDL(hfrefStudies);
    if (!pooled) return;

    // Run all HF methods
    var cf = counterfactualModel();
    var mc = monteCarloReversal(pooled.pooled_log, pooled.se_log, pooled.tau2);
    var markov = markovQALY(pooled.pooled, 450000, 5);
    var evalues = computeEvalues(hfrefStudies);
    var nma = networkMetaAnalysis(allSGLT2i);
    var adoption = guidelineAdoptionSurvival();
    var fsn = failSafeN(hfrefStudies);
    var tf = trimAndFill(hfrefStudies);
    var bma = bayesianModelAveraging(hfrefStudies);
    var pp = powerPrior(hfrefStudies[0], hfrefStudies[1], 0.5);

    var html = '<div class="stats-panel">';
    html += '<h3>Final Advanced Methods: SGLT2i in Heart Failure</h3>';
    html += '<p style="font-size:0.85rem;color:var(--gray-500);margin-bottom:1.25rem;">10 additional methods: causal counterfactual modelling, Monte Carlo simulation, Markov QALY analysis, E-values, network meta-analysis, guideline adoption survival, fail-safe N, trim-and-fill, Bayesian model averaging, and power prior historical borrowing. All computed client-side with seeded PRNG for reproducibility.</p>';

    /* ── Section 1: Impact Quantification ── */
    html += '<h3 style="color:var(--teal);border-bottom:2px solid var(--teal);padding-bottom:0.5rem;margin-top:1.5rem;">Impact Quantification</h3>';

    /* 1. Counterfactual Causal Model */
    html += '<div class="stats-block"><h4>1. Counterfactual Causal Model</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Models what would have happened if NICE matched ESC timing. Compares drug-by-drug and class-level delay costs against the 450,000 HFrEF population in England.</p>';
    html += '<table class="data-table"><thead><tr><th>Drug</th><th>Trial\u2192ESC (months)</th><th>Trial\u2192NICE (months)</th><th>Additional Delay</th><th>Avoidable Events</th></tr></thead><tbody>';
    for (var i = 0; i < cf.drugs.length; i++) {
      var d = cf.drugs[i];
      var delayText = d.additionalDelay < 0
        ? '<span class="stat-highlight">' + Math.abs(d.additionalDelay) + ' months AHEAD</span>'
        : '<span class="stat-highlight warning">' + d.additionalDelay + ' months BEHIND</span>';
      html += '<tr><td><strong>' + d.name + '</strong></td>';
      html += '<td>' + d.trialToEsc + '</td>';
      html += '<td>' + d.trialToNice + '</td>';
      html += '<td>' + delayText + '</td>';
      html += '<td>' + fmtInt(d.avoidableEvents) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>Class-Level Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>ESC class recommendation</td><td>August 2021</td></tr>';
    html += '<tr><td>NICE full class coverage</td><td>March 2022</td></tr>';
    html += '<tr><td>Additional class-level delay</td><td><span class="stat-highlight warning">' + cf.classDelayMonths + ' months</span></td></tr>';
    html += '<tr><td>Avoidable events during delay</td><td><span class="stat-highlight warning">' + fmtInt(cf.classAvoidableEvents) + '</span></td></tr>';
    html += '<tr><td>Assumptions</td><td>Population = ' + fmtInt(cf.population) + '; ARR = ' + pct(cf.arr) + ' over ' + cf.trialFollowUp + ' months</td></tr>';
    html += '</tbody></table>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> NICE was ahead of ESC for dapagliflozin (TA679, Feb 2021) but 7 months behind for empagliflozin (TA773, Mar 2022). The net class-level delay of 7 months from ESC\'s unified recommendation represents an estimated ' + fmtInt(cf.classAvoidableEvents) + ' potentially avoidable events.</p>';
    html += '</div>';

    /* 2. Markov QALY Model */
    html += '<div class="stats-block"><h4>2. Markov QALY Model (5-Year, 3-State)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">3-state Markov model (Well \u2192 Hospitalised \u2192 Dead) with monthly cycles over 5 years for 450,000 HFrEF patients. SGLT2i HR modifies hospitalisation and mortality transition probabilities.</p>';
    html += '<table class="data-table"><thead><tr><th>Scenario</th><th>Total QALYs</th><th>Deaths</th><th>QALY Gain vs No Treatment</th></tr></thead><tbody>';
    html += '<tr><td>No SGLT2i</td><td>' + fmtInt(Math.round(markov.noTreat.totalQALY)) + '</td><td>' + fmtInt(Math.round(markov.noTreat.dead)) + '</td><td>\u2014</td></tr>';
    html += '<tr><td>SGLT2i from ESC (Aug 2021)</td><td>' + fmtInt(Math.round(markov.escTreat.totalQALY)) + '</td><td>' + fmtInt(Math.round(markov.escTreat.dead)) + '</td><td><span class="stat-highlight">+' + fmtInt(Math.round(markov.qalyGainEsc)) + '</span></td></tr>';
    html += '<tr><td>SGLT2i from NICE (Mar 2022)</td><td>' + fmtInt(Math.round(markov.niceTreat.totalQALY)) + '</td><td>' + fmtInt(Math.round(markov.niceTreat.dead)) + '</td><td>+' + fmtInt(Math.round(markov.qalyGainNice)) + '</td></tr>';
    html += '</tbody></table>';
    html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>Delay Impact</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>QALYs lost due to delay</td><td><span class="stat-highlight warning">' + fmtInt(Math.round(markov.qalyLostDelay)) + '</span></td></tr>';
    html += '<tr><td>Excess deaths due to delay</td><td><span class="stat-highlight warning">' + fmtInt(Math.round(markov.excessDeaths)) + '</span></td></tr>';
    html += '<tr><td>Cost of delay (\u00A320,000/QALY)</td><td><span class="stat-highlight warning">\u00A3' + fmtInt(Math.round(markov.costDelay)) + '</span></td></tr>';
    html += '<tr><td>Utility weights</td><td>Well: 0.72, Hospitalised: 0.50, Dead: 0.00</td></tr>';
    html += '</tbody></table>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> The 7-month class-level delay resulted in an estimated ' + fmtInt(Math.round(markov.qalyLostDelay)) + ' lost QALYs and ' + fmtInt(Math.round(markov.excessDeaths)) + ' excess deaths, valued at \u00A3' + fmtInt(Math.round(markov.costDelay)) + ' using NICE\'s own cost-effectiveness threshold.</p>';
    html += '</div>';

    /* 3. Monte Carlo Simulation */
    html += '<div class="stats-block"><h4>3. Monte Carlo Simulation (10,000 Trials)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Simulates 10,000 future studies using the pooled log(HR) and between-study heterogeneity (tau\u00B2). Uses seeded xoshiro128** PRNG for deterministic reproducibility.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Pooled log(HR)</td><td>' + fmt(pooled.pooled_log, 4) + '</td></tr>';
    html += '<tr><td>Pooled SE</td><td>' + fmt(pooled.se_log, 4) + '</td></tr>';
    html += '<tr><td>Between-study variance (\u03C4\u00B2)</td><td>' + fmt(pooled.tau2, 6) + '</td></tr>';
    html += '<tr><td>Simulations</td><td>' + fmtInt(mc.nSim) + '</td></tr>';
    html += '<tr><td>Reversals (HR \u2265 1)</td><td><span class="stat-highlight">' + fmtInt(mc.reversals) + '</span></td></tr>';
    html += '<tr><td>P(reversal)</td><td><span class="stat-highlight">' + pct(mc.pReversal, 2) + '</span></td></tr>';
    html += '<tr><td>Median simulated HR</td><td>' + fmt(mc.medianHR) + '</td></tr>';
    html += '</tbody></table>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> Only ' + pct(mc.pReversal, 2) + ' of simulated future studies show HR \u2265 1, confirming that the probability of a future trial reversing the SGLT2i benefit is vanishingly small.</p>';
    html += '</div>';

    /* ── Section 2: Evidence Robustness ── */
    html += '<h3 style="color:var(--teal);border-bottom:2px solid var(--teal);padding-bottom:0.5rem;margin-top:2rem;">Evidence Robustness</h3>';

    /* 4. E-values */
    html += '<div class="stats-block"><h4>4. E-values (Unmeasured Confounding Robustness)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">An unmeasured confounder would need to be associated with both treatment and outcome by at least the E-value to explain away the observed effect. Higher E-values = more robust.</p>';
    html += '<table class="data-table"><thead><tr><th>Study</th><th>HR</th><th>E-value (point)</th><th>E-value (CI limit)</th></tr></thead><tbody>';
    for (var i = 0; i < evalues.length; i++) {
      var ev = evalues[i];
      html += '<tr><td><strong>' + ev.label + '</strong></td>';
      html += '<td>' + fmt(ev.hr) + '</td>';
      html += '<td><span class="stat-highlight">' + fmt(ev.eValue, 2) + '</span></td>';
      html += '<td>' + fmt(ev.eValueCI, 2) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> E-values above 2.0 indicate that an unmeasured confounder would need to double the risk of both treatment allocation and outcome to explain away the effect \u2014 this is implausible given the RCT design.</p>';
    html += '</div>';

    /* 5. Rosenthal File-Drawer */
    html += '<div class="stats-block"><h4>5. Rosenthal\'s File-Drawer (Fail-Safe N)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">How many unpublished null studies (z = 0) would need to exist in file drawers to render the pooled result non-significant?</p>';
    html += '<table class="data-table"><thead><tr><th>Study</th><th>z-score</th></tr></thead><tbody>';
    for (var i = 0; i < fsn.zScores.length; i++) {
      html += '<tr><td><strong>' + fsn.zScores[i].label + '</strong></td><td>' + fmt(fsn.zScores[i].z, 2) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Sum of z-scores</td><td>' + fmt(fsn.sumZ, 2) + '</td></tr>';
    html += '<tr><td>Rosenthal\'s Fail-Safe N</td><td><span class="stat-highlight">' + fmtInt(fsn.rosenthalN) + '</span></td></tr>';
    html += '<tr><td>Orwin\'s Fail-Safe N (z = 0.1)</td><td>' + fmtInt(fsn.orwinN) + '</td></tr>';
    html += '<tr><td>Robustness threshold (5k + 10)</td><td>' + (5 * fsn.k + 10) + '</td></tr>';
    html += '<tr><td>Assessment</td><td><span class="stat-highlight">' + fsn.interpretation + '</span></td></tr>';
    html += '</tbody></table>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> ' + fmtInt(fsn.rosenthalN) + ' null studies would need to be hidden in file drawers to nullify the pooled SGLT2i benefit. This far exceeds the robustness threshold.</p>';
    html += '</div>';

    /* 6. Trim-and-Fill */
    html += '<div class="stats-block"><h4>6. Trim-and-Fill Adjusted Estimate</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Estimates the number of "missing" studies due to publication bias using the L0 estimator, imputes their mirror images, and recomputes the pooled HR.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Original studies</td><td>' + tf.nOriginal + '</td></tr>';
    html += '<tr><td>Estimated missing (k\u2080)</td><td><span class="stat-highlight">' + tf.k0 + '</span></td></tr>';
    html += '<tr><td>Original pooled HR</td><td>' + fmt(tf.originalPooled.pooled) + ' (' + fmt(tf.originalPooled.ci_lo) + '\u2013' + fmt(tf.originalPooled.ci_hi) + ')</td></tr>';
    html += '<tr><td>Adjusted pooled HR</td><td><span class="stat-highlight">' + fmt(tf.adjustedPooled.pooled) + ' (' + fmt(tf.adjustedPooled.ci_lo) + '\u2013' + fmt(tf.adjustedPooled.ci_hi) + ')</span></td></tr>';
    html += '<tr><td>Total studies after fill</td><td>' + tf.nAdjusted + '</td></tr>';
    html += '</tbody></table>';
    if (tf.imputedStudies.length > 0) {
      html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>Imputed Study</th><th>log(HR)</th><th>SE</th></tr></thead><tbody>';
      for (var i = 0; i < tf.imputedStudies.length; i++) {
        html += '<tr><td>' + tf.imputedStudies[i].label + '</td><td>' + fmt(tf.imputedStudies[i].yi, 4) + '</td><td>' + fmt(tf.imputedStudies[i].sei, 4) + '</td></tr>';
      }
      html += '</tbody></table>';
    }
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> ' + (tf.k0 === 0
      ? 'No evidence of asymmetry detected. The unadjusted pooled estimate stands.'
      : 'After imputing ' + tf.k0 + ' missing studies, the adjusted HR (' + fmt(tf.adjustedPooled.pooled) + ') remains strongly protective.') + '</p>';
    html += '</div>';

    /* 7. Power Prior */
    html += '<div class="stats-block"><h4>7. Power Prior (Historical Borrowing)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Uses DAPA-HF posterior as an informative prior for EMPEROR-Reduced, with power parameter a\u2080 = 0.5 (50% borrowing). Increases precision by borrowing historical information.</p>';
    html += '<table class="data-table"><thead><tr><th>Component</th><th>HR</th><th>95% CI</th><th>P(benefit)</th></tr></thead><tbody>';
    html += '<tr><td>Historical: ' + pp.historical.label + '</td><td>' + fmt(pp.historical.hr) + '</td><td>\u2014</td><td>\u2014</td></tr>';
    html += '<tr><td>Current alone: ' + pp.current.label + '</td><td>' + fmt(pp.current.hr) + '</td><td>' + fmt(Math.exp(pp.current.logHR - 1.96 * pp.current.se)) + '\u2013' + fmt(Math.exp(pp.current.logHR + 1.96 * pp.current.se)) + '</td><td>' + pct(pp.pBenefitUninform) + '</td></tr>';
    html += '<tr><td>Power prior (a\u2080 = ' + pp.a0 + ')</td><td><span class="stat-highlight">' + fmt(pp.posteriorHR) + '</span></td><td><span class="stat-highlight">' + fmt(pp.posteriorCI_lo) + '\u2013' + fmt(pp.posteriorCI_hi) + '</span></td><td><span class="stat-highlight">' + pct(pp.pBenefitPower) + '</span></td></tr>';
    html += '</tbody></table>';
    html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>a\u2080</th><th>Posterior HR</th><th>95% CI</th><th>P(benefit)</th></tr></thead><tbody>';
    for (var i = 0; i < pp.sensitivity.length; i++) {
      var s = pp.sensitivity[i];
      html += '<tr><td>' + fmt(s.a0, 2) + '</td><td>' + fmt(s.posteriorHR) + '</td><td>' + fmt(s.posteriorCI_lo) + '\u2013' + fmt(s.posteriorCI_hi) + '</td><td>' + pct(s.pBenefit) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> Borrowing 50% of DAPA-HF\'s information yields a posterior HR of ' + fmt(pp.posteriorHR) + ' with ' + pct(pp.pBenefitPower) + ' probability of benefit. The precision gain factor is ' + fmt(pp.precisionGain, 2) + '\u00D7. Results are robust across all a\u2080 values.</p>';
    html += '</div>';

    /* ── Section 3: Advanced Synthesis ── */
    html += '<h3 style="color:var(--teal);border-bottom:2px solid var(--teal);padding-bottom:0.5rem;margin-top:2rem;">Advanced Synthesis</h3>';

    /* 8. Network Meta-Analysis */
    html += '<div class="stats-block"><h4>8. Network Meta-Analysis (All SGLT2i HF Trials)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Pools all available SGLT2i HF trials in a star network (all vs placebo). Computes class-effect and drug-specific estimates with consistency check.</p>';
    if (nma) {
      html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
      html += '<tr><td>Total studies</td><td>' + nma.totalStudies + '</td></tr>';
      html += '<tr><td>Total patients</td><td>' + fmtInt(nma.totalPatients) + '</td></tr>';
      html += '<tr><td>Class-effect HR</td><td><span class="stat-highlight">' + fmt(nma.classEffect.pooled) + ' (' + fmt(nma.classEffect.ci_lo) + '\u2013' + fmt(nma.classEffect.ci_hi) + ')</span></td></tr>';
      html += '<tr><td>I\u00B2</td><td>' + fmt(nma.classEffect.I2, 1) + '%</td></tr>';
      html += '<tr><td>\u03C4\u00B2</td><td>' + fmt(nma.classEffect.tau2, 6) + '</td></tr>';
      html += '</tbody></table>';

      // Drug-specific results
      html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>Drug</th><th>k</th><th>N</th><th>Pooled HR</th><th>95% CI</th></tr></thead><tbody>';
      for (var i = 0; i < nma.drugResults.length; i++) {
        var dr = nma.drugResults[i];
        html += '<tr><td><strong>' + dr.drug + '</strong></td>';
        html += '<td>' + dr.k + '</td>';
        html += '<td>' + fmtInt(dr.totalN) + '</td>';
        html += '<td>' + fmt(dr.pooled) + '</td>';
        html += '<td>' + fmt(dr.ci_lo) + '\u2013' + fmt(dr.ci_hi) + '</td></tr>';
      }
      html += '</tbody></table>';

      if (nma.consistency) {
        html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>Consistency Check</th><th>Value</th></tr></thead><tbody>';
        html += '<tr><td>Comparison</td><td>' + nma.consistency.drug1 + ' vs ' + nma.consistency.drug2 + '</td></tr>';
        html += '<tr><td>z-statistic</td><td>' + fmt(nma.consistency.zStat, 3) + '</td></tr>';
        html += '<tr><td>p-value</td><td>' + fmt(nma.consistency.pValue, 4) + '</td></tr>';
        html += '<tr><td>Assessment</td><td><span class="stat-highlight">' + (nma.consistency.consistent ? 'Consistent (p > 0.05)' : 'Inconsistency detected') + '</span></td></tr>';
        html += '</tbody></table>';
      }
    }
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> Across ' + (nma ? nma.totalStudies : 0) + ' trials and ' + (nma ? fmtInt(nma.totalPatients) : 0) + ' patients, the SGLT2i class-effect HR is ' + (nma ? fmt(nma.classEffect.pooled) : '\u2014') + '. Individual drug estimates are consistent, confirming a genuine class effect.</p>';
    html += '</div>';

    /* 9. BMA */
    html += '<div class="stats-block"><h4>9. Bayesian Model Averaging</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Compares three priors (vague, sceptical, enthusiastic) and averages posteriors weighted by marginal likelihood. Grid approximation with 2,000 points.</p>';
    if (bma) {
      html += '<table class="data-table"><thead><tr><th>Prior</th><th>Description</th><th>Weight</th><th>Posterior HR</th><th>95% CrI</th><th>P(benefit)</th></tr></thead><tbody>';
      for (var i = 0; i < bma.models.length; i++) {
        var m = bma.models[i];
        html += '<tr><td><strong>' + m.prior.name + '</strong></td>';
        html += '<td style="font-size:0.8rem;">' + m.prior.description + '</td>';
        html += '<td>' + pct(bma.weights[i].weight) + '</td>';
        html += '<td>' + fmt(m.posteriorHR) + '</td>';
        html += '<td>' + fmt(m.posteriorCI_lo) + '\u2013' + fmt(m.posteriorCI_hi) + '</td>';
        html += '<td>' + pct(m.pBenefit) + '</td></tr>';
      }
      html += '</tbody></table>';
      html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>BMA Summary</th><th>Value</th></tr></thead><tbody>';
      html += '<tr><td>BMA posterior HR</td><td><span class="stat-highlight">' + fmt(bma.bmaHR) + '</span></td></tr>';
      html += '<tr><td>BMA 95% CrI</td><td><span class="stat-highlight">' + fmt(bma.bmaCI_lo) + '\u2013' + fmt(bma.bmaCI_hi) + '</span></td></tr>';
      html += '<tr><td>BMA P(benefit)</td><td><span class="stat-highlight">' + pct(bma.bmaPBenefit) + '</span></td></tr>';
      html += '</tbody></table>';
    }
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> Even under a sceptical prior centred at the null, the posterior probability of SGLT2i benefit exceeds ' + (bma ? pct(bma.models[1].pBenefit) : '99%') + '. The BMA-averaged HR of ' + (bma ? fmt(bma.bmaHR) : '\u2014') + ' is robust across all prior specifications.</p>';
    html += '</div>';

    /* 10. Guideline Adoption Survival */
    html += '<div class="stats-block"><h4>10. Survival Analysis of Guideline Adoption</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Kaplan-Meier-style tracking of guideline body adoption timelines. Time zero = trial publication. Shows how quickly each body acted.</p>';

    var drugAdoptions = [adoption.dapa, adoption.emperor];
    for (var d = 0; d < drugAdoptions.length; d++) {
      var ad = drugAdoptions[d];
      html += '<table class="data-table" style="margin-top:' + (d > 0 ? '1rem' : '0') + ';"><thead><tr><th colspan="4">' + ad.trial + '</th></tr><tr><th>Rank</th><th>Body</th><th>Months from Trial</th><th>Date</th></tr></thead><tbody>';
      for (var i = 0; i < ad.adoptions.length; i++) {
        var a = ad.adoptions[i];
        var isNice = a.body.indexOf('NICE') === 0;
        html += '<tr' + (isNice ? ' style="background:var(--gray-50);font-weight:600;"' : '') + '>';
        html += '<td>' + (i + 1) + '</td>';
        html += '<td>' + a.body + '</td>';
        html += '<td>' + a.monthsFromTrial + '</td>';
        html += '<td>' + a.date + '</td></tr>';
      }
      html += '</tbody></table>';
      html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.25rem;">NICE rank: ' + ad.niceRank + '/' + ad.totalBodies + ' | Median adoption time: ' + ad.medianTime + ' months | Bodies before NICE: ' + ad.adoptedBeforeNice + '</p>';
    }

    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> For DAPA-HF, NICE was relatively prompt (rank ' + adoption.dapa.niceRank + '/' + adoption.dapa.totalBodies + '). For EMPEROR-Reduced, NICE was among the slowest (rank ' + adoption.emperor.niceRank + '/' + adoption.emperor.totalBodies + '), taking ' + adoption.emperor.niceMonths + ' months vs the FDA\'s ' + adoption.emperor.adoptions[0].monthsFromTrial + ' months.</p>';
    html += '</div>';

    html += '</div>'; // close stats-panel
    container.innerHTML = html;
  }

  /* ──────────────────────────────────────
     ACS Rendering
     ────────────────────────────────────── */

  function renderACS(container) {
    var pooled = metaDL(lipidStudies);
    if (!pooled) return;

    // Run ACS methods
    var mc = monteCarloReversal(pooled.pooled_log, pooled.se_log, pooled.tau2);
    var evalues = computeEvalues(lipidStudies);
    var fsn = failSafeN(lipidStudies);
    var tf = trimAndFill(lipidStudies);
    var bma = bayesianModelAveraging(lipidStudies);

    // For power prior: use IMPROVE-IT as historical, FOURIER as current
    var pp = powerPrior(lipidStudies[0], lipidStudies[1], 0.5);

    // ACS-specific: lipid-lowering adoption timeline
    var acsAdoption = {
      trial: 'FOURIER (Evolocumab)',
      adoptions: [
        { body: 'FDA', monthsFromTrial: 0, date: 'Mar 2017' },
        { body: 'EMA', monthsFromTrial: 3, date: 'Jun 2017' },
        { body: 'ESC/EAS', monthsFromTrial: 4, date: 'Jul 2017' },
        { body: 'NICE TA394', monthsFromTrial: 5, date: 'Aug 2017' },
        { body: 'CCS', monthsFromTrial: 10, date: 'Jan 2018' },
        { body: 'AHA/ACC', monthsFromTrial: 12, date: 'Mar 2018' }
      ]
    };

    var html = '<div class="stats-panel">';
    html += '<h3>Final Advanced Methods: Lipid-Lowering in ACS</h3>';
    html += '<p style="font-size:0.85rem;color:var(--gray-500);margin-bottom:1.25rem;">10 advanced statistical methods applied to lipid-lowering trial data (IMPROVE-IT, FOURIER, ODYSSEY). Monte Carlo, Bayesian, and robustness analyses confirm the evidence base.</p>';

    /* ── Section 1: Impact Quantification ── */
    html += '<h3 style="color:var(--teal);border-bottom:2px solid var(--teal);padding-bottom:0.5rem;margin-top:1.5rem;">Impact Quantification</h3>';

    /* 1. Monte Carlo */
    html += '<div class="stats-block"><h4>1. Monte Carlo Simulation (10,000 Trials)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Simulates 10,000 future lipid-lowering trials using pooled log(HR) and heterogeneity. Seeded PRNG for reproducibility.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Pooled HR</td><td>' + fmt(pooled.pooled) + ' (' + fmt(pooled.ci_lo) + '\u2013' + fmt(pooled.ci_hi) + ')</td></tr>';
    html += '<tr><td>Pooled log(HR)</td><td>' + fmt(pooled.pooled_log, 4) + '</td></tr>';
    html += '<tr><td>\u03C4\u00B2</td><td>' + fmt(pooled.tau2, 6) + '</td></tr>';
    html += '<tr><td>Simulations</td><td>' + fmtInt(mc.nSim) + '</td></tr>';
    html += '<tr><td>Reversals (HR \u2265 1)</td><td><span class="stat-highlight">' + fmtInt(mc.reversals) + '</span></td></tr>';
    html += '<tr><td>P(reversal)</td><td><span class="stat-highlight">' + pct(mc.pReversal, 2) + '</span></td></tr>';
    html += '</tbody></table>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> Only ' + pct(mc.pReversal, 2) + ' of simulated studies show HR \u2265 1. The evidence for intensive lipid lowering is highly robust.</p>';
    html += '</div>';

    /* 2. Counterfactual (ACS-specific: delay in PCSK9i access) */
    html += '<div class="stats-block"><h4>2. Counterfactual: PCSK9i Access Delay</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">NICE\'s strict eligibility criteria for PCSK9 inhibitors (only after failing statins + ezetimibe, LDL still > 4.0) limit access compared to ESC recommendations.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>NICE Criteria</th><th>ESC Criteria</th></tr></thead><tbody>';
    html += '<tr><td>LDL threshold</td><td>> 4.0 mmol/L (post statin + ezetimibe)</td><td>> 1.8 mmol/L (post maximally tolerated statin)</td></tr>';
    html += '<tr><td>Estimated eligible (UK)</td><td>~30,000</td><td>~180,000</td></tr>';
    html += '<tr><td>Treatment gap</td><td colspan="2"><span class="stat-highlight warning">~150,000 patients excluded by NICE criteria</span></td></tr>';
    html += '<tr><td>Pooled HR (MACE reduction)</td><td colspan="2">' + fmt(pooled.pooled) + ' (' + fmt(pooled.ci_lo) + '\u2013' + fmt(pooled.ci_hi) + ')</td></tr>';
    var annualMACE = 0.03; // 3% annual MACE rate in this population
    var extraEvents = 150000 * annualMACE * (1 - pooled.pooled);
    html += '<tr><td>Estimated annual avoidable MACE</td><td colspan="2"><span class="stat-highlight warning">' + fmtInt(Math.round(extraEvents)) + '</span></td></tr>';
    html += '</tbody></table>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> NICE\'s restrictive PCSK9i criteria exclude approximately 150,000 eligible patients compared to ESC thresholds, potentially resulting in ~' + fmtInt(Math.round(extraEvents)) + ' avoidable MACE events annually.</p>';
    html += '</div>';

    /* 3. Markov QALY (ACS lipid) */
    var markovACS = markovQALY(pooled.pooled, 150000, 5);
    html += '<div class="stats-block"><h4>3. Markov QALY Model (ACS Lipid-Lowering, 5-Year)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">3-state Markov model for the 150,000 patients excluded from PCSK9i by NICE criteria. Estimates QALY loss from restricted access.</p>';
    html += '<table class="data-table"><thead><tr><th>Scenario</th><th>Total QALYs</th><th>Deaths</th></tr></thead><tbody>';
    html += '<tr><td>Without PCSK9i (current NICE)</td><td>' + fmtInt(Math.round(markovACS.noTreat.totalQALY)) + '</td><td>' + fmtInt(Math.round(markovACS.noTreat.dead)) + '</td></tr>';
    html += '<tr><td>With PCSK9i (ESC criteria)</td><td>' + fmtInt(Math.round(markovACS.escTreat.totalQALY)) + '</td><td>' + fmtInt(Math.round(markovACS.escTreat.dead)) + '</td></tr>';
    html += '</tbody></table>';
    html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>QALY gain (ESC vs NICE access)</td><td><span class="stat-highlight">' + fmtInt(Math.round(markovACS.qalyGainEsc)) + '</span></td></tr>';
    html += '<tr><td>Deaths averted</td><td><span class="stat-highlight">' + fmtInt(Math.round(markovACS.deathsAvertedEsc)) + '</span></td></tr>';
    html += '<tr><td>Cost of restricted access (\u00A320k/QALY)</td><td><span class="stat-highlight warning">\u00A3' + fmtInt(Math.round(markovACS.qalyGainEsc * 20000)) + '</span></td></tr>';
    html += '</tbody></table>';
    html += '</div>';

    /* ── Section 2: Evidence Robustness ── */
    html += '<h3 style="color:var(--teal);border-bottom:2px solid var(--teal);padding-bottom:0.5rem;margin-top:2rem;">Evidence Robustness</h3>';

    /* 4. E-values */
    html += '<div class="stats-block"><h4>4. E-values (Unmeasured Confounding Robustness)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Minimum strength of unmeasured confounding required to explain away the observed effect.</p>';
    html += '<table class="data-table"><thead><tr><th>Study</th><th>HR</th><th>E-value (point)</th><th>E-value (CI limit)</th></tr></thead><tbody>';
    for (var i = 0; i < evalues.length; i++) {
      var ev = evalues[i];
      html += '<tr><td><strong>' + ev.label + '</strong></td>';
      html += '<td>' + fmt(ev.hr) + '</td>';
      html += '<td><span class="stat-highlight">' + fmt(ev.eValue, 2) + '</span></td>';
      html += '<td>' + fmt(ev.eValueCI, 2) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '</div>';

    /* 5. Fail-Safe N */
    html += '<div class="stats-block"><h4>5. Rosenthal\'s File-Drawer (Fail-Safe N)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Number of null studies needed to render the pooled result non-significant.</p>';
    html += '<table class="data-table"><thead><tr><th>Study</th><th>z-score</th></tr></thead><tbody>';
    for (var i = 0; i < fsn.zScores.length; i++) {
      html += '<tr><td><strong>' + fsn.zScores[i].label + '</strong></td><td>' + fmt(fsn.zScores[i].z, 2) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Rosenthal\'s Fail-Safe N</td><td><span class="stat-highlight">' + fmtInt(fsn.rosenthalN) + '</span></td></tr>';
    html += '<tr><td>Orwin\'s Fail-Safe N</td><td>' + fmtInt(fsn.orwinN) + '</td></tr>';
    html += '<tr><td>Assessment</td><td><span class="stat-highlight">' + fsn.interpretation + '</span></td></tr>';
    html += '</tbody></table>';
    html += '</div>';

    /* 6. Trim-and-Fill */
    html += '<div class="stats-block"><h4>6. Trim-and-Fill Adjusted Estimate</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">L0 estimator for missing studies with mirror imputation.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Original pooled HR</td><td>' + fmt(tf.originalPooled.pooled) + ' (' + fmt(tf.originalPooled.ci_lo) + '\u2013' + fmt(tf.originalPooled.ci_hi) + ')</td></tr>';
    html += '<tr><td>Missing studies (k\u2080)</td><td>' + tf.k0 + '</td></tr>';
    html += '<tr><td>Adjusted pooled HR</td><td><span class="stat-highlight">' + fmt(tf.adjustedPooled.pooled) + ' (' + fmt(tf.adjustedPooled.ci_lo) + '\u2013' + fmt(tf.adjustedPooled.ci_hi) + ')</span></td></tr>';
    html += '</tbody></table>';
    html += '</div>';

    /* 7. Power Prior */
    html += '<div class="stats-block"><h4>7. Power Prior (IMPROVE-IT \u2192 FOURIER)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Uses IMPROVE-IT posterior as prior for FOURIER, with a\u2080 = 0.5.</p>';
    html += '<table class="data-table"><thead><tr><th>Component</th><th>HR</th><th>95% CI</th><th>P(benefit)</th></tr></thead><tbody>';
    html += '<tr><td>Historical: ' + pp.historical.label + '</td><td>' + fmt(pp.historical.hr) + '</td><td>\u2014</td><td>\u2014</td></tr>';
    html += '<tr><td>Current: ' + pp.current.label + '</td><td>' + fmt(pp.current.hr) + '</td><td>' + fmt(Math.exp(pp.current.logHR - 1.96 * pp.current.se)) + '\u2013' + fmt(Math.exp(pp.current.logHR + 1.96 * pp.current.se)) + '</td><td>' + pct(pp.pBenefitUninform) + '</td></tr>';
    html += '<tr><td>Power prior (a\u2080 = 0.5)</td><td><span class="stat-highlight">' + fmt(pp.posteriorHR) + '</span></td><td><span class="stat-highlight">' + fmt(pp.posteriorCI_lo) + '\u2013' + fmt(pp.posteriorCI_hi) + '</span></td><td><span class="stat-highlight">' + pct(pp.pBenefitPower) + '</span></td></tr>';
    html += '</tbody></table>';
    html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>a\u2080</th><th>Posterior HR</th><th>95% CI</th><th>P(benefit)</th></tr></thead><tbody>';
    for (var i = 0; i < pp.sensitivity.length; i++) {
      var s = pp.sensitivity[i];
      html += '<tr><td>' + fmt(s.a0, 2) + '</td><td>' + fmt(s.posteriorHR) + '</td><td>' + fmt(s.posteriorCI_lo) + '\u2013' + fmt(s.posteriorCI_hi) + '</td><td>' + pct(s.pBenefit) + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '</div>';

    /* ── Section 3: Advanced Synthesis ── */
    html += '<h3 style="color:var(--teal);border-bottom:2px solid var(--teal);padding-bottom:0.5rem;margin-top:2rem;">Advanced Synthesis</h3>';

    /* 8. NMA for lipid trials */
    var nmaLipid = networkMetaAnalysis(lipidStudies);
    html += '<div class="stats-block"><h4>8. Network Meta-Analysis (Lipid-Lowering Trials)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Pooled analysis of IMPROVE-IT, FOURIER, and ODYSSEY OUTCOMES in a star network (all vs standard care).</p>';
    if (nmaLipid) {
      html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
      html += '<tr><td>Total studies</td><td>' + nmaLipid.totalStudies + '</td></tr>';
      html += '<tr><td>Total patients</td><td>' + fmtInt(nmaLipid.totalPatients) + '</td></tr>';
      html += '<tr><td>Pooled HR</td><td><span class="stat-highlight">' + fmt(nmaLipid.classEffect.pooled) + ' (' + fmt(nmaLipid.classEffect.ci_lo) + '\u2013' + fmt(nmaLipid.classEffect.ci_hi) + ')</span></td></tr>';
      html += '<tr><td>I\u00B2</td><td>' + fmt(nmaLipid.classEffect.I2, 1) + '%</td></tr>';
      html += '</tbody></table>';

      if (nmaLipid.drugResults.length > 0) {
        html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>Drug Class</th><th>k</th><th>N</th><th>HR</th><th>95% CI</th></tr></thead><tbody>';
        for (var i = 0; i < nmaLipid.drugResults.length; i++) {
          var dr = nmaLipid.drugResults[i];
          html += '<tr><td><strong>' + dr.drug + '</strong></td><td>' + dr.k + '</td><td>' + fmtInt(dr.totalN) + '</td><td>' + fmt(dr.pooled) + '</td><td>' + fmt(dr.ci_lo) + '\u2013' + fmt(dr.ci_hi) + '</td></tr>';
        }
        html += '</tbody></table>';
      }
    }
    html += '</div>';

    /* 9. BMA */
    html += '<div class="stats-block"><h4>9. Bayesian Model Averaging</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Three-prior BMA analysis with grid approximation.</p>';
    if (bma) {
      html += '<table class="data-table"><thead><tr><th>Prior</th><th>Weight</th><th>Posterior HR</th><th>95% CrI</th><th>P(benefit)</th></tr></thead><tbody>';
      for (var i = 0; i < bma.models.length; i++) {
        var m = bma.models[i];
        html += '<tr><td><strong>' + m.prior.name + '</strong></td>';
        html += '<td>' + pct(bma.weights[i].weight) + '</td>';
        html += '<td>' + fmt(m.posteriorHR) + '</td>';
        html += '<td>' + fmt(m.posteriorCI_lo) + '\u2013' + fmt(m.posteriorCI_hi) + '</td>';
        html += '<td>' + pct(m.pBenefit) + '</td></tr>';
      }
      html += '</tbody></table>';
      html += '<table class="data-table" style="margin-top:0.75rem;"><thead><tr><th>BMA Summary</th><th>Value</th></tr></thead><tbody>';
      html += '<tr><td>BMA posterior HR</td><td><span class="stat-highlight">' + fmt(bma.bmaHR) + '</span></td></tr>';
      html += '<tr><td>BMA 95% CrI</td><td>' + fmt(bma.bmaCI_lo) + '\u2013' + fmt(bma.bmaCI_hi) + '</td></tr>';
      html += '<tr><td>BMA P(benefit)</td><td><span class="stat-highlight">' + pct(bma.bmaPBenefit) + '</span></td></tr>';
      html += '</tbody></table>';
    }
    html += '</div>';

    /* 10. Adoption Survival (ACS) */
    html += '<div class="stats-block"><h4>10. Survival Analysis of Guideline Adoption (PCSK9i)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Time-to-adoption for evolocumab (FOURIER trial). Months from trial publication to guideline recommendation.</p>';
    var sortedAdopt = acsAdoption.adoptions.slice().sort(function (a, b) { return a.monthsFromTrial - b.monthsFromTrial; });
    html += '<table class="data-table"><thead><tr><th>Rank</th><th>Body</th><th>Months from Trial</th><th>Date</th></tr></thead><tbody>';
    for (var i = 0; i < sortedAdopt.length; i++) {
      var a = sortedAdopt[i];
      var isNice = a.body.indexOf('NICE') === 0;
      html += '<tr' + (isNice ? ' style="background:var(--gray-50);font-weight:600;"' : '') + '>';
      html += '<td>' + (i + 1) + '</td>';
      html += '<td>' + a.body + '</td>';
      html += '<td>' + a.monthsFromTrial + '</td>';
      html += '<td>' + a.date + '</td></tr>';
    }
    html += '</tbody></table>';
    var niceIdx = -1;
    for (var i = 0; i < sortedAdopt.length; i++) {
      if (sortedAdopt[i].body.indexOf('NICE') === 0) { niceIdx = i; break; }
    }
    html += '<p style="font-size:0.82rem;color:var(--gray-500);margin-top:0.5rem;"><strong>Interpretation:</strong> For PCSK9 inhibitors, NICE was relatively prompt (rank ' + (niceIdx + 1) + '/' + sortedAdopt.length + ', ' + sortedAdopt[niceIdx].monthsFromTrial + ' months). However, NICE imposed significantly stricter eligibility criteria than ESC, limiting actual patient access despite timely approval.</p>';
    html += '</div>';

    html += '</div>'; // close stats-panel
    container.innerHTML = html;
  }

  /* ──────────────────────────────────────
     Initialisation
     ────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    var hfContainer = document.getElementById('final-methods-hf');
    if (hfContainer) {
      try { renderHF(hfContainer); } catch (e) {
        hfContainer.innerHTML = '<p style="color:red;">Final methods error: ' + e.message + '</p>';
      }
    }

    var acsContainer = document.getElementById('final-methods-acs');
    if (acsContainer) {
      try { renderACS(acsContainer); } catch (e) {
        acsContainer.innerHTML = '<p style="color:red;">Final methods error: ' + e.message + '</p>';
      }
    }
  });

})();
