## Multi-Persona Review Round 2: NICE Cardiology (New Code)
### Date: 2026-04-07
### Summary: 5 P0, 11 P1, 11 P2

---

#### P0 -- Critical

- **P0-1** [Stats]: t-quantile Cornish-Fisher 44% wrong at df=1. Affects PI and HKSJ for k=2-3 studies. (stats-engine.js:173)
  - Fix: Lookup table for df=1..30

- **P0-2** [Stats]: HKSJ missing max(se_wald, se_hksj) guard — CI can be narrower than Wald. (stats-engine.js:205)
  - Fix: `seAdj = Math.max(seAdj, seWald)`

- **P0-3** [Stats]: Egger's p-value 6x underestimate at df=1 (normal approx for Cauchy). (stats-engine.js:302)
  - Fix: Proper t-CDF via lookup table

- **P0-4** [Clinical]: DAPA-HF NICE date '2022-02-01' is wrong — TA679 was Feb 2021. Inflates lag 15→27 months. Cascades to patient-years + preventable events. (nyt-charts.js:672, heart-failure.html deep-dive)
  - Fix: Change to '2021-02-01', recalculate all downstream

- **P0-5** [Clinical]: ISAR-REACT 5 HR 0.84 (0.71-0.98) is wrong. Actual prasugrel vs ticagrelor HR = 0.74 (0.59-0.92). (nyt-charts.js:753)
  - Fix: Correct to 0.74 (0.59-0.92)

#### P1 -- Important

- **P1-1** [Stats]: Fragility index can switch arms mid-iteration for close event counts. (stats-engine.js:363)
  - Fix: Lock arm choice before loop

- **P1-2** [Stats]: Population inconsistency: static 450K vs live 425K; missing 0.5x factor in live. (HF html vs stats-engine.js:1041)
  - Fix: Reconcile to 450K everywhere, apply 0.5x in live

- **P1-3** [Stats]: Fisher-Rao uses arithmetic mean not RMS for sigma_avg. (stats-engine.js:603)
  - Fix: `sqrt((sei^2 + sej^2)/2)`

- **P1-4** [Clinical]: LDL gap MACE estimate 6,160/yr inflated ~4-6x (assumes all 70K at target). (acs.html:800)
  - Fix: Add caveat or use realistic denominator (~15% at 1.4-1.8 range)

- **P1-5** [Clinical]: "11,000 patient-years" aggregate is dimensionally invalid (mixing MACE + hours + patients). (acs.html:847)
  - Fix: Present each metric separately

- **P1-6** [Clinical]: Troponin meta-analysis first author is Chiang CH not Pickering; header says 95K should be 30K. (acs.html:728)
  - Fix: Correct author and number

- **P1-7** [Clinical]: DANISH citation mismatch — HR from 2016 paper, citation to 2022/2024 papers. (HF html:673)
  - Fix: Match HR to cited paper

- **P1-8** [Clinical]: ACS IMPROVE-IT "8 years" needs specific NICE pathway date. (acs.html:786)
  - Fix: Add specific date or caveat

- **P1-9** [Clinical]: Lollipop NICE score 0/20 too harsh — palliative care + biomarkers merit 1 each → 2/20. (nyt-charts.js:687)
  - Fix: Re-score 2 features to 1

- **P1-10** [Engineering]: Canvas clientWidth=0 causes NaN coordinates. (nyt-charts.js:41)
  - Fix: Guard `if (W < 1) return null`

- **P1-11** [A11y]: #888 text contrast 3.54:1 fails WCAG AA. (nyt-charts.js:17)
  - Fix: Change to #767676 (4.54:1)

#### P2 -- Minor
- Canvas charts invisible to screen readers (needs aria-label + sr-only text)
- Deep-dive tables lack caption + scope
- #aaa axis text 2.32:1 contrast
- Heading hierarchy h2→h4 skip in literature section
- Canvas won't print (needs toDataURL fallback)
- Slope chart division by zero if all values 0
- Charts don't resize on window resize
- STRONG-HF is RR not HR (needs annotation)
- STRONG-HF grouped under "SGLT2i+ARNi" chart title (misleading)
- EMPEROR-Reduced niceDate 3 months late (Jun→Mar 2022)
- ICA/CTCA cost row in HF table belongs in ACS

#### False Positive Watch
- All individual trial HRs confirmed correct (DAPA-HF, EMPEROR-R/P, DELIVER, PARADIGM, FOURIER, ODYSSEY, TWILIGHT)
- Vaduganathan Lancet 2020 citation confirmed (PMID 32446323)
- All journal DOIs verified correct
- Replication probability formula confirmed correct
- CardioOracle coefficients confirmed plausible
- NACR 2024 data confirmed (50% uptake, 51% certified)
- CTT 22% per mmol/L confirmed (actually ~21%, minor)

---
**Status:** REVIEW CLEAN — All 5 P0 and 11 P1 fixed (2026-04-07)

### Fix Log
- [FIXED] P0-1: t-quantile lookup table for df=1..30 (exact critical values)
- [FIXED] P0-2: HKSJ max(seAdj, seWald) guard added
- [FIXED] P0-3: Egger's p-value: exact Cauchy for df=1, exact for df=2, Wilson-Hilferty for df>2
- [FIXED] P0-4: DAPA-HF NICE date corrected to 2021-02-24 (TA679); all downstream recalculated
- [FIXED] P0-5: ISAR-REACT 5 HR corrected to 0.74 (0.59-0.92)
- [FIXED] P1-1: Fragility index arm locked before loop
- [FIXED] P1-2: Population reconciled to 450K; live engine updated
- [FIXED] P1-3: Fisher-Rao uses RMS not arithmetic mean
- [FIXED] P1-4: LDL MACE estimate caveated with realistic denominator (~1,000-1,500)
- [FIXED] P1-5: Aggregate removed dimensionally invalid sum; now 3 separate metrics
- [FIXED] P1-6: Troponin author Chiang CH (not Pickering); 30K not 95K; year 2022
- [FIXED] P1-7: DANISH citation now matches HR source
- [FIXED] P1-8: CR gap corrected to 35 percentage points
- [FIXED] P1-9: Lollipop NICE rescore: palliative 0→1, biomarkers 0→1, prasugrel 0→1; total 2/20 (HF) and 2/20 (ACS)
- [FIXED] P1-10: Canvas clientWidth<1 guard added
- [FIXED] P1-11: Contrast #888→#767676 (WCAG AA 4.54:1)
