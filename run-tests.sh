#!/usr/bin/env bash
# FH6 Car Data — Comprehensive Test Runner
#
# Usage: ./run-tests.sh [MODE]
#   all       - Run Python tests + frontend lint/build [DEFAULT]
#   python    - Run Python lint + pytest only
#   api       - Alias for python
#   frontend  - Run frontend lint + build only
#   ui        - Alias for frontend

set -e

MODE="${1:-all}"

case "$MODE" in
    all|python|api|frontend|ui) ;;
    *)
        echo "❌ Invalid mode: $MODE"
        echo "Usage: ./run-tests.sh [all|python|api|frontend|ui]"
        exit 1
        ;;
esac

[[ "$MODE" == "ui" ]]  && MODE="frontend"
[[ "$MODE" == "api" ]] && MODE="python"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🏎  FH6 Car Data — Test Suite Runner${NC}"
echo "====================================="
echo "Mode: $MODE"
echo ""

# Change to repo root
cd "$(dirname "$0")"

# Tracking
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES_LIST=()
FAILED_LOG="test-failures.log"

echo "FH6 Car Data Test Failures — $(date)" > "$FAILED_LOG"
echo "======================================" >> "$FAILED_LOG"
echo "" >> "$FAILED_LOG"

# ── Helpers ───────────────────────────────────────────────────────────────────
pass_suite() {
    local name=$1
    echo -e "${GREEN}✅ PASSED: ${name}${NC}"
    PASSED_SUITES=$((PASSED_SUITES + 1))
}

fail_suite() {
    local name=$1
    echo -e "${RED}❌ FAILED: ${name}${NC}"
    FAILED_SUITES_LIST+=("$name")
    echo "FAILED: $name  ($(date))" >> "$FAILED_LOG"
}

section() {
    echo ""
    echo -e "${BLUE}── $1${NC}"
    echo "────────────────────────────────────────"
}

# ── Python: activate venv ─────────────────────────────────────────────────────
activate_venv() {
    if [[ -d ".venv" ]]; then
        # shellcheck disable=SC1091
        source .venv/bin/activate
    elif [[ -d "venv" ]]; then
        # shellcheck disable=SC1091
        source venv/bin/activate
    else
        echo -e "${RED}❌ No Python venv found. Run: python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt${NC}"
        exit 1
    fi
}

# ── Python lint (ruff) ────────────────────────────────────────────────────────
run_python_lint() {
    section "Python linting (ruff)"

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    local tmp
    tmp=$(mktemp)
    set +e
    ruff check . > "$tmp" 2>&1
    local exit_code=$?
    set -e

    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ ruff — no issues${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        echo -e "${YELLOW}⚠️  ruff warnings (non-blocking):${NC}"
        cat "$tmp"
        echo -e "${YELLOW}⚠️  Linting warnings found — review recommended${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))  # warnings are non-blocking
    fi
    rm -f "$tmp"
}

# ── Python tests (pytest) ─────────────────────────────────────────────────────
run_python_tests() {
    section "Python tests (pytest)"

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    local tmp
    tmp=$(mktemp)

    set +e
    python -m pytest tests/ -v --tb=short --color=yes 2>&1 | tee "$tmp"
    local exit_code=$?
    set -e

    local passed
    local failed
    local errors
    local skipped
    passed=$(grep -oP '\d+(?= passed)' "$tmp" | tail -1 || echo "0")
    failed=$(grep -oP '\d+(?= failed)' "$tmp" | tail -1 || echo "0")
    errors=$(grep -oP '\d+(?= error)' "$tmp"  | tail -1 || echo "0")
    skipped=$(grep -oP '\d+(?= skipped)' "$tmp" | tail -1 || echo "0")

    if [[ "$failed" -gt 0 || "$errors" -gt 0 || $exit_code -ne 0 ]]; then
        fail_suite "pytest"
        echo "  Results: ${passed} passed, ${failed} failed, ${errors} errors, ${skipped} skipped" >> "$FAILED_LOG"
        grep -E "^FAILED" "$tmp" | sed 's/^/  /' >> "$FAILED_LOG" || true
        echo "" >> "$FAILED_LOG"
    else
        echo -e "${GREEN}   Results: ${passed} passed, ${skipped} skipped${NC}"
        pass_suite "pytest"
    fi

    rm -f "$tmp"
}

# ── Frontend lint (eslint) ────────────────────────────────────────────────────
run_frontend_lint() {
    section "Frontend linting (eslint)"

    if [[ ! -d "frontend/node_modules" ]]; then
        echo -e "${YELLOW}📦 node_modules missing — running npm install…${NC}"
        (cd frontend && npm install --silent)
    fi

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    set +e
    (cd frontend && npm run lint 2>&1)
    local exit_code=$?
    set -e

    if [[ $exit_code -eq 0 ]]; then
        pass_suite "eslint"
    else
        fail_suite "eslint"
        echo "  Run: cd frontend && npm run lint" >> "$FAILED_LOG"
        echo "" >> "$FAILED_LOG"
    fi
}

# ── Frontend build ────────────────────────────────────────────────────────────
run_frontend_build() {
    section "Frontend build (vite)"

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    local tmp
    tmp=$(mktemp)

    set +e
    (cd frontend && npm run build 2>&1) | tee "$tmp"
    local exit_code=$?
    set -e

    if [[ $exit_code -eq 0 ]]; then
        pass_suite "vite build"
    else
        fail_suite "vite build"
        cat "$tmp" >> "$FAILED_LOG"
        echo "" >> "$FAILED_LOG"
    fi

    rm -f "$tmp"
}

# ── Dispatch ──────────────────────────────────────────────────────────────────
case "$MODE" in
    all)
        activate_venv
        run_python_lint
        run_python_tests
        run_frontend_lint
        run_frontend_build
        ;;
    python)
        activate_venv
        run_python_lint
        run_python_tests
        ;;
    frontend)
        run_frontend_lint
        run_frontend_build
        ;;
esac

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "====================================="
echo -e "${BLUE}📊 TEST SUMMARY${NC}"
echo "====================================="
echo "Suites run:    $TOTAL_SUITES"
echo -e "Passed:        ${GREEN}$PASSED_SUITES${NC}"
echo -e "Failed:        ${RED}${#FAILED_SUITES_LIST[@]}${NC}"

if [[ ${#FAILED_SUITES_LIST[@]} -gt 0 ]]; then
    echo ""
    echo -e "${RED}Failed suites:${NC}"
    for s in "${FAILED_SUITES_LIST[@]}"; do
        echo -e "${RED}  ❌ $s${NC}"
    done
    echo ""
    echo -e "${YELLOW}📝 Details: $FAILED_LOG${NC}"
    echo ""
    echo -e "${RED}❌ TESTS FAILED${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo "All tests passed — no failures" > "$FAILED_LOG"
    exit 0
fi
