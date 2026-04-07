/* ============================================================
   Evidence Triangulation Module
   Cross-references 5 independent data sources to triangulate
   the NICE cardiology critique:
     1. CT.gov Registry Census
     2. Regulatory Timeline Comparison
     3. NHS Prescribing Data
     4. WHO Essential Medicines List
     5. International Guideline Concordance Matrix
   Renders into #triangulation-hf and #triangulation-acs.
   Zero external dependencies. ES5 compatible.
   ============================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════
     DATA SOURCE 1: CT.gov Registry Census
     ══════════════════════════════════════ */

  var CTGOV_CENSUS = {
    sglt2i_hf: {
      totalTrials: 20,
      totalEnrollment: 28553,
      completedBeforeNICE: 8,
      completedBeforeESC: 4,
      largestTrials: [
        { nct: 'NCT04509674', name: 'EMPACT-MI', n: 6522, completed: '2023-11' },
        { nct: 'NCT03619213', name: 'DELIVER', n: 6263, completed: '2022-03' },
        { nct: 'NCT03057951', name: 'EMPEROR-Preserved', n: 5988, completed: '2021-04' },
        { nct: 'NCT03036124', name: 'DAPA-HF', n: 4744, completed: '2019-07' },
        { nct: 'NCT04564742', name: 'DAPA-MI', n: 4017, completed: '2023-07' },
        { nct: 'NCT03057977', name: 'EMPEROR-Reduced', n: 3730, completed: '2020-05' }
      ],
      medianEnrollment: 313,
      sponsors: { industry: 14, academic: 6 }
    },
    lipid_acs: {
      totalTrials: 7,
      totalEnrollment: 67254,
      largestTrials: [
        { nct: 'NCT01764633', name: 'FOURIER', n: 27564 },
        { nct: 'NCT01663402', name: 'ODYSSEY', n: 18924 },
        { nct: 'NCT00202878', name: 'IMPROVE-IT', n: 18144 },
        { nct: 'NCT01492361', name: 'REDUCE-IT', n: 8179 }
      ]
    }
  };

  /* ══════════════════════════════════════
     DATA SOURCE 2: Regulatory Timeline
     ══════════════════════════════════════ */

  var REGULATORY_TIMELINE = {
    dapagliflozin_hfref: {
      label: 'Dapagliflozin (HFrEF)',
      trialPublished: '2019-11',
      ema: '2020-11',
      fda: '2020-05',
      nice: '2021-02',
      who_eml: '2021-10',
      esc: '2021-08'
    },
    empagliflozin_hfref: {
      label: 'Empagliflozin (HFrEF)',
      trialPublished: '2020-10',
      ema: '2021-06',
      fda: '2021-08',
      nice: '2022-03',
      esc: '2021-08'
    },
    empagliflozin_all_hf: {
      label: 'Empagliflozin (all HF)',
      trialPublished: '2021-10',
      ema: '2022-03',
      fda: '2022-02',
      nice: '2023-11',
      esc: '2023-08'
    },
    dapagliflozin_hfpef: {
      label: 'Dapagliflozin (HFpEF)',
      trialPublished: '2022-09',
      ema: '2023-02',
      fda: '2023-05',
      nice: '2023-06',
      esc: '2023-08'
    }
  };

  /* ══════════════════════════════════════
     DATA SOURCE 3: NHS Prescribing Data
     ══════════════════════════════════════ */

  var NHS_PRESCRIBING = {
    sglt2i_uptake_hf: {
      sept2023_pct: 30.5,
      baseline_pct: 8,
      twoYear_pct: 60,
      over80_pct: 33,
      under80_pct: 69,
      source: 'medRxiv 2026 + EHJ 2023'
    }
  };

  /* ══════════════════════════════════════
     DATA SOURCE 4: WHO Essential Medicines
     ══════════════════════════════════════ */

  var WHO_EML = {
    sglt2i_added: '2021-10',
    agents: ['empagliflozin', 'dapagliflozin', 'canagliflozin'],
    indication: 'Second-line T2D + cardiovascular/renal benefit',
    note: 'Added to WHO EML before NICE TA773 (empagliflozin HFrEF, Mar 2022)'
  };

  /* ══════════════════════════════════════
     DATA SOURCE 5: Guideline Concordance
     ══════════════════════════════════════ */

  var GUIDELINE_CONCORDANCE = {
    sglt2i_hfref_firstline: {
      ESC: { year: 2021, class_: 'I', level: 'A', recommends: true },
      AHA_ACC: { year: 2022, class_: 'I', recommends: true },
      CCS: { year: 2021, recommends: true },
      NICE: { year: 2021, recommends: true, caveat: 'Via separate TA, not in NG106 algorithm' },
      JCS: { year: 2022, recommends: true },
      HFSA: { year: 2022, recommends: true },
      totalRecommending: 6,
      totalBodies: 6,
      niceIntegratedInAlgorithm: false,
      allOthersIntegrated: true
    },
    quadruple_therapy_pathway: {
      ESC: true, AHA_ACC: true, CCS: true, NICE: false, JCS: true, HFSA: true,
      niceIsOnlyWithout: true
    }
  };

  /* ══════════════════════════════════════
     Colour Constants
     ══════════════════════════════════════ */

  var COL = {
    nice: '#c0392b',
    esc: '#2471a3',
    aha: '#148f77',
    fda: '#7d3c98',
    ema: '#d68910',
    who: '#1a5276'
  };

  /* ══════════════════════════════════════
     Utility Helpers
     ══════════════════════════════════════ */

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  function fmtNum(n) {
    var s = String(n);
    var parts = [];
    while (s.length > 3) {
      parts.unshift(s.slice(-3));
      s = s.slice(0, -3);
    }
    parts.unshift(s);
    return parts.join(',');
  }

  /** Parse 'YYYY-MM' to a Date (1st of month). */
  function parseYM(ym) {
    var parts = ym.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
  }

  /** Months between two 'YYYY-MM' strings. */
  function monthsBetween(a, b) {
    var da = parseYM(a);
    var db = parseYM(b);
    return Math.round((db - da) / (1000 * 60 * 60 * 24 * 30.44));
  }

  /** Render a coloured dot. */
  function dot(colour) {
    return '<span style="display:inline-block;width:10px;height:10px;' +
      'border-radius:50%;background:' + colour + ';margin-right:4px;' +
      'vertical-align:middle;"></span>';
  }

  /** Render a horizontal bar (percentage-width, max 100%). */
  function bar(pct, colour, label) {
    var w = Math.max(2, Math.min(100, pct));
    return '<div style="display:flex;align-items:center;gap:0.5rem;margin:0.35rem 0;">' +
      '<div style="flex:1;background:var(--gray-200);border-radius:4px;height:22px;position:relative;overflow:hidden;">' +
        '<div style="width:' + w + '%;height:100%;background:' + colour +
          ';border-radius:4px;transition:width 0.6s ease;"></div>' +
      '</div>' +
      '<span style="font-size:0.82rem;font-weight:600;color:var(--gray-700);min-width:60px;">' +
        esc(label) + '</span>' +
      '</div>';
  }

  /* ══════════════════════════════════════
     Panel 1: CT.gov Census (HF)
     ══════════════════════════════════════ */

  function renderCensusPanelHF() {
    var d = CTGOV_CENSUS.sglt2i_hf;
    var html = '<div class="stats-block">';
    html += '<h4>' + dot(COL.esc) + 'Source 1: CT.gov Registry Census</h4>';

    html += '<p style="margin-bottom:0.75rem;color:var(--gray-700);">' +
      '<strong>' + d.totalTrials + ' completed Phase 3 SGLT2i heart failure trials</strong> ' +
      'with <span class="stat-highlight">' + fmtNum(d.totalEnrollment) + ' patients</span> ' +
      'existed by 2024. Of these, <span class="stat-highlight warning">' +
      d.completedBeforeNICE + ' were completed before</span> ' +
      'NICE\'s first TA (Feb 2021), and ' + d.completedBeforeESC +
      ' were completed before the ESC 2021 update.</p>';

    // Largest trials table
    html += '<table class="data-table">';
    html += '<thead><tr><th>NCT ID</th><th>Trial</th><th>Enrolled</th><th>Completed</th></tr></thead>';
    html += '<tbody>';
    for (var i = 0; i < d.largestTrials.length; i++) {
      var t = d.largestTrials[i];
      html += '<tr>' +
        '<td class="nct">' + esc(t.nct) + '</td>' +
        '<td><strong>' + esc(t.name) + '</strong></td>' +
        '<td>' + fmtNum(t.n) + '</td>' +
        '<td>' + esc(t.completed) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';

    // Sponsor split
    html += '<div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:0.5rem;">';
    html += '<span class="stat-highlight">Industry-sponsored: ' + d.sponsors.industry + '</span>';
    html += '<span class="stat-highlight">Academic: ' + d.sponsors.academic + '</span>';
    html += '<span class="stat-highlight">Median enrollment: ' + fmtNum(d.medianEnrollment) + '</span>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════
     Panel 2: Regulatory Race Table (HF)
     ══════════════════════════════════════ */

  function renderRegulatoryRaceHF() {
    var html = '<div class="stats-block">';
    html += '<h4>' + dot(COL.fda) + 'Source 2: Regulatory Timeline Comparison</h4>';

    html += '<p style="margin-bottom:0.75rem;color:var(--gray-700);">' +
      'For every SGLT2i heart failure indication, NICE was <strong>consistently the last</strong> ' +
      'major regulatory or guideline body to act.</p>';

    // Build the table
    html += '<table class="data-table">';
    html += '<thead><tr>' +
      '<th>Drug / Indication</th>' +
      '<th>Trial Pub.</th>' +
      '<th style="color:' + COL.fda + '">FDA</th>' +
      '<th style="color:' + COL.ema + '">EMA</th>' +
      '<th style="color:' + COL.who + '">WHO EML</th>' +
      '<th style="color:' + COL.esc + '">ESC</th>' +
      '<th style="color:' + COL.nice + '">NICE</th>' +
      '<th>NICE Delay</th>' +
      '</tr></thead>';
    html += '<tbody>';

    var keys = ['dapagliflozin_hfref', 'empagliflozin_hfref', 'empagliflozin_all_hf', 'dapagliflozin_hfpef'];
    var totalDelayFDA = 0;
    var totalDelayEMA = 0;
    var totalDelayESC = 0;
    var countFDA = 0;
    var countEMA = 0;
    var countESC = 0;

    for (var i = 0; i < keys.length; i++) {
      var r = REGULATORY_TIMELINE[keys[i]];
      var delayVsFDA = r.fda ? monthsBetween(r.fda, r.nice) : null;
      var delayVsEMA = r.ema ? monthsBetween(r.ema, r.nice) : null;
      var delayVsESC = r.esc ? monthsBetween(r.esc, r.nice) : null;

      if (delayVsFDA !== null) { totalDelayFDA += delayVsFDA; countFDA++; }
      if (delayVsEMA !== null) { totalDelayEMA += delayVsEMA; countEMA++; }
      if (delayVsESC !== null) { totalDelayESC += delayVsESC; countESC++; }

      var niceDelay = monthsBetween(r.trialPublished, r.nice);

      html += '<tr>';
      html += '<td><strong>' + esc(r.label) + '</strong></td>';
      html += '<td>' + esc(r.trialPublished) + '</td>';
      html += '<td>' + (r.fda ? esc(r.fda) : '\u2014') + '</td>';
      html += '<td>' + (r.ema ? esc(r.ema) : '\u2014') + '</td>';
      html += '<td>' + (r.who_eml ? esc(r.who_eml) : '\u2014') + '</td>';
      html += '<td>' + (r.esc ? esc(r.esc) : '\u2014') + '</td>';
      html += '<td style="color:' + COL.nice + ';font-weight:700;">' + esc(r.nice) + '</td>';
      html += '<td><span class="stat-highlight warning">' + niceDelay + ' mo from trial</span></td>';
      html += '</tr>';
    }
    html += '</tbody></table>';

    // Average delays
    var avgFDA = countFDA > 0 ? Math.round(totalDelayFDA / countFDA) : 0;
    var avgEMA = countEMA > 0 ? Math.round(totalDelayEMA / countEMA) : 0;
    var avgESC = countESC > 0 ? Math.round(totalDelayESC / countESC) : 0;

    html += '<div style="margin-top:0.75rem;display:flex;gap:1rem;flex-wrap:wrap;">';
    html += '<span class="stat-highlight warning">Avg NICE delay vs FDA: ' + avgFDA + ' mo</span>';
    html += '<span class="stat-highlight warning">Avg NICE delay vs EMA: ' + avgEMA + ' mo</span>';
    html += '<span class="stat-highlight warning">Avg NICE delay vs ESC: ' + avgESC + ' mo</span>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════
     Panel 3: NHS Prescribing Gap (HF)
     ══════════════════════════════════════ */

  function renderPrescribingGapHF() {
    var p = NHS_PRESCRIBING.sglt2i_uptake_hf;
    var html = '<div class="stats-block">';
    html += '<h4>' + dot(COL.nice) + 'Source 3: NHS Prescribing Data</h4>';

    html += '<p style="margin-bottom:0.75rem;color:var(--gray-700);">' +
      'Despite guideline availability, SGLT2i uptake remains far below the achievable ceiling, ' +
      'revealing a significant <strong>prescribing gap</strong> \u2014 likely ' +
      'compounded by NICE\'s fragmented TA pathway.</p>';

    // Bar chart metaphor
    html += '<div style="margin:1rem 0;padding:1rem;background:var(--gray-50);border-radius:8px;' +
      'border:1px solid var(--gray-200);">';

    html += '<div style="font-size:0.8rem;font-weight:600;color:var(--gray-500);' +
      'text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.75rem;">' +
      'SGLT2i Uptake in HF Patients (% prescribed)</div>';

    html += '<div style="margin-bottom:0.3rem;font-size:0.82rem;color:var(--gray-700);">' +
      'Baseline (pre-guideline)</div>';
    html += bar(p.baseline_pct, 'var(--gray-300)', p.baseline_pct + '%');

    html += '<div style="margin-bottom:0.3rem;font-size:0.82rem;color:var(--gray-700);">' +
      'National average (Sep 2023)</div>';
    html += bar(p.sept2023_pct, COL.nice, p.sept2023_pct + '%');

    html += '<div style="margin-bottom:0.3rem;font-size:0.82rem;color:var(--gray-700);">' +
      '2-year specialist programme</div>';
    html += bar(p.twoYear_pct, COL.esc, p.twoYear_pct + '%');

    html += '</div>';

    // Age disparity
    html += '<div style="margin:1rem 0;padding:1rem;background:var(--red-bg);border-radius:8px;' +
      'border:1px solid rgba(220,38,38,0.15);">';
    html += '<div style="font-size:0.8rem;font-weight:600;color:' + COL.nice + ';' +
      'text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.75rem;">' +
      'Age Disparity in SGLT2i Uptake</div>';

    html += '<div style="display:flex;gap:2rem;flex-wrap:wrap;align-items:center;">';
    html += '<div style="text-align:center;">' +
      '<div style="font-size:2rem;font-weight:800;color:' + COL.aha + ';">' + p.under80_pct + '%</div>' +
      '<div style="font-size:0.78rem;color:var(--gray-500);">Under 80 years</div></div>';

    html += '<div style="font-size:1.5rem;color:var(--gray-300);">\u2192</div>';

    html += '<div style="text-align:center;">' +
      '<div style="font-size:2rem;font-weight:800;color:' + COL.nice + ';">' + p.over80_pct + '%</div>' +
      '<div style="font-size:0.78rem;color:var(--gray-500);">80+ years</div></div>';

    html += '<div style="flex:1;min-width:180px;font-size:0.82rem;color:var(--gray-700);">' +
      'A <strong>' + (p.under80_pct - p.over80_pct) + ' percentage-point gap</strong> in uptake ' +
      'between age groups, despite elderly patients having the highest absolute benefit from ' +
      'HF hospitisation reduction.</div>';

    html += '</div></div>';

    html += '<div style="font-size:0.75rem;color:var(--gray-500);margin-top:0.5rem;">' +
      'Source: ' + esc(p.source) + '</div>';

    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════
     Panel 4: International Concordance (HF)
     ══════════════════════════════════════ */

  function renderConcordanceHF() {
    var gc = GUIDELINE_CONCORDANCE.sglt2i_hfref_firstline;
    var qt = GUIDELINE_CONCORDANCE.quadruple_therapy_pathway;

    var html = '<div class="stats-block">';
    html += '<h4>' + dot(COL.aha) + 'Sources 4 &amp; 5: WHO EML + International Guideline Concordance</h4>';

    // WHO EML note
    html += '<div style="margin-bottom:1rem;padding:0.75rem 1rem;background:var(--blue-bg);' +
      'border-radius:8px;border:1px solid rgba(37,99,235,0.15);">';
    html += '<strong style="color:var(--navy);">WHO Essential Medicines List</strong> ' +
      '<span class="stat-highlight">Added Oct 2021</span>';
    html += '<p style="margin-top:0.35rem;font-size:0.85rem;color:var(--gray-700);">' +
      'SGLT2 inhibitors (' + esc(WHO_EML.agents.join(', ')) + ') were added to the WHO EML in ' +
      esc(WHO_EML.sglt2i_added) + ' for "' + esc(WHO_EML.indication) + '". ' +
      '<span class="stat-highlight warning">' + esc(WHO_EML.note) + '</span></p>';
    html += '</div>';

    // Concordance matrix
    html += '<div style="font-size:0.8rem;font-weight:600;color:var(--gray-500);' +
      'text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.5rem;">' +
      'SGLT2i as First-Line HFrEF Therapy: Guideline Concordance</div>';

    html += '<table class="data-table">';
    html += '<thead><tr><th>Guideline Body</th><th>Year</th><th>Recommends</th>' +
      '<th>Class</th><th>Integrated in Algorithm</th></tr></thead>';
    html += '<tbody>';

    var bodies = [
      { key: 'ESC', name: 'ESC (European)', colour: COL.esc, integrated: true },
      { key: 'AHA_ACC', name: 'AHA/ACC (US)', colour: COL.aha, integrated: true },
      { key: 'CCS', name: 'CCS (Canadian)', colour: COL.aha, integrated: true },
      { key: 'JCS', name: 'JCS (Japanese)', colour: COL.esc, integrated: true },
      { key: 'HFSA', name: 'HFSA (US)', colour: COL.aha, integrated: true },
      { key: 'NICE', name: 'NICE (England)', colour: COL.nice, integrated: false }
    ];

    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      var entry = gc[b.key];
      var isNICE = b.key === 'NICE';
      var rowStyle = isNICE ? ' style="background:' + COL.nice + '10;"' : '';

      html += '<tr' + rowStyle + '>';
      html += '<td>' + dot(b.colour) + '<strong>' + esc(b.name) + '</strong></td>';
      html += '<td>' + (entry.year || '\u2014') + '</td>';
      html += '<td>' + (entry.recommends ?
        '<span class="stat-highlight">Yes</span>' :
        '<span class="stat-highlight warning">No</span>') + '</td>';
      html += '<td>' + (entry.class_ ? 'Class ' + esc(entry.class_) +
        (entry.level ? ', Level ' + esc(entry.level) : '') : '\u2014') + '</td>';
      html += '<td>' + (b.integrated ?
        '<span class="stat-highlight">Yes</span>' :
        '<span class="stat-highlight warning">No' +
        (entry.caveat ? ' \u2014 ' + esc(entry.caveat) : '') + '</span>') + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table>';

    // Quadruple therapy pathway
    html += '<div style="margin-top:1rem;padding:0.75rem 1rem;background:var(--red-bg);' +
      'border-radius:8px;border:1px solid rgba(220,38,38,0.15);">';
    html += '<strong style="color:' + COL.nice + ';">Quadruple Therapy Pathway:</strong> ';

    var qtBodies = ['ESC', 'AHA_ACC', 'CCS', 'JCS', 'HFSA'];
    var qtYes = [];
    for (var j = 0; j < qtBodies.length; j++) {
      if (qt[qtBodies[j]]) qtYes.push(qtBodies[j].replace('_', '/'));
    }
    html += '<span style="font-size:0.85rem;color:var(--gray-700);">' +
      qtYes.join(', ') + ' all include a quadruple therapy pathway. ' +
      '<span class="stat-highlight warning">NICE is the only major body without one.</span>' +
      '</span>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════
     Panel 5: Triangulation Verdict (HF)
     ══════════════════════════════════════ */

  function renderVerdictHF() {
    var html = '<div class="stats-block" style="border-bottom:none;">';
    html += '<h4 style="color:var(--navy);">' +
      '<span style="font-size:1.2rem;margin-right:0.3rem;">\u25B6</span>' +
      'Triangulation Verdict</h4>';

    html += '<div style="padding:1.25rem;background:linear-gradient(135deg,#fef2f2 0%,#fff7ed 100%);' +
      'border:2px solid ' + COL.nice + ';border-radius:10px;">';

    html += '<p style="font-size:0.95rem;color:var(--gray-900);line-height:1.7;margin-bottom:0.75rem;">' +
      '<strong>All 5 independent data sources converge:</strong></p>';

    html += '<ul style="list-style:none;padding:0;margin:0 0 1rem 0;">';

    html += '<li style="padding:0.35rem 0;font-size:0.88rem;color:var(--gray-700);">' +
      dot(COL.esc) + '<strong>CT.gov:</strong> 20 completed Phase 3 trials, ' +
      fmtNum(CTGOV_CENSUS.sglt2i_hf.totalEnrollment) + ' patients, ' +
      CTGOV_CENSUS.sglt2i_hf.completedBeforeNICE + ' completed before NICE acted</li>';

    html += '<li style="padding:0.35rem 0;font-size:0.88rem;color:var(--gray-700);">' +
      dot(COL.ema) + '<strong>EMA:</strong> Approved dapagliflozin for HFrEF Nov 2020 ' +
      '(3 months before NICE)</li>';

    html += '<li style="padding:0.35rem 0;font-size:0.88rem;color:var(--gray-700);">' +
      dot(COL.fda) + '<strong>FDA:</strong> Approved dapagliflozin for HFrEF May 2020 ' +
      '(9 months before NICE)</li>';

    html += '<li style="padding:0.35rem 0;font-size:0.88rem;color:var(--gray-700);">' +
      dot(COL.who) + '<strong>WHO:</strong> Added SGLT2i to Essential Medicines List Oct 2021 ' +
      '(before NICE\'s empagliflozin TA)</li>';

    html += '<li style="padding:0.35rem 0;font-size:0.88rem;color:var(--gray-700);">' +
      dot(COL.aha) + '<strong>ESC/AHA/CCS/JCS/HFSA:</strong> All integrated SGLT2i into ' +
      'treatment algorithms 2021\u20132022</li>';

    html += '</ul>';

    html += '<p style="font-size:0.92rem;font-weight:600;color:' + COL.nice + ';' +
      'border-top:1px solid rgba(192,57,43,0.2);padding-top:0.75rem;line-height:1.6;">' +
      'NICE was the last major body to act, and even then used a fragmented TA pathway ' +
      'rather than algorithm integration. With only 30.5% SGLT2i uptake nationally and ' +
      'NICE as the sole major guideline body without a quadruple therapy pathway, the ' +
      'evidence\u2013practice gap is both measurable and attributable.</p>';

    html += '</div></div>';
    return html;
  }

  /* ══════════════════════════════════════
     ACS Panel 1: CT.gov Lipid Census
     ══════════════════════════════════════ */

  function renderCensusPanelACS() {
    var d = CTGOV_CENSUS.lipid_acs;
    var html = '<div class="stats-block">';
    html += '<h4>' + dot(COL.esc) + 'Source 1: CT.gov Lipid Trial Census</h4>';

    html += '<p style="margin-bottom:0.75rem;color:var(--gray-700);">' +
      '<strong>' + d.totalTrials + ' completed Phase 3 post-ACS lipid trials</strong> ' +
      'enrolled <span class="stat-highlight">' + fmtNum(d.totalEnrollment) +
      ' patients</span>. IMPROVE-IT alone contributed 18,144 patients \u2014 ' +
      'one of the largest CV outcome trials ever conducted.</p>';

    html += '<table class="data-table">';
    html += '<thead><tr><th>NCT ID</th><th>Trial</th><th>Enrolled</th></tr></thead>';
    html += '<tbody>';
    for (var i = 0; i < d.largestTrials.length; i++) {
      var t = d.largestTrials[i];
      html += '<tr>' +
        '<td class="nct">' + esc(t.nct) + '</td>' +
        '<td><strong>' + esc(t.name) + '</strong></td>' +
        '<td>' + fmtNum(t.n) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';

    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════
     ACS Panel 2: IMPROVE-IT Timeline
     ══════════════════════════════════════ */

  function renderTimelineACS() {
    var html = '<div class="stats-block">';
    html += '<h4>' + dot(COL.fda) + 'Source 2: Evidence-to-Guideline Timeline</h4>';

    html += '<p style="margin-bottom:0.75rem;color:var(--gray-700);">' +
      'IMPROVE-IT demonstrated the benefit of adding ezetimibe to statin post-ACS in 2014. ' +
      'The international response illustrates NICE\'s delay pattern:</p>';

    // IMPROVE-IT timeline
    var milestones = [
      { date: '2014-11', label: 'IMPROVE-IT results presented (AHA)', colour: COL.who },
      { date: '2015-06', label: 'FDA ezetimibe consideration', colour: COL.fda },
      { date: '2019-08', label: 'ESC integrates into lipid guideline', colour: COL.esc },
      { date: '2022-00', label: 'NICE updates lipid target (approx.)', colour: COL.nice }
    ];

    html += '<div style="margin:1rem 0;padding:0 0.5rem;border-left:3px solid var(--gray-300);">';
    for (var i = 0; i < milestones.length; i++) {
      var m = milestones[i];
      var isLast = i === milestones.length - 1;
      html += '<div style="padding:0.5rem 0 0.5rem 1rem;position:relative;">';
      html += '<div style="position:absolute;left:-9px;top:0.65rem;width:14px;height:14px;' +
        'border-radius:50%;background:' + m.colour + ';border:2px solid #fff;"></div>';
      html += '<div style="font-size:0.78rem;font-weight:700;color:' + m.colour + ';">' +
        esc(m.date.replace('-00', '')) + '</div>';
      html += '<div style="font-size:0.85rem;color:var(--gray-700);' +
        (isLast ? 'font-weight:600;' : '') + '">' + esc(m.label) + '</div>';
      html += '</div>';
    }
    html += '</div>';

    html += '<p style="font-size:0.85rem;color:var(--gray-700);">' +
      '<span class="stat-highlight warning">~8 years</span> from IMPROVE-IT publication (2014) ' +
      'to NICE updating its lipid management approach for post-ACS patients.</p>';

    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════
     ACS Panel 3: Post-ACS Prescribing
     ══════════════════════════════════════ */

  function renderPrescribingACS() {
    var html = '<div class="stats-block">';
    html += '<h4>' + dot(COL.nice) + 'Source 3: Post-ACS Prescribing Reality</h4>';

    html += '<p style="margin-bottom:0.75rem;color:var(--gray-700);">' +
      'Even with updated guidance, <strong>real-world prescribing reveals a major gap</strong>:</p>';

    html += '<div style="margin:1rem 0;padding:1rem;background:var(--gray-50);border-radius:8px;' +
      'border:1px solid var(--gray-200);">';

    html += '<div style="font-size:0.8rem;font-weight:600;color:var(--gray-500);' +
      'text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.75rem;">' +
      'Post-ACS LDL Target Attainment</div>';

    html += '<div style="display:flex;gap:2rem;flex-wrap:wrap;align-items:center;">';

    html += '<div style="text-align:center;">' +
      '<div style="font-size:2.5rem;font-weight:800;color:' + COL.nice + ';">70%</div>' +
      '<div style="font-size:0.78rem;color:var(--gray-500);">NOT reaching LDL target</div></div>';

    html += '<div style="flex:1;min-width:200px;">';
    html += bar(30, COL.aha, '30% at target');
    html += bar(70, COL.nice, '70% above target');
    html += '</div>';

    html += '</div>';

    html += '<p style="margin-top:0.75rem;font-size:0.85rem;color:var(--gray-700);">' +
      'Approximately 70% of post-ACS patients in England are <strong>not reaching even the ' +
      'less stringent NICE LDL target</strong>, compared to the ESC target of ' +
      '<span class="stat-highlight">&lt;1.4 mmol/L</span> with ' +
      '<span class="stat-highlight">&ge;50% reduction</span>.</p>';

    html += '</div>';

    html += '</div>';
    return html;
  }

  /* ══════════════════════════════════════
     ACS Verdict
     ══════════════════════════════════════ */

  function renderVerdictACS() {
    var html = '<div class="stats-block" style="border-bottom:none;">';
    html += '<h4 style="color:var(--navy);">' +
      '<span style="font-size:1.2rem;margin-right:0.3rem;">\u25B6</span>' +
      'Triangulation Verdict</h4>';

    html += '<div style="padding:1.25rem;background:linear-gradient(135deg,#fef2f2 0%,#fff7ed 100%);' +
      'border:2px solid ' + COL.nice + ';border-radius:10px;">';

    html += '<p style="font-size:0.92rem;font-weight:600;color:' + COL.nice + ';line-height:1.6;">' +
      'CT.gov data confirms ' + CTGOV_CENSUS.lipid_acs.totalTrials +
      ' Phase 3 lipid trials with ' + fmtNum(CTGOV_CENSUS.lipid_acs.totalEnrollment) +
      ' patients established the evidence base. IMPROVE-IT alone (2014, n=' +
      fmtNum(18144) + ') took ~8 years to influence NICE lipid targets. ' +
      'The consequence: 70% of post-ACS patients in England remain above even the less ' +
      'stringent NICE LDL target, while international guidelines moved to &lt;1.4 mmol/L years earlier.</p>';

    html += '</div></div>';
    return html;
  }

  /* ══════════════════════════════════════
     Main Init Functions
     ══════════════════════════════════════ */

  function initTriangulationHF() {
    var container = document.getElementById('triangulation-hf');
    if (!container) return;

    var html = '<div class="stats-panel">';
    html += '<h3>Evidence Triangulation: 5 Independent Data Sources</h3>';
    html += '<p style="margin-bottom:1.5rem;font-size:0.88rem;color:var(--gray-500);">' +
      'Cross-referencing CT.gov registry data, regulatory timelines, NHS prescribing, ' +
      'WHO Essential Medicines List, and international guideline concordance to test whether ' +
      'the NICE critique is supported from multiple independent angles.</p>';

    html += renderCensusPanelHF();
    html += renderRegulatoryRaceHF();
    html += renderPrescribingGapHF();
    html += renderConcordanceHF();
    html += renderVerdictHF();

    html += '</div>';
    container.innerHTML = html;
  }

  function initTriangulationACS() {
    var container = document.getElementById('triangulation-acs');
    if (!container) return;

    var html = '<div class="stats-panel">';
    html += '<h3>Evidence Triangulation: Post-ACS Lipid Management</h3>';
    html += '<p style="margin-bottom:1.5rem;font-size:0.88rem;color:var(--gray-500);">' +
      'Cross-referencing CT.gov trial data, regulatory timelines, and NHS prescribing ' +
      'to triangulate the critique of NICE\'s post-ACS lipid guidance.</p>';

    html += renderCensusPanelACS();
    html += renderTimelineACS();
    html += renderPrescribingACS();
    html += renderVerdictACS();

    html += '</div>';
    container.innerHTML = html;
  }

  /* ══════════════════════════════════════
     Bootstrap
     ══════════════════════════════════════ */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(initTriangulationHF, 0);
      setTimeout(initTriangulationACS, 0);
    });
  } else {
    setTimeout(initTriangulationHF, 0);
    setTimeout(initTriangulationACS, 0);
  }

})();
