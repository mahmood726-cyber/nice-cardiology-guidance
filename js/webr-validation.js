/* ============================================================
   WebR Validation — On-Demand R Engine for Meta-Analysis
   Only loads WebR (~20MB) when user clicks "Validate" button.
   Uses metafor package to independently verify DL pooling.
   ============================================================ */

/* global WebR */

var webrInstance = null;
var webrLoading = false;

function loadWebR(page) {
  var btn = document.getElementById('load-webr-' + page);
  var output = document.getElementById('webr-output-' + page);
  if (!btn || !output) return;

  output.style.display = 'block';
  output.textContent = 'Loading WebR runtime (~20 MB)... This may take 30-60 seconds on first load.\n';
  btn.disabled = true;
  btn.textContent = 'Loading WebR...';

  if (webrInstance) {
    runValidation(webrInstance, page, output, btn);
    return;
  }

  if (webrLoading) {
    output.textContent += 'WebR is already loading, please wait...\n';
    return;
  }

  webrLoading = true;

  // Dynamically load WebR from CDN
  var script = document.createElement('script');
  script.src = 'https://webr.r-wasm.org/latest/webr.mjs';
  script.type = 'module';

  // Use dynamic import for ES module
  import('https://webr.r-wasm.org/latest/webr.mjs').then(function (module) {
    var WebRClass = module.WebR;
    var webr = new WebRClass();
    return webr.init().then(function () {
      output.textContent += 'WebR loaded successfully.\nInstalling metafor package...\n';
      return webr.installPackages(['metafor']).then(function () {
        output.textContent += 'metafor installed.\n\nRunning validation...\n\n';
        webrInstance = webr;
        webrLoading = false;
        runValidation(webr, page, output, btn);
      });
    });
  }).catch(function (err) {
    webrLoading = false;
    output.textContent += '\nError loading WebR: ' + err.message + '\n';
    output.textContent += '\nFallback: You can validate manually using R or RStudio with the code below:\n\n';
    output.textContent += getRCode(page);
    btn.textContent = 'WebR Failed — R Code Shown Below';
    btn.disabled = false;
  });
}

function runValidation(webr, page, output, btn) {
  var code = getRCode(page);

  webr.evalRString(code).then(function (result) {
    output.textContent += result + '\n';
    btn.textContent = 'Validation Complete';
    btn.disabled = false;
  }).catch(function (err) {
    // If evalRString is not available, try evalR and capture output
    output.textContent += '\nDirect eval failed. Showing R code for manual validation:\n\n';
    output.textContent += code;
    btn.textContent = 'R Code Shown Below';
    btn.disabled = false;
  });
}

function getRCode(page) {
  if (page === 'hf') {
    return [
      '# ═══════════════════════════════════════════════════════════',
      '# NICE Cardiology Review — HF Meta-Analysis Validation',
      '# Run in R 4.x with metafor package installed',
      '# ═══════════════════════════════════════════════════════════',
      'library(metafor)',
      '',
      '# SGLT2i in HFrEF: DAPA-HF + EMPEROR-Reduced',
      'yi_hfref <- log(c(0.74, 0.75))',
      'sei_hfref <- c(',
      '  (log(0.85) - log(0.65)) / (2 * 1.96),',
      '  (log(0.86) - log(0.65)) / (2 * 1.96)',
      ')',
      '',
      'res_hfref <- rma(yi = yi_hfref, sei = sei_hfref, method = "DL")',
      'cat("\\n═══ SGLT2i in HFrEF ═══\\n")',
      'cat(sprintf("Pooled log(HR): %.4f (SE: %.4f)\\n", res_hfref$b, res_hfref$se))',
      'cat(sprintf("Pooled HR: %.4f\\n", exp(res_hfref$b)))',
      'cat(sprintf("95%% CI: %.4f to %.4f\\n", exp(res_hfref$ci.lb), exp(res_hfref$ci.ub)))',
      'cat(sprintf("tau2: %.6f\\n", res_hfref$tau2))',
      'cat(sprintf("I2: %.1f%%\\n", res_hfref$I2))',
      'cat(sprintf("Q: %.4f, p = %.4f\\n", res_hfref$QE, res_hfref$QEp))',
      '',
      '# SGLT2i in HFpEF: EMPEROR-Preserved + DELIVER',
      'yi_hfpef <- log(c(0.79, 0.82))',
      'sei_hfpef <- c(',
      '  (log(0.90) - log(0.69)) / (2 * 1.96),',
      '  (log(0.92) - log(0.73)) / (2 * 1.96)',
      ')',
      '',
      'res_hfpef <- rma(yi = yi_hfpef, sei = sei_hfpef, method = "DL")',
      'cat("\\n═══ SGLT2i in HFpEF ═══\\n")',
      'cat(sprintf("Pooled HR: %.4f\\n", exp(res_hfpef$b)))',
      'cat(sprintf("95%% CI: %.4f to %.4f\\n", exp(res_hfpef$ci.lb), exp(res_hfpef$ci.ub)))',
      'cat(sprintf("I2: %.1f%%\\n", res_hfpef$I2))',
      '',
      'cat("\\n═══ Validation Complete ═══\\n")',
      'cat("Compare these values against the browser-computed results above.\\n")'
    ].join('\n');
  } else {
    return [
      '# ═══════════════════════════════════════════════════════════',
      '# NICE Cardiology Review — ACS Meta-Analysis Validation',
      '# Run in R 4.x with metafor package installed',
      '# ═══════════════════════════════════════════════════════════',
      'library(metafor)',
      '',
      '# Post-ACS lipid intensification: IMPROVE-IT + FOURIER + ODYSSEY',
      'yi_lipid <- log(c(0.936, 0.85, 0.85))',
      'sei_lipid <- c(',
      '  (log(0.99) - log(0.89)) / (2 * 1.96),',
      '  (log(0.92) - log(0.79)) / (2 * 1.96),',
      '  (log(0.93) - log(0.78)) / (2 * 1.96)',
      ')',
      '',
      'res_lipid <- rma(yi = yi_lipid, sei = sei_lipid, method = "DL")',
      'cat("\\n═══ Post-ACS Lipid Intensification ═══\\n")',
      'cat(sprintf("Pooled log(HR): %.4f (SE: %.4f)\\n", res_lipid$b, res_lipid$se))',
      'cat(sprintf("Pooled HR: %.4f\\n", exp(res_lipid$b)))',
      'cat(sprintf("95%% CI: %.4f to %.4f\\n", exp(res_lipid$ci.lb), exp(res_lipid$ci.ub)))',
      'cat(sprintf("tau2: %.6f\\n", res_lipid$tau2))',
      'cat(sprintf("I2: %.1f%%\\n", res_lipid$I2))',
      '',
      '# DAPT shortening (bleeding endpoint): TWILIGHT + TICO',
      'yi_dapt <- log(c(0.56, 0.66))',
      'sei_dapt <- c(',
      '  (log(0.68) - log(0.45)) / (2 * 1.96),',
      '  (log(0.91) - log(0.48)) / (2 * 1.96)',
      ')',
      '',
      'res_dapt <- rma(yi = yi_dapt, sei = sei_dapt, method = "DL")',
      'cat("\\n═══ Short DAPT (Bleeding) ═══\\n")',
      'cat(sprintf("Pooled HR: %.4f\\n", exp(res_dapt$b)))',
      'cat(sprintf("95%% CI: %.4f to %.4f\\n", exp(res_dapt$ci.lb), exp(res_dapt$ci.ub)))',
      'cat(sprintf("I2: %.1f%%\\n", res_dapt$I2))',
      '',
      'cat("\\n═══ Validation Complete ═══\\n")'
    ].join('\n');
  }
}
