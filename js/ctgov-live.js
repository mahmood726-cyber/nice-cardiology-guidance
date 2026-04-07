/* ============================================================
   CT.gov Live Registry Data Panels
   Structured trial data for all cited RCTs — hardcoded constants,
   no API calls. Renders into #ctgov-data-hf and #ctgov-data-acs.
   ============================================================ */

(function () {
  'use strict';

  /* ---- Embedded trial registry data (12 trials) ---- */
  var TRIALS = [
    {
      nct: 'NCT03036124', name: 'DAPA-HF', drug: 'Dapagliflozin',
      phase: 'Phase 3', enrollment: 4744, status: 'Completed',
      startDate: '2017-02', completionDate: '2019-07', resultsDate: '2019-11',
      sponsor: 'AstraZeneca', sites: 410, countries: 20, hasDSMB: true,
      primaryEndpoint: 'Composite of worsening HF or CV death',
      population: 'HFrEF (LVEF \u226440%), NYHA II-IV, NT-proBNP \u2265600 pg/mL',
      result: 'HR 0.74 (0.65\u20130.85), p<0.001',
      niceTA: 'TA679 (Feb 2021)', escRec: 'Class I, Level A (Aug 2021)',
      category: 'hf'
    },
    {
      nct: 'NCT03057977', name: 'EMPEROR-Reduced', drug: 'Empagliflozin',
      phase: 'Phase 3', enrollment: 3730, status: 'Completed',
      startDate: '2017-03', completionDate: '2020-05', resultsDate: '2020-10',
      sponsor: 'Boehringer Ingelheim', sites: 520, countries: 20, hasDSMB: true,
      primaryEndpoint: 'CV death or HF hospitalisation',
      population: 'HFrEF (LVEF \u226440%), NYHA II-IV',
      result: 'HR 0.75 (0.65\u20130.86), p<0.001',
      niceTA: 'TA773 (Mar 2022)', escRec: 'Class I, Level A (Aug 2021)',
      category: 'hf'
    },
    {
      nct: 'NCT03057951', name: 'EMPEROR-Preserved', drug: 'Empagliflozin',
      phase: 'Phase 3', enrollment: 5988, status: 'Completed',
      startDate: '2017-03', completionDate: '2021-04', resultsDate: '2021-10',
      sponsor: 'Boehringer Ingelheim', sites: 622, countries: 23, hasDSMB: true,
      primaryEndpoint: 'CV death or HF hospitalisation',
      population: 'HFpEF (LVEF >40%), NYHA II-IV',
      result: 'HR 0.79 (0.69\u20130.90), p<0.001',
      niceTA: 'TA929 (Nov 2023)', escRec: 'Class I (2023 focused update)',
      category: 'hf'
    },
    {
      nct: 'NCT03619213', name: 'DELIVER', drug: 'Dapagliflozin',
      phase: 'Phase 3', enrollment: 6263, status: 'Completed',
      startDate: '2018-08', completionDate: '2022-03', resultsDate: '2022-09',
      sponsor: 'AstraZeneca', sites: 350, countries: 20, hasDSMB: true,
      primaryEndpoint: 'CV death or worsening HF',
      population: 'HFmrEF/HFpEF (LVEF >40%)',
      result: 'HR 0.82 (0.73\u20130.92), p<0.001',
      niceTA: 'TA902 (Jun 2023)', escRec: 'Class I (2023 focused update)',
      category: 'hf'
    },
    {
      nct: 'NCT01035255', name: 'PARADIGM-HF', drug: 'Sacubitril/Valsartan',
      phase: 'Phase 3', enrollment: 8442, status: 'Completed',
      startDate: '2009-12', completionDate: '2014-05', resultsDate: '2014-09',
      sponsor: 'Novartis', sites: 1043, countries: 47, hasDSMB: true,
      primaryEndpoint: 'CV death or HF hospitalisation',
      population: 'HFrEF (LVEF \u226440%), NYHA II-IV',
      result: 'HR 0.80 (0.73\u20130.87), p<0.001',
      niceTA: 'TA388 (Apr 2016)', escRec: 'Class I, Level B (2016, 2021)',
      category: 'hf'
    },
    {
      nct: 'NCT03412201', name: 'STRONG-HF', drug: 'Rapid GDMT uptitration',
      phase: 'Phase 4', enrollment: 1078, status: 'Completed',
      startDate: '2018-05', completionDate: '2022-07', resultsDate: '2022-12',
      sponsor: 'Heart Initiative', sites: 87, countries: 14, hasDSMB: true,
      primaryEndpoint: '180-day death or HF readmission',
      population: 'Acute HF, recently discharged',
      result: 'RR 0.66 (0.50\u20130.86), p=0.002',
      niceTA: 'Not appraised', escRec: 'Supports rapid initiation strategy',
      category: 'hf'
    },
    {
      nct: 'NCT00202878', name: 'IMPROVE-IT', drug: 'Ezetimibe + Simvastatin',
      phase: 'Phase 3', enrollment: 18144, status: 'Completed',
      startDate: '2005-10', completionDate: '2014-09', resultsDate: '2015-06',
      sponsor: 'Merck', sites: 1147, countries: 39, hasDSMB: true,
      primaryEndpoint: 'CV death, MI, UA, revascularisation, stroke',
      population: 'Post-ACS, LDL 1.3\u20132.6 mmol/L on statin',
      result: 'HR 0.936 (0.89\u20130.99), p=0.016',
      niceTA: 'Available via CG181', escRec: 'Class I (2019 Dyslipidaemia)',
      category: 'acs'
    },
    {
      nct: 'NCT01764633', name: 'FOURIER', drug: 'Evolocumab',
      phase: 'Phase 3', enrollment: 27564, status: 'Completed',
      startDate: '2013-01', completionDate: '2016-11', resultsDate: '2017-03',
      sponsor: 'Amgen', sites: 1242, countries: 49, hasDSMB: true,
      primaryEndpoint: 'CV death, MI, stroke, UA, revascularisation',
      population: 'ASCVD, LDL \u22651.8 mmol/L on statin',
      result: 'HR 0.85 (0.79\u20130.92), p<0.001',
      niceTA: 'TA394 (Jun 2016)', escRec: 'Class I (2019)',
      category: 'acs'
    },
    {
      nct: 'NCT01663402', name: 'ODYSSEY Outcomes', drug: 'Alirocumab',
      phase: 'Phase 3', enrollment: 18924, status: 'Completed',
      startDate: '2012-11', completionDate: '2017-11', resultsDate: '2018-11',
      sponsor: 'Sanofi/Regeneron', sites: 1315, countries: 57, hasDSMB: true,
      primaryEndpoint: 'CHD death, MI, ischaemic stroke, UA',
      population: 'Post-ACS (1\u201312 months), LDL \u22651.8 mmol/L on statin',
      result: 'HR 0.85 (0.78\u20130.93), p=0.0003',
      niceTA: 'TA393 (Jun 2016)', escRec: 'Class I (2019)',
      category: 'acs'
    },
    {
      nct: 'NCT00542945', name: 'DANISH', drug: 'ICD vs usual care',
      phase: 'Phase 3', enrollment: 1116, status: 'Completed',
      startDate: '2008-02', completionDate: '2014-06', resultsDate: '2016-08',
      sponsor: 'Danish Study Group (academic)', sites: 5, countries: 1, hasDSMB: true,
      primaryEndpoint: 'All-cause mortality',
      population: 'Non-ischaemic cardiomyopathy, LVEF \u226435%',
      result: 'HR 0.87 (0.68\u20131.12), p=0.28',
      niceTA: 'TA314 unchanged', escRec: 'Prompted ICD re-evaluation',
      category: 'hf'
    },
    {
      nct: 'NCT01685840', name: 'GUIDE-IT', drug: 'NT-proBNP-guided therapy',
      phase: 'Phase 3', enrollment: 894, status: 'Completed (stopped for futility)',
      startDate: '2013-01', completionDate: '2016-10', resultsDate: '2017-08',
      sponsor: 'Duke University (NHLBI)', sites: 45, countries: 2, hasDSMB: true,
      primaryEndpoint: 'CV death or HF hospitalisation',
      population: 'HFrEF (LVEF \u226440%), NT-proBNP \u22652000',
      result: 'HR 0.98 (0.79\u20131.22), p=0.88',
      niceTA: 'Not adopted', escRec: 'Class IIa (serial monitoring, 2021)',
      category: 'hf'
    },
    {
      nct: 'NCT05198791', name: 'StratMedMINOCA', drug: 'Eplerenone (MRA)',
      phase: 'Phase 2', enrollment: 400, status: 'Recruiting',
      startDate: '2022-06', completionDate: '2026 (est)', resultsDate: 'Pending',
      sponsor: 'Academic (UK)', sites: 20, countries: 3, hasDSMB: true,
      primaryEndpoint: 'Within-patient change in NT-proBNP at 6 months',
      population: 'MINOCA (MI with non-obstructive coronaries)',
      result: 'Recruiting \u2014 no results yet',
      niceTA: 'No MINOCA pathway in NG185', escRec: 'MINOCA diagnostic algorithm (2023 ACS guidelines)',
      category: 'acs'
    }
  ];

  /* ---- Utility: escape HTML entities ---- */
  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  /* ---- Compute summary statistics for a trial set ---- */
  function computeSummary(trials) {
    var totalEnroll = 0;
    var sitesList = [];
    var startYears = [];
    var endYears = [];

    for (var i = 0; i < trials.length; i++) {
      totalEnroll += trials[i].enrollment;
      sitesList.push(trials[i].sites);
      var sy = parseInt(trials[i].startDate.split('-')[0], 10);
      if (!isNaN(sy)) startYears.push(sy);
      var eyStr = trials[i].completionDate.split('-')[0].replace(/[^0-9]/g, '');
      var ey = parseInt(eyStr, 10);
      if (!isNaN(ey)) endYears.push(ey);
    }

    // Median sites
    sitesList.sort(function (a, b) { return a - b; });
    var medianSites;
    var mid = Math.floor(sitesList.length / 2);
    if (sitesList.length % 2 === 0) {
      medianSites = Math.round((sitesList[mid - 1] + sitesList[mid]) / 2);
    } else {
      medianSites = sitesList[mid];
    }

    var minYear = Math.min.apply(null, startYears);
    var maxYear = Math.max.apply(null, endYears);

    return {
      totalEnroll: totalEnroll,
      medianSites: medianSites,
      trialCount: trials.length,
      dateRange: minYear + '\u2013' + maxYear
    };
  }

  /* ---- Format a number with locale-style commas ---- */
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

  /* ---- Determine NICE TA colour class ---- */
  function niceClass(ta) {
    if (/not appraised|not adopted|unchanged|no .* pathway/i.test(ta)) {
      return 'warning';
    }
    if (/available via/i.test(ta)) {
      return 'amber-hl';
    }
    return '';
  }

  /* ---- Determine result styling ---- */
  function resultClass(result) {
    if (/no results|recruiting|futility|p\s*=\s*0\.\d*[2-9]/i.test(result) ||
        /p\s*=\s*0\.28|p\s*=\s*0\.88/i.test(result)) {
      return 'warning';
    }
    return '';
  }

  /* ---- Render summary banner ---- */
  function renderSummary(summary, label) {
    var html = '<div class="ctgov-summary" style="' +
      'display:flex;flex-wrap:wrap;gap:1.5rem;align-items:center;' +
      'padding:1rem 1.25rem;margin-bottom:1.5rem;' +
      'background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;">';

    html += '<div style="font-weight:700;color:var(--navy);font-size:0.95rem;">' +
      'CT.gov Registry \u2014 ' + esc(label) + '</div>';

    html += '<div style="display:flex;gap:1.5rem;flex-wrap:wrap;">';

    html += '<span class="stat-highlight">' +
      fmtNum(summary.totalEnroll) + ' total enrolled</span>';
    html += '<span class="stat-highlight">' +
      summary.trialCount + ' trials</span>';
    html += '<span class="stat-highlight">' +
      summary.medianSites + ' median sites</span>';
    html += '<span class="stat-highlight">' +
      summary.dateRange + '</span>';

    html += '</div></div>';
    return html;
  }

  /* ---- Render a single trial card ---- */
  function renderCard(trial) {
    var html = '<div class="ctgov-card" style="' +
      'border:1px solid var(--gray-200);border-radius:8px;' +
      'margin-bottom:1rem;overflow:hidden;">';

    /* -- Header row -- */
    html += '<div class="ctgov-card-header" style="' +
      'display:flex;flex-wrap:wrap;align-items:center;gap:0.75rem;' +
      'padding:0.85rem 1rem;background:var(--gray-50);' +
      'border-bottom:1px solid var(--gray-200);">';

    html += '<a href="https://clinicaltrials.gov/study/' + esc(trial.nct) + '" ' +
      'target="_blank" rel="noopener" class="nct" style="' +
      'font-family:monospace;font-size:0.8rem;color:var(--teal);' +
      'background:var(--teal-bg);padding:0.2rem 0.5rem;border-radius:4px;' +
      'text-decoration:none;">' + esc(trial.nct) + '</a>';

    html += '<strong style="font-size:1rem;color:var(--navy);">' +
      esc(trial.name) + '</strong>';
    html += '<span style="color:var(--gray-500);font-size:0.88rem;">' +
      esc(trial.drug) + '</span>';

    /* Status badge */
    var statusColor = trial.status === 'Recruiting' ? 'var(--amber)' : 'var(--teal)';
    if (/futility/i.test(trial.status)) statusColor = 'var(--red)';
    html += '<span style="margin-left:auto;font-size:0.78rem;font-weight:600;' +
      'color:' + statusColor + ';">' + esc(trial.status) + '</span>';

    html += '</div>';

    /* -- Metrics row -- */
    html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;' +
      'padding:0.6rem 1rem;font-size:0.82rem;color:var(--gray-500);' +
      'border-bottom:1px solid var(--gray-200);">';

    html += '<span>' + esc(trial.phase) + '</span>';
    html += '<span>\u00B7</span>';
    html += '<span><strong>' + fmtNum(trial.enrollment) + '</strong> enrolled</span>';
    html += '<span>\u00B7</span>';
    html += '<span>' + trial.sites + ' sites</span>';
    html += '<span>\u00B7</span>';
    html += '<span>' + trial.countries + ' countries</span>';
    html += '<span>\u00B7</span>';
    html += '<span>' + esc(trial.sponsor) + '</span>';
    if (trial.hasDSMB) {
      html += '<span>\u00B7</span>';
      html += '<span style="color:var(--teal);">DSMB \u2713</span>';
    }

    html += '</div>';

    /* -- Body -- */
    html += '<div style="padding:0.85rem 1rem;">';

    /* Primary endpoint */
    html += '<div style="margin-bottom:0.6rem;">';
    html += '<span style="font-size:0.75rem;text-transform:uppercase;' +
      'letter-spacing:0.04em;font-weight:600;color:var(--gray-500);">' +
      'Primary endpoint</span><br>';
    html += '<span style="font-size:0.88rem;color:var(--gray-700);">' +
      esc(trial.primaryEndpoint) + '</span>';
    html += '</div>';

    /* Population */
    html += '<div style="margin-bottom:0.6rem;">';
    html += '<span style="font-size:0.75rem;text-transform:uppercase;' +
      'letter-spacing:0.04em;font-weight:600;color:var(--gray-500);">' +
      'Population</span><br>';
    html += '<span style="font-size:0.88rem;color:var(--gray-700);">' +
      esc(trial.population) + '</span>';
    html += '</div>';

    /* Result */
    html += '<div style="margin-bottom:0.75rem;">';
    html += '<span style="font-size:0.75rem;text-transform:uppercase;' +
      'letter-spacing:0.04em;font-weight:600;color:var(--gray-500);">' +
      'Result</span><br>';
    var rCls = resultClass(trial.result);
    html += '<span class="stat-highlight' + (rCls ? ' ' + rCls : '') + '">' +
      esc(trial.result) + '</span>';
    html += '</div>';

    /* NICE vs ESC row */
    html += '<div style="display:flex;flex-wrap:wrap;gap:1rem;">';

    /* NICE TA */
    var nCls = niceClass(trial.niceTA);
    html += '<div style="flex:1;min-width:200px;">';
    html += '<span style="font-size:0.75rem;text-transform:uppercase;' +
      'letter-spacing:0.04em;font-weight:600;color:var(--gray-500);">' +
      'NICE TA</span><br>';
    html += '<span class="stat-highlight' + (nCls ? ' ' + nCls : '') + '">' +
      esc(trial.niceTA) + '</span>';
    html += '</div>';

    /* ESC Recommendation */
    html += '<div style="flex:1;min-width:200px;">';
    html += '<span style="font-size:0.75rem;text-transform:uppercase;' +
      'letter-spacing:0.04em;font-weight:600;color:var(--gray-500);">' +
      'ESC Recommendation</span><br>';
    html += '<span class="stat-highlight">' +
      esc(trial.escRec) + '</span>';
    html += '</div>';

    html += '</div>'; /* end NICE vs ESC row */

    /* Dates */
    html += '<div style="margin-top:0.6rem;font-size:0.78rem;color:var(--gray-500);">';
    html += 'Started ' + esc(trial.startDate) +
      ' \u00B7 Completed ' + esc(trial.completionDate) +
      ' \u00B7 Results ' + esc(trial.resultsDate);
    html += '</div>';

    html += '</div>'; /* end body */
    html += '</div>'; /* end card */
    return html;
  }

  /* ---- Filter trials by category ---- */
  function filterTrials(cat) {
    var out = [];
    for (var i = 0; i < TRIALS.length; i++) {
      if (TRIALS[i].category === cat) out.push(TRIALS[i]);
    }
    return out;
  }

  /* ---- Public init: Heart Failure panel ---- */
  function initCTGovHF() {
    var container = document.getElementById('ctgov-data-hf');
    if (!container) return;

    var hfTrials = filterTrials('hf');
    var summary = computeSummary(hfTrials);
    var html = renderSummary(summary, 'Heart Failure Trials');

    for (var i = 0; i < hfTrials.length; i++) {
      html += renderCard(hfTrials[i]);
    }

    container.innerHTML = html;
  }

  /* ---- Public init: ACS panel ---- */
  function initCTGovACS() {
    var container = document.getElementById('ctgov-data-acs');
    if (!container) return;

    var acsTrials = filterTrials('acs');
    var summary = computeSummary(acsTrials);
    var html = renderSummary(summary, 'ACS / Lipid Trials');

    for (var i = 0; i < acsTrials.length; i++) {
      html += renderCard(acsTrials[i]);
    }

    container.innerHTML = html;
  }

  /* ---- Init on DOMContentLoaded ---- */
  document.addEventListener('DOMContentLoaded', function () {
    initCTGovHF();
    initCTGovACS();
  });
})();
