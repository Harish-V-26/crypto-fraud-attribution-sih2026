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
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal
import time

from engine.tracer import trace_wallet
from engine.risk_scoring import score_trace
from engine.clustering import cluster_from_txs
from engine.cross_chain import analyse_trace_for_cross_chain
from engine.ml_detector import analyse as ml_analyse
from blockchain import bitcoin_client, ethereum_client
from mock_lea import sahyog_ncrp_mock as lea

app = FastAPI(title="Real-Time Crypto Fraud Attribution System", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    # 1. Open case (NCRP/SAHYOG intake)
    case = lea.ingest_complaint(
        victim_reported_address=payload.victim_reported_address,
        chain=payload.chain,
        complaint_category=payload.complaint_category,
        reporting_officer=payload.reporting_officer,
        victim_id_masked=payload.victim_id_masked,
    )

    # 2. Blockchain trace (live or simulation fallback)
    trace_result = await trace_wallet(
        payload.victim_reported_address, payload.chain, max_hops=payload.max_hops
    )

    # 3. Risk scoring (rule-based, explainable)
    risk = score_trace(trace_result)

    # 4. Cross-chain bridge + DeFi analysis
    cross_chain = analyse_trace_for_cross_chain(trace_result)

    # 5. AI/ML fraud typology classification + pattern recognition + anomaly scoring
    ml_result = ml_analyse(trace_result, cross_chain)

    # 6. Attach everything to the case
    case = lea.attach_trace_result(case["case_id"], trace_result, risk, cross_chain, ml_result)

    return case


@app.get("/api/trace")
async def trace_only(address: str, chain: Literal["bitcoin", "ethereum"], max_hops: int = 5):
    """Standalone trace endpoint — no case creation."""
    trace_result = await trace_wallet(address, chain, max_hops=max_hops)
    risk = score_trace(trace_result)
    cross_chain = analyse_trace_for_cross_chain(trace_result)
    ml_result = ml_analyse(trace_result, cross_chain)
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


@app.get("/api/live/mempool")
async def live_mempool(chain: str = "bitcoin", count: int = 60):
    """Synthetic mempool transactions for the 3D ambient universe animation."""
    from blockchain.mock_data import get_mock_mempool
    count = min(count, 120)
    return {"chain": chain, "mempool": get_mock_mempool(chain, count)}


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

if os.path.isdir(_FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=_FRONTEND_DIR, html=True), name="frontend_static")


