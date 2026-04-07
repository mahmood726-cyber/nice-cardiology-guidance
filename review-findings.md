## Multi-Persona Review: NICE Cardiology Guidance Site
### Date: 2026-04-06
### Summary: 4 P0, 15 P1, 17 P2 (after deduplication across 5 personas)

---

#### P0 -- Critical (must fix)

- **P0-1** [Statistical + Clinical]: heart-failure.html line 253 — Total patient count "10,434" is wrong. DAPA-HF (4,744) + EMPEROR-Reduced (3,730) = 8,474, not 10,434. Internal inconsistency with the data table below.
  - Fix: Change "10,434" to "8,474"

- **P0-2** [Clinical]: heart-failure.html line 389 — "~920,000 HFrEF patients" is incorrect. 920K is the total HF population (all phenotypes). HFrEF is ~40-50% = ~400-450K. Line 579 correctly says ~450K is half (HFpEF), confirming 920K is total. Using 920K for HFrEF inflates the affected population by 2x.
  - Fix: Change to "~400,000-450,000 HFrEF patients in England"

- **P0-3** [Statistical]: heart-failure.html line 357 — "NICE TA775" for dapagliflozin in HF is wrong. Header says TA902. Correct TA for dapagliflozin in HFrEF is TA775 (Feb 2022); TA902 is for HFpEF (Mar 2024). Both should be listed but the header/body are contradictory.
  - Fix: Header should list "TA775 (Dapagliflozin, HFrEF)" AND "TA902 (Dapagliflozin, HFpEF)". Timeline should stay as TA775.

- **P0-4** [Accessibility]: All 3 HTML files — Issue card headers are `<div>` with click handlers but NO `tabindex`, NO `role="button"`, NO keyboard handler, NO `aria-expanded`. Core interaction completely inaccessible to keyboard/screen-reader users.
  - Fix: Add `tabindex="0"`, `role="button"`, `aria-expanded`, keyboard Enter/Space handlers

#### P1 -- Important (should fix)

- **P1-1** [Statistical]: acs.html line 732 — "with less bleeding" for prasugrel in ISAR-REACT 5 is misleading. Bleeding was similar (BARC 3-5: HR 0.88, p=0.46), not less.
  - Fix: Change to "without significantly increased bleeding"

- **P1-2** [Clinical]: acs.html lines 729-752 — ISAR-REACT 5 presented as definitive without noting: open-label design, pre-treatment bias (ticagrelor arm pre-treated per protocol), and ESC Level B (not A) grading.
  - Fix: Add caveat about open-label design and pre-treatment difference

- **P1-3** [Clinical]: Both files — NICE's cost-effectiveness mandate (QALY threshold, binding NHS access guarantees) insufficiently acknowledged. Site treats NICE as a slower ESC rather than engaging with its health-economic gatekeeping function.
  - Fix: Add section acknowledging NICE's dual mandate; argue delays are excessive EVEN accounting for TA process

- **P1-4** [Clinical]: heart-failure.html lines 420-442 — Vaduganathan 62% relative reduction is a cross-trial modelled estimate assuming independent multiplicative effects. Not a direct RCT result. STRONG-HF didn't include SGLT2i.
  - Fix: Add caveat: "Modelled estimate; no single RCT has tested simultaneous four-pillar initiation."

- **P1-5** [Clinical]: heart-failure.html lines 455-464 — ESC sacubitril/valsartan "first-line (Class I)" oversimplified. ESC recommends as replacement for ACEi (Class I, Level B), not universal first agent.
  - Fix: Change to "recommended to replace ACEi (Class I, Level B); de novo use endorsed"

- **P1-6** [Clinical]: heart-failure.html lines 621-634 — DANISH trial age subgroup omitted: <68 years had significant mortality reduction (HR 0.64, p=0.02). Relevant since NICE makes no age distinction.
  - Fix: Add age subgroup finding

- **P1-7** [Clinical]: acs.html lines 640-651 — MINOCA mechanism percentages are single point estimates; should be ranges (myocarditis 6-33%, spasm 15-30%).
  - Fix: Present ranges

- **P1-8** [Clinical]: acs.html lines 449-451 — NICE troponin pathway oversimplified as "0/3h". NG185 allows single-sample rule-out below LoD when >3h from onset.
  - Fix: Acknowledge single-sample rule-out pathway; focus critique on lack of validated delta algorithm

- **P1-9** [Clinical]: acs.html lines 826-828 — CG172 may be withdrawn/superseded by NG185. Verify current status.
  - Fix: If withdrawn, note as "(withdrawn, now part of NG185)"

- **P1-10** [Clinical]: index.html line 71 — CG187 (Acute HF) referenced but not critiqued in heart-failure.html which focuses on chronic HF.
  - Fix: Remove CG187 or add acute HF content

- **P1-11** [Engineering]: heart-failure.html + acs.html — ~195 lines of identical inline `<style>` duplicated across both pages. Maintenance hazard.
  - Fix: Extract to css/page-components.css

- **P1-12** [Engineering]: js/main.js — Filter hides cards but doesn't collapse them. Re-showing after filter gives stale max-height (scrollHeight was 0 while hidden). Content may be clipped.
  - Fix: On filter-hide, also collapse: `card.classList.remove('open'); body.style.maxHeight='0'`

- **P1-13** [Engineering]: js/main.js — Expand/collapse max-height set once; becomes stale on window resize. Open cards may clip.
  - Fix: Add resize listener to recalculate, or use max-height:none after transition

- **P1-14** [Clinical]: heart-failure.html — No "last assessed" date. 2024-2025 NICE updates not reflected. Site should be explicit about assessment snapshot.
  - Fix: Add assessment date to each issue card

- **P1-15** [Accessibility]: All files — No `<main>` landmark. Screen readers can't jump to content.
  - Fix: Wrap content in `<main id="main-content">`

#### P2 -- Minor (nice to fix)

- **P2-1** [Accessibility]: All files — No skip-to-content link
- **P2-2** [Accessibility]: css/styles.css — No `:focus-visible` styles anywhere
- **P2-3** [Accessibility]: Filter buttons lack `aria-pressed`; hamburger lacks `aria-expanded`
- **P2-4** [Accessibility]: Gap-meter bars have no `role="progressbar"` or ARIA attributes
- **P2-5** [Accessibility]: Breadcrumb missing `<nav aria-label="Breadcrumb">` + `<ol>` structure
- **P2-6** [Accessibility]: Print CSS doesn't override `display:none` from JS filter
- **P2-7** [Statistical]: heart-failure.html line 692 — "JACC 2014" should be "JACC Heart Failure 2014"
- **P2-8** [Statistical]: heart-failure.html line 581 — 75% HFpEF 5-year mortality is extreme end; use "50-75%" or "up to 75%"
- **P2-9** [Clinical]: heart-failure.html line 698 — GUIDE-IT described as "underpowered"; actually "stopped early for futility"
- **P2-10** [Statistical]: acs.html line 552 — IMPROVE-IT timeline uses study completion (Sep 2014) not publication (Jun 2015)
- **P2-11** [Clinical]: acs.html line 539 — "No lower LDL threshold" slightly overstated; add "in major trials, though data below 0.5 mmol/L are limited"
- **P2-12** [Engineering]: js/main.js — Duplicate smooth scroll (CSS + JS). Pick one.
- **P2-13** [Engineering]: css/styles.css — No intermediate breakpoint for .comparison-row at ~1024px
- **P2-14** [Engineering]: No favicon declared; empty images/ directory
- **P2-15** [Engineering]: Inline style= attributes should be utility CSS classes
- **P2-16** [Security]: Inline `<style>` blocks would require `unsafe-inline` in CSP
- **P2-17** [Clinical]: acs.html line 650 — "MRA-MI" is informal; official name is StratMedMINOCA

#### False Positive Watch
- Pooled HFrEF HR 0.74 (0.67-0.82), I²=0%, NNT=21 — all verified correct
- STRONG-HF HR 0.66 (0.50-0.86), n=1,078 — verified correct
- DANISH HR 0.87 (0.68-1.12) — verified correct
- GUIDE-IT HR 0.98 (0.79-1.22), n=894 — verified correct
- CTT RR 0.78 (0.76-0.80) per mmol/L — verified correct
- FOURIER HR 0.85 (0.79-0.92), n=27,564 — verified correct
- ODYSSEY HR 0.85 (0.78-0.93), n=18,924 — verified correct
- TWILIGHT HR 0.56 (0.45-0.68) — verified correct
- Cochrane CR RR 0.74 (0.64-0.86) — verified correct

---
**Status:** REVIEW CLEAN — All P0 and P1 fixed. Advanced stats engine added.

### Fix Log (2026-04-07)
- [FIXED] P0-1: 10,434 → 8,474
- [FIXED] P0-2: ~920K HFrEF → ~400-450K (with total HF clarification)
- [FIXED] P0-3: TA numbers corrected (TA775 HFrEF + TA902 HFpEF in header, TA775 in timeline)
- [FIXED] P0-4: Full keyboard accessibility + ARIA states + focus styles
- [FIXED] P1-1: "with less bleeding" → "without significantly increased bleeding"
- [FIXED] P1-2: ISAR-REACT 5 open-label caveat + pre-treatment bias noted
- [FIXED] P1-3: Added "Fair Critique: NICE's Cost-Effectiveness Mandate" section on index.html
- [FIXED] P1-4: Vaduganathan modelled estimate caveat + STRONG-HF SGLT2i note
- [FIXED] P1-5: ESC sacubitril/valsartan "replace ACEi (Class I, Level B)"
- [FIXED] P1-6: DANISH age subgroup (HR 0.64, p=0.02 in <68 years)
- [FIXED] P1-7: MINOCA mechanism percentages → ranges
- [FIXED] P1-8: Troponin pathway nuanced (single-sample rule-out acknowledged)
- [FIXED] P1-9: CG172 noted as "largely superseded by NG185"
- [FIXED] P1-10: CG187 reference removed from HF card
- [FIXED] P1-11: 195 lines duplicated CSS → extracted to css/page-components.css
- [FIXED] P1-12: Filter now collapses hidden cards (stale max-height fix)
- [FIXED] P1-13: Window resize recalculates open card heights
- [FIXED] P1-14: Assessment date added via live computation timestamp
- [FIXED] P1-15: <main id="main-content"> on all pages + skip link + sr-only utility
- [ADDED] Stats engine: DL meta-analysis, NNT/NNH, TSA, Bayesian posteriors, forest plots
- [ADDED] WebR validation: on-demand R metafor validation (lazy-loaded)
- [FIXED] P2-2: :focus-visible styles
- [FIXED] P2-3: aria-pressed on filter buttons
- [FIXED] P2-6: Print CSS override for filtered cards
- [FIXED] P2-7: JACC → JACC Heart Failure 2014
- [FIXED] P2-8: 75% → 50-75% HFpEF mortality
- [FIXED] P2-9: "underpowered" → "stopped early for futility"
- [FIXED] P2-10: IMPROVE-IT date Sep 2014 → Nov 2014 (AHA presentation)
- [FIXED] P2-12: Removed duplicate smooth scroll JS (CSS handles it)
- [FIXED] P2-13: Added 1024px breakpoint for comparison-row
