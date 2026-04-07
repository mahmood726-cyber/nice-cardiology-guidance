/* ============================================================
   NYT-Style Visualization Engine
   Canvas-based charts with NYT aesthetic:
   - Muted palette with strategic colour pops
   - Direct annotations on data points
   - Clean axes, no chartjunk
   - Responsive, retina-ready
   ============================================================ */

(function () {
  'use strict';

  /* ── Palette (NYT-inspired) ── */
  var P = {
    bg: '#ffffff',
    text: '#333333',
    textMuted: '#767676',   // WCAG AA compliant (4.54:1)
    textLight: '#767676',   // WCAG AA compliant (was #aaa at 2.32:1)
    axis: '#e0e0e0',
    gridLine: '#f0f0f0',
    nice: '#c0392b',    // red for NICE
    esc: '#2471a3',     // blue for ESC
    aha: '#148f77',     // teal for AHA
    trial: '#1a5276',   // navy for trial data
    benefit: '#0e6655', // green for benefit
    harm: '#c0392b',    // red for harm
    accent: '#e67e22',  // orange accent
    accentLight: '#f5cba7',
    highlight: '#f9e79f',
    pop: '#e74c3c',     // pop colour for key data points
    subtle: '#d5dbdb'
  };

  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  /* ── Setup canvas for retina ── */
  function setupCanvas(id, height) {
    var canvas = document.getElementById(id);
    if (!canvas) return null;
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth;
    if (W < 1) return null; // canvas not visible yet
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
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ════════════════════════════════════════
     1. EVIDENCE LAG TIMELINE (Gantt-style)
     ════════════════════════════════════════ */

  function drawEvidenceLagTimeline(canvasId, data) {
    var c = setupCanvas(canvasId, 320);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 150, marginR = 30, marginT = 50, marginB = 50;
    var plotW = W - marginL - marginR;
    var plotH = H - marginT - marginB;

    // data: [{label, trialDate, escDate, niceDate}]
    var minDate = new Date('2019-01-01'), maxDate = new Date('2024-06-01');
    var range = maxDate - minDate;
    function xPos(d) { return marginL + ((new Date(d) - minDate) / range) * plotW; }

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('Evidence-to-Guideline Adoption Timeline', marginL, 24);
    ctx.font = '12px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('Time from trial publication to guideline incorporation', marginL, 40);

    // Year gridlines
    ctx.strokeStyle = P.gridLine;
    ctx.lineWidth = 1;
    for (var yr = 2019; yr <= 2024; yr++) {
      var x = xPos(yr + '-01-01');
      ctx.beginPath(); ctx.moveTo(x, marginT); ctx.lineTo(x, H - marginB); ctx.stroke();
      ctx.fillStyle = P.textLight;
      ctx.font = '11px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(yr.toString(), x, H - marginB + 16);
    }

    var rowH = plotH / data.length;
    data.forEach(function (d, i) {
      var y = marginT + i * rowH + rowH / 2;

      // Label
      ctx.fillStyle = P.text;
      ctx.font = '13px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(d.label, marginL - 12, y + 4);

      // Trial → ESC bar
      var xTrial = xPos(d.trialDate);
      var xESC = xPos(d.escDate);
      var xNICE = xPos(d.niceDate);

      // Background bar (full span)
      ctx.fillStyle = '#fef2f2';
      roundRect(ctx, xTrial, y - 10, xNICE - xTrial, 20, 4);
      ctx.fill();

      // Trial → ESC (blue)
      ctx.fillStyle = P.esc + '40';
      roundRect(ctx, xTrial, y - 10, xESC - xTrial, 20, 4);
      ctx.fill();

      // Trial dot
      ctx.fillStyle = P.trial;
      ctx.beginPath(); ctx.arc(xTrial, y, 6, 0, Math.PI * 2); ctx.fill();

      // ESC dot
      ctx.fillStyle = P.esc;
      ctx.beginPath(); ctx.arc(xESC, y, 6, 0, Math.PI * 2); ctx.fill();

      // NICE dot (red, larger — the critique point)
      ctx.fillStyle = P.nice;
      ctx.beginPath(); ctx.arc(xNICE, y, 8, 0, Math.PI * 2); ctx.fill();

      // Months annotation
      var months = Math.round((new Date(d.niceDate) - new Date(d.trialDate)) / (1000 * 60 * 60 * 24 * 30.44));
      ctx.fillStyle = P.nice;
      ctx.font = 'bold 11px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText(months + ' mo', xNICE + 12, y + 4);
    });

    // Legend
    var legY = H - 12;
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'left';
    [{ c: P.trial, l: 'Trial published' }, { c: P.esc, l: 'ESC adopted' }, { c: P.nice, l: 'NICE TA issued' }].forEach(function (item, idx) {
      var lx = marginL + idx * 140;
      ctx.fillStyle = item.c;
      ctx.beginPath(); ctx.arc(lx, legY, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.textMuted;
      ctx.fillText(item.l, lx + 8, legY + 4);
    });
  }

  /* ════════════════════════════════════════
     2. LOLLIPOP CHART (Guideline Comparison)
     ════════════════════════════════════════ */

  function drawLollipopComparison(canvasId, data) {
    var c = setupCanvas(canvasId, 50 + data.length * 44);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 200, marginR = 60, marginT = 45, marginB = 30;
    var plotW = W - marginL - marginR;

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText('NICE vs ESC vs AHA/ACC: Feature Comparison', 12, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('Score: 0 = absent, 1 = partial, 2 = comprehensive', 12, 38);

    // data: [{feature, nice, esc, aha}]
    var maxVal = 2;
    function xPos(v) { return marginL + (v / maxVal) * plotW; }

    // Grid
    ctx.strokeStyle = P.gridLine;
    ctx.lineWidth = 1;
    for (var v = 0; v <= 2; v++) {
      var x = xPos(v);
      ctx.beginPath(); ctx.moveTo(x, marginT); ctx.lineTo(x, H - marginB); ctx.stroke();
      ctx.fillStyle = P.textLight;
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(v.toString(), x, H - marginB + 14);
    }

    var rowH = (H - marginT - marginB) / data.length;
    data.forEach(function (d, i) {
      var y = marginT + i * rowH + rowH / 2;

      // Label
      ctx.fillStyle = P.text;
      ctx.font = '12px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(d.feature, marginL - 10, y + 4);

      // Horizontal line from 0
      ctx.strokeStyle = P.axis;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xPos(0), y); ctx.lineTo(xPos(maxVal), y); ctx.stroke();

      // NICE dot (red)
      ctx.fillStyle = P.nice;
      ctx.beginPath(); ctx.arc(xPos(d.nice), y - 6, 5, 0, Math.PI * 2); ctx.fill();

      // ESC dot (blue)
      ctx.fillStyle = P.esc;
      ctx.beginPath(); ctx.arc(xPos(d.esc), y, 5, 0, Math.PI * 2); ctx.fill();

      // AHA dot (teal)
      ctx.fillStyle = P.aha;
      ctx.beginPath(); ctx.arc(xPos(d.aha), y + 6, 5, 0, Math.PI * 2); ctx.fill();
    });

    // Legend
    var legY = marginT - 8;
    ctx.font = '11px ' + FONT;
    [{ c: P.nice, l: 'NICE' }, { c: P.esc, l: 'ESC' }, { c: P.aha, l: 'AHA/ACC' }].forEach(function (item, idx) {
      var lx = W - marginR - (2 - idx) * 80;
      ctx.fillStyle = item.c;
      ctx.beginPath(); ctx.arc(lx, legY, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.textMuted;
      ctx.fillText(item.l, lx + 8, legY + 4);
    });
  }

  /* ════════════════════════════════════════
     3. WAFFLE CHART (Population Impact)
     ════════════════════════════════════════ */

  function drawWaffleChart(canvasId, total, affected, label, sublabel) {
    var c = setupCanvas(canvasId, 200);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var cols = 20, rows = 5;
    var totalCells = cols * rows;
    var filledCells = Math.round((affected / total) * totalCells);

    var cellSize = Math.min((W - 40) / cols, (H - 70) / rows) - 2;
    var startX = (W - cols * (cellSize + 2)) / 2;
    var startY = 45;

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 14px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(label, W / 2, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText(sublabel, W / 2, 38);

    var cellIdx = 0;
    for (var r = 0; r < rows; r++) {
      for (var col = 0; col < cols; col++) {
        var x = startX + col * (cellSize + 2);
        var y = startY + r * (cellSize + 2);
        ctx.fillStyle = cellIdx < filledCells ? P.pop : '#f0f0f0';
        roundRect(ctx, x, y, cellSize, cellSize, 2);
        ctx.fill();
        cellIdx++;
      }
    }

    // Stat
    var pct = (affected / total * 100).toFixed(0);
    ctx.fillStyle = P.pop;
    ctx.font = 'bold 18px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(pct + '% affected', W / 2, H - 16);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText(affected.toLocaleString() + ' of ' + total.toLocaleString() + ' patients', W / 2, H - 2);
  }

  /* ════════════════════════════════════════
     4. SLOPE CHART (Before/After Comparison)
     ════════════════════════════════════════ */

  function drawSlopeChart(canvasId, data) {
    var c = setupCanvas(canvasId, 280);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 120, marginR = 120, marginT = 50, marginB = 40;
    var plotH = H - marginT - marginB;

    // data: [{label, left, right, color}]
    // left = NICE metric, right = ESC metric
    var allVals = data.reduce(function (a, d) { return a.concat([d.left, d.right]); }, []);
    var minVal = Math.min.apply(null, allVals) * 0.8;
    var maxVal = Math.max.apply(null, allVals) * 1.1;
    function yPos(v) { return marginT + (1 - (v - minVal) / (maxVal - minVal)) * plotH; }

    // Title
    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('NICE vs ESC: Key Metrics', W / 2, 22);

    // Column headers
    ctx.font = 'bold 12px ' + FONT;
    ctx.fillStyle = P.nice;
    ctx.textAlign = 'center';
    ctx.fillText('NICE', marginL, marginT - 10);
    ctx.fillStyle = P.esc;
    ctx.fillText('ESC', W - marginR, marginT - 10);

    // Vertical lines
    ctx.strokeStyle = P.axis;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(marginL, marginT); ctx.lineTo(marginL, H - marginB); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - marginR, marginT); ctx.lineTo(W - marginR, H - marginB); ctx.stroke();

    data.forEach(function (d) {
      var yL = yPos(d.left);
      var yR = yPos(d.right);

      // Connecting line
      ctx.strokeStyle = d.color || P.accent;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(marginL, yL); ctx.lineTo(W - marginR, yR); ctx.stroke();

      // Left dot + value
      ctx.fillStyle = P.nice;
      ctx.beginPath(); ctx.arc(marginL, yL, 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '11px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(d.left + ' ' + (d.unit || ''), marginL - 10, yL + 4);

      // Right dot + value
      ctx.fillStyle = P.esc;
      ctx.beginPath(); ctx.arc(W - marginR, yR, 5, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillText(d.right + ' ' + (d.unit || ''), W - marginR + 10, yR + 4);

      // Label in middle
      ctx.fillStyle = P.text;
      ctx.font = '11px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(d.label, W / 2, (yL + yR) / 2 - 6);
    });
  }

  /* ════════════════════════════════════════
     5. DOT STRIP CHART (Effect Size Comparison)
     ════════════════════════════════════════ */

  function drawDotStrip(canvasId, studies, title) {
    var c = setupCanvas(canvasId, 160);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 30, marginR = 30, marginT = 45, marginB = 35;
    var plotW = W - marginL - marginR;

    // studies: [{label, hr, ci_lo, ci_hi, color}]
    var logMin = Math.log(0.5), logMax = Math.log(1.5);
    function xPos(hr) { return marginL + (Math.log(Math.max(0.5, Math.min(1.5, hr))) - logMin) / (logMax - logMin) * plotW; }

    ctx.fillStyle = P.text;
    ctx.font = 'bold 14px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(title || 'Effect Sizes (HR)', 12, 22);

    // Null line
    var nullX = xPos(1.0);
    ctx.strokeStyle = P.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(nullX, marginT); ctx.lineTo(nullX, H - marginB); ctx.stroke();
    ctx.setLineDash([]);

    // Favour labels
    ctx.fillStyle = P.textLight;
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('Favours treatment', (marginL + nullX) / 2, H - 8);
    ctx.fillText('Favours control', (nullX + W - marginR) / 2, H - 8);

    // Scale
    [0.5, 0.75, 1.0, 1.25, 1.5].forEach(function (v) {
      var x = xPos(v);
      ctx.fillStyle = P.textLight;
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(v.toFixed(2), x, H - marginB + 14);
      ctx.strokeStyle = P.gridLine;
      ctx.beginPath(); ctx.moveTo(x, marginT); ctx.lineTo(x, H - marginB); ctx.stroke();
    });

    var rowH = (H - marginT - marginB) / studies.length;
    studies.forEach(function (s, i) {
      var y = marginT + i * rowH + rowH / 2;

      // CI line
      ctx.strokeStyle = s.color || P.trial;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xPos(s.ci_lo), y); ctx.lineTo(xPos(s.ci_hi), y); ctx.stroke();

      // Point
      ctx.fillStyle = s.color || P.trial;
      ctx.beginPath(); ctx.arc(xPos(s.hr), y, 6, 0, Math.PI * 2); ctx.fill();

      // Label
      ctx.fillStyle = P.text;
      ctx.font = '11px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(s.label, xPos(s.ci_lo) - 8, y + 4);

      // Value
      ctx.textAlign = 'left';
      ctx.fillText(s.hr.toFixed(2), xPos(s.ci_hi) + 8, y + 4);
    });
  }

  /* ════════════════════════════════════════
     6. BAR CHART (Horizontal, for metrics)
     ════════════════════════════════════════ */

  function drawHorizontalBars(canvasId, data, title) {
    var c = setupCanvas(canvasId, 40 + data.length * 38);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 180, marginR = 60, marginT = 35;
    var plotW = W - marginL - marginR;
    var maxVal = Math.max.apply(null, data.map(function (d) { return d.value; }));

    ctx.fillStyle = P.text;
    ctx.font = 'bold 14px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(title || '', 12, 22);

    data.forEach(function (d, i) {
      var y = marginT + i * 38;
      var barW = (d.value / maxVal) * plotW;

      // Label
      ctx.fillStyle = P.text;
      ctx.font = '12px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(d.label, marginL - 10, y + 16);

      // Bar
      ctx.fillStyle = d.color || P.esc;
      roundRect(ctx, marginL, y + 4, barW, 20, 3);
      ctx.fill();

      // Value
      ctx.fillStyle = P.text;
      ctx.font = 'bold 11px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText(d.display || d.value.toString(), marginL + barW + 6, y + 18);
    });
  }

  /* ════════════════════════════════════════
     7. CUMULATIVE MA TIMELINE PLOT
     ════════════════════════════════════════ */

  function drawCumulativeMAPlot(canvasId, points, title) {
    var c = setupCanvas(canvasId, 280);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 60, marginR = 30, marginT = 50, marginB = 50;
    var plotW = W - marginL - marginR;
    var plotH = H - marginT - marginB;

    // points: [{year, hr, ci_lo, ci_hi, label}]
    var minYr = points[0].year - 0.5, maxYr = points[points.length - 1].year + 1;
    var logMin = Math.log(0.5), logMax = Math.log(1.2);
    function xPos(yr) { return marginL + ((yr - minYr) / (maxYr - minYr)) * plotW; }
    function yPos(hr) { return marginT + (1 - (Math.log(hr) - logMin) / (logMax - logMin)) * plotH; }

    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(title || 'Cumulative Meta-Analysis Over Time', 12, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('Pooled HR with 95% CI after each trial added', 12, 38);

    // Null line
    ctx.strokeStyle = P.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(marginL, yPos(1.0)); ctx.lineTo(W - marginR, yPos(1.0)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = P.textLight;
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText('HR = 1.0 (no effect)', marginL - 6, yPos(1.0) + 4);

    // Y axis labels
    [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1].forEach(function (v) {
      var y = yPos(v);
      if (y > marginT && y < H - marginB) {
        ctx.strokeStyle = P.gridLine;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(marginL, y); ctx.lineTo(W - marginR, y); ctx.stroke();
        ctx.fillStyle = P.textLight;
        ctx.font = '10px ' + FONT;
        ctx.textAlign = 'right';
        ctx.fillText(v.toFixed(1), marginL - 6, y + 3);
      }
    });

    // CI ribbons
    ctx.fillStyle = P.benefit + '20';
    ctx.beginPath();
    points.forEach(function (p, i) { ctx[i === 0 ? 'moveTo' : 'lineTo'](xPos(p.year), yPos(p.ci_lo)); });
    for (var i = points.length - 1; i >= 0; i--) ctx.lineTo(xPos(points[i].year), yPos(points[i].ci_hi));
    ctx.closePath(); ctx.fill();

    // Line
    ctx.strokeStyle = P.benefit;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach(function (p, i) { ctx[i === 0 ? 'moveTo' : 'lineTo'](xPos(p.year), yPos(p.hr)); });
    ctx.stroke();

    // Points + labels
    points.forEach(function (p) {
      ctx.fillStyle = P.benefit;
      ctx.beginPath(); ctx.arc(xPos(p.year), yPos(p.hr), 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.text;
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(p.label, xPos(p.year), yPos(p.hr) - 10);
      ctx.fillText(p.hr.toFixed(2), xPos(p.year), H - marginB + 30);
    });

    // X axis year labels
    points.forEach(function (p) {
      ctx.fillStyle = P.textMuted;
      ctx.font = '11px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(p.year.toString(), xPos(p.year), H - marginB + 16);
    });
  }

  /* ════════════════════════════════════════
     8. FUNNEL PLOT (Publication Bias)
     ════════════════════════════════════════ */

  function drawFunnelPlot(canvasId, studies, pooledLog, title) {
    var c = setupCanvas(canvasId, 280);
    if (!c) return;
    var ctx = c.ctx, W = c.W, H = c.H;

    var marginL = 60, marginR = 30, marginT = 50, marginB = 45;
    var plotW = W - marginL - marginR;
    var plotH = H - marginT - marginB;

    var maxSE = Math.max.apply(null, studies.map(function (s) { return s.sei; })) * 1.3;
    var effectRange = 1.0; // +/- from pooled
    function xPos(yi) { return marginL + ((yi - pooledLog + effectRange) / (2 * effectRange)) * plotW; }
    function yPos(se) { return marginT + (se / maxSE) * plotH; }

    ctx.fillStyle = P.text;
    ctx.font = 'bold 14px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(title || 'Funnel Plot', 12, 22);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = P.textMuted;
    ctx.fillText('Symmetry indicates absence of publication bias', 12, 38);

    // 95% CI funnel
    ctx.strokeStyle = P.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xPos(pooledLog), yPos(0));
    ctx.lineTo(xPos(pooledLog - 1.96 * maxSE), yPos(maxSE));
    ctx.moveTo(xPos(pooledLog), yPos(0));
    ctx.lineTo(xPos(pooledLog + 1.96 * maxSE), yPos(maxSE));
    ctx.stroke();
    ctx.setLineDash([]);

    // Pooled line
    ctx.strokeStyle = P.benefit;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xPos(pooledLog), marginT);
    ctx.lineTo(xPos(pooledLog), H - marginB);
    ctx.stroke();

    // Studies
    studies.forEach(function (s) {
      ctx.fillStyle = P.trial;
      ctx.beginPath(); ctx.arc(xPos(s.yi), yPos(s.sei), 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.text;
      ctx.font = '10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(s.label, xPos(s.yi), yPos(s.sei) - 8);
    });

    // Axes labels
    ctx.fillStyle = P.textMuted;
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('log(HR)', W / 2, H - 6);
    ctx.save();
    ctx.translate(14, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Standard Error', 0, 0);
    ctx.restore();
  }

  /* ════════════════════════════════════════
     INIT: Render all charts on page load
     ════════════════════════════════════════ */

  function initNYTCharts() {
    var path = window.location.pathname;

    if (path.indexOf('heart-failure') >= 0) initHFCharts();
    else if (path.indexOf('acs') >= 0) initACSCharts();
  }

  function initHFCharts() {
    var container = document.getElementById('nyt-charts-hf');
    if (!container) return;

    var html = '<h3 style="font-size:1.3rem;font-weight:700;color:#1b2a4a;margin-bottom:0.5rem;">Data Visualisations</h3>';
    html += '<p style="font-size:0.85rem;color:#767676;margin-bottom:1.5rem;">NYT-style charts computed from trial data. All rendered client-side on canvas.</p>';

    // 1. Evidence lag timeline
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-hf-lag" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    // 2. Dot strip - all HF trials
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-hf-dots" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    // 3. Guideline comparison lollipop
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-hf-lollipop" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    // 4. Waffle charts
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem;">';
    html += '<canvas id="chart-hf-waffle1" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas>';
    html += '<canvas id="chart-hf-waffle2" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas>';
    html += '</div>';

    // 5. Funnel plot
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-hf-funnel" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    // 6. Slope chart
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-hf-slope" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    // 7. Bar chart - TA performance
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-hf-bars" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    container.innerHTML = html;

    setTimeout(function () {
      drawEvidenceLagTimeline('chart-hf-lag', [
        { label: 'DAPA-HF (HFrEF)', trialDate: '2019-11-01', escDate: '2021-08-01', niceDate: '2021-02-24' },
        { label: 'EMPEROR-Reduced', trialDate: '2020-10-01', escDate: '2021-08-01', niceDate: '2022-03-09' },
        { label: 'EMPEROR-Preserved', trialDate: '2021-10-01', escDate: '2023-08-01', niceDate: '2024-03-01' },
        { label: 'DELIVER (HFpEF)', trialDate: '2022-09-01', escDate: '2023-08-01', niceDate: '2024-03-01' }
      ]);

      drawDotStrip('chart-hf-dots', [
        { label: 'DAPA-HF', hr: 0.74, ci_lo: 0.65, ci_hi: 0.85, color: '#0e6655' },
        { label: 'EMPEROR-Red', hr: 0.75, ci_lo: 0.65, ci_hi: 0.86, color: '#0e6655' },
        { label: 'EMPEROR-Pres', hr: 0.79, ci_lo: 0.69, ci_hi: 0.90, color: '#2471a3' },
        { label: 'DELIVER', hr: 0.82, ci_lo: 0.73, ci_hi: 0.92, color: '#2471a3' },
        { label: 'PARADIGM-HF', hr: 0.80, ci_lo: 0.73, ci_hi: 0.87, color: '#e67e22' },
        { label: 'STRONG-HF', hr: 0.66, ci_lo: 0.50, ci_hi: 0.86, color: '#c0392b' }
      ], 'SGLT2i + ARNi: All Key HF Trials');

      drawLollipopComparison('chart-hf-lollipop', [
        { feature: 'SGLT2i in core algorithm', nice: 0, esc: 2, aha: 2 },
        { feature: 'Quadruple therapy pathway', nice: 0, esc: 2, aha: 2 },
        { feature: 'De novo sacubitril/valsartan', nice: 0, esc: 1, aha: 2 },
        { feature: 'HFpEF pharmacotherapy', nice: 0, esc: 2, aha: 1 },
        { feature: 'Rapid up-titration protocol', nice: 0, esc: 2, aha: 2 },
        { feature: 'ICD risk stratification (CMR)', nice: 0, esc: 1, aha: 1 },
        { feature: 'Serial biomarker monitoring', nice: 1, esc: 2, aha: 1 },
        { feature: 'Palliative care triggers', nice: 1, esc: 2, aha: 1 },
        { feature: 'Leadless pacemaker guidance', nice: 0, esc: 2, aha: 1 },
        { feature: 'Conduction system pacing', nice: 0, esc: 2, aha: 1 }
      ]);

      drawWaffleChart('chart-hf-waffle1', 900000, 450000, 'HFrEF Patients Without Timely SGLT2i Access', '~450K of ~900K HF patients in England');
      drawWaffleChart('chart-hf-waffle2', 100, 69, 'Sacubitril/Valsartan Ineligibility', '69% ineligible under NICE TA388 criteria');

      drawFunnelPlot('chart-hf-funnel', [
        { label: 'DAPA-HF', yi: Math.log(0.74), sei: (Math.log(0.85) - Math.log(0.65)) / (2 * 1.96) },
        { label: 'EMPEROR-Red', yi: Math.log(0.75), sei: (Math.log(0.86) - Math.log(0.65)) / (2 * 1.96) },
        { label: 'EMPEROR-Pres', yi: Math.log(0.79), sei: (Math.log(0.90) - Math.log(0.69)) / (2 * 1.96) },
        { label: 'DELIVER', yi: Math.log(0.82), sei: (Math.log(0.92) - Math.log(0.73)) / (2 * 1.96) }
      ], Math.log(0.77), 'Funnel Plot: SGLT2i in Heart Failure (All Phenotypes)');

      drawSlopeChart('chart-hf-slope', [
        { label: 'Months to adopt SGLT2i', left: 27, right: 9, unit: 'mo', color: '#c0392b' },
        { label: 'ICD indications listed', left: 3, right: 18, unit: '', color: '#2471a3' },
        { label: 'HFpEF drug classes', left: 0, right: 1, unit: '', color: '#e67e22' },
        { label: 'Pacing modalities', left: 1, right: 3, unit: '', color: '#148f77' }
      ]);

      drawHorizontalBars('chart-hf-bars', [
        { label: 'NICE TA on-time (Q2-Q4 2022)', value: 30, display: '30%', color: '#c0392b' },
        { label: 'NICE TA on-time (Q3 2023)', value: 37, display: '37%', color: '#e67e22' },
        { label: 'NICE TA target', value: 100, display: '100% within 90 days', color: '#e0e0e0' },
        { label: 'TA evidence "poor" quality', value: 55, display: '55%', color: '#c0392b' },
        { label: 'TA evidence "unacceptable"', value: 10, display: '10%', color: '#8b0000' },
        { label: 'CR programmes certified', value: 51, display: '51%', color: '#2471a3' }
      ], 'NICE Performance Metrics (from published audits)');
    }, 100);
  }

  function initACSCharts() {
    var container = document.getElementById('nyt-charts-acs');
    if (!container) return;

    var html = '<h3 style="font-size:1.3rem;font-weight:700;color:#1b2a4a;margin-bottom:0.5rem;">Data Visualisations</h3>';
    html += '<p style="font-size:0.85rem;color:#767676;margin-bottom:1.5rem;">NYT-style charts computed from trial data and published audit metrics.</p>';

    html += '<div style="margin-bottom:2rem;"><canvas id="chart-acs-dots" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-acs-lollipop" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem;">';
    html += '<canvas id="chart-acs-waffle1" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas>';
    html += '<canvas id="chart-acs-waffle2" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas>';
    html += '</div>';
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-acs-bars" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-acs-funnel" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';
    html += '<div style="margin-bottom:2rem;"><canvas id="chart-acs-cum" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;"></canvas></div>';

    container.innerHTML = html;

    setTimeout(function () {
      drawDotStrip('chart-acs-dots', [
        { label: 'IMPROVE-IT', hr: 0.936, ci_lo: 0.89, ci_hi: 0.99, color: '#0e6655' },
        { label: 'FOURIER', hr: 0.85, ci_lo: 0.79, ci_hi: 0.92, color: '#0e6655' },
        { label: 'ODYSSEY', hr: 0.85, ci_lo: 0.78, ci_hi: 0.93, color: '#0e6655' },
        { label: 'TWILIGHT (bleed)', hr: 0.56, ci_lo: 0.45, ci_hi: 0.68, color: '#2471a3' },
        { label: 'ISAR-REACT 5', hr: 0.74, ci_lo: 0.59, ci_hi: 0.92, color: '#e67e22' }
      ], 'ACS Key Trial Effect Sizes');

      drawLollipopComparison('chart-acs-lollipop', [
        { feature: 'LDL target <1.4 mmol/L', nice: 0, esc: 2, aha: 2 },
        { feature: 'Risk-stratified DAPT duration', nice: 0, esc: 2, aha: 2 },
        { feature: 'PRECISE-DAPT integration', nice: 0, esc: 2, aha: 1 },
        { feature: '0/1h troponin pathway', nice: 0, esc: 2, aha: 1 },
        { feature: 'MINOCA diagnostic pathway', nice: 0, esc: 2, aha: 1 },
        { feature: 'Prasugrel preference (STEMI+PCI)', nice: 1, esc: 2, aha: 1 },
        { feature: 'DAPT de-escalation protocol', nice: 0, esc: 2, aha: 2 },
        { feature: 'Ezetimibe escalation pathway', nice: 1, esc: 2, aha: 2 },
        { feature: 'Digital CR alternatives endorsed', nice: 0, esc: 1, aha: 1 },
        { feature: 'CR equity KPIs', nice: 0, esc: 0, aha: 0 }
      ]);

      drawWaffleChart('chart-acs-waffle1', 100, 70, 'Post-ACS LDL Target Not Met', 'Only 30% reach LDL <1.8 mmol/L (EUROASPIRE V)');
      drawWaffleChart('chart-acs-waffle2', 100, 50, 'Cardiac Rehab Not Completed', '50% uptake, 76% completion (NACR 2024)');

      drawHorizontalBars('chart-acs-bars', [
        { label: 'NICE lipid recheck', value: 3, display: '3 months', color: '#c0392b' },
        { label: 'ESC lipid recheck', value: 1.5, display: '4-6 weeks', color: '#2471a3' },
        { label: 'NICE rule-out time', value: 3, display: '3 hours', color: '#c0392b' },
        { label: 'ESC rule-out time', value: 1, display: '1 hour', color: '#2471a3' },
        { label: 'IMPROVE-IT to NICE (yrs)', value: 8, display: '~8 years', color: '#c0392b' },
        { label: 'IMPROVE-IT to ESC (yrs)', value: 4, display: '~4 years', color: '#2471a3' }
      ], 'Timeline Comparison: NICE vs ESC Response Speed');

      drawFunnelPlot('chart-acs-funnel', [
        { label: 'IMPROVE-IT', yi: Math.log(0.936), sei: (Math.log(0.99) - Math.log(0.89)) / (2 * 1.96) },
        { label: 'FOURIER', yi: Math.log(0.85), sei: (Math.log(0.92) - Math.log(0.79)) / (2 * 1.96) },
        { label: 'ODYSSEY', yi: Math.log(0.85), sei: (Math.log(0.93) - Math.log(0.78)) / (2 * 1.96) }
      ], Math.log(0.88), 'Funnel Plot: Post-ACS Lipid Intensification');

      drawCumulativeMAPlot('chart-acs-cum', [
        { year: 2015, hr: 0.936, ci_lo: 0.89, ci_hi: 0.99, label: 'IMPROVE-IT' },
        { year: 2017, hr: 0.89, ci_lo: 0.85, ci_hi: 0.94, label: '+FOURIER' },
        { year: 2018, hr: 0.88, ci_lo: 0.84, ci_hi: 0.92, label: '+ODYSSEY' }
      ], 'Cumulative MA: Post-ACS Lipid Therapy Over Time');
    }, 100);
  }

  document.addEventListener('DOMContentLoaded', initNYTCharts);
})();
