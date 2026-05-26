#!/usr/bin/env bash
# FH6 Car Data — Development Environment Manager
#
# Usage: ./run-dev.sh [component] [--foreground]
# Examples:
#   ./run-dev.sh              # Start api + frontend
#   ./run-dev.sh all          # Start api + frontend
#   ./run-dev.sh api          # Start Flask API only
#   ./run-dev.sh frontend     # Start Vite dev server only
#   ./run-dev.sh ui           # Alias for frontend
#   ./run-dev.sh restart      # Restart running components
#   ./run-dev.sh stop         # Stop all components
#   ./run-dev.sh status       # Show component status
#   ./run-dev.sh help         # Show this help

set -e

COMPONENT="${1:-all}"
FOREGROUND_MODE=""

# Colours
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# PID files
API_PID_FILE=".api.pid"
UI_PID_FILE=".ui.pid"

# Ports (override via env)
API_PORT="${FH6_API_PORT:-5002}"
UI_PORT="${FH6_UI_PORT:-3002}"

show_help() {
    echo ""
    echo -e "${BLUE}🏎  FH6 Car Data — Dev Environment Manager${NC}"
    echo ""
    echo "Usage: $0 [component] [--foreground]"
    echo ""
    echo "Components:"
    echo "  all        Start api + frontend [default]"
    echo "  api        Start Flask API only  (http://localhost:${API_PORT})"
    echo "  frontend   Start Vite dev server (http://localhost:${UI_PORT})"
    echo "  ui         Alias for frontend"
    echo "  restart    Restart currently running components"
    echo "  stop       Stop all components"
    echo "  status     Show status of all components"
    echo "  help       Show this help"
    echo ""
    echo "Options:"
    echo "  --foreground   Run in foreground (shows output directly, Ctrl+C to stop)"
    echo ""
    echo "Environment variables:"
    echo "  FH6_API_PORT   Flask API port (default: 5000)"
    echo "  FH6_UI_PORT    Vite port     (default: 5173)"
    echo ""
    echo "Tips:"
    echo "  💡 Logs are written to logs/api.log and logs/ui.log"
    echo "  💡 Use '$0 stop' or Ctrl+C in foreground mode to stop"
    echo ""
}

# Parse flags
for arg in "$@"; do
    case "$arg" in
        --foreground) FOREGROUND_MODE="1" ;;
    esac
done

# Normalise aliases
[[ "$COMPONENT" == "ui" ]] && COMPONENT="frontend"

# ── Help / early exits ───────────────────────────────────────────────────────
if [[ "$COMPONENT" == "help" || "$COMPONENT" == "--help" || "$COMPONENT" == "-h" ]]; then
    show_help; exit 0
fi

# ── Utility functions ────────────────────────────────────────────────────────
cd "$(dirname "$0")"
mkdir -p logs

is_running() {
    local pid_file=$1
    if [[ -f "$pid_file" ]]; then
        local pid
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        rm -f "$pid_file"
    fi
    return 1
}

stop_component() {
    local name=$1
    local pid_file=$2
    if [[ -f "$pid_file" ]]; then
        local pid
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}⏹  Stopping ${name} (PID ${pid})…${NC}"
            kill "$pid" 2>/dev/null || true
            sleep 0.5
            kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
        echo -e "${GREEN}✅ ${name} stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  ${name} not running${NC}"
    fi
}

print_status() {
    echo ""
    echo -e "${BLUE}📊 Component Status${NC}"
    echo "────────────────────────────────"

    if is_running "$API_PID_FILE"; then
        echo -e "  API      ${GREEN}● running${NC}  http://localhost:${API_PORT}  (PID $(cat $API_PID_FILE))"
    else
        echo -e "  API      ${RED}○ stopped${NC}"
    fi

    if is_running "$UI_PID_FILE"; then
        echo -e "  Frontend ${GREEN}● running${NC}  http://localhost:${UI_PORT}  (PID $(cat $UI_PID_FILE))"
    else
        echo -e "  Frontend ${RED}○ stopped${NC}"
    fi
    echo ""
}

# ── stop / status early exits ─────────────────────────────────────────────────
if [[ "$COMPONENT" == "stop" ]]; then
    stop_component "API"      "$API_PID_FILE"
    stop_component "Frontend" "$UI_PID_FILE"
    exit 0
fi

if [[ "$COMPONENT" == "status" ]]; then
    print_status; exit 0
fi

# ── Virtual environment ───────────────────────────────────────────────────────
activate_venv() {
    if [[ -d ".venv" ]]; then
        # shellcheck disable=SC1091
        source .venv/bin/activate
    elif [[ -d "venv" ]]; then
        # shellcheck disable=SC1091
        source venv/bin/activate
    else
        echo -e "${RED}❌ No Python virtual environment found (.venv or venv).${NC}"
        echo -e "${YELLOW}   Run: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt${NC}"
        exit 1
    fi
}

# ── Start API ─────────────────────────────────────────────────────────────────
start_api() {
    if is_running "$API_PID_FILE"; then
        echo -e "${YELLOW}⚠️  API already running (PID $(cat $API_PID_FILE))${NC}"
        return
    fi

    activate_venv

    echo -e "${BLUE}🐍 Starting Flask API on port ${API_PORT}…${NC}"

    if [[ "$FOREGROUND_MODE" == "1" ]]; then
        FH6_API_PORT="$API_PORT" python -m api.main
    else
        FH6_API_PORT="$API_PORT" python -m api.main > logs/api.log 2>&1 &
        echo $! > "$API_PID_FILE"
        sleep 1
        if is_running "$API_PID_FILE"; then
            echo -e "${GREEN}✅ API started  → http://localhost:${API_PORT}  (log: logs/api.log)${NC}"
        else
            echo -e "${RED}❌ API failed to start. Check logs/api.log${NC}"
            cat logs/api.log | tail -20
            exit 1
        fi
    fi
}

# ── Start Frontend ────────────────────────────────────────────────────────────
start_frontend() {
    if [[ ! -d "frontend/node_modules" ]]; then
        echo -e "${YELLOW}📦 node_modules not found — running npm install…${NC}"
        (cd frontend && npm install)
    fi

    if is_running "$UI_PID_FILE"; then
        echo -e "${YELLOW}⚠️  Frontend already running (PID $(cat $UI_PID_FILE))${NC}"
        return
    fi

    echo -e "${BLUE}⚡ Starting Vite dev server on port ${UI_PORT}…${NC}"

    if [[ "$FOREGROUND_MODE" == "1" ]]; then
        (cd frontend && FH6_API_PORT="$API_PORT" npm run dev -- --port "$UI_PORT")
    else
        (cd frontend && FH6_API_PORT="$API_PORT" npm run dev -- --port "$UI_PORT" > ../logs/ui.log 2>&1) &
        echo $! > "$UI_PID_FILE"
        sleep 2
        if is_running "$UI_PID_FILE"; then
            echo -e "${GREEN}✅ Frontend started → http://localhost:${UI_PORT}  (log: logs/ui.log)${NC}"
        else
            echo -e "${RED}❌ Frontend failed to start. Check logs/ui.log${NC}"
            cat logs/ui.log | tail -20
            exit 1
        fi
    fi
}

# ── Restart ───────────────────────────────────────────────────────────────────
restart_running() {
    local restarted=0
    if is_running "$API_PID_FILE"; then
        stop_component "API" "$API_PID_FILE"
        start_api
        restarted=$((restarted + 1))
    fi
    if is_running "$UI_PID_FILE"; then
        stop_component "Frontend" "$UI_PID_FILE"
        start_frontend
        restarted=$((restarted + 1))
    fi
    if [[ $restarted -eq 0 ]]; then
        echo -e "${YELLOW}⚠️  No components were running. Use '$0 all' to start.${NC}"
    fi
}

# ── Validate component arg ────────────────────────────────────────────────────
case "$COMPONENT" in
    all|api|frontend|restart) ;;
    *)
        echo -e "${RED}❌ Unknown component: $COMPONENT${NC}"
        show_help; exit 1
        ;;
esac

# ── Main ──────────────────────────────────────────────────────────────────────
echo -e "${BLUE}🏎  FH6 Car Data — starting dev environment…${NC}"
echo ""

case "$COMPONENT" in
    all)
        start_api
        start_frontend
        echo ""
        print_status
        ;;
    api)
        start_api
        ;;
    frontend)
        start_frontend
        ;;
    restart)
        restart_running
        ;;
esac
