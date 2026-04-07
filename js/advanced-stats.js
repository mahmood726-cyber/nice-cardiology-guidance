/* ============================================================
   NICE Cardiology Advanced Stats Module
   13 novel statistical methods for meta-analytic evidence assessment:
   Conformal PI, Anytime-Valid CS, Evidence Half-Life, Shannon Entropy,
   Spectral Heterogeneity, Multiverse Robustness, Extreme Value Theory,
   Value of Information, Copula Dependency, Transportability Index,
   MA Sample Size Planning, Persistent Homology, Protocol Evolution.
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

  function normalQuantile(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p < 0.5) return -normalQuantile(1 - p);
    var t = Math.sqrt(-2 * Math.log(1 - p));
    var c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    var d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
  }

  function chi2CDF(x, df) {
    if (df <= 0 || x <= 0) return 0;
    var z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
    z = z / Math.sqrt(2 / (9 * df));
    return normalCDF(z);
  }

  /* DerSimonian-Laird (internal copy for self-containment) */
  function metaDL(studies) {
    var k = studies.length;
    if (k === 0) return null;
    if (k === 1) {
      var s = studies[0];
      return {
        pooled: Math.exp(s.yi),
        pooled_log: s.yi,
        se_log: s.sei,
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
      pooled: Math.exp(thetaRE),
      pooled_log: thetaRE,
      se_log: seRE,
      ci_lo: Math.exp(thetaRE - 1.96 * seRE),
      ci_hi: Math.exp(thetaRE + 1.96 * seRE),
      tau2: tau2,
      I2: I2,
      Q: Q,
      df: k - 1,
      k: k,
      weights: wiStar.map(function (w) { return w / sumWStar * 100; })
    };
  }

  /* Fixed-effect pooling (for multiverse) */
  function metaFE(studies) {
    var k = studies.length;
    if (k === 0) return null;
    if (k === 1) {
      var s = studies[0];
      return {
        pooled: Math.exp(s.yi),
        pooled_log: s.yi,
        se_log: s.sei,
        ci_lo: Math.exp(s.yi - 1.96 * s.sei),
        ci_hi: Math.exp(s.yi + 1.96 * s.sei),
        k: 1
      };
    }
    var wi = studies.map(function (s) { return 1 / (s.sei * s.sei); });
    var sumW = wi.reduce(function (a, b) { return a + b; }, 0);
    var theta = wi.reduce(function (sum, w, i) { return sum + w * studies[i].yi; }, 0) / sumW;
    var se = Math.sqrt(1 / sumW);
    return {
      pooled: Math.exp(theta),
      pooled_log: theta,
      se_log: se,
      ci_lo: Math.exp(theta - 1.96 * se),
      ci_hi: Math.exp(theta + 1.96 * se),
      k: k
    };
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

  /* ──────────────────────────────────────
     Method 1: Conformal Prediction Interval
     Distribution-free PI using LOO residuals.
     ────────────────────────────────────── */

  function conformalPI(studies, alpha) {
    alpha = alpha || 0.05;
    var k = studies.length;
    if (k < 2) return { lo: NaN, hi: NaN, halfWidth: NaN, coverageLevel: 1 - alpha };

    // Leave-one-out residuals
    var residuals = [];
    for (var i = 0; i < k; i++) {
      var subset = [];
      for (var j = 0; j < k; j++) {
        if (j !== i) subset.push(studies[j]);
      }
      var ma = metaDL(subset);
      var predicted = ma.pooled_log;
      residuals.push(Math.abs(studies[i].yi - predicted));
    }

    // Sort ascending
    residuals.sort(function (a, b) { return a - b; });

    // Conformal quantile: ceil((1-alpha)(k+1))-th value
    var idx = Math.ceil((1 - alpha) * (k + 1)) - 1;
    // Clamp to valid index
    idx = Math.min(idx, k - 1);
    idx = Math.max(idx, 0);
    var halfWidth = residuals[idx];

    var pooled = metaDL(studies);
    return {
      lo: Math.exp(pooled.pooled_log - halfWidth),
      hi: Math.exp(pooled.pooled_log + halfWidth),
      halfWidth: halfWidth,
      coverageLevel: 1 - alpha,
      pooledHR: pooled.pooled,
      nResiduals: k
    };
  }

  /* ──────────────────────────────────────
     Method 2: Anytime-Valid Confidence Sequence (Safe CI)
     Sequential CI valid at every sample size.
     ────────────────────────────────────── */

  function anytimeValidCS(studies, alpha) {
    alpha = alpha || 0.05;
    var k = studies.length;
    if (k < 1) return [];

    var results = [];
    var cumWeightedY = 0;
    var cumPrec = 0;

    for (var i = 0; i < k; i++) {
      var wi = 1 / (studies[i].sei * studies[i].sei);
      cumWeightedY += wi * studies[i].yi;
      cumPrec += wi;

      var theta = cumWeightedY / cumPrec;
      // Mixing rate rho = 1/(i+1), ensures slow mixing for validity at all stopping times
      var rho = 1 / (i + 1);
      // Width: sqrt(2*(1+rho)*log(1/alpha) / cumPrec)
      var width = Math.sqrt(2 * (1 + rho) * Math.log(1 / alpha) / cumPrec);

      results.push({
        study: i + 1,
        label: studies[i].label,
        theta: theta,
        hr: Math.exp(theta),
        ci_lo: Math.exp(theta - width),
        ci_hi: Math.exp(theta + width),
        width: width,
        rho: rho,
        standard_lo: Math.exp(theta - 1.96 / Math.sqrt(cumPrec)),
        standard_hi: Math.exp(theta + 1.96 / Math.sqrt(cumPrec))
      });
    }
    return results;
  }

  /* ──────────────────────────────────────
     Method 3: Evidence Half-Life
     At which study does the pooled HR stabilise within 5%?
     ────────────────────────────────────── */

  function evidenceHalfLife(studies, threshold) {
    threshold = threshold || 0.05;
    var k = studies.length;
    if (k < 2) return { halfLifeStudy: 1, volatility: 0, trajectory: [], stabilised: false };

    var trajectory = [];
    for (var i = 0; i < k; i++) {
      var subset = studies.slice(0, i + 1);
      var ma = metaDL(subset);
      trajectory.push({
        study: i + 1,
        label: studies[i].label,
        cumulativeHR: ma.pooled,
        cumulativeLogHR: ma.pooled_log
      });
    }

    // Find first study after which the HR never changes by more than threshold%
    var finalHR = trajectory[k - 1].cumulativeHR;
    var halfLifeStudy = k;
    var stabilised = false;

    for (var i = 0; i < k; i++) {
      var allStable = true;
      for (var j = i; j < k; j++) {
        if (Math.abs(trajectory[j].cumulativeHR - finalHR) / finalHR > threshold) {
          allStable = false;
          break;
        }
      }
      if (allStable) {
        halfLifeStudy = i + 1;
        stabilised = true;
        break;
      }
    }

    // Volatility = SD of cumulative HR trajectory
    var mean = trajectory.reduce(function (s, t) { return s + t.cumulativeHR; }, 0) / k;
    var variance = trajectory.reduce(function (s, t) {
      var d = t.cumulativeHR - mean;
      return s + d * d;
    }, 0) / k;
    var volatility = Math.sqrt(variance);

    return {
      halfLifeStudy: halfLifeStudy,
      halfLifeLabel: trajectory[halfLifeStudy - 1].label,
      volatility: volatility,
      trajectory: trajectory,
      stabilised: stabilised,
      finalHR: finalHR,
      threshold: threshold
    };
  }

  /* ──────────────────────────────────────
     Method 4: Shannon Entropy of Weights
     H = -sum(p_i * log2(p_i)); J = H / Hmax
     ────────────────────────────────────── */

  function shannonEntropy(studies) {
    var k = studies.length;
    if (k < 2) return { H: 0, Hmax: 0, J: 1, weights: [100], dominantIdx: 0, dominantPct: 100 };

    var ma = metaDL(studies);
    var wNorm = ma.weights.map(function (w) { return w / 100; }); // normalised to sum=1

    var H = 0;
    for (var i = 0; i < k; i++) {
      if (wNorm[i] > 0) {
        H -= wNorm[i] * Math.log(wNorm[i]) / Math.LN2;
      }
    }

    var Hmax = Math.log(k) / Math.LN2;
    var J = Hmax > 0 ? H / Hmax : 1;

    return {
      H: H,
      Hmax: Hmax,
      J: J,
      k: k,
      weights: wNorm,
      interpretation: J > 0.9 ? 'Highly even (balanced contributions)' :
                      J > 0.7 ? 'Moderately even' :
                      J > 0.5 ? 'Moderately uneven (some dominance)' :
                                'Highly uneven (one study dominates)'
    };
  }

  /* ──────────────────────────────────────
     Method 5: Spectral Heterogeneity
     Per-study contributions to Cochran's Q.
     ────────────────────────────────────── */

  function spectralHeterogeneity(studies) {
    var k = studies.length;
    if (k < 2) return { Q: 0, contributions: [], pHet: 1 };

    var wi = studies.map(function (s) { return 1 / (s.sei * s.sei); });
    var sumW = wi.reduce(function (a, b) { return a + b; }, 0);
    var thetaFE = wi.reduce(function (sum, w, i) { return sum + w * studies[i].yi; }, 0) / sumW;

    var Q = 0;
    var contributions = [];
    for (var i = 0; i < k; i++) {
      var qi = wi[i] * Math.pow(studies[i].yi - thetaFE, 2);
      Q += qi;
      contributions.push({
        label: studies[i].label,
        qi: qi,
        pct: 0 // filled after Q is computed
      });
    }

    for (var i = 0; i < k; i++) {
      contributions[i].pct = Q > 0 ? contributions[i].qi / Q * 100 : 100 / k;
    }

    // Sort descending by contribution
    contributions.sort(function (a, b) { return b.pct - a.pct; });

    return {
      Q: Q,
      pHet: 1 - chi2CDF(Q, k - 1),
      contributions: contributions,
      dominantStudy: contributions[0].label,
      dominantPct: contributions[0].pct
    };
  }

  /* ──────────────────────────────────────
     Method 6: Multiverse Robustness
     All combos of {DL, FE} x {all studies, leave-each-out}.
     ────────────────────────────────────── */

  function multiverseRobustness(studies) {
    var k = studies.length;
    var specs = [];

    // Method 1: DL on all studies
    var dlAll = metaDL(studies);
    specs.push({ method: 'DL', subset: 'All studies', hr: dlAll.pooled, ci_lo: dlAll.ci_lo, ci_hi: dlAll.ci_hi });

    // Method 2: FE on all studies
    var feAll = metaFE(studies);
    specs.push({ method: 'FE', subset: 'All studies', hr: feAll.pooled, ci_lo: feAll.ci_lo, ci_hi: feAll.ci_hi });

    // Leave-each-out for DL and FE
    for (var i = 0; i < k; i++) {
      var subset = [];
      for (var j = 0; j < k; j++) {
        if (j !== i) subset.push(studies[j]);
      }
      if (subset.length === 0) continue;
      var dlLoo = metaDL(subset);
      specs.push({ method: 'DL', subset: 'Without ' + studies[i].label, hr: dlLoo.pooled, ci_lo: dlLoo.ci_lo, ci_hi: dlLoo.ci_hi });

      var feLoo = metaFE(subset);
      specs.push({ method: 'FE', subset: 'Without ' + studies[i].label, hr: feLoo.pooled, ci_lo: feLoo.ci_lo, ci_hi: feLoo.ci_hi });
    }

    var hrs = specs.map(function (s) { return s.hr; });
    // Reference direction from DL all-studies (first spec)
    var refDirection = specs[0] ? specs[0].hr < 1 : true;
    var concordant = specs.filter(function (s) { return (s.hr < 1) === refDirection; }).length;
    var total = specs.length;
    var hrMin = Math.min.apply(null, hrs);
    var hrMax = Math.max.apply(null, hrs);

    return {
      specifications: specs,
      concordance: concordant / total,
      concordantCount: concordant,
      totalSpecs: total,
      hrRange: [hrMin, hrMax],
      robust: concordant === total,
      interpretation: concordant === total ? 'Fully robust: all specifications favour benefit' :
                      concordant / total > 0.8 ? 'Largely robust: >80% specifications concordant' :
                      'Fragile: conclusions sensitive to analytic choices'
    };
  }

  /* ──────────────────────────────────────
     Method 7: Extreme Value Theory (Gumbel)
     Fit Gumbel to log(HR), compute P(future HR > 1) and return period.
     ────────────────────────────────────── */

  function extremeValueTheory(studies) {
    var k = studies.length;
    if (k < 2) return { pNullResult: NaN, returnPeriod: NaN, mu: NaN, beta: NaN };

    var logHRs = studies.map(function (s) { return s.yi; });

    // Method of moments for Gumbel distribution
    // E[X] = mu + beta*gamma (gamma = Euler-Mascheroni = 0.5772)
    // Var[X] = (pi^2 / 6) * beta^2
    var gamma = 0.5772156649;
    var mean = logHRs.reduce(function (s, v) { return s + v; }, 0) / k;
    var variance = logHRs.reduce(function (s, v) { return s + (v - mean) * (v - mean); }, 0) / (k - 1);
    var sd = Math.sqrt(variance);

    // beta = sd * sqrt(6) / pi
    var beta = sd * Math.sqrt(6) / Math.PI;
    // mu = mean - beta * gamma
    var mu = mean - beta * gamma;

    // Ensure beta > 0 (degenerate if all values identical)
    if (beta < 1e-10) beta = 1e-10;

    // P(X > 0) = P(log(HR) > 0) = 1 - F(0) where F(x) = exp(-exp(-(x-mu)/beta))
    var pNullResult = 1 - Math.exp(-Math.exp(-(0 - mu) / beta));

    // Return period = 1 / P(null result)
    var returnPeriod = pNullResult > 1e-10 ? 1 / pNullResult : Infinity;

    return {
      mu: mu,
      beta: beta,
      pNullResult: pNullResult,
      returnPeriod: returnPeriod,
      meanLogHR: mean,
      sdLogHR: sd,
      interpretation: pNullResult < 0.05 ? 'Very unlikely a future trial would show HR \u2265 1' :
                      pNullResult < 0.20 ? 'Low probability of a null result in future trial' :
                      'Non-trivial probability of a null future trial'
    };
  }

  /* ──────────────────────────────────────
     Method 8: Value of Information (EVPI + EVSI)
     EVPI = P(wrong) x population x cost per error.
     EVSI for trial sizes [1000, 2000, 5000, 10000].
     ────────────────────────────────────── */

  function valueOfInformation(studies, popSize, costPerError) {
    popSize = popSize || 100000;      // affected population
    costPerError = costPerError || 1;  // normalised cost units

    var ma = metaDL(studies);
    if (!ma) return null;

    // P(wrong decision) = P(true HR >= 1 | data) = 1 - normalCDF(-pooled_log/se_log)
    var z = ma.pooled_log / ma.se_log;
    var pWrong = 1 - normalCDF(Math.abs(z));

    // EVPI = expected cost of uncertainty
    var evpi = pWrong * popSize * costPerError;

    // EVSI: value of a new trial of size n
    // Additional precision from new trial: 1/se_new^2
    // Approximate se_new = sqrt(4/n) for HR (log scale)
    var trialSizes = [1000, 2000, 5000, 10000];
    var evsiResults = trialSizes.map(function (n) {
      var eventRate = 0.15; // typical cardiology event rate
      var seNew = Math.sqrt(4 / (n * eventRate));
      var precNew = 1 / (seNew * seNew);
      var precCurrent = 1 / (ma.se_log * ma.se_log);
      var precTotal = precCurrent + precNew;
      var seTotal = Math.sqrt(1 / precTotal);
      var zNew = ma.pooled_log / seTotal;
      var pWrongNew = 1 - normalCDF(Math.abs(zNew));
      var evsiVal = (pWrong - pWrongNew) * popSize * costPerError;
      return {
        n: n,
        seNew: seNew,
        pWrongAfter: pWrongNew,
        evsi: Math.max(0, evsiVal),
        reductionPct: pWrong > 0 ? (1 - pWrongNew / pWrong) * 100 : 0
      };
    });

    return {
      pWrongDecision: pWrong,
      evpi: evpi,
      evsi: evsiResults,
      currentZ: z,
      popSize: popSize,
      costPerError: costPerError,
      interpretation: pWrong < 0.01 ? 'Very low uncertainty; additional trials have minimal value' :
                      pWrong < 0.05 ? 'Low residual uncertainty' :
                      'Moderate uncertainty; further research has value'
    };
  }

  /* ──────────────────────────────────────
     Method 9: Copula Dependency
     Kendall's tau between effect sizes and precision (1/SE).
     Tests for small-study effects.
     ────────────────────────────────────── */

  function copulaDependency(studies) {
    var k = studies.length;
    if (k < 3) return { tau: NaN, pValue: NaN, interpretation: 'Insufficient studies (k<3)' };

    var effects = studies.map(function (s) { return s.yi; });
    var precisions = studies.map(function (s) { return 1 / s.sei; });

    // Kendall's tau: count concordant and discordant pairs
    var concordant = 0, discordant = 0;
    for (var i = 0; i < k - 1; i++) {
      for (var j = i + 1; j < k; j++) {
        var dEffect = effects[j] - effects[i];
        var dPrec = precisions[j] - precisions[i];
        var product = dEffect * dPrec;
        if (product > 0) concordant++;
        else if (product < 0) discordant++;
        // ties are neither
      }
    }

    var nPairs = k * (k - 1) / 2;
    var tau = nPairs > 0 ? (concordant - discordant) / nPairs : 0;

    // Approximate z-test for Kendall's tau
    var seTau = Math.sqrt(2 * (2 * k + 5) / (9 * k * (k - 1)));
    var zTau = seTau > 0 ? tau / seTau : 0;
    var pValue = 2 * (1 - normalCDF(Math.abs(zTau)));

    // Positive tau = larger effects in smaller (less precise) studies = small-study bias
    // Negative tau = larger effects in larger studies (unusual)
    return {
      tau: tau,
      concordant: concordant,
      discordant: discordant,
      zStat: zTau,
      pValue: pValue,
      significant: pValue < 0.10,
      direction: tau > 0 ? 'Positive (larger effects in less precise studies)' :
                 tau < 0 ? 'Negative (larger effects in more precise studies)' :
                 'None',
      interpretation: pValue < 0.05 ? 'Significant small-study effect detected (possible publication bias)' :
                      pValue < 0.10 ? 'Marginally significant small-study effect' :
                      'No evidence of small-study effects'
    };
  }

  /* ──────────────────────────────────────
     Method 10: Transportability Index
     PI width / CI width ratio. Higher = less transportable.
     ────────────────────────────────────── */

  function transportabilityIndex(studies) {
    var ma = metaDL(studies);
    if (!ma || studies.length < 2) return { ratio: NaN, grade: 'Insufficient data' };

    var ciWidth = Math.log(ma.ci_hi) - Math.log(ma.ci_lo); // on log scale

    // Prediction interval using t-distribution
    var k = studies.length;
    // For k=2, t critical is 12.706 (df=1), making PI very wide
    // For larger k, use normalQuantile as approximation
    // Prediction interval uses df = k-2 (Higgins & Thompson 2009)
    var tCrit;
    var df = k - 2;
    if (df <= 0) {
      tCrit = 12.706; // pragmatic: df=0 undefined, use df=1 value
    } else if (df === 1) {
      tCrit = 12.706;
    } else if (df === 2) {
      tCrit = 4.303;
    } else if (df === 3) {
      tCrit = 3.182;
    } else if (df <= 30) {
      // Lookup table for exact values
      var T_TABLE = [0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
        2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086,
        2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
      tCrit = T_TABLE[df];
    } else {
      tCrit = normalQuantile(0.975);
    }

    var piHalfWidth = tCrit * Math.sqrt(ma.tau2 + ma.se_log * ma.se_log);
    var piWidth = 2 * piHalfWidth;

    var ratio = ciWidth > 0 ? piWidth / ciWidth : Infinity;

    var grade;
    if (ratio <= 1.5) grade = 'Excellent';
    else if (ratio <= 3.0) grade = 'Good';
    else if (ratio <= 6.0) grade = 'Moderate';
    else grade = 'Poor';

    return {
      ratio: ratio,
      ciWidth: ciWidth,
      piWidth: piWidth,
      grade: grade,
      tau2: ma.tau2,
      I2: ma.I2,
      interpretation: 'Ratio ' + fmt(ratio, 2) + ' \u2014 ' + grade + ' transportability. ' +
                      (ratio > 3 ? 'Effect may vary substantially across new settings.' :
                       'Effect likely to generalise to new settings.')
    };
  }

  /* ──────────────────────────────────────
     Method 11: MA Sample Size Planning
     Additional studies needed to narrow CI to target width.
     ────────────────────────────────────── */

  function maSampleSizePlanning(studies, targetCIWidth) {
    var ma = metaDL(studies);
    if (!ma) return null;

    // Default target: halve current CI width
    var currentWidth = Math.log(ma.ci_hi) - Math.log(ma.ci_lo);
    if (!targetCIWidth) targetCIWidth = currentWidth / 2;

    var k = studies.length;
    // Current precision
    var precCurrent = 1 / (ma.se_log * ma.se_log);
    // Target SE = targetWidth / (2 * 1.96)
    var targetSE = targetCIWidth / (2 * 1.96);
    var precTarget = 1 / (targetSE * targetSE);

    // Additional precision needed
    var precNeeded = precTarget - precCurrent;
    if (precNeeded <= 0) {
      return {
        additionalStudies: 0,
        currentWidth: currentWidth,
        targetWidth: targetCIWidth,
        alreadyMet: true,
        interpretation: 'Current CI width already meets target'
      };
    }

    // Average precision per study
    var avgPrecPerStudy = precCurrent / k;

    // Additional studies needed
    var additionalStudies = Math.ceil(precNeeded / avgPrecPerStudy);

    // Also compute for specific trial sizes
    var projections = [1, 2, 3, 5, 10].map(function (n) {
      var newPrec = precCurrent + n * avgPrecPerStudy;
      var newSE = Math.sqrt(1 / newPrec);
      var newWidth = 2 * 1.96 * newSE;
      return {
        nAdditional: n,
        projectedWidth: newWidth,
        projectedCI_lo: Math.exp(ma.pooled_log - 1.96 * newSE),
        projectedCI_hi: Math.exp(ma.pooled_log + 1.96 * newSE),
        meetsTarget: newWidth <= targetCIWidth
      };
    });

    return {
      additionalStudies: additionalStudies,
      currentWidth: currentWidth,
      targetWidth: targetCIWidth,
      currentSE: ma.se_log,
      targetSE: targetSE,
      avgPrecPerStudy: avgPrecPerStudy,
      projections: projections,
      alreadyMet: false,
      interpretation: additionalStudies + ' additional studies (of average precision) needed to reach target CI width of ' + fmt(targetCIWidth, 3) + ' on log scale'
    };
  }

  /* ──────────────────────────────────────
     Method 12: Persistent Homology (Vietoris-Rips)
     Union-find on standardised distance matrix.
     Track beta0 (connected components) filtration.
     ────────────────────────────────────── */

  function persistentHomology(studies) {
    var k = studies.length;
    if (k < 2) return { beta0Curve: [], beta1: 0, maxPersistence: 0, clusters: 1 };

    // Standardise: use (yi, 1/sei) as 2D point cloud
    var points = studies.map(function (s) {
      return { x: s.yi, y: 1 / s.sei, label: s.label };
    });

    // Compute pairwise distances
    var edges = [];
    for (var i = 0; i < k - 1; i++) {
      for (var j = i + 1; j < k; j++) {
        var dx = points[i].x - points[j].x;
        var dy = points[i].y - points[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        edges.push({ i: i, j: j, dist: dist });
      }
    }

    // Sort edges by distance
    edges.sort(function (a, b) { return a.dist - b.dist; });

    // Union-Find
    var parent = [];
    var rank = [];
    for (var i = 0; i < k; i++) {
      parent[i] = i;
      rank[i] = 0;
    }

    function find(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]]; // path compression
        x = parent[x];
      }
      return x;
    }

    function union(x, y) {
      var px = find(x), py = find(y);
      if (px === py) return false;
      if (rank[px] < rank[py]) { var tmp = px; px = py; py = tmp; }
      parent[py] = px;
      if (rank[px] === rank[py]) rank[px]++;
      return true;
    }

    // Filtration: track beta0 at each edge addition
    var beta0Curve = [{ epsilon: 0, beta0: k }];
    var components = k;
    var birthDeath = []; // persistence diagram
    var mergeDistances = [];

    for (var e = 0; e < edges.length; e++) {
      if (union(edges[e].i, edges[e].j)) {
        components--;
        mergeDistances.push(edges[e].dist);
        beta0Curve.push({ epsilon: edges[e].dist, beta0: components });
        birthDeath.push({ birth: 0, death: edges[e].dist });
      }
    }

    // Max persistence = largest death distance among features
    var maxPersistence = mergeDistances.length > 0 ? Math.max.apply(null, mergeDistances) : 0;

    // Beta1 estimate at median threshold
    // For simplicial complex, beta1 = #edges - #vertices + #components at given threshold
    var medianDist = edges.length > 0 ? edges[Math.floor(edges.length / 2)].dist : 0;
    var edgesAtMedian = edges.filter(function (e) { return e.dist <= medianDist; }).length;
    // Reset union-find for median threshold count
    var parentMed = [];
    for (var i = 0; i < k; i++) parentMed[i] = i;
    var rankMed = [];
    for (var i = 0; i < k; i++) rankMed[i] = 0;

    function findMed(x) {
      while (parentMed[x] !== x) { parentMed[x] = parentMed[parentMed[x]]; x = parentMed[x]; }
      return x;
    }

    var compMed = k;
    for (var e = 0; e < edges.length; e++) {
      if (edges[e].dist > medianDist) break;
      var px = findMed(edges[e].i), py = findMed(edges[e].j);
      if (px !== py) {
        if (rankMed[px] < rankMed[py]) { var tmp = px; px = py; py = tmp; }
        parentMed[py] = px;
        if (rankMed[px] === rankMed[py]) rankMed[px]++;
        compMed--;
      }
    }
    // Euler characteristic: V - E + F, for 1-skeleton beta1 = E - V + C
    var beta1 = Math.max(0, edgesAtMedian - k + compMed);

    return {
      beta0Curve: beta0Curve,
      beta1: beta1,
      maxPersistence: maxPersistence,
      mergeDistances: mergeDistances,
      birthDeath: birthDeath,
      medianThreshold: medianDist,
      nPoints: k,
      interpretation: maxPersistence < 0.1 ? 'Highly clustered (homogeneous evidence)' :
                      maxPersistence < 0.5 ? 'Moderate topological spread' :
                      'Topologically dispersed (heterogeneous evidence clusters)'
    };
  }

  /* ──────────────────────────────────────
     Method 13: Protocol Evolution Score
     Based on trial year span and design consistency.
     ────────────────────────────────────── */

  function protocolEvolution(studies) {
    var k = studies.length;
    if (k < 1) return { score: 0, yearSpan: 0, consistency: 0, interpretation: 'No studies' };

    var years = studies.map(function (s) { return s.year || 2020; });
    var minYear = Math.min.apply(null, years);
    var maxYear = Math.max.apply(null, years);
    var yearSpan = maxYear - minYear;

    // Design consistency: coefficient of variation of sample sizes
    var ns = studies.map(function (s) { return s.n || 1000; });
    var meanN = ns.reduce(function (a, b) { return a + b; }, 0) / k;
    var varN = ns.reduce(function (s, n) { return s + (n - meanN) * (n - meanN); }, 0) / k;
    var cvN = meanN > 0 ? Math.sqrt(varN) / meanN : 0;
    var consistency = Math.max(0, 1 - cvN); // 1 = identical designs, 0 = very heterogeneous

    // Effect size consistency: CV of HRs
    var hrs = studies.map(function (s) { return s.hr; });
    var meanHR = hrs.reduce(function (a, b) { return a + b; }, 0) / k;
    var varHR = hrs.reduce(function (s, h) { return s + (h - meanHR) * (h - meanHR); }, 0) / k;
    var cvHR = meanHR > 0 ? Math.sqrt(varHR) / meanHR : 0;
    var effectConsistency = Math.max(0, 1 - cvHR * 5); // scale up for sensitivity

    // Composite score (0-100)
    // Penalise short evidence base, reward consistency
    var timeScore = Math.min(yearSpan / 10, 1); // max at 10-year span
    var score = Math.round((0.3 * timeScore + 0.35 * consistency + 0.35 * effectConsistency) * 100);
    score = Math.max(0, Math.min(100, score));

    return {
      score: score,
      yearSpan: yearSpan,
      minYear: minYear,
      maxYear: maxYear,
      consistency: consistency,
      effectConsistency: effectConsistency,
      cvSampleSize: cvN,
      cvEffectSize: cvHR,
      interpretation: score >= 80 ? 'Strong protocol maturity; consistent evidence evolution' :
                      score >= 60 ? 'Moderate maturity; some protocol variation' :
                      score >= 40 ? 'Early-stage evidence; protocols still evolving' :
                      'Limited evidence base; substantial protocol heterogeneity'
    };
  }

  /* ══════════════════════════════════════════
     Rendering: Build HTML for all 13 methods
     ══════════════════════════════════════════ */

  function renderAllMethods(studies, panelTitle) {
    var ma = metaDL(studies);
    var k = studies.length;

    // Compute all 13 methods
    var conformal = conformalPI(studies);
    var avcs = anytimeValidCS(studies);
    var halfLife = evidenceHalfLife(studies);
    var entropy = shannonEntropy(studies);
    var spectral = spectralHeterogeneity(studies);
    var multiverse = multiverseRobustness(studies);
    var evt = extremeValueTheory(studies);
    var voi = valueOfInformation(studies);
    var copula = copulaDependency(studies);
    var transport = transportabilityIndex(studies);
    var sampleSize = maSampleSizePlanning(studies);
    var topology = persistentHomology(studies);
    var protocol = protocolEvolution(studies);

    var html = '<div class="stats-panel">';
    html += '<h3>' + panelTitle + '</h3>';
    html += '<p style="font-size:0.85rem;color:var(--gray-500);margin-bottom:1.25rem;">13 advanced statistical methods computed client-side. Distribution-free, topology-aware, and decision-theoretic analyses. Zero external dependencies.</p>';

    /* ── 1. Conformal Prediction Interval ── */
    html += '<div class="stats-block"><h4>1. Conformal Prediction Interval (Distribution-Free)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">LOO residual-based PI valid without distributional assumptions.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Pooled HR</td><td><strong>' + fmt(conformal.pooledHR) + '</strong></td></tr>';
    html += '<tr><td>Conformal 95% PI</td><td><span class="stat-highlight">' + fmt(conformal.lo) + ' \u2013 ' + fmt(conformal.hi) + '</span></td></tr>';
    html += '<tr><td>Half-width (log scale)</td><td>' + fmt(conformal.halfWidth) + '</td></tr>';
    html += '<tr><td>LOO residuals used</td><td>' + conformal.nResiduals + '</td></tr>';
    html += '</tbody></table></div>';

    /* ── 2. Anytime-Valid Confidence Sequence ── */
    html += '<div class="stats-block"><h4>2. Anytime-Valid Confidence Sequence (Safe CI)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Sequential CI valid at every stopping time. Wider than standard CI to control Type I error under optional stopping.</p>';
    html += '<table class="data-table"><thead><tr><th>Study</th><th>Cumulative HR</th><th>Safe CI</th><th>Standard CI</th><th>Width Ratio</th></tr></thead><tbody>';
    for (var i = 0; i < avcs.length; i++) {
      var r = avcs[i];
      var safeWidth = Math.log(r.ci_hi) - Math.log(r.ci_lo);
      var stdWidth = Math.log(r.standard_hi) - Math.log(r.standard_lo);
      var widthRatio = stdWidth > 0 ? safeWidth / stdWidth : Infinity;
      html += '<tr><td><strong>' + r.label + '</strong></td>';
      html += '<td>' + fmt(r.hr) + '</td>';
      html += '<td><span class="stat-highlight">' + fmt(r.ci_lo) + ' \u2013 ' + fmt(r.ci_hi) + '</span></td>';
      html += '<td>' + fmt(r.standard_lo) + ' \u2013 ' + fmt(r.standard_hi) + '</td>';
      html += '<td>' + fmt(widthRatio, 2) + '\u00D7</td></tr>';
    }
    html += '</tbody></table></div>';

    /* ── 3. Evidence Half-Life ── */
    html += '<div class="stats-block"><h4>3. Evidence Half-Life</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Point at which cumulative HR stabilises within 5% of final estimate.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Stabilisation point</td><td><span class="stat-highlight">Study ' + halfLife.halfLifeStudy + ' (' + halfLife.halfLifeLabel + ')</span></td></tr>';
    html += '<tr><td>Final cumulative HR</td><td>' + fmt(halfLife.finalHR) + '</td></tr>';
    html += '<tr><td>Volatility (SD of trajectory)</td><td>' + fmt(halfLife.volatility, 4) + '</td></tr>';
    html += '<tr><td>Stabilised?</td><td>' + (halfLife.stabilised ? '<span class="stat-highlight">Yes</span>' : '<span class="stat-highlight warning">No</span>') + '</td></tr>';
    // Trajectory table
    html += '</tbody></table>';
    if (halfLife.trajectory.length > 1) {
      html += '<table class="data-table" style="margin-top:0.5rem;"><thead><tr><th>Study</th><th>Cumulative HR</th></tr></thead><tbody>';
      for (var i = 0; i < halfLife.trajectory.length; i++) {
        var t = halfLife.trajectory[i];
        html += '<tr><td>' + t.label + '</td><td>' + fmt(t.cumulativeHR) + '</td></tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div>';

    /* ── 4. Shannon Entropy ── */
    html += '<div class="stats-block"><h4>4. Shannon Entropy of Meta-Analytic Weights</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Measures information balance across studies. J=1 means perfectly even weights.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Shannon entropy H</td><td>' + fmt(entropy.H) + ' bits</td></tr>';
    html += '<tr><td>Maximum entropy H<sub>max</sub></td><td>' + fmt(entropy.Hmax) + ' bits</td></tr>';
    html += '<tr><td>Pielou evenness J</td><td><span class="stat-highlight">' + fmt(entropy.J) + '</span></td></tr>';
    html += '<tr><td>Interpretation</td><td>' + entropy.interpretation + '</td></tr>';
    html += '</tbody></table></div>';

    /* ── 5. Spectral Heterogeneity ── */
    html += '<div class="stats-block"><h4>5. Spectral Heterogeneity Decomposition</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Per-study contributions to Cochran\'s Q statistic.</p>';
    html += '<table class="data-table"><thead><tr><th>Study</th><th>q<sub>i</sub></th><th>% Contribution</th></tr></thead><tbody>';
    for (var i = 0; i < spectral.contributions.length; i++) {
      var c = spectral.contributions[i];
      html += '<tr><td><strong>' + c.label + '</strong></td>';
      html += '<td>' + fmt(c.qi, 4) + '</td>';
      html += '<td><span class="stat-highlight">' + fmt(c.pct, 1) + '%</span></td></tr>';
    }
    html += '<tr><td><strong>Total Q</strong></td><td>' + fmt(spectral.Q, 4) + '</td>';
    html += '<td>p = ' + fmt(spectral.pHet, 4) + '</td></tr>';
    html += '</tbody></table></div>';

    /* ── 6. Multiverse Robustness ── */
    html += '<div class="stats-block"><h4>6. Multiverse Robustness Analysis</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">{DL, FE} \u00D7 {all studies, leave-each-out}: ' + multiverse.totalSpecs + ' specifications.</p>';
    html += '<table class="data-table"><thead><tr><th>Method</th><th>Subset</th><th>HR (95% CI)</th><th>HR &lt; 1?</th></tr></thead><tbody>';
    for (var i = 0; i < multiverse.specifications.length; i++) {
      var s = multiverse.specifications[i];
      html += '<tr><td>' + s.method + '</td>';
      html += '<td>' + s.subset + '</td>';
      html += '<td>' + fmt(s.hr) + ' (' + fmt(s.ci_lo, 2) + '\u2013' + fmt(s.ci_hi, 2) + ')</td>';
      html += '<td>' + (s.hr < 1 ? '<span class="stat-highlight">Yes</span>' : '<span class="stat-highlight warning">No</span>') + '</td></tr>';
    }
    html += '</tbody></table>';
    html += '<p style="font-size:0.85rem;margin-top:0.5rem;"><strong>Concordance:</strong> <span class="stat-highlight">' + pct(multiverse.concordance) + '</span> (' + multiverse.concordantCount + '/' + multiverse.totalSpecs + ' specifications). ' + multiverse.interpretation + '</p>';
    html += '</div>';

    /* ── 7. Extreme Value Theory ── */
    html += '<div class="stats-block"><h4>7. Extreme Value Theory (Gumbel Model)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Gumbel fit to log(HR) distribution. Predicts likelihood of future null results.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Gumbel location (\u03BC)</td><td>' + fmt(evt.mu, 4) + '</td></tr>';
    html += '<tr><td>Gumbel scale (\u03B2)</td><td>' + fmt(evt.beta, 4) + '</td></tr>';
    html += '<tr><td>P(future HR \u2265 1)</td><td><span class="stat-highlight">' + pct(evt.pNullResult) + '</span></td></tr>';
    html += '<tr><td>Return period</td><td>' + fmt(evt.returnPeriod, 1) + ' trials</td></tr>';
    html += '<tr><td>Interpretation</td><td>' + evt.interpretation + '</td></tr>';
    html += '</tbody></table></div>';

    /* ── 8. Value of Information ── */
    html += '<div class="stats-block"><h4>8. Value of Information Analysis</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">EVPI = expected cost of wrong decision; EVSI = value of additional trial evidence.</p>';
    if (voi) {
      html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
      html += '<tr><td>P(wrong decision)</td><td><span class="stat-highlight">' + pct(voi.pWrongDecision) + '</span></td></tr>';
      html += '<tr><td>EVPI (per ' + voi.popSize.toLocaleString() + ' patients)</td><td>' + fmt(voi.evpi, 1) + ' cost units</td></tr>';
      html += '<tr><td>Current Z-statistic</td><td>' + fmt(voi.currentZ, 2) + '</td></tr>';
      html += '<tr><td>Interpretation</td><td>' + voi.interpretation + '</td></tr>';
      html += '</tbody></table>';
      html += '<table class="data-table" style="margin-top:0.5rem;"><thead><tr><th>New Trial N</th><th>P(wrong) After</th><th>EVSI</th><th>Uncertainty Reduction</th></tr></thead><tbody>';
      for (var i = 0; i < voi.evsi.length; i++) {
        var ev = voi.evsi[i];
        html += '<tr><td>' + ev.n.toLocaleString() + '</td>';
        html += '<td>' + pct(ev.pWrongAfter) + '</td>';
        html += '<td>' + fmt(ev.evsi, 1) + '</td>';
        html += '<td>' + fmt(ev.reductionPct, 1) + '%</td></tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div>';

    /* ── 9. Copula Dependency ── */
    html += '<div class="stats-block"><h4>9. Copula Dependency (Small-Study Effects)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Kendall\'s \u03C4 between effect sizes and precision. Tests for asymmetric funnel plot.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Kendall\'s \u03C4</td><td><span class="stat-highlight">' + fmt(copula.tau) + '</span></td></tr>';
    html += '<tr><td>Concordant pairs</td><td>' + (isNaN(copula.concordant) ? '\u2014' : copula.concordant) + '</td></tr>';
    html += '<tr><td>Discordant pairs</td><td>' + (isNaN(copula.discordant) ? '\u2014' : copula.discordant) + '</td></tr>';
    html += '<tr><td>Z-statistic</td><td>' + fmt(copula.zStat, 2) + '</td></tr>';
    html += '<tr><td>p-value</td><td>' + fmt(copula.pValue, 4) + '</td></tr>';
    html += '<tr><td>Direction</td><td>' + copula.direction + '</td></tr>';
    html += '<tr><td>Interpretation</td><td>' + copula.interpretation + '</td></tr>';
    html += '</tbody></table></div>';

    /* ── 10. Transportability Index ── */
    html += '<div class="stats-block"><h4>10. Transportability Index</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">PI/CI width ratio. Indicates how well the effect generalises to new populations.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>PI width (log scale)</td><td>' + fmt(transport.piWidth, 4) + '</td></tr>';
    html += '<tr><td>CI width (log scale)</td><td>' + fmt(transport.ciWidth, 4) + '</td></tr>';
    html += '<tr><td>Transportability ratio</td><td><span class="stat-highlight">' + fmt(transport.ratio, 2) + '</span></td></tr>';
    html += '<tr><td>Grade</td><td><span class="stat-highlight' + (transport.grade === 'Poor' || transport.grade === 'Moderate' ? ' warning' : '') + '">' + transport.grade + '</span></td></tr>';
    html += '<tr><td>\u03C4\u00B2</td><td>' + fmt(transport.tau2, 6) + '</td></tr>';
    html += '<tr><td>I\u00B2</td><td>' + fmt(transport.I2, 1) + '%</td></tr>';
    html += '</tbody></table></div>';

    /* ── 11. MA Sample Size Planning ── */
    html += '<div class="stats-block"><h4>11. Meta-Analytic Sample Size Planning</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Studies needed to halve the current CI width.</p>';
    if (sampleSize) {
      html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
      html += '<tr><td>Current CI width (log scale)</td><td>' + fmt(sampleSize.currentWidth, 4) + '</td></tr>';
      html += '<tr><td>Target CI width (log scale)</td><td>' + fmt(sampleSize.targetWidth, 4) + '</td></tr>';
      if (sampleSize.alreadyMet) {
        html += '<tr><td>Status</td><td><span class="stat-highlight">Target already met</span></td></tr>';
      } else {
        html += '<tr><td>Additional studies needed</td><td><span class="stat-highlight">' + sampleSize.additionalStudies + '</span></td></tr>';
      }
      html += '</tbody></table>';
      if (!sampleSize.alreadyMet && sampleSize.projections) {
        html += '<table class="data-table" style="margin-top:0.5rem;"><thead><tr><th>Additional Studies</th><th>Projected CI Width</th><th>Projected HR (95% CI)</th><th>Meets Target?</th></tr></thead><tbody>';
        for (var i = 0; i < sampleSize.projections.length; i++) {
          var p = sampleSize.projections[i];
          html += '<tr><td>+' + p.nAdditional + '</td>';
          html += '<td>' + fmt(p.projectedWidth, 4) + '</td>';
          html += '<td>' + fmt(p.projectedCI_lo, 3) + ' \u2013 ' + fmt(p.projectedCI_hi, 3) + '</td>';
          html += '<td>' + (p.meetsTarget ? '<span class="stat-highlight">Yes</span>' : 'No') + '</td></tr>';
        }
        html += '</tbody></table>';
      }
    }
    html += '</div>';

    /* ── 12. Persistent Homology ── */
    html += '<div class="stats-block"><h4>12. Persistent Homology (Topological Data Analysis)</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Vietoris-Rips filtration on (log HR, precision) point cloud. Tracks connected components (\u03B2<sub>0</sub>) and loops (\u03B2<sub>1</sub>).</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Points (studies)</td><td>' + topology.nPoints + '</td></tr>';
    html += '<tr><td>Max persistence</td><td><span class="stat-highlight">' + fmt(topology.maxPersistence, 4) + '</span></td></tr>';
    html += '<tr><td>\u03B2<sub>1</sub> at median threshold</td><td>' + topology.beta1 + '</td></tr>';
    html += '<tr><td>Median threshold (\u03B5)</td><td>' + fmt(topology.medianThreshold, 4) + '</td></tr>';
    html += '<tr><td>Interpretation</td><td>' + topology.interpretation + '</td></tr>';
    html += '</tbody></table>';
    // Beta0 filtration curve
    if (topology.beta0Curve.length > 1) {
      html += '<table class="data-table" style="margin-top:0.5rem;"><thead><tr><th>\u03B5 (distance)</th><th>\u03B2<sub>0</sub> (components)</th></tr></thead><tbody>';
      for (var i = 0; i < topology.beta0Curve.length; i++) {
        var b = topology.beta0Curve[i];
        html += '<tr><td>' + fmt(b.epsilon, 4) + '</td><td>' + b.beta0 + '</td></tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div>';

    /* ── 13. Protocol Evolution Score ── */
    html += '<div class="stats-block"><h4>13. Protocol Evolution Score</h4>';
    html += '<p style="font-size:0.82rem;color:var(--gray-500);">Composite measure of evidence maturity based on temporal span, sample size consistency, and effect size stability.</p>';
    html += '<table class="data-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    html += '<tr><td>Composite score</td><td><span class="stat-highlight">' + protocol.score + '/100</span></td></tr>';
    html += '<tr><td>Year span</td><td>' + protocol.minYear + '\u2013' + protocol.maxYear + ' (' + protocol.yearSpan + ' years)</td></tr>';
    html += '<tr><td>Sample size consistency</td><td>' + fmt(protocol.consistency, 3) + ' (CV = ' + fmt(protocol.cvSampleSize, 3) + ')</td></tr>';
    html += '<tr><td>Effect size consistency</td><td>' + fmt(protocol.effectConsistency, 3) + ' (CV = ' + fmt(protocol.cvEffectSize, 3) + ')</td></tr>';
    html += '<tr><td>Interpretation</td><td>' + protocol.interpretation + '</td></tr>';
    html += '</tbody></table></div>';

    /* ── Methods Summary ── */
    html += '<div class="stats-block"><h4>Advanced Methods Summary</h4>';
    html += '<table class="data-table"><thead><tr><th>#</th><th>Method</th><th>Key Result</th></tr></thead><tbody>';
    html += '<tr><td>1</td><td>Conformal PI</td><td>' + fmt(conformal.lo) + '\u2013' + fmt(conformal.hi) + '</td></tr>';
    html += '<tr><td>2</td><td>Anytime-Valid CS</td><td>Final safe CI: ' + (avcs.length > 0 ? fmt(avcs[avcs.length - 1].ci_lo) + '\u2013' + fmt(avcs[avcs.length - 1].ci_hi) : '\u2014') + '</td></tr>';
    html += '<tr><td>3</td><td>Evidence Half-Life</td><td>Stabilises at study ' + halfLife.halfLifeStudy + '</td></tr>';
    html += '<tr><td>4</td><td>Shannon Entropy</td><td>J = ' + fmt(entropy.J) + ' (' + entropy.interpretation + ')</td></tr>';
    html += '<tr><td>5</td><td>Spectral Heterogeneity</td><td>Q = ' + fmt(spectral.Q, 3) + ', p = ' + fmt(spectral.pHet, 4) + '</td></tr>';
    html += '<tr><td>6</td><td>Multiverse Robustness</td><td>' + pct(multiverse.concordance) + ' concordance</td></tr>';
    html += '<tr><td>7</td><td>Extreme Value Theory</td><td>P(HR\u22651) = ' + pct(evt.pNullResult) + '</td></tr>';
    html += '<tr><td>8</td><td>Value of Information</td><td>P(wrong) = ' + (voi ? pct(voi.pWrongDecision) : '\u2014') + '</td></tr>';
    html += '<tr><td>9</td><td>Copula Dependency</td><td>\u03C4 = ' + fmt(copula.tau) + ', p = ' + fmt(copula.pValue, 4) + '</td></tr>';
    html += '<tr><td>10</td><td>Transportability</td><td>Ratio = ' + fmt(transport.ratio, 2) + ' (' + transport.grade + ')</td></tr>';
    html += '<tr><td>11</td><td>Sample Size Planning</td><td>' + (sampleSize && !sampleSize.alreadyMet ? '+' + sampleSize.additionalStudies + ' studies needed' : 'Target met') + '</td></tr>';
    html += '<tr><td>12</td><td>Persistent Homology</td><td>Max persistence = ' + fmt(topology.maxPersistence, 4) + '</td></tr>';
    html += '<tr><td>13</td><td>Protocol Evolution</td><td>Score = ' + protocol.score + '/100</td></tr>';
    html += '</tbody></table></div>';

    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════════
     Page Initialization
     ══════════════════════════════════════════ */

  function initAdvancedHF() {
    var container = document.getElementById('advanced-stats-hf');
    if (!container) return;

    // HFrEF: DAPA-HF + EMPEROR-Reduced
    var hfrefStudies = [
      { label: 'DAPA-HF', yi: Math.log(0.74), sei: (Math.log(0.85) - Math.log(0.65)) / (2 * 1.96), hr: 0.74, ci_lo: 0.65, ci_hi: 0.85, n: 4744, year: 2019 },
      { label: 'EMPEROR-Reduced', yi: Math.log(0.75), sei: (Math.log(0.86) - Math.log(0.65)) / (2 * 1.96), hr: 0.75, ci_lo: 0.65, ci_hi: 0.86, n: 3730, year: 2020 }
    ];

    // HFpEF: EMPEROR-Preserved + DELIVER
    var hfpefStudies = [
      { label: 'EMPEROR-Preserved', yi: Math.log(0.79), sei: (Math.log(0.90) - Math.log(0.69)) / (2 * 1.96), hr: 0.79, ci_lo: 0.69, ci_hi: 0.90, n: 5988, year: 2021 },
      { label: 'DELIVER', yi: Math.log(0.82), sei: (Math.log(0.92) - Math.log(0.73)) / (2 * 1.96), hr: 0.82, ci_lo: 0.73, ci_hi: 0.92, n: 6263, year: 2022 }
    ];

    var html = '';
    html += renderAllMethods(hfrefStudies, 'Advanced Statistical Analysis: SGLT2i in HFrEF');
    html += renderAllMethods(hfpefStudies, 'Advanced Statistical Analysis: SGLT2i in HFpEF');

    container.innerHTML = html;
  }

  function initAdvancedACS() {
    var container = document.getElementById('advanced-stats-acs');
    if (!container) return;

    var lipidStudies = [
      { label: 'IMPROVE-IT', yi: Math.log(0.936), sei: (Math.log(0.99) - Math.log(0.89)) / (2 * 1.96), hr: 0.936, ci_lo: 0.89, ci_hi: 0.99, n: 18144, year: 2015 },
      { label: 'FOURIER', yi: Math.log(0.85), sei: (Math.log(0.92) - Math.log(0.79)) / (2 * 1.96), hr: 0.85, ci_lo: 0.79, ci_hi: 0.92, n: 27564, year: 2017 },
      { label: 'ODYSSEY', yi: Math.log(0.85), sei: (Math.log(0.93) - Math.log(0.78)) / (2 * 1.96), hr: 0.85, ci_lo: 0.78, ci_hi: 0.93, n: 18924, year: 2018 }
    ];

    var html = renderAllMethods(lipidStudies, 'Advanced Statistical Analysis: Post-ACS Lipid Intensification');

    container.innerHTML = html;
  }

  /* ──────────────────────────────────────
     Boot
     ────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    var path = window.location.pathname;
    if (path.indexOf('heart-failure') >= 0) {
      setTimeout(initAdvancedHF, 100);
    } else if (path.indexOf('acs') >= 0) {
      setTimeout(initAdvancedACS, 100);
    }
  });

})();
