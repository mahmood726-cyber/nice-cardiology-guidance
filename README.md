# NICE Cardiology Guidance: Under the Microscope

A data-driven statistical critique of NICE cardiology guidelines, computed entirely
client-side in dependency-free JavaScript. The site examines where NICE recommendations
in **heart failure** (NG106) and **acute coronary syndromes** (NG185 / legacy CG94/CG95)
lag behind landmark trial evidence and international guideline bodies.

**Live:** https://mahmood726-cyber.github.io/nice-cardiology-guidance/

## What it does

Each topic page assesses individual guideline issues on three dimensions — the identified
problem, the supporting trial/meta-analytic evidence, and the current NICE position — and
backs the critique with meta-analysis run live in the browser. Headline finding: a pooled
SGLT2-inhibitor class-effect HR of 0.79 (95% CI 0.74–0.84, I² 28%) across the HFrEF trials
— DAPA-HF (NCT03036124) and EMPEROR-Reduced (NCT03057977), computed live by
`js/stats-engine.js` and cross-validated against R `metafor` — with NICE ranking last of six
guideline bodies on adoption timing.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Landing page — overview, topic cards, "fair critique" of NICE's cost-effectiveness mandate |
| `heart-failure.html` | Heart-failure analysis dashboard (6 issues) — loads the full stats engine |
| `acs.html` | Acute-coronary-syndrome analysis dashboard (6 issues) — loads the full stats engine |
| `e156-paper.html` | The E156 micro-paper (155 words, 7 sentences) — see `E156-PROTOCOL.md` |

## Statistics engine (`js/`)

All computation is client-side, zero-dependency, and works offline (the only network call
is an optional live ClinicalTrials.gov lookup that degrades gracefully). Key modules:

| Module | Contents |
|--------|----------|
| `stats-engine.js` | DerSimonian–Laird random-effects pooling, HKSJ-corrected CIs, prediction intervals (t_{k-1}), Egger's test, leave-one-out & influence diagnostics, cumulative MA, fragility index, Fisher's exact, trial sequential analysis, GRADE, NNT, replication probability |
| `advanced-stats.js` | Conformal (distribution-free) prediction intervals, transportability index, and further advanced methods |
| `triangulation.js` | Cross-source triangulation across registry / regulatory / prescribing data |
| `final-methods.js` | Additional methods used by the dashboards |
| `nyt-charts.js`, `nyt-charts-v2.js` | NYT-style canvas charts (forest plots, timelines) |
| `ctgov-live.js` | Optional live ClinicalTrials.gov lookup |
| `webr-validation.js` | On-demand WebR cross-validation against R `metafor` |
| `main.js` | Navigation and page wiring |

### Statistical conventions

- **Pooling** on the log scale (logHR), back-transformed after.
- **Heterogeneity** via Cochran's Q, I², τ².
- **HKSJ** CIs use the t-distribution with df = k−1 and a variance floor (SE never narrower than Wald).
- **Prediction intervals** use t_{k−1} per Cochrane Handbook v6.5 (matches metafor `predict` v4+;
  the earlier IntHout-2016 / Higgins–Thompson t_{k−2} form is superseded).

## Tests

```
python -m pytest
```

Static-site contracts assert the core pages exist, the home page links the topic pages, the
topic pages keep their expected titles/sections, all local assets resolve, the site is offline
(no CDN-loaded assets), there are no hardcoded paths or unfilled placeholders, and the
prediction-interval engine uses the t_{k−1} convention.

## Disclaimer

For educational and research purposes only. Not medical advice — always follow local clinical
protocols and current guideline documents. NICE guidelines are Crown copyright and referenced
here under fair dealing for criticism and review.

Created by Dr Mahmood Ahmad, Royal Free Hospital, London. Licensed under MIT (see `LICENSE`).
