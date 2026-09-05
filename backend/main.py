"""
Real-Time Crypto Fraud Attribution System — Backend API
SIH 2026 — Full-featured build.

Includes:
  - Blockchain tracing (Bitcoin + Ethereum, live + simulation fallback)
  - Exchange/VASP attribution
  - Cross-chain bridge detection (Wormhole, LayerZero, Hop, Stargate ...)
  - DeFi protocol detection (Uniswap, Aave, Compound, 1inch ...)
  - AI/ML fraud typology classification (Bayesian, pure-Python, explainable)
  - Fraud pattern recognition (Peel Chain, Mixer-Exit, Triple-Threat ...)
  - Anomaly scoring
  - NCRP/SAHYOG simulated integration
  - Standardised investigation report generation
  - Analytics dashboard for LEAs
"""
from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from typing import Optional, Literal, List, Dict
import time
import json
import sys
import datetime
import asyncio

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

from engine.tracer import trace_wallet
from engine.risk_scoring import score_trace
from engine.clustering import cluster_from_txs
from engine.cross_chain import analyse_trace_for_cross_chain
from engine.ml_detector import analyse as ml_analyse
from blockchain import bitcoin_client, ethereum_client, live_crypto
from mock_lea import sahyog_ncrp_mock as lea

# ─── ANSI color codes ────────────────────────────────────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
MAGENTA= "\033[95m"
CYAN   = "\033[96m"
WHITE  = "\033[97m"
ORANGE = "\033[38;5;208m"
PURPLE = "\033[38;5;135m"

def _ts():
    return datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]

def _method_color(method: str) -> str:
    return {"GET": CYAN, "POST": GREEN, "DELETE": RED, "PUT": YELLOW, "PATCH": ORANGE}.get(method, WHITE)

def _status_color(status: int) -> str:
    if status < 300: return GREEN
    if status < 400: return YELLOW
    return RED

def log_separator(char="-", width=72):
    print(f"{DIM}{char * width}{RESET}", flush=True)

def log_section(title: str, color=CYAN):
    width = 72
    pad = max(2, (width - len(title) - 4) // 2)
    print(f"{color}{BOLD}{'='*pad}  {title}  {'='*pad}{RESET}", flush=True)

def log_info(tag: str, msg: str, color=WHITE):
    print(f"{DIM}[{_ts()}]{RESET} {BOLD}{color}{tag:<18}{RESET} {msg}", flush=True)

def log_blockchain(chain: str, address: str, step: str, detail: str = ""):
    chain_color = ORANGE if chain == "bitcoin" else PURPLE
    print(f"{DIM}[{_ts()}]{RESET} {BOLD}{chain_color}[{chain.upper():<8}]{RESET}  "
          f"{CYAN}{step:<22}{RESET}  {YELLOW}{address[:20]}...{address[-6:]}{RESET}  {DIM}{detail}{RESET}", flush=True)

def log_hop(hop: int, addr: str, node_type: str, label: str, value):
    type_colors = {
        "exchange": GREEN, "mixer": RED, "bridge": MAGENTA,
        "defi": PURPLE, "layering": YELLOW, "source": CYAN,
    }
    icon = {
        "exchange": "🏦", "mixer": "🌀", "bridge": "🌉",
        "defi": "💱", "layering": "🔗", "source": "🎯",
    }.get(node_type, "•")
    color = type_colors.get(node_type, WHITE)
    val_str = f"{value:,.0f} sat" if value and value > 1000 else (f"{value} wei" if value else "?")
    print(f"{DIM}[{_ts()}]{RESET}   {icon}  {BOLD}{color}HOP {hop:<3}{RESET}  "
          f"{color}{node_type:<10}{RESET}  {WHITE}{addr[:18]}...{addr[-6:]}{RESET}  "
          f"{DIM}{label:<28}{RESET}  {CYAN}{val_str}{RESET}", flush=True)


# ─── Live Connection & Interaction Hub ────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, asyncio.Lock] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = asyncio.Lock()

    def disconnect(self, websocket: WebSocket):
        self.active_connections.pop(websocket, None)

    async def send_personal(self, websocket: WebSocket, message: dict):
        lock = self.active_connections.get(websocket)
        if not lock:
            return
        try:
            async with lock:
                await asyncio.wait_for(websocket.send_json(message), timeout=1.0)
        except Exception:
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        for ws in list(self.active_connections.keys()):
            await self.send_personal(ws, message)

ws_manager = ConnectionManager()

_INTERACTION_HISTORY: List[dict] = []
_MAX_INTERACTIONS = 120

def _classify_path(path: str) -> str:
    p = path.lower()
    if "complaint" in p: return "complaint"
    if "trace" in p: return "trace"
    if "cluster" in p: return "cluster"
    if "market" in p or "crypto" in p: return "market"
    if "gas" in p: return "gas"
    if "blockchain" in p: return "blockchain"
    if "mempool" in p: return "mempool"
    if "ml" in p: return "ml"
    if "cross_chain" in p: return "bridge"
    if "report" in p: return "report"
    if "dashboard" in p or "stats" in p: return "analytics"
    return "system"

# ─── Live HTTP logging middleware ─────────────────────────────────────────────
class LiveLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        t0 = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - t0) * 1000

        # Record structured live interaction telemetry for API routes (exclude internal polling)
        path = request.url.path
        if path.startswith("/api") and not (
            path.startswith("/api/live/interactions")
            or path.startswith("/api/health")
            or path.startswith("/api/ws")
        ):
            client_ip = request.client.host if request.client else "127.0.0.1"
            interaction_record = {
                "id": f"REQ-{int(time.time()*1000)}-{len(_INTERACTION_HISTORY)+1}",
                "timestamp": _ts(),
                "unix_time": time.time(),
                "method": request.method,
                "path": path,
                "query": str(request.url.query) if request.url.query else "",
                "client_ip": client_ip,
                "status_code": response.status_code,
                "elapsed_ms": round(elapsed, 1),
                "category": _classify_path(path),
            }
            _INTERACTION_HISTORY.append(interaction_record)
            if len(_INTERACTION_HISTORY) > _MAX_INTERACTIONS:
                _INTERACTION_HISTORY.pop(0)

            if ws_manager.active_connections:
                try:
                    asyncio.create_task(ws_manager.broadcast({
                        "type": "interaction",
                        "interaction": interaction_record,
                    }))
                except Exception:
                    pass

        return response



app = FastAPI(title="Real-Time Crypto Fraud Attribution System", version="2.0.0")

# NOTE: CORSMiddleware must be added AFTER LiveLogMiddleware so it wraps the outside
app.add_middleware(LiveLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Print startup banner
log_section("CRYPTO FRAUD ATTRIBUTION - BACKEND LIVE", GREEN)
log_info("STATUS", "Server starting on http://0.0.0.0:8000", GREEN)
log_info("API DOCS", "http://localhost:8000/docs", CYAN)
log_info("3D VIEW", "http://localhost:8000/3d_view.html", CYAN)
log_separator("=")
print(flush=True)


class ComplaintIn(BaseModel):
    victim_reported_address: str
    chain: Literal["bitcoin", "ethereum"]
    complaint_category: str
    reporting_officer: Optional[str] = None
    victim_id_masked: Optional[str] = None
    max_hops: int = 5


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "time": int(time.time())}


@app.post("/api/complaint")
async def submit_complaint(payload: ComplaintIn):
    """
    Full automated pipeline:
      complaint ingest → blockchain trace → VASP attribution
      → cross-chain bridge analysis → DeFi detection
      → AI/ML fraud typology classification + anomaly scoring
      → risk scoring → case creation
    """
    t_start = time.perf_counter()
    log_section("NEW COMPLAINT RECEIVED", YELLOW)
    log_info("CHAIN",    payload.chain.upper(), ORANGE if payload.chain == "bitcoin" else PURPLE)
    log_info("ADDRESS",  payload.victim_reported_address, WHITE)
    log_info("CATEGORY", payload.complaint_category, CYAN)
    log_info("MAX HOPS", str(payload.max_hops), DIM)

    # 1. Open case (NCRP/SAHYOG intake)
    log_info("STEP 1/6", "Opening NCRP/SAHYOG case...", CYAN)
    case = lea.ingest_complaint(
        victim_reported_address=payload.victim_reported_address,
        chain=payload.chain,
        complaint_category=payload.complaint_category,
        reporting_officer=payload.reporting_officer,
        victim_id_masked=payload.victim_id_masked,
    )
    log_info("CASE ID",  case["case_id"], GREEN)

    # 2. Blockchain trace (live or simulation fallback)
    log_info("STEP 2/6", f"Starting blockchain BFS trace ({payload.chain.upper()})...", CYAN)
    log_blockchain(payload.chain, payload.victim_reported_address, "BFS TRACE START")
    trace_result = await trace_wallet(
        payload.victim_reported_address, payload.chain, max_hops=payload.max_hops
    )
    src = trace_result.get("data_source", "?")
    hops = trace_result.get("traced_hops", 0)
    src_color = GREEN if src == "live" else YELLOW
    log_info("DATA SRC",  src.upper(), src_color)
    log_info("HOPS FOUND", str(hops), WHITE)
    # Print each hop
    for i, step in enumerate(trace_result.get("path", [])):
        node = next((n for n in trace_result["graph"]["nodes"] if n["id"] == step["address"]), {})
        edge = next((e for e in trace_result["graph"]["edges"] if e["to"] == step["address"]), {})
        log_hop(i, step["address"], node.get("type", step.get("role", "?")),
                node.get("label", ""), edge.get("value", 0))
    if trace_result.get("attribution"):
        attr = trace_result["attribution"]
        log_info("ATTRIBUTED", f"✅ {attr.get('exchange','?')} ({attr.get('type','?')})", GREEN)
    else:
        log_info("ATTRIBUTED", "⚠️  No exchange found in trace depth", YELLOW)

    # 3. Risk scoring (rule-based, explainable)
    log_info("STEP 3/6", "Running risk scoring...", CYAN)
    risk = score_trace(trace_result)
    band_color = {"CRITICAL": RED, "HIGH": ORANGE, "MEDIUM": YELLOW, "LOW": GREEN}.get(risk.get("risk_band", ""), WHITE)
    log_info("RISK SCORE", f"{risk.get('risk_score','?')} / 100  [{risk.get('risk_band','?')}]", band_color)
    for reason in risk.get("reasons", [])[:4]:
        log_info("  reason", reason, DIM)

    # 4. Cross-chain bridge + DeFi analysis
    log_info("STEP 4/6", "Cross-chain bridge & DeFi analysis...", CYAN)
    cross_chain = analyse_trace_for_cross_chain(trace_result)
    log_info("BRIDGES", str(cross_chain.get("bridge_events_detected", 0)), MAGENTA)
    log_info("DEFI",    str(cross_chain.get("defi_events_detected", 0)), PURPLE)
    log_info("CC RISK",  cross_chain.get("cross_chain_risk", "NONE"), MAGENTA)

    # 5. AI/ML fraud typology classification + pattern recognition + anomaly scoring
    log_info("STEP 5/6", "AI/ML fraud typology classification...", CYAN)
    ml_result = ml_analyse(trace_result, cross_chain)
    log_info("TYPOLOGY",  ml_result.get("top_fraud_typology", "?"), MAGENTA)
    log_info("CONFIDENCE", str(ml_result.get("typology_confidence", "?")), WHITE)
    log_info("ANOMALY",   f"{ml_result.get('anomaly_score','?')} [{ml_result.get('anomaly_band','?')}]", RED)
    for p in ml_result.get("patterns_detected", [])[:3]:
        log_info("  pattern", p.get("pattern_name", "?"), DIM)

    # 6. Attach everything to the case
    log_info("STEP 6/6", "Finalising case & attaching results...", CYAN)
    case = lea.attach_trace_result(case["case_id"], trace_result, risk, cross_chain, ml_result)

    elapsed = (time.perf_counter() - t_start) * 1000
    log_section(f"PIPELINE COMPLETE  {elapsed:.0f} ms", GREEN)
    print(flush=True)

    return case


@app.get("/api/trace")
async def trace_only(address: str, chain: Literal["bitcoin", "ethereum"], max_hops: int = 5):
    """Standalone trace endpoint — no case creation."""
    log_section("STANDALONE TRACE", CYAN)
    log_blockchain(chain, address, "BFS TRACE START")
    trace_result = await trace_wallet(address, chain, max_hops=max_hops)
    log_info("DATA SRC", trace_result.get("data_source", "?").upper(),
             GREEN if trace_result.get("data_source") == "live" else YELLOW)
    log_info("HOPS", str(trace_result.get("traced_hops", 0)), WHITE)
    for i, step in enumerate(trace_result.get("path", [])):
        node = next((n for n in trace_result["graph"]["nodes"] if n["id"] == step["address"]), {})
        edge = next((e for e in trace_result["graph"]["edges"] if e["to"] == step["address"]), {})
        log_hop(i, step["address"], node.get("type", step.get("role", "?")),
                node.get("label", ""), edge.get("value", 0))
    risk = score_trace(trace_result)
    log_info("RISK", f"{risk.get('risk_score','?')} [{risk.get('risk_band','?')}]", YELLOW)
    cross_chain = analyse_trace_for_cross_chain(trace_result)
    ml_result = ml_analyse(trace_result, cross_chain)
    log_section("TRACE DONE", GREEN)
    return {"trace": trace_result, "risk": risk, "cross_chain": cross_chain, "ml": ml_result}


@app.get("/api/cluster")
async def cluster_address(address: str, chain: Literal["bitcoin", "ethereum"] = "bitcoin"):
    """Common-input-ownership clustering around a given address."""
    client = bitcoin_client if chain == "bitcoin" else ethereum_client
    result = await client.get_address_transactions(address, limit=25)
    clusters = cluster_from_txs(result["txs"])
    return {"address": address, "chain": chain, "data_source": result["source"], "clusters": clusters}


@app.get("/api/case/{case_id}")
async def get_case(case_id: str):
    case = lea.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return case


@app.get("/api/case/{case_id}/hops")
async def case_hops(case_id: str):
    """Ordered hop list — used by 3D replay animation."""
    case = lea.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    tr = case.get("trace_result") or {}
    path = tr.get("path", [])
    edges = tr.get("graph", {}).get("edges", [])
    nodes = {n["id"]: n for n in tr.get("graph", {}).get("nodes", [])}
    edge_map = {(e["from"], e["to"]): e for e in edges}

    hops = []
    for i, step in enumerate(path):
        addr = step["address"]
        prev_addr = path[i - 1]["address"] if i > 0 else None
        edge = edge_map.get((prev_addr, addr)) if prev_addr else None
        hops.append({
            "hop_index":  i,
            "address":    addr,
            "role":       step.get("role", "unknown"),
            "label":      nodes.get(addr, {}).get("label", ""),
            "node_type":  nodes.get(addr, {}).get("type", "layering"),
            "txid":       step.get("txid") or (edge["txid"] if edge else None),
            "value":      edge["value"] if edge else None,
        })
    return {"case_id": case_id, "chain": case.get("chain"), "hops": hops}


@app.get("/api/cross_chain/{case_id}")
async def cross_chain_analysis(case_id: str):
    """Cross-chain bridge and DeFi analysis for a traced case."""
    case = lea.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return case.get("cross_chain_analysis") or {"message": "No cross-chain analysis found for this case."}


@app.get("/api/ml/{case_id}")
async def ml_analysis(case_id: str):
    """AI/ML fraud typology classification result for a traced case."""
    case = lea.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return case.get("ml_analysis") or {"message": "No ML analysis found for this case."}


@app.get("/api/cases")
async def list_cases():
    return lea.list_cases()


@app.get("/api/dashboard/stats")
async def dashboard_stats():
    return lea.dashboard_stats()


@app.get("/api/crypto/market")
async def crypto_market():
    """Real-time crypto asset market prices, 24h metrics and INR conversions."""
    return await live_crypto.get_live_market_prices()


@app.get("/api/crypto/gas")
async def crypto_gas():
    """Real-time gas and network fees for Ethereum (Gwei) and Bitcoin (sat/vB)."""
    return await live_crypto.get_live_gas_and_fees()


@app.get("/api/blockchain/status")
async def blockchain_status():
    """Real-time block heights and network status for Bitcoin and Ethereum."""
    return await live_crypto.get_live_blockchain_status()


@app.get("/api/blockchain/address/{chain}/{address}")
async def blockchain_address_info(chain: str, address: str):
    """Real-time on-chain balance, tx counts, and fiat conversions for an address."""
    return await live_crypto.get_live_address_metrics(address, chain)


@app.get("/api/live/mempool")
async def live_mempool(chain: str = "bitcoin", count: int = 60):
    """Live mempool and recent transactions feed for 3D visualization and monitor."""
    count = min(count, 120)
    txs = await live_crypto.get_live_mempool_txs(chain, count)
    return {"chain": chain, "mempool": txs}


@app.get("/api/live/interactions")
async def get_live_interactions(limit: int = 50, category: Optional[str] = None):
    """
    Returns real-time backend API request/response interactions,
    pipeline executions, and latency metrics for forensics analysis.
    """
    history = _INTERACTION_HISTORY
    if category and category.lower() != "all":
        history = [i for i in history if i["category"].lower() == category.lower()]
    limit = min(max(1, limit), 120)
    return {
        "active_ws_clients": len(ws_manager.active_connections),
        "total_captured": len(_INTERACTION_HISTORY),
        "count": len(history[-limit:]),
        "interactions": list(reversed(history[-limit:])),
    }


async def global_heartbeat_loop():
    """Single global background task to broadcast real-time metrics every 3 seconds."""
    while True:
        try:
            if ws_manager.active_connections:
                market, gas, status = await asyncio.gather(
                    live_crypto.get_live_market_prices(),
                    live_crypto.get_live_gas_and_fees(),
                    live_crypto.get_live_blockchain_status(),
                    return_exceptions=True,
                )
                payload = {
                    "type": "heartbeat",
                    "timestamp": int(time.time()),
                    "market": market if isinstance(market, dict) else {},
                    "gas": gas if isinstance(gas, dict) else {},
                    "blockchain": status if isinstance(status, dict) else {},
                }
                await ws_manager.broadcast(payload)
        except Exception:
            pass
        await asyncio.sleep(3.0)


@app.on_event("startup")
async def on_startup_event():
    asyncio.create_task(global_heartbeat_loop())


@app.websocket("/api/ws/realtime")
async def websocket_realtime_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint broadcasting real-time market prices, gas fees,
    network status, and live transaction pulses.
    """
    await ws_manager.connect(websocket)
    try:
        # Immediately send snapshot of current cached telemetry so client gets data instantly
        market = live_crypto._get_cache("market_prices") or {}
        gas = live_crypto._get_cache("gas_and_fees") or {}
        status = live_crypto._get_cache("blockchain_status") or {}
        await ws_manager.send_personal(websocket, {
            "type": "heartbeat",
            "timestamp": int(time.time()),
            "market": market,
            "gas": gas,
            "blockchain": status,
        })
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await ws_manager.send_personal(websocket, {"type": "pong", "timestamp": int(time.time())})
    except (WebSocketDisconnect, Exception):
        ws_manager.disconnect(websocket)


# ─── Server-Sent Events (SSE) Stream ──────────────────────────────────────────
@app.get("/api/stream/live-crypto")
async def sse_live_crypto_stream():
    """
    Server-Sent Events endpoint streaming real-time prices & gas updates
    for web clients preferring EventSource.
    """
    async def event_generator():
        while True:
            try:
                market = await live_crypto.get_live_market_prices()
                gas = await live_crypto.get_live_gas_and_fees()
                data = json.dumps({"market": market, "gas": gas, "timestamp": int(time.time())})
                yield f"data: {data}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/report/{case_id}")
async def generate_report(case_id: str):
    """Standardised investigation report (JSON) — attach to case file for LEA action."""
    case = lea.get_case(case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    tr  = case.get("trace_result") or {}
    ra  = case.get("risk_assessment") or {}
    cc  = case.get("cross_chain_analysis") or {}
    ml  = case.get("ml_analysis") or {}

    report = {
        "report_id":   f"RPT-{case_id}",
        "generated_at": int(time.time()),
        "report_version": "2.0",
        "case_summary": {
            "case_id":             case["case_id"],
            "source_platform":     case["source_platform"],
            "complaint_category":  case["complaint_category"],
            "reporting_officer":   case["reporting_officer"],
        },
        "subject_wallet":  case["victim_reported_address"],
        "chain":           case["chain"],

        # --- Attribution ---
        "attribution_finding": tr.get("attribution") or "NOT RESOLVED — no known exchange found within trace depth",
        "hops_traced":    tr.get("traced_hops"),

        # --- Risk ---
        "risk_score":     ra.get("risk_score"),
        "risk_band":      ra.get("risk_band"),
        "risk_reasons":   ra.get("reasons"),

        # --- AI/ML ---
        "ml_fraud_typology":     ml.get("top_fraud_typology"),
        "ml_typology_confidence": ml.get("typology_confidence"),
        "ml_anomaly_score":      ml.get("anomaly_score"),
        "ml_anomaly_band":       ml.get("anomaly_band"),
        "ml_patterns_detected":  [p["pattern_name"] for p in ml.get("patterns_detected", [])],
        "ml_recommendation":     ml.get("investigative_recommendation"),
        "ml_methodology":        ml.get("methodology"),

        # --- Cross-chain ---
        "cross_chain_bridges_detected": cc.get("bridge_events_detected", 0),
        "cross_chain_defi_detected":    cc.get("defi_events_detected", 0),
        "cross_chain_risk":             cc.get("cross_chain_risk"),
        "cross_chain_summary":          cc.get("summary"),
        "cross_chain_bridge_hops":      cc.get("bridge_hops", []),
        "cross_chain_defi_hops":        cc.get("defi_hops", []),

        # --- Action ---
        "recommended_action": _build_recommended_action(tr, cc, ml),
        "data_source":  tr.get("data_source"),
        "disclaimer":   "Auto-generated investigative lead. Requires officer verification before legal action.",
    }
    return report


def _build_recommended_action(tr, cc, ml):
    actions = []
    if tr.get("attribution"):
        ex = tr["attribution"].get("exchange", "identified exchange")
        actions.append(
            f"Issue urgent preservation/freeze request to {ex} compliance team. "
            "Request KYC records for the receiving deposit address."
        )
    if cc.get("bridge_events_detected", 0) > 0:
        chains = list({
            c["destination_chain"]
            for b in cc.get("bridge_hops", [])
            for c in b.get("destination_correlations", [])
        })
        actions.append(
            f"Issue multi-chain LEA requests to exchanges on {', '.join(chains).upper()} chains "
            "where funds may have arrived via cross-chain bridge."
        )
    if cc.get("defi_events_detected", 0) > 0:
        actions.append(
            "Request DeFi protocol transaction records from identified protocol operators. "
            "Subpoena swap/liquidity records to reconstruct asset transformation."
        )
    if not actions:
        actions.append(
            "Escalate for advanced tracing: cross-chain bridge analysis, mixer de-anonymization, "
            "and DeFi swap reconstruction. Monitor address for future exchange deposits."
        )
    if ml.get("anomaly_band") == "HIGHLY ANOMALOUS":
        actions.append(
            "ALERT: Highly anomalous trace pattern — escalate to specialised cyber forensics unit."
        )
    return " | ".join(actions)


# --- Serve static frontend (including 3D view) directly on backend port 8000 ---
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

@app.get("/3d_view.html")
async def serve_3d_view():
    return FileResponse(os.path.join(_FRONTEND_DIR, "3d_view.html"))

@app.get("/app3d.js")
async def serve_app3d():
    return FileResponse(os.path.join(_FRONTEND_DIR, "app3d.js"))

@app.get("/blockchain_sim.js")
async def serve_blockchain_sim():
    return FileResponse(os.path.join(_FRONTEND_DIR, "blockchain_sim.js"))

@app.get("/style.css")
async def serve_style_css():
    return FileResponse(os.path.join(_FRONTEND_DIR, "style.css"))

@app.get("/")
async def serve_root_index():
    return FileResponse(os.path.join(_FRONTEND_DIR, "index.html"))



