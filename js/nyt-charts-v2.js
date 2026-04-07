/* ============================================================
   NYT-Style Visualization Engine v2
   Canvas-based charts with NYT aesthetic:
   - Radar/Spider, Heat Matrix, Sparkline Grid,
     Specification Curve, Ridgeline Density, Beeswarm Strip
   - Muted palette, direct annotations, retina-ready
   ============================================================ */

(function () {
  'use strict';

  /* ── Palette (NYT-inspired, WCAG AA compliant) ── */
  var P = {
    bg: '#ffffff',
    text: '#333333',
    textMuted: '#767676',
    textLight: '#767676',
    axis: '#e0e0e0',
    gridLine: '#f0f0f0',
    nice: '#c0392b',
    esc: '#2471a3',
    aha: '#148f77',
    trial: '#1a5276',
    benefit: '#0e6655',
    harm: '#c0392b',
    accent: '#e67e22',
    accentLight: '#f5cba7',
    highlight: '#f9e79f',
    pop: '#e74c3c',
    subtle: '#d5dbdb'
  };

  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  /* ── Setup canvas for retina ── */
  function setupCanvas(id, height) {
    var canvas = document.getElementById(id);
    if (!canvas) return null;
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth;
    if (W < 1) return null;
    var H = height || 400;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);
    return { ctx: ctx, W: W, H: H };
  }

  /* ── Helpers ── */

  /** Gaussian PDF (for ridgeline density curves) */
  function gaussPDF(x, mu, sigma) {
    var z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }

  /** Hex colour to rgba string */
  function hexToRGBA(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /** Wrap text into multiple lines that fit within maxWidth */
  function wrapText(ctx, text, maxWidth) {
    var words = text.split(' ');
    var lines = [];
    var currentLine = words[0] || '';
    for (var i = 1; i < words.length; i++) {
      var test = currentLine + ' ' + words[i];
      if (ctx.measureText(test).width > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = test;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  /* ════════════════════════════════════════
     1. RADAR / SPIDER CHART
     ════════════════════════════════════════ */

  function drawRadarChart(canvasId, datasets, labels) {
    var numAxes = labels.length;
    if (numAxes < 3) return;

    var c = setupCanvas(canvasId, 420);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var cx = W / 2;
    var cy = H / 2 + 10;
    var maxR = Math.min(W, H) / 2 - 60;
    var maxVal = 2;
    var angleStep = (2 * Math.PI) / numAxes;
    var startAngle = -Math.PI / 2; // 12 o'clock

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('Guideline Feature Comparison (Radar)', W / 2, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('0 = absent, 1 = partial, 2 = comprehensive', W / 2, 38);

    // Concentric grid rings
    var rings = [0.5, 1, 1.5, 2];
    rings.forEach(function (v) {
      var r = (v / maxVal) * maxR;
      ctx.strokeStyle = P.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i <= numAxes; i++) {
        var angle = startAngle + i * angleStep;
        var px = cx + r * Math.cos(angle);
        var py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    });

    // Axis lines + labels
    for (var a = 0; a < numAxes; a++) {
      var angle = startAngle + a * angleStep;
      var ex = cx + maxR * Math.cos(angle);
      var ey = cy + maxR * Math.sin(angle);

      ctx.strokeStyle = P.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Label positioning
      var labelR = maxR + 14;
      var lx = cx + labelR * Math.cos(angle);
      var ly = cy + labelR * Math.sin(angle);

      ctx.fillStyle = P.text;
      ctx.font = '10px ' + FONT;

      // Determine alignment based on angle position
      var normAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (normAngle < 0.1 || normAngle > 2 * Math.PI - 0.1) {
        ctx.textAlign = 'center';
      } else if (normAngle < Math.PI) {
        ctx.textAlign = 'left';
      } else {
        ctx.textAlign = 'right';
      }

      // Use textBaseline for vertical alignment
      if (Math.abs(normAngle - Math.PI * 1.5) < 0.2) {
        ctx.textBaseline = 'bottom';
      } else if (Math.abs(normAngle - Math.PI * 0.5) < 0.2) {
        ctx.textBaseline = 'top';
      } else {
        ctx.textBaseline = 'middle';
      }

      // Wrap long labels
      var maxLabelW = 90;
      var labelLines = wrapText(ctx, labels[a], maxLabelW);
      for (var li = 0; li < labelLines.length; li++) {
        ctx.fillText(labelLines[li], lx, ly + li * 12);
      }
    }
    ctx.textBaseline = 'alphabetic'; // reset

    // Draw each dataset polygon
    // datasets: [{name, values:[], color}]
    datasets.forEach(function (ds) {
      var vals = ds.values;
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = hexToRGBA(ds.color, 0.15);

      ctx.beginPath();
      for (var i = 0; i <= numAxes; i++) {
        var idx = i % numAxes;
        var angle = startAngle + idx * angleStep;
        var r = (vals[idx] / maxVal) * maxR;
        var px = cx + r * Math.cos(angle);
        var py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dots on vertices
      for (var j = 0; j < numAxes; j++) {
        var a2 = startAngle + j * angleStep;
        var r2 = (vals[j] / maxVal) * maxR;
        ctx.fillStyle = ds.color;
        ctx.beginPath();
        ctx.arc(cx + r2 * Math.cos(a2), cy + r2 * Math.sin(a2), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Legend at bottom
    var legY = H - 14;
    ctx.font = '11px ' + FONT;
    ctx.textBaseline = 'alphabetic';
    var legTotalW = 0;
    datasets.forEach(function (ds) { legTotalW += ctx.measureText(ds.name).width + 28; });
    var legX = (W - legTotalW) / 2;
    datasets.forEach(function (ds) {
      ctx.fillStyle = ds.color;
      ctx.beginPath();
      ctx.arc(legX + 4, legY - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.textMuted;
      ctx.textAlign = 'left';
      ctx.fillText(ds.name, legX + 12, legY);
      legX += ctx.measureText(ds.name).width + 28;
    });
  }

  /* ════════════════════════════════════════
     2. HEAT MATRIX
     ════════════════════════════════════════ */

  function drawHeatMatrix(canvasId, data, rowLabels, colLabels, title) {
    var nRows = rowLabels.length;
    var nCols = colLabels.length;
    var cellH = 40;
    var headerH = 80;
    var rowLabelW = 180;
    var totalH = headerH + nRows * cellH + 40;

    var c = setupCanvas(canvasId, totalH);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var cellW = Math.min(140, (W - rowLabelW - 40) / nCols);
    var gridLeft = rowLabelW + 10;
    var gridTop = headerH;

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(title || 'Method Concordance Matrix', 12, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('Green = agrees significant, Red = disagrees, Grey = not applicable', 12, 38);

    // Column headers (rotated)
    ctx.save();
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.text;
    ctx.textAlign = 'left';
    for (var ci = 0; ci < nCols; ci++) {
      var colX = gridLeft + ci * cellW + cellW / 2;
      ctx.save();
      ctx.translate(colX, gridTop - 6);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(colLabels[ci], 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // Colour map: 1=agree(green), -1=disagree(red), 0=NA(grey)
    var colorMap = {};
    colorMap['1'] = P.benefit;
    colorMap['-1'] = P.harm;
    colorMap['0'] = '#bdc3c7';

    // Cells
    for (var ri = 0; ri < nRows; ri++) {
      var ry = gridTop + ri * cellH;

      // Row label
      ctx.fillStyle = P.text;
      ctx.font = '12px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(rowLabels[ri], gridLeft - 10, ry + cellH / 2 + 4);

      for (var cj = 0; cj < nCols; cj++) {
        var rx = gridLeft + cj * cellW;
        var val = data[ri][cj];
        var valStr = String(val);

        // Cell background
        ctx.fillStyle = colorMap[valStr] || '#bdc3c7';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(rx + 1, ry + 1, cellW - 2, cellH - 2);
        ctx.globalAlpha = 1.0;

        // Cell border
        ctx.strokeStyle = P.axis;
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 1, ry + 1, cellW - 2, cellH - 2);

        // Cell text
        var cellText = val === 1 ? 'Yes' : val === -1 ? 'No' : 'N/A';
        ctx.fillStyle = val === 1 ? P.benefit : val === -1 ? P.harm : P.textMuted;
        ctx.font = 'bold 12px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText(cellText, rx + cellW / 2, ry + cellH / 2 + 4);
      }
    }

    // Legend
    var legY = H - 16;
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'left';
    var legends = [
      { color: P.benefit, label: 'Agrees significant' },
      { color: P.harm, label: 'Disagrees' },
      { color: '#bdc3c7', label: 'Not applicable' }
    ];
    var lx = gridLeft;
    legends.forEach(function (leg) {
      ctx.fillStyle = leg.color;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(lx, legY - 8, 14, 14);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = P.textMuted;
      ctx.fillText(leg.label, lx + 18, legY + 3);
      lx += ctx.measureText(leg.label).width + 38;
    });
  }

  /* ════════════════════════════════════════
     3. SPARKLINE GRID (Small Multiples)
     ════════════════════════════════════════ */

  function drawSparklineGrid(canvasId, sparklines) {
    // sparklines: [{label, values:[], unit, highlight}]
    var cols = 3;
    var rows = Math.ceil(sparklines.length / cols);
    var cellW = 200;
    var cellH = 60;
    var padX = 16;
    var padY = 12;
    var totalH = 50 + rows * (cellH + padY);

    var c = setupCanvas(canvasId, totalH);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    // Recalculate cellW based on actual width
    cellW = (W - (cols + 1) * padX) / cols;

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('Trial Metrics at a Glance', 12, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('Sparklines showing per-trial statistical properties', 12, 38);

    sparklines.forEach(function (sp, idx) {
      var col = idx % cols;
      var row = Math.floor(idx / cols);
      var ox = padX + col * (cellW + padX);
      var oy = 50 + row * (cellH + padY);

      var vals = sp.values;
      var n = vals.length;
      if (n < 2) return;

      var minV = Math.min.apply(null, vals);
      var maxV = Math.max.apply(null, vals);
      var rangeV = maxV - minV || 1;

      // Background
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(ox, oy, cellW, cellH);
      ctx.strokeStyle = P.axis;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(ox, oy, cellW, cellH);

      // Label
      ctx.fillStyle = P.text;
      ctx.font = 'bold 10px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText(sp.label, ox + 4, oy + 12);

      // Current value (last)
      var lastVal = vals[n - 1];
      ctx.fillStyle = P.trial;
      ctx.font = 'bold 12px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(lastVal.toFixed(2) + (sp.unit ? ' ' + sp.unit : ''), ox + cellW - 4, oy + 12);

      // Sparkline
      var sparkTop = oy + 18;
      var sparkH = cellH - 22;
      var sparkW = cellW - 8;

      ctx.strokeStyle = sp.highlight || P.trial;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var sx = ox + 4 + (i / (n - 1)) * sparkW;
        var sy = sparkTop + sparkH - ((vals[i] - minV) / rangeV) * sparkH;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // End dot
      var endX = ox + 4 + sparkW;
      var endY = sparkTop + sparkH - ((lastVal - minV) / rangeV) * sparkH;
      ctx.fillStyle = sp.highlight || P.trial;
      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /* ════════════════════════════════════════
     4. SPECIFICATION CURVE
     ════════════════════════════════════════ */

  function drawSpecCurve(canvasId, specs, title) {
    // specs: [{label, hr, ciLo, ciHi, estimator, inclusion}]
    // Sort by HR
    var sorted = specs.slice().sort(function (a, b) { return a.hr - b.hr; });
    var n = sorted.length;

    var topPanelH = 220;
    var bottomPanelH = 100;
    var gap = 20;
    var totalH = topPanelH + gap + bottomPanelH + 60;

    var c = setupCanvas(canvasId, totalH);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 60, marginR = 30, marginT = 50;
    var plotW = W - marginL - marginR;

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(title || 'Specification Curve: Multiverse Analysis', 12, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('Each point = one estimator x inclusion combination, sorted by HR', 12, 38);

    // ── TOP PANEL: HR estimates with CI ──
    var allVals = [];
    sorted.forEach(function (s) { allVals.push(s.ciLo, s.ciHi); });
    var yMin = Math.min.apply(null, allVals) * 0.95;
    var yMax = Math.max.apply(null, allVals) * 1.05;

    function yPos(v) {
      return marginT + (1 - (v - yMin) / (yMax - yMin)) * (topPanelH - 10);
    }

    // Y-axis gridlines
    var yTicks = [];
    var yStep = 0.05;
    for (var yv = Math.ceil(yMin / yStep) * yStep; yv <= yMax; yv += yStep) {
      yTicks.push(Math.round(yv * 100) / 100);
    }
    yTicks.forEach(function (v) {
      var y = yPos(v);
      ctx.strokeStyle = P.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginL, y);
      ctx.lineTo(W - marginR, y);
      ctx.stroke();
      ctx.fillStyle = P.textLight;
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(2), marginL - 6, y + 4);
    });

    // Null line at HR = 1
    if (yMin < 1 && yMax > 1) {
      var nullY = yPos(1);
      ctx.strokeStyle = P.text;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(marginL, nullY);
      ctx.lineTo(W - marginR, nullY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = P.textMuted;
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText('HR = 1', W - marginR + 4, nullY + 3);
    }

    // Y-axis label
    ctx.save();
    ctx.fillStyle = P.textMuted;
    ctx.font = '11px ' + FONT;
    ctx.translate(14, marginT + (topPanelH - 10) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Hazard Ratio', 0, 0);
    ctx.restore();

    // Plot points + whiskers
    sorted.forEach(function (s, i) {
      var x = marginL + (i + 0.5) / n * plotW;
      var yHR = yPos(s.hr);
      var yLo = yPos(s.ciLo);
      var yHi = yPos(s.ciHi);

      var colour = s.hr < 1 ? P.benefit : P.harm;

      // CI whisker
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, yLo);
      ctx.lineTo(x, yHi);
      ctx.stroke();

      // Caps
      ctx.beginPath();
      ctx.moveTo(x - 3, yLo);
      ctx.lineTo(x + 3, yLo);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 3, yHi);
      ctx.lineTo(x + 3, yHi);
      ctx.stroke();

      // Point
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(x, yHR, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── BOTTOM PANEL: Indicator dots ──
    var bpTop = marginT + topPanelH + gap;

    // Collect unique estimators and inclusions
    var estimators = [];
    var inclusions = [];
    sorted.forEach(function (s) {
      if (estimators.indexOf(s.estimator) === -1) estimators.push(s.estimator);
      if (inclusions.indexOf(s.inclusion) === -1) inclusions.push(s.inclusion);
    });
    var allIndicators = estimators.concat(inclusions);

    var indicatorH = bottomPanelH / allIndicators.length;

    // Row labels
    ctx.fillStyle = P.text;
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'right';
    allIndicators.forEach(function (ind, ri) {
      ctx.fillText(ind, marginL - 6, bpTop + ri * indicatorH + indicatorH / 2 + 3);
    });

    // Separator line between panels
    ctx.strokeStyle = P.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginL, bpTop - 4);
    ctx.lineTo(W - marginR, bpTop - 4);
    ctx.stroke();

    // Dots
    sorted.forEach(function (s, i) {
      var x = marginL + (i + 0.5) / n * plotW;
      var colour = s.hr < 1 ? P.benefit : P.harm;

      allIndicators.forEach(function (ind, ri) {
        var cy = bpTop + ri * indicatorH + indicatorH / 2;

        // Check if this spec has this indicator active
        var active = (s.estimator === ind || s.inclusion === ind);

        if (active) {
          ctx.fillStyle = colour;
          ctx.beginPath();
          ctx.arc(x, cy, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#eeeeee';
          ctx.beginPath();
          ctx.arc(x, cy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
  }

  /* ════════════════════════════════════════
     5. RIDGELINE DENSITY
     ════════════════════════════════════════ */

  function drawRidgeline(canvasId, distributions, title) {
    // distributions: [{label, mean, sd, color}]
    var nDist = distributions.length;
    var rowH = 90;
    var totalH = 60 + nDist * rowH + 40;

    var c = setupCanvas(canvasId, totalH);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 160, marginR = 30, marginT = 55;
    var plotW = W - marginL - marginR;

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(title || 'Bayesian Posterior Distributions', 12, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('Gaussian approximation from prior + SGLT2i data', 12, 38);

    // Determine x-range from all distributions
    var xMin = Infinity, xMax = -Infinity;
    distributions.forEach(function (d) {
      var lo = d.mean - 4 * d.sd;
      var hi = d.mean + 4 * d.sd;
      if (lo < xMin) xMin = lo;
      if (hi > xMax) xMax = hi;
    });
    // Add some padding
    var xPad = (xMax - xMin) * 0.05;
    xMin -= xPad;
    xMax += xPad;

    function xPos(v) { return marginL + ((v - xMin) / (xMax - xMin)) * plotW; }

    // Vertical reference line at HR=1 (log(HR)=0)
    var refX = xPos(0);
    if (refX >= marginL && refX <= marginL + plotW) {
      ctx.strokeStyle = P.text;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(refX, marginT);
      ctx.lineTo(refX, marginT + nDist * rowH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = P.textMuted;
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('HR = 1', refX, marginT + nDist * rowH + 14);
    }

    // X-axis ticks
    var hrTicks = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
    ctx.font = '10px ' + FONT;
    ctx.fillStyle = P.textLight;
    ctx.textAlign = 'center';
    hrTicks.forEach(function (hr) {
      var logHR = Math.log(hr);
      if (logHR >= xMin && logHR <= xMax) {
        var x = xPos(logHR);
        ctx.fillText(hr.toFixed(1), x, marginT + nDist * rowH + 14);

        // Gridline
        ctx.strokeStyle = P.gridLine;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, marginT);
        ctx.lineTo(x, marginT + nDist * rowH);
        ctx.stroke();
      }
    });

    // X-axis label
    ctx.fillStyle = P.textMuted;
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('Hazard Ratio (log scale)', marginL + plotW / 2, marginT + nDist * rowH + 30);

    // Draw each density curve (bottom to top for overlap)
    for (var di = nDist - 1; di >= 0; di--) {
      var d = distributions[di];
      var baseY = marginT + di * rowH + rowH;

      // Label
      ctx.fillStyle = P.text;
      ctx.font = '12px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(d.label, marginL - 10, baseY - rowH / 2 + 4);

      // Baseline
      ctx.strokeStyle = P.axis;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(marginL, baseY);
      ctx.lineTo(marginL + plotW, baseY);
      ctx.stroke();

      // Density curve
      var nPoints = 200;
      var step = (xMax - xMin) / nPoints;
      var maxDensity = gaussPDF(d.mean, d.mean, d.sd);
      var peakH = rowH * 0.85; // max height

      ctx.fillStyle = hexToRGBA(d.color, 0.25);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2;

      // Fill
      ctx.beginPath();
      ctx.moveTo(xPos(xMin), baseY);
      for (var xi = 0; xi <= nPoints; xi++) {
        var xv = xMin + xi * step;
        var density = gaussPDF(xv, d.mean, d.sd);
        var h = (density / maxDensity) * peakH;
        ctx.lineTo(xPos(xv), baseY - h);
      }
      ctx.lineTo(xPos(xMax), baseY);
      ctx.closePath();
      ctx.fill();

      // Stroke
      ctx.beginPath();
      for (var xj = 0; xj <= nPoints; xj++) {
        var xv2 = xMin + xj * step;
        var density2 = gaussPDF(xv2, d.mean, d.sd);
        var h2 = (density2 / maxDensity) * peakH;
        if (xj === 0) ctx.moveTo(xPos(xv2), baseY - h2);
        else ctx.lineTo(xPos(xv2), baseY - h2);
      }
      ctx.stroke();

      // Mean annotation
      var meanX = xPos(d.mean);
      var meanHR = Math.exp(d.mean);
      ctx.fillStyle = d.color;
      ctx.font = 'bold 10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('HR ' + meanHR.toFixed(2), meanX, baseY - peakH - 4);
    }
  }

  /* ════════════════════════════════════════
     6. BEESWARM STRIP
     ════════════════════════════════════════ */

  function drawBeeswarm(canvasId, points, title) {
    // points: [{label, logHR, weight, category, color}]
    var c = setupCanvas(canvasId, 320);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 60, marginR = 40, marginT = 55, marginB = 50;
    var plotW = W - marginL - marginR;
    var plotH = H - marginT - marginB;
    var centerY = marginT + plotH / 2;

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(title || 'Study Effect Sizes (Beeswarm)', 12, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('Point size proportional to study weight; jittered to avoid overlap', 12, 38);

    // X-axis range
    var allX = points.map(function (p) { return p.logHR; });
    var xMin = Math.min.apply(null, allX) - 0.1;
    var xMax = Math.max.apply(null, allX) + 0.1;

    function xPos(v) { return marginL + ((v - xMin) / (xMax - xMin)) * plotW; }

    // X-axis gridlines & ticks
    var xStep = 0.1;
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'center';
    for (var xv = Math.ceil(xMin / xStep) * xStep; xv <= xMax; xv += xStep) {
      var x = xPos(xv);
      var rounded = Math.round(xv * 100) / 100;

      ctx.strokeStyle = P.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, marginT);
      ctx.lineTo(x, H - marginB);
      ctx.stroke();

      ctx.fillStyle = P.textLight;
      ctx.fillText(rounded.toFixed(2), x, H - marginB + 14);
    }

    // Null line at log(HR) = 0
    var nullX = xPos(0);
    if (nullX >= marginL && nullX <= marginL + plotW) {
      ctx.strokeStyle = P.text;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(nullX, marginT);
      ctx.lineTo(nullX, H - marginB);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // X-axis label
    ctx.fillStyle = P.textMuted;
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('log(HR)', marginL + plotW / 2, H - 8);

    // Beeswarm jitter: simple dodge algorithm
    // Sort by x position, then stack vertically
    var maxWeight = Math.max.apply(null, points.map(function (p) { return p.weight; }));
    var minR = 5, maxR = 16;

    // Compute radius for each point
    var placed = [];
    var sortedPts = points.slice().sort(function (a, b) { return a.logHR - b.logHR; });

    sortedPts.forEach(function (p) {
      var px = xPos(p.logHR);
      var r = minR + (p.weight / maxWeight) * (maxR - minR);
      var py = centerY;

      // Dodge: check overlap with placed points
      var attempts = 0;
      var direction = 1;
      var offset = 0;
      var step = 3;

      while (attempts < 80) {
        var overlaps = false;
        for (var k = 0; k < placed.length; k++) {
          var dx = px - placed[k].x;
          var dy = py - placed[k].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var minDist = r + placed[k].r + 1;
          if (dist < minDist) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) break;

        offset += step;
        py = centerY + offset * direction;
        direction *= -1;
        if (direction === 1) offset += step;
        attempts++;

        // Stay within bounds
        if (py < marginT + r) py = marginT + r;
        if (py > H - marginB - r) py = H - marginB - r;
      }

      placed.push({ x: px, y: py, r: r, point: p });
    });

    // Draw points
    placed.forEach(function (pl) {
      var p = pl.point;
      ctx.fillStyle = hexToRGBA(p.color || P.trial, 0.6);
      ctx.strokeStyle = p.color || P.trial;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label (only for larger points or non-overlapping)
      if (pl.r >= 8) {
        ctx.fillStyle = P.text;
        ctx.font = '9px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText(p.label, pl.x, pl.y - pl.r - 4);
      }
    });

    // Legend: collect unique categories
    var cats = {};
    points.forEach(function (p) {
      if (p.category && !cats[p.category]) {
        cats[p.category] = p.color || P.trial;
      }
    });
    var catKeys = Object.keys(cats);
    if (catKeys.length > 0) {
      var legY = marginT - 8;
      ctx.font = '11px ' + FONT;
      var legX = W - marginR;
      for (var ci = catKeys.length - 1; ci >= 0; ci--) {
        var catName = catKeys[ci];
        var tw = ctx.measureText(catName).width;
        legX -= tw + 24;
        ctx.fillStyle = cats[catName];
        ctx.beginPath();
        ctx.arc(legX, legY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = P.textMuted;
        ctx.textAlign = 'left';
        ctx.fillText(catName, legX + 8, legY + 4);
      }
    }
  }

  /* ════════════════════════════════════════
     INIT: Heart Failure V2 Charts
     ════════════════════════════════════════ */

  function initHFChartsV2() {
    var container = document.getElementById('nyt-charts-v2-hf');
    if (!container) return;

    var html = '<h3 style="font-size:1.3rem;font-weight:700;color:#1b2a4a;margin-bottom:0.5rem;">Advanced Data Visualisations</h3>';
    html += '<p style="font-size:0.85rem;color:#767676;margin-bottom:1.5rem;">Multiverse, Bayesian, and comparative analytics rendered client-side on canvas.</p>';

    // 1. Radar chart
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-hf-radar" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    // 2. Specification curve
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-hf-speccurve" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    // 3. Ridgeline
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-hf-ridgeline" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    container.innerHTML = html;

    setTimeout(function () {
      // 1. Radar: 10-feature NICE vs ESC vs AHA
      drawRadarChart('chart-hf-radar', [
        {
          name: 'NICE',
          color: P.nice,
          values: [0, 0, 0, 0, 0, 0, 1, 1, 0, 0]
        },
        {
          name: 'ESC',
          color: P.esc,
          values: [2, 2, 1, 2, 2, 1, 2, 2, 2, 2]
        },
        {
          name: 'AHA/ACC',
          color: P.aha,
          values: [2, 2, 2, 1, 2, 1, 1, 1, 1, 1]
        }
      ], [
        'SGLT2i in algorithm', 'Quadruple pathway', 'De novo ARNi',
        'HFpEF Rx', 'Rapid uptitration', 'ICD risk stratify',
        'Biomarker monitor', 'Palliative triggers', 'Leadless PM', 'CRT pacing'
      ]);

      // 2. Specification curve: multiverse HRs for HFrEF
      drawSpecCurve('chart-hf-speccurve', [
        { label: 'DL-all',    hr: 0.74, ciLo: 0.67, ciHi: 0.82, estimator: 'DerSimonian-Laird', inclusion: 'All trials' },
        { label: 'FE-all',    hr: 0.75, ciLo: 0.69, ciHi: 0.81, estimator: 'Fixed-effect',      inclusion: 'All trials' },
        { label: 'DL-drop0',  hr: 0.72, ciLo: 0.64, ciHi: 0.81, estimator: 'DerSimonian-Laird', inclusion: 'Drop lowest' },
        { label: 'DL-drop1',  hr: 0.76, ciLo: 0.68, ciHi: 0.85, estimator: 'DerSimonian-Laird', inclusion: 'Drop highest' },
        { label: 'FE-drop0',  hr: 0.73, ciLo: 0.66, ciHi: 0.80, estimator: 'Fixed-effect',      inclusion: 'Drop lowest' },
        { label: 'FE-drop1',  hr: 0.77, ciLo: 0.70, ciHi: 0.84, estimator: 'Fixed-effect',      inclusion: 'Drop highest' }
      ], 'Specification Curve: SGLT2i in HFrEF (Multiverse)');

      // 3. Ridgeline: 3 posteriors (log HR scale)
      // Vague: N(log(0.77), 0.5) => posterior dominated by data
      // Sceptical: N(0, 0.2) => centred on null
      // Enthusiastic: N(-0.3, 0.3) => prior favouring benefit
      // Posterior approximations after data (DAPA-HF + EMPEROR-Reduced):
      //   Data likelihood centred at ~log(0.745) = -0.295, SE ~ 0.06
      var dataLogHR = Math.log(0.745);
      var dataSE = 0.06;

      // Posterior mean = (prior_mean/prior_var + data_mean/data_var) / (1/prior_var + 1/data_var)
      // Posterior var = 1 / (1/prior_var + 1/data_var)
      function posteriorNormal(priorMu, priorSD) {
        var priorVar = priorSD * priorSD;
        var dataVar = dataSE * dataSE;
        var postVar = 1 / (1 / priorVar + 1 / dataVar);
        var postMu = postVar * (priorMu / priorVar + dataLogHR / dataVar);
        return { mean: postMu, sd: Math.sqrt(postVar) };
      }

      var vague = posteriorNormal(0, 0.5);
      var sceptical = posteriorNormal(0, 0.2);
      var enthusiastic = posteriorNormal(-0.3, 0.3);

      drawRidgeline('chart-hf-ridgeline', [
        { label: 'Vague prior posterior', mean: vague.mean, sd: vague.sd, color: P.esc },
        { label: 'Sceptical prior posterior', mean: sceptical.mean, sd: sceptical.sd, color: P.accent },
        { label: 'Enthusiastic prior posterior', mean: enthusiastic.mean, sd: enthusiastic.sd, color: P.benefit }
      ], 'Bayesian Posteriors: SGLT2i in HFrEF');
    }, 100);
  }

  /* ════════════════════════════════════════
     INIT: ACS V2 Charts
     ════════════════════════════════════════ */

  function initACSChartsV2() {
    var container = document.getElementById('nyt-charts-v2-acs');
    if (!container) return;

    var html = '<h3 style="font-size:1.3rem;font-weight:700;color:#1b2a4a;margin-bottom:0.5rem;">Advanced Data Visualisations</h3>';
    html += '<p style="font-size:0.85rem;color:#767676;margin-bottom:1.5rem;">Method concordance, effect distribution, and comparative analytics.</p>';

    // 1. Radar chart
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-acs-radar" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    // 2. Heat matrix
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-acs-heatmatrix" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    // 3. Beeswarm
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-acs-beeswarm" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    container.innerHTML = html;

    setTimeout(function () {
      // 1. Radar: ACS 10-feature comparison
      drawRadarChart('chart-acs-radar', [
        {
          name: 'NICE',
          color: P.nice,
          values: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0]
        },
        {
          name: 'ESC',
          color: P.esc,
          values: [2, 2, 2, 2, 2, 2, 2, 2, 1, 0]
        },
        {
          name: 'AHA/ACC',
          color: P.aha,
          values: [2, 2, 1, 1, 1, 1, 2, 2, 1, 0]
        }
      ], [
        'LDL <1.4', 'Risk DAPT', 'PRECISE-DAPT', '0/1h troponin',
        'MINOCA pathway', 'Prasugrel pref', 'DAPT de-escalation',
        'Ezetimibe pathway', 'Digital CR', 'CR equity KPIs'
      ]);

      // 2. Heat matrix: 6 methods x 3 conclusions
      // 1=agrees significant, -1=disagrees, 0=N/A
      drawHeatMatrix('chart-acs-heatmatrix', [
        // DL random-effects
        [ 1,  1,  1],
        // Fixed-effect
        [ 1,  1,  1],
        // HKSJ (Hartung-Knapp)
        [ 1,  1, -1],
        // Bayesian (vague prior)
        [ 1,  1,  1],
        // Bayesian (sceptical)
        [-1,  1, -1],
        // Leave-one-out sensitivity
        [ 1,  1,  0]
      ], [
        'DL random-effects',
        'Fixed-effect (IV)',
        'Hartung-Knapp-SJ',
        'Bayesian (vague)',
        'Bayesian (sceptical)',
        'Leave-one-out'
      ], [
        'SGLT2i benefit',
        'Lipid benefit',
        'DAPT shorten OK'
      ], 'Method Concordance: ACS Key Conclusions');

      // 3. Beeswarm: ACS trial effect sizes
      drawBeeswarm('chart-acs-beeswarm', [
        { label: 'IMPROVE-IT',    logHR: Math.log(0.936), weight: 18144, category: 'Lipid',    color: P.benefit },
        { label: 'FOURIER',       logHR: Math.log(0.85),  weight: 27564, category: 'Lipid',    color: P.benefit },
        { label: 'ODYSSEY',       logHR: Math.log(0.85),  weight: 18924, category: 'Lipid',    color: P.benefit },
        { label: 'TWILIGHT',      logHR: Math.log(0.56),  weight: 7119,  category: 'DAPT',     color: P.esc },
        { label: 'ISAR-REACT 5', logHR: Math.log(0.74),  weight: 4018,  category: 'DAPT',     color: P.esc },
        { label: 'TICO',          logHR: Math.log(0.66),  weight: 3056,  category: 'DAPT',     color: P.esc },
        { label: 'GLOBAL LEADERS',logHR: Math.log(0.99),  weight: 15991, category: 'DAPT',     color: P.esc },
        { label: 'PLATO',         logHR: Math.log(0.84),  weight: 18624, category: 'P2Y12',    color: P.accent },
        { label: 'TRITON-TIMI 38',logHR: Math.log(0.81),  weight: 13608, category: 'P2Y12',    color: P.accent }
      ], 'ACS Trial Effect Sizes (Beeswarm)');
    }, 100);
  }

  /* ════════════════════════════════════════
     INIT: Entry point on DOMContentLoaded
     ════════════════════════════════════════ */

  function initNYTChartsV2() {
    initHFChartsV2();
    initACSChartsV2();
  }

  document.addEventListener('DOMContentLoaded', initNYTChartsV2);

  /* ── Expose chart functions for external use ── */
  window.NYTChartsV2 = {
    drawRadarChart: drawRadarChart,
    drawHeatMatrix: drawHeatMatrix,
    drawSparklineGrid: drawSparklineGrid,
    drawSpecCurve: drawSpecCurve,
    drawRidgeline: drawRidgeline,
    drawBeeswarm: drawBeeswarm
  };
})();
