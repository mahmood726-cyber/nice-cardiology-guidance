"""Static site contracts for NICECardiology."""

from __future__ import annotations

import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SITE_PAGES = [
    REPO_ROOT / "index.html",
    REPO_ROOT / "heart-failure.html",
    REPO_ROOT / "acs.html",
]
LOCAL_ASSET_RE = re.compile(r'<(?:link|script|img|a)[^>]+(?:href|src)="([^"]+)"', re.IGNORECASE)
ALL_HTML_FILES = sorted(REPO_ROOT.glob("*.html"))
README = REPO_ROOT / "README.md"
# Externally-loaded assets break offline use; hyperlinks (<a href>) are allowed.
EXTERNAL_ASSET_RE = re.compile(
    r'<(?:link|script|img)[^>]+(?:href|src)="(https?://[^"]+)"', re.IGNORECASE
)
WINDOWS_PATH_RE = re.compile(r"[A-Za-z]:\\(?:Users|NICECardiology|Projects)", re.IGNORECASE)
PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}|REPLACE_ME|__PLACEHOLDER__|TODO_FILL")
ENGINE_JS_FILES = [
    REPO_ROOT / "js" / "stats-engine.js",
    REPO_ROOT / "js" / "advanced-stats.js",
]


def test_core_site_pages_exist() -> None:
    for page in SITE_PAGES:
        assert page.is_file(), f"missing page: {page.name}"


def test_home_page_links_topic_pages() -> None:
    html = (REPO_ROOT / "index.html").read_text(encoding="utf-8")

    assert "NICE Cardiology Guidance" in html
    assert 'href="heart-failure.html"' in html
    assert 'href="acs.html"' in html
    assert "A Fair Critique: Understanding NICE's Mandate" in html


def test_topic_pages_keep_expected_titles_and_sections() -> None:
    hf_html = (REPO_ROOT / "heart-failure.html").read_text(encoding="utf-8")
    acs_html = (REPO_ROOT / "acs.html").read_text(encoding="utf-8")

    assert "Heart Failure" in hf_html
    assert "DAPA-HF" in hf_html
    assert "NICE NG106" in hf_html

    assert "Acute Coronary Syndrome" in acs_html or "ACS" in acs_html
    assert "NICE NG185" in acs_html
    assert "NSTEMI" in acs_html or "STEMI" in acs_html


def test_local_links_and_assets_resolve() -> None:
    missing: list[str] = []

    for page in SITE_PAGES:
        html = page.read_text(encoding="utf-8")
        for target in LOCAL_ASSET_RE.findall(html):
            if target.startswith(("http://", "https://", "#", "mailto:")):
                continue
            resolved = (page.parent / target).resolve()
            if not resolved.exists():
                missing.append(f"{page.name}: {target}")

    assert not missing, f"missing linked assets: {missing}"


def test_no_externally_loaded_assets_offline() -> None:
    """Every page must run offline: no CDN-loaded CSS/JS/fonts/images."""
    offenders: list[str] = []
    for page in ALL_HTML_FILES:
        html = page.read_text(encoding="utf-8")
        for hit in EXTERNAL_ASSET_RE.findall(html):
            offenders.append(f"{page.name}: {hit}")
    assert not offenders, f"externally-loaded assets break offline use: {offenders}"


def test_no_hardcoded_local_paths() -> None:
    offenders: list[str] = []
    for page in ALL_HTML_FILES:
        html = page.read_text(encoding="utf-8")
        for hit in WINDOWS_PATH_RE.findall(html):
            offenders.append(f"{page.name}: {hit}")
    for js in sorted(REPO_ROOT.glob("js/*.js")):
        for hit in WINDOWS_PATH_RE.findall(js.read_text(encoding="utf-8")):
            offenders.append(f"{js.name}: {hit}")
    assert not offenders, f"hardcoded local paths in shipped assets: {offenders}"


def test_no_unfilled_placeholder_tokens() -> None:
    offenders: list[str] = []
    for page in ALL_HTML_FILES:
        html = page.read_text(encoding="utf-8")
        for hit in PLACEHOLDER_RE.findall(html):
            offenders.append(f"{page.name}: {hit}")
    assert not offenders, f"unfilled placeholder tokens: {offenders}"


def test_script_tags_balanced() -> None:
    imbalanced: list[str] = []
    for page in ALL_HTML_FILES:
        html = page.read_text(encoding="utf-8")
        opens = len(re.findall(r"<script[\s>]", html, re.IGNORECASE))
        closes = len(re.findall(r"</script>", html, re.IGNORECASE))
        if opens != closes:
            imbalanced.append(f"{page.name}: {opens} open / {closes} close")
    assert not imbalanced, f"unbalanced <script> tags: {imbalanced}"


def test_topic_pages_load_their_js_modules() -> None:
    """heart-failure and acs dashboards must reference the stats engine modules that exist."""
    for page_name in ("heart-failure.html", "acs.html"):
        html = (REPO_ROOT / page_name).read_text(encoding="utf-8")
        for module in ("js/stats-engine.js", "js/advanced-stats.js", "js/main.js"):
            assert f'src="{module}"' in html, f"{page_name} missing <script {module}>"
            assert (REPO_ROOT / module).is_file(), f"missing module file: {module}"


def test_prediction_interval_uses_tk1() -> None:
    """Regression guard: PI must use t_{k-1} (Cochrane v6.5), not the superseded t_{k-2}."""
    for js in ENGINE_JS_FILES:
        src = js.read_text(encoding="utf-8")
        assert "tQuantile(0.025, k - 2)" not in src, f"{js.name}: stale t_{{k-2}} PI"
        # The k-2 PI df assignment in transportabilityIndex must be gone.
        assert "var df = k - 2;" not in src, f"{js.name}: stale t_{{k-2}} PI df"


def test_readme_describes_real_artifacts() -> None:
    readme = README.read_text(encoding="utf-8")
    assert "NICE Cardiology Guidance" in readme
    for page in ("heart-failure.html", "acs.html", "e156-paper.html"):
        assert page in readme, f"README does not mention {page}"
    assert "stats-engine.js" in readme
    assert "t_{k" in readme  # documents the prediction-interval convention
