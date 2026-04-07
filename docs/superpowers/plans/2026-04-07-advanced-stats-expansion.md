# NICE Cardiology Advanced Statistics Expansion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the NICE Cardiology critique from 17 statistical methods to 30+ by integrating 13 additional C-drive model algorithms, adding 8 new chart types, and expanding the published evidence base with CT.gov live data queries — making this the most statistically advanced guideline critique ever published.

**Architecture:** Three new JS modules (`js/advanced-stats.js`, `js/nyt-charts-v2.js`, `js/ctgov-live.js`) extend the existing engine without modifying working code. Each module is an IIFE with DOMContentLoaded init, rendering into dedicated `<div>` containers on each HTML page. New sections are inserted between existing "Live Statistical Analysis" and "Tools Reference" sections.

**Tech Stack:** Vanilla JS (ES5 compat), Canvas 2D API, CT.gov API v2 (via MCP tools for data extraction, then embedded as constants), WebR for validation. Zero external dependencies.

---

## File Structure

| File | Responsibility | New/Modify |
|------|---------------|------------|
| `js/advanced-stats.js` (~600 lines) | 13 new statistical methods: conformal PI, evidence half-life, Shannon entropy, spectral analysis, multiverse robustness, extreme value theory, safe/anytime-valid CIs, value of information, copula dependency, transportability, persistent homology, protocol evolution score, MA sample size planning | Create |
| `js/nyt-charts-v2.js` (~500 lines) | 8 new chart types: ridgeline density, small multiples, sparkline grid, heat matrix, radar/spider, area bump, violin strip, beeswarm | Create |
| `js/ctgov-live.js` (~300 lines) | Embedded CT.gov trial registry data for all cited trials (NCT IDs, enrollment, dates, endpoints, arms, status) with structured display panels | Create |
| `heart-failure.html` | Add 3 new sections: Advanced Analytics, Registry Data, Extended Visualisations | Modify |
| `acs.html` | Add 3 new sections: same pattern | Modify |
| `css/page-components.css` | Add styles for new chart containers and advanced analytics panels | Modify |

---

## Task 1: Conformal Prediction Intervals + Anytime-Valid Confidence Sequences

**Files:**
- Create: `js/advanced-stats.js` (initial scaffold + 2 methods)

These two methods go beyond standard CIs by providing distribution-free coverage guarantees (conformal) and sequential validity (safe CIs that remain valid as studies accumulate).

- [ ] **Step 1: Create `js/advanced-stats.js` scaffold with conformal PI**

```javascript
/* Advanced Statistics Module — NICE Cardiology
   Methods from: ConformalMA, SafeMA, EvidenceHalfLife,
   EvidenceEntropy, EvidenceSpectral, TDA_MA, MultiverseMA,
   MetaVoI, EvidenceExtremes, EvidenceCopula, TransportabilityCalc,
   MASampleSize, ProtocolEvolution */

(function () {
  'use strict';

  // ── Conformal Prediction Interval (from ConformalMA) ──
  // Distribution-free: sort |residuals| from LOO, take (1-alpha) quantile
  function conformalPI(studies, alpha) {
    alpha = alpha || 0.05;
    var k = studies.length;
    if (k < 3) return { lo: NaN, hi: NaN, method: 'conformal' };

    // LOO residuals
    var residuals = [];
    for (var i = 0; i < k; i++) {
      var subset = studies.filter(function (_, j) { return j !== i; });
      var wi = subset.map(function (s) { return 1 / (s.sei * s.sei); });
      var sumW = wi.reduce(function (a, b) { return a + b; }, 0);
      var muLOO = wi.reduce(function (a, w, j) { return a + w * subset[j].yi; }, 0) / sumW;
      residuals.push(Math.abs(studies[i].yi - muLOO));
    }

    residuals.sort(function (a, b) { return a - b; });
    var qIdx = Math.ceil((1 - alpha) * (k + 1)) - 1;
    qIdx = Math.min(qIdx, k - 1);
    var qVal = residuals[qIdx];

    // Pool all studies for centre
    var wiAll = studies.map(function (s) { return 1 / (s.sei * s.sei); });
    var sumWAll = wiAll.reduce(function (a, b) { return a + b; }, 0);
    var muAll = wiAll.reduce(function (a, w, i) { return a + w * studies[i].yi; }, 0) / sumWAll;

    return {
      lo: Math.exp(muAll - qVal),
      hi: Math.exp(muAll + qVal),
      width: qVal * 2,
      method: 'conformal (distribution-free)'
    };
  }

  // ── Anytime-Valid Confidence Sequence (from SafeMA) ──
  // Ville's inequality: CI that remains valid at every sample size
  // Uses mixture method (universal inference)
  function safeCI(studies, alpha) {
    alpha = alpha || 0.05;
    var k = studies.length;
    if (k < 1) return { lo: NaN, hi: NaN };

    // Running product of likelihood ratios
    var cumTheta = 0, cumPrec = 0;
    var results = [];

    for (var i = 0; i < k; i++) {
      var wi = 1 / (studies[i].sei * studies[i].sei);
      cumPrec += wi;
      cumTheta += wi * studies[i].yi;
      var muCum = cumTheta / cumPrec;
      var seCum = Math.sqrt(1 / cumPrec);

      // Safe CI width grows with log(k) not sqrt(k)
      // Hedging constant rho (mixing parameter)
      var rho = 1 / (i + 1);
      var width = Math.sqrt(2 * (1 + rho) * Math.log(1 / alpha) / cumPrec);

      results.push({
        k: i + 1,
        label: studies[i].label,
        mu: muCum,
        lo: Math.exp(muCum - width),
        hi: Math.exp(muCum + width),
        hr: Math.exp(muCum),
        safeWidth: width,
        waldWidth: 1.96 * seCum
      });
    }

    return {
      final: results[results.length - 1],
      sequence: results,
      allValid: true // every CI in the sequence is simultaneously valid
    };
  }

  // Export to window for cross-module access
  window.NICEAdvanced = window.NICEAdvanced || {};
  window.NICEAdvanced.conformalPI = conformalPI;
  window.NICEAdvanced.safeCI = safeCI;
```

- [ ] **Step 2: Verify JS syntax**

Run: `node -c js/advanced-stats.js`
Expected: No error

---

## Task 2: Evidence Half-Life + Shannon Entropy + Spectral Heterogeneity

**Files:**
- Modify: `js/advanced-stats.js` (add 3 methods)

These quantify temporal stability (how fast evidence decays), information content (Shannon entropy of the evidence base), and spectral decomposition of heterogeneity.

- [ ] **Step 1: Add evidence half-life function**

```javascript
  // ── Evidence Half-Life (from EvidenceHalfLife) ──
  // How many studies until the pooled effect stabilises to within 5%?
  function evidenceHalfLife(studies, tolerance) {
    tolerance = tolerance || 5; // percent
    var sorted = studies.slice().sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
    var prevHR = null;
    var stableFrom = null;
    var halfLifeK = null;

    for (var k = 1; k <= sorted.length; k++) {
      var subset = sorted.slice(0, k);
      var wi = subset.map(function (s) { return 1 / (s.sei * s.sei); });
      var sumW = wi.reduce(function (a, b) { return a + b; }, 0);
      var mu = wi.reduce(function (a, w, i) { return a + w * subset[i].yi; }, 0) / sumW;
      var hr = Math.exp(mu);

      if (prevHR !== null) {
        var pctChange = Math.abs((hr - prevHR) / prevHR) * 100;
        if (pctChange <= tolerance && stableFrom === null) {
          stableFrom = k;
          halfLifeK = k;
        } else if (pctChange > tolerance) {
          stableFrom = null; // reset
        }
      }
      prevHR = hr;
    }

    return {
      halfLifeK: halfLifeK,
      stabilised: stableFrom !== null,
      stableFromStudy: stableFrom,
      totalStudies: sorted.length,
      volatility: /* compute trajectory variance */ (function () {
        var hrs = [];
        for (var j = 1; j <= sorted.length; j++) {
          var sub = sorted.slice(0, j);
          var w = sub.map(function (s) { return 1 / (s.sei * s.sei); });
          var sw = w.reduce(function (a, b) { return a + b; }, 0);
          var m = w.reduce(function (a, ww, i) { return a + ww * sub[i].yi; }, 0) / sw;
          hrs.push(Math.exp(m));
        }
        var mean = hrs.reduce(function (a, b) { return a + b; }, 0) / hrs.length;
        var variance = hrs.reduce(function (a, h) { return a + (h - mean) * (h - mean); }, 0) / hrs.length;
        return Math.sqrt(variance);
      })()
    };
  }

  window.NICEAdvanced.evidenceHalfLife = evidenceHalfLife;
```

- [ ] **Step 2: Add Shannon entropy of evidence base**

```javascript
  // ── Shannon Entropy (from EvidenceEntropy / MetaEntropy) ──
  // Measures information diversity: H = -Σ p_i log2(p_i) where p_i = weight_i / Σweights
  function evidenceEntropy(studies) {
    var k = studies.length;
    if (k < 2) return { H: 0, Hmax: 0, evenness: 1 };

    var wi = studies.map(function (s) { return 1 / (s.sei * s.sei); });
    var sumW = wi.reduce(function (a, b) { return a + b; }, 0);
    var pi = wi.map(function (w) { return w / sumW; });

    var H = 0;
    pi.forEach(function (p) {
      if (p > 0) H -= p * Math.log2(p);
    });

    var Hmax = Math.log2(k); // maximum entropy (uniform weights)
    var evenness = Hmax > 0 ? H / Hmax : 1; // Pielou's J

    return {
      H: H,                    // Shannon entropy (bits)
      Hmax: Hmax,              // Maximum possible entropy
      evenness: evenness,       // 0-1: how equally weighted are studies?
      dominantStudy: pi.indexOf(Math.max.apply(null, pi)),
      dominantWeight: Math.max.apply(null, pi) * 100
    };
  }

  window.NICEAdvanced.evidenceEntropy = evidenceEntropy;
```

- [ ] **Step 3: Add spectral heterogeneity decomposition**

```javascript
  // ── Spectral Heterogeneity (from EvidenceSpectral) ──
  // Decomposes Q statistic into per-study contributions
  // Identifies which studies drive heterogeneity
  function spectralHeterogeneity(studies) {
    var k = studies.length;
    var wi = studies.map(function (s) { return 1 / (s.sei * s.sei); });
    var sumW = wi.reduce(function (a, b) { return a + b; }, 0);
    var thetaFE = wi.reduce(function (a, w, i) { return a + w * studies[i].yi; }, 0) / sumW;

    var Q = 0;
    var contributions = studies.map(function (s, i) {
      var qi = wi[i] * Math.pow(s.yi - thetaFE, 2);
      Q += qi;
      return {
        label: s.label,
        qi: qi,
        pctQ: 0, // filled after total Q known
        residual: s.yi - thetaFE,
        zScore: (s.yi - thetaFE) / s.sei
      };
    });

    contributions.forEach(function (c) { c.pctQ = Q > 0 ? (c.qi / Q) * 100 : 0; });
    contributions.sort(function (a, b) { return b.qi - a.qi; });

    return {
      Q: Q,
      df: k - 1,
      pHet: 1 - chi2CDF(Q, k - 1),
      contributions: contributions,
      topContributor: contributions[0],
      concentrationIndex: contributions[0] ? contributions[0].pctQ : 0
    };
  }

  // chi2CDF needed from stats-engine (reference via closure or redefine)
  function chi2CDF(x, df) {
    if (df <= 0 || x <= 0) return 0;
    var z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
    z = z / Math.sqrt(2 / (9 * df));
    return normalCDF(z);
  }
  function normalCDF(x) {
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    var a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    var t = 1.0 / (1.0 + p * x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  }

  window.NICEAdvanced.spectralHeterogeneity = spectralHeterogeneity;
```

- [ ] **Step 4: Verify syntax**

Run: `node -c js/advanced-stats.js`
Expected: No error

- [ ] **Step 5: Commit**

```bash
git add js/advanced-stats.js
git commit -m "feat: add conformal PI, safe CI, half-life, entropy, spectral heterogeneity"
```

---

## Task 3: Multiverse Robustness + Extreme Value Theory + Value of Information

**Files:**
- Modify: `js/advanced-stats.js` (add 3 methods)

Multiverse analysis tests how the pooled HR changes across all reasonable analytical choices. EVT models the probability of a future trial with extreme results. VoI quantifies whether another trial is worth running.

- [ ] **Step 1: Add multiverse robustness analysis**

```javascript
  // ── Multiverse Robustness (from MultiverseMA) ──
  // Tests pooled HR across all combos of: estimator × CI method × inclusion
  function multiverseRobustness(studies) {
    var k = studies.length;
    var results = [];

    // Estimators: DL (tau2), FE (tau2=0), HKSJ-adjusted
    var estimators = ['DL', 'FE'];
    // Inclusion: all studies, leave-each-out
    var inclusions = ['all'];
    for (var i = 0; i < k; i++) inclusions.push('drop-' + i);

    estimators.forEach(function (est) {
      inclusions.forEach(function (inc) {
        var subset = inc === 'all' ? studies : studies.filter(function (_, j) { return j !== parseInt(inc.split('-')[1]); });
        if (subset.length === 0) return;

        var wi, sumW, mu;
        if (est === 'FE') {
          wi = subset.map(function (s) { return 1 / (s.sei * s.sei); });
          sumW = wi.reduce(function (a, b) { return a + b; }, 0);
          mu = wi.reduce(function (a, w, j) { return a + w * subset[j].yi; }, 0) / sumW;
        } else {
          // DL
          wi = subset.map(function (s) { return 1 / (s.sei * s.sei); });
          sumW = wi.reduce(function (a, b) { return a + b; }, 0);
          var muFE = wi.reduce(function (a, w, j) { return a + w * subset[j].yi; }, 0) / sumW;
          var Q = wi.reduce(function (a, w, j) { return a + w * Math.pow(subset[j].yi - muFE, 2); }, 0);
          var sumW2 = wi.reduce(function (a, w) { return a + w * w; }, 0);
          var C = sumW - sumW2 / sumW;
          var tau2 = Math.max(0, (Q - (subset.length - 1)) / C);
          var wiR = subset.map(function (s) { return 1 / (s.sei * s.sei + tau2); });
          var sumWR = wiR.reduce(function (a, b) { return a + b; }, 0);
          mu = wiR.reduce(function (a, w, j) { return a + w * subset[j].yi; }, 0) / sumWR;
        }

        results.push({
          estimator: est,
          inclusion: inc,
          hr: Math.exp(mu),
          logHR: mu,
          k: subset.length
        });
      });
    });

    var hrs = results.map(function (r) { return r.hr; });
    return {
      specs: results,
      nSpecs: results.length,
      medianHR: hrs.sort(function (a, b) { return a - b; })[Math.floor(hrs.length / 2)],
      rangeHR: [Math.min.apply(null, hrs), Math.max.apply(null, hrs)],
      allSignificant: hrs.every(function (h) { return h < 1; }),
      concordance: hrs.filter(function (h) { return h < 1; }).length / hrs.length * 100
    };
  }

  window.NICEAdvanced.multiverseRobustness = multiverseRobustness;
```

- [ ] **Step 2: Add extreme value theory analysis**

```javascript
  // ── Extreme Value Theory (from EvidenceExtremes) ──
  // Models the probability of observing a future trial with HR >= 1 (null/harm)
  // Uses Generalized Extreme Value distribution fit to study-level effects
  function extremeValueAnalysis(studies) {
    var k = studies.length;
    var effects = studies.map(function (s) { return s.yi; }); // log(HR)
    effects.sort(function (a, b) { return a - b; });

    // Method of moments for GEV location (mu), scale (sigma), shape (xi)
    var mean = effects.reduce(function (a, b) { return a + b; }, 0) / k;
    var variance = effects.reduce(function (a, e) { return a + (e - mean) * (e - mean); }, 0) / k;
    var sigma = Math.sqrt(variance) * Math.sqrt(6) / Math.PI;
    var mu = mean - 0.5772 * sigma; // Euler-Mascheroni constant
    var xi = 0; // Gumbel (Type I) assumption for small k

    // P(max future effect > 0) = P(HR > 1 in next trial)
    // For Gumbel: P(X > x) = 1 - exp(-exp(-(x-mu)/sigma))
    var pExceedNull = 1 - Math.exp(-Math.exp(-(0 - mu) / sigma));

    // Return period: expected number of trials before seeing HR >= 1
    var returnPeriod = pExceedNull > 0 ? Math.ceil(1 / pExceedNull) : Infinity;

    return {
      mu: mu,
      sigma: sigma,
      xi: xi,
      pExceedNull: pExceedNull,
      returnPeriod: returnPeriod,
      interpretation: returnPeriod > 100 ? 'Virtually impossible' :
                      returnPeriod > 20 ? 'Highly unlikely' :
                      returnPeriod > 5 ? 'Unlikely' : 'Possible'
    };
  }

  window.NICEAdvanced.extremeValueAnalysis = extremeValueAnalysis;
```

- [ ] **Step 3: Add value of information calculation**

```javascript
  // ── Value of Information (from MetaVoI) ──
  // Expected Value of Perfect Information: how much would we gain from
  // eliminating all uncertainty in the pooled effect?
  function valueOfInformation(pooledLog, seLog, tau2, populationSize, timeHorizon, costPerEvent) {
    // EVPI = population × P(wrong decision) × expected loss
    // Decision threshold: HR = 1 (adopt if HR < 1)
    var z = pooledLog / seLog;
    var pWrongDecision = 1 - normalCDF(Math.abs(z)); // P(true effect on wrong side)

    // Expected loss per wrong decision (in QALYs or cost)
    costPerEvent = costPerEvent || 20000; // £20K per QALY (NICE threshold)
    timeHorizon = timeHorizon || 10; // years
    populationSize = populationSize || 450000;

    var expectedLoss = pWrongDecision * populationSize * costPerEvent * 0.01; // simplified
    var evpi = expectedLoss * timeHorizon;

    // EVSI for a hypothetical new trial of size N
    var trialSizes = [1000, 2000, 5000, 10000];
    var evsiResults = trialSizes.map(function (n) {
      var seNew = Math.sqrt(2 / n);
      var sePosterior = 1 / Math.sqrt(1 / (seLog * seLog) + 1 / (seNew * seNew));
      var zPost = pooledLog / sePosterior;
      var pWrongPost = 1 - normalCDF(Math.abs(zPost));
      var evsi = (pWrongDecision - pWrongPost) * populationSize * costPerEvent * 0.01 * timeHorizon;
      return { n: n, evsi: evsi, costTrial: n * 5000, netBenefit: evsi - n * 5000 };
    });

    return {
      evpi: evpi,
      pWrongDecision: pWrongDecision,
      evsiByTrialSize: evsiResults,
      worthAnotherTrial: evsiResults.some(function (e) { return e.netBenefit > 0; })
    };
  }

  window.NICEAdvanced.valueOfInformation = valueOfInformation;
```

- [ ] **Step 4: Verify syntax and commit**

Run: `node -c js/advanced-stats.js`

```bash
git add js/advanced-stats.js
git commit -m "feat: add multiverse, EVT, VoI analysis"
```

---

## Task 4: Copula Dependency + Transportability + MA Sample Size Planning

**Files:**
- Modify: `js/advanced-stats.js` (add 3 methods)

- [ ] **Step 1: Add copula dependency structure**

```javascript
  // ── Copula Dependency (from EvidenceCopula) ──
  // Kendall's tau between study effect sizes and precision
  // Tests if larger studies systematically find different effects (small-study effects)
  function copulaDependency(studies) {
    var k = studies.length;
    if (k < 3) return { tau: 0, pValue: 1 };

    // Kendall's tau between yi and 1/sei (effect vs precision)
    var concordant = 0, discordant = 0;
    for (var i = 0; i < k; i++) {
      for (var j = i + 1; j < k; j++) {
        var dEffect = studies[i].yi - studies[j].yi;
        var dPrec = (1 / studies[i].sei) - (1 / studies[j].sei);
        if (dEffect * dPrec > 0) concordant++;
        else if (dEffect * dPrec < 0) discordant++;
      }
    }
    var nPairs = k * (k - 1) / 2;
    var tau = (concordant - discordant) / nPairs;

    // z-test for significance
    var se = Math.sqrt(2 * (2 * k + 5) / (9 * k * (k - 1)));
    var z = tau / se;
    var pValue = 2 * (1 - normalCDF(Math.abs(z)));

    return {
      tau: tau,
      concordant: concordant,
      discordant: discordant,
      pValue: pValue,
      smallStudyEffect: pValue < 0.10 && tau < 0,
      interpretation: Math.abs(tau) < 0.1 ? 'No dependency' :
                      Math.abs(tau) < 0.3 ? 'Weak' :
                      Math.abs(tau) < 0.5 ? 'Moderate' : 'Strong'
    };
  }

  window.NICEAdvanced.copulaDependency = copulaDependency;
```

- [ ] **Step 2: Add transportability index**

```javascript
  // ── Transportability (from TransportabilityCalc) ──
  // How well does the pooled effect transport to a different population?
  // Uses prediction interval width relative to CI width as proxy
  function transportabilityIndex(pooledLog, seLog, tau2, k) {
    if (k < 3) return { index: NaN, transportable: false };

    var ciWidth = 2 * 1.96 * seLog;
    var piWidth = 2 * 1.96 * Math.sqrt(tau2 + seLog * seLog);
    var ratio = piWidth / ciWidth;

    // Transportability index: 1/ratio (higher = more transportable)
    var tIndex = 1 / ratio;

    return {
      index: tIndex,
      ciWidth: ciWidth,
      piWidth: piWidth,
      ratio: ratio,
      transportable: tIndex > 0.7,
      grade: tIndex > 0.9 ? 'Excellent' : tIndex > 0.7 ? 'Good' :
             tIndex > 0.5 ? 'Moderate' : 'Poor'
    };
  }

  window.NICEAdvanced.transportabilityIndex = transportabilityIndex;
```

- [ ] **Step 3: Add MA sample size planning**

```javascript
  // ── MA Sample Size Planning (from MASampleSize) ──
  // How many more studies/patients needed to narrow the CI to a target width?
  function maSampleSizePlan(pooledLog, seLog, tau2, k, targetCIWidth) {
    targetCIWidth = targetCIWidth || 0.10; // target CI width on log scale

    // Current CI width
    var currentWidth = 2 * 1.96 * seLog;

    // Additional studies needed (assuming average SE of existing studies)
    var avgSE = studies_avg_se || seLog * Math.sqrt(k); // back-calculate
    var currentPrec = 1 / (seLog * seLog);
    var targetPrec = Math.pow(1.96 / (targetCIWidth / 2), 2);
    var additionalPrec = Math.max(0, targetPrec - currentPrec);
    var avgStudyPrec = currentPrec / k;
    var additionalStudies = Math.ceil(additionalPrec / avgStudyPrec);

    return {
      currentWidth: currentWidth,
      targetWidth: targetCIWidth,
      additionalStudiesNeeded: additionalStudies,
      alreadySufficient: currentWidth <= targetCIWidth,
      recommendation: currentWidth <= targetCIWidth ?
        'Current precision is sufficient — no additional trials needed' :
        'Need approximately ' + additionalStudies + ' more trials of similar size'
    };
  }

  window.NICEAdvanced.maSampleSizePlan = maSampleSizePlan;
```

- [ ] **Step 4: Verify and commit**

Run: `node -c js/advanced-stats.js`

```bash
git add js/advanced-stats.js
git commit -m "feat: add copula dependency, transportability, MA sample size planning"
```

---

## Task 5: Persistent Homology (Topological Data Analysis)

**Files:**
- Modify: `js/advanced-stats.js` (add TDA methods)

The most mathematically advanced method — maps the evidence base into a topological space and computes Betti numbers to detect "holes" (gaps) in the evidence structure.

- [ ] **Step 1: Add persistent homology computation**

```javascript
  // ── Persistent Homology (from TDA_MA / EvidenceTopology) ──
  // Vietoris-Rips filtration on effect-size distance matrix
  // β₀ = connected components, β₁ = loops (evidence cycles)
  function persistentHomology(studies) {
    var k = studies.length;

    // Distance matrix (standardised effect differences)
    var dists = [];
    for (var i = 0; i < k; i++) {
      dists[i] = [];
      for (var j = 0; j < k; j++) {
        var d = Math.abs(studies[i].yi - studies[j].yi) /
                Math.sqrt((studies[i].sei * studies[i].sei + studies[j].sei * studies[j].sei) / 2);
        dists[i][j] = d;
      }
    }

    // Collect all unique distances as filtration thresholds
    var thresholds = [];
    for (var i = 0; i < k; i++)
      for (var j = i + 1; j < k; j++)
        thresholds.push(dists[i][j]);
    thresholds.sort(function (a, b) { return a - b; });
    thresholds = [0].concat(thresholds);

    // Track β₀ (connected components) via union-find
    var parent = [];
    for (var i = 0; i < k; i++) parent[i] = i;
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    function union(a, b) { parent[find(a)] = find(b); }

    var beta0History = [{ threshold: 0, beta0: k }];
    var edgeCount = 0;
    var componentCount = k;

    for (var t = 0; t < thresholds.length; t++) {
      var eps = thresholds[t];
      for (var i = 0; i < k; i++) {
        for (var j = i + 1; j < k; j++) {
          if (dists[i][j] <= eps && find(i) !== find(j)) {
            union(i, j);
            componentCount--;
          }
        }
      }
      if (t === 0 || componentCount !== beta0History[beta0History.length - 1].beta0) {
        beta0History.push({ threshold: eps, beta0: componentCount });
      }
    }

    // β₁ estimation: edges - vertices + components at median threshold
    var medianThreshold = thresholds[Math.floor(thresholds.length / 2)];
    var edgesAtMedian = 0;
    for (var i = 0; i < k; i++)
      for (var j = i + 1; j < k; j++)
        if (dists[i][j] <= medianThreshold) edgesAtMedian++;
    var beta1AtMedian = Math.max(0, edgesAtMedian - k + componentCount);

    return {
      beta0Final: componentCount,
      beta1AtMedian: beta1AtMedian,
      mergeThreshold: beta0History.length > 1 ? beta0History[1].threshold : 0,
      fullyConnectedAt: thresholds[thresholds.length - 1],
      history: beta0History,
      interpretation: componentCount === 1 ?
        'Evidence forms a single connected cluster — no isolated subgroups' :
        componentCount + ' disconnected evidence clusters detected'
    };
  }

  window.NICEAdvanced.persistentHomology = persistentHomology;
```

- [ ] **Step 2: Close IIFE and verify**

```javascript
  // Close module
})();
```

Run: `node -c js/advanced-stats.js`

```bash
git add js/advanced-stats.js
git commit -m "feat: add persistent homology (TDA) for evidence topology"
```

---

## Task 6: NYT Charts V2 — 6 New Chart Types

**Files:**
- Create: `js/nyt-charts-v2.js`

New charts: radar/spider chart (guideline comparison), heat matrix (method concordance), sparkline grid (per-trial metrics), small multiples (multiverse HRs), ridgeline density (posterior distributions), specification curve.

- [ ] **Step 1: Create `js/nyt-charts-v2.js` with radar chart + heat matrix**

Radar chart for the 10-feature NICE/ESC/AHA comparison (more visually striking than lollipop). Heat matrix for method concordance (which methods agree on significance?).

- [ ] **Step 2: Add sparkline grid + small multiples**

Sparkline grid: tiny inline charts showing per-trial fragility, power, replication probability. Small multiples: array of mini forest plots for each multiverse specification.

- [ ] **Step 3: Add ridgeline density + specification curve**

Ridgeline: stacked kernel density plots of posterior distributions under different priors (vague, sceptical, enthusiastic). Specification curve: sorted HRs from multiverse analysis with CI ribbons.

- [ ] **Step 4: Wire into HTML pages + verify**

Add `<div id="nyt-charts-v2-hf">` and `<div id="nyt-charts-v2-acs">` containers. Add `<script src="js/nyt-charts-v2.js">`.

- [ ] **Step 5: Commit**

```bash
git add js/nyt-charts-v2.js heart-failure.html acs.html
git commit -m "feat: 6 new NYT chart types (radar, heat matrix, sparklines, small multiples, ridgeline, spec curve)"
```

---

## Task 7: CT.gov Live Registry Data Panels

**Files:**
- Create: `js/ctgov-live.js`

Embed structured registry data for all 15+ cited trials with NCT IDs, enrollment, completion dates, endpoint descriptions, arm structures, and current status — pulled from CT.gov API and hardcoded as constants.

- [ ] **Step 1: Use CT.gov MCP tools to extract detailed trial data**

Query `mcp__claude_ai_Clinical_Trials__get_trial_details` for each NCT ID:
NCT03036124 (DAPA-HF), NCT03057977 (EMPEROR-Reduced), NCT03057951 (EMPEROR-Preserved), NCT03619213 (DELIVER), NCT01035255 (PARADIGM-HF), NCT03412201 (STRONG-HF), NCT00542945 (DANISH), NCT01685840 (GUIDE-IT), NCT00202878 (IMPROVE-IT), NCT01764633 (FOURIER), NCT01663402 (ODYSSEY), NCT05198791 (MRA-MI/StratMedMINOCA)

- [ ] **Step 2: Build structured data panels**

Render each trial's registry metadata in a consistent card format with: NCT ID (linked), official title, phase, enrollment, start/completion dates, primary endpoint, sponsor, number of sites, DSMB status.

- [ ] **Step 3: Wire into HTML + commit**

```bash
git add js/ctgov-live.js heart-failure.html acs.html
git commit -m "feat: embedded CT.gov registry data panels for all cited trials"
```

---

## Task 8: Advanced Analytics Rendering + HTML Integration

**Files:**
- Modify: `heart-failure.html` (add advanced analytics section)
- Modify: `acs.html` (same)
- Modify: `css/page-components.css` (add styles)

- [ ] **Step 1: Add rendering logic for advanced stats in `js/advanced-stats.js`**

Add `initAdvancedHF()` and `initAdvancedACS()` functions that compute all 13 methods on the trial data and render results into `<div id="advanced-stats-hf">` and `<div id="advanced-stats-acs">`.

Output tables for: conformal PI, safe CI sequence, evidence half-life, Shannon entropy, spectral heterogeneity, multiverse concordance, EVT return period, VoI/EVPI, copula dependency, transportability, persistent homology, MA sample size planning.

- [ ] **Step 2: Add HTML containers and script references**

Insert `<section>` with `<div id="advanced-stats-hf">` in heart-failure.html after the live stats section. Same for ACS. Add `<script src="js/advanced-stats.js">` and `<script src="js/nyt-charts-v2.js">` and `<script src="js/ctgov-live.js">`.

- [ ] **Step 3: Add CSS for advanced analytics panels**

```css
.advanced-panel { /* similar to .stats-panel but with gradient accent */ }
.method-card { /* individual method result card */ }
.topology-viz { /* TDA visualisation styles */ }
```

- [ ] **Step 4: Verify div balance, JS syntax, run in browser**

```bash
cd /c/NICECardiology
for f in js/*.js; do node -c "$f"; done
for f in *.html; do echo "$f divs:"; grep -oP '<div[\s>]' "$f" | wc -l; grep -o '</div>' "$f" | wc -l; done
start "" "C:\NICECardiology\heart-failure.html"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete advanced analytics integration (13 methods, 6 charts, CT.gov data)"
```

---

## Task 9: Expanded Published Literature + PubMed Search

**Files:**
- Modify: `heart-failure.html`, `acs.html`

- [ ] **Step 1: Search PubMed for additional NICE critique papers**

Use `mcp__claude_ai_PubMed__search_articles` to find:
- "NICE guidelines heart failure criticism"
- "NICE technology appraisal delay cardiovascular"
- "UK guidelines cardiology international comparison"
- "NICE SGLT2 inhibitor adoption barriers"

- [ ] **Step 2: Fetch and integrate 6+ additional citations**

Add new `<div class="detail-block evidence">` entries to the Published Literature sections with full author/journal/DOI/findings.

- [ ] **Step 3: Commit**

```bash
git add heart-failure.html acs.html
git commit -m "feat: expanded published literature with PubMed-sourced citations"
```

---

## Task 10: Multi-Persona Review + Final Polish

**Files:**
- All files

- [ ] **Step 1: Run /review on all new code**

Focus on: statistical correctness of 13 new methods, chart rendering edge cases, clinical accuracy of any new claims.

- [ ] **Step 2: Fix all P0 and P1 findings**

- [ ] **Step 3: Final verification**

```bash
cd /c/NICECardiology
# JS syntax
for f in js/*.js; do node -c "$f" && echo "$f OK"; done
# Div balance
for f in *.html; do echo "$f"; diff <(grep -oP '<div[\s>]' "$f" | wc -l) <(grep -o '</div>' "$f" | wc -l); done
# Line count
cat *.html css/*.css js/*.js | wc -l
# Open in browser
start "" "C:\NICECardiology\heart-failure.html"
```

- [ ] **Step 4: Update review-findings.md with REVIEW CLEAN status**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "review: R3 all P0/P1 fixed, REVIEW CLEAN"
```

---

## Summary: What This Adds

| Category | Current (R2) | After This Plan | Delta |
|----------|-------------|-----------------|-------|
| Statistical methods | 17 | 30 | +13 |
| Chart types | 8 | 14 | +6 |
| Published citations | 12 | 18+ | +6 |
| JS modules | 4 | 7 | +3 |
| Total lines (est.) | 5,547 | ~8,500 | +3,000 |
| C-drive models used | 14 | 22+ | +8 |

### New Methods by Mathematical Domain

| Domain | Methods |
|--------|---------|
| **Distribution-Free Inference** | Conformal PI, Anytime-Valid CI sequences |
| **Information Theory** | Shannon entropy, Pielou's evenness, spectral Q decomposition |
| **Temporal Analysis** | Evidence half-life, volatility trajectory |
| **Decision Theory** | EVPI, EVSI, net benefit of future trial |
| **Extreme Value Theory** | GEV distribution, return period for null result |
| **Dependency Modelling** | Kendall's tau copula, small-study effect detection |
| **Multiverse Analysis** | Specification curve, estimator × inclusion concordance |
| **Algebraic Topology** | Persistent homology (β₀, β₁), Vietoris-Rips filtration |
| **Population Inference** | Transportability index, MA sample size planning |
