"""
SIMULATED SAHYOG / NCRP integration layer.
Updated to store cross-chain and ML analysis alongside trace results.
"""
import uuid
import time
from typing import Optional

_CASES: dict[str, dict] = {}


def ingest_complaint(
    victim_reported_address: str,
    chain: str,
    complaint_category: str,
    reporting_officer: Optional[str] = None,
    victim_id_masked: Optional[str] = None,
) -> dict:
    case_id = f"CFAS-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"
    case = {
        "case_id": case_id,
        "source_platform": "NCRP (simulated)",
        "victim_reported_address": victim_reported_address,
        "chain": chain,
        "complaint_category": complaint_category,
        "reporting_officer": reporting_officer or "unassigned",
        "victim_id_masked": victim_id_masked or "REDACTED",
        "status": "received",
        "created_at": int(time.time()),
        "trace_result": None,
        "risk_assessment": None,
        "cross_chain_analysis": None,
        "ml_analysis": None,
    }
    _CASES[case_id] = case
    return case


def attach_trace_result(
    case_id: str,
    trace_result: dict,
    risk_assessment: dict,
    cross_chain_analysis: dict | None = None,
    ml_analysis: dict | None = None,
) -> dict:
    if case_id not in _CASES:
        raise KeyError(f"Unknown case_id: {case_id}")
    _CASES[case_id]["trace_result"]       = trace_result
    _CASES[case_id]["risk_assessment"]    = risk_assessment
    _CASES[case_id]["cross_chain_analysis"] = cross_chain_analysis
    _CASES[case_id]["ml_analysis"]        = ml_analysis
    _CASES[case_id]["status"]             = "traced"
    return _CASES[case_id]


def get_case(case_id: str) -> Optional[dict]:
    return _CASES.get(case_id)


def list_cases() -> list[dict]:
    return list(_CASES.values())


def dashboard_stats() -> dict:
    cases = list(_CASES.values())
    by_band = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    exchanges_hit = {}
    mixer_touched = 0
    bridge_detected = 0
    typology_counts = {}

    for c in cases:
        ra = c.get("risk_assessment")
        if ra:
            band = ra.get("risk_band", "LOW")
            by_band[band] = by_band.get(band, 0) + 1
        tr = c.get("trace_result")
        if tr:
            if tr.get("flags", {}).get("mixer_touched"):
                mixer_touched += 1
            if tr.get("flags", {}).get("cross_chain_detected"):
                bridge_detected += 1
            attr = tr.get("attribution")
            if attr:
                ex = attr["exchange"]
                exchanges_hit[ex] = exchanges_hit.get(ex, 0) + 1
        ml = c.get("ml_analysis")
        if ml:
            typ = ml.get("top_fraud_typology", "Unknown")
            typology_counts[typ] = typology_counts.get(typ, 0) + 1

    return {
        "total_cases": len(cases),
        "risk_distribution": by_band,
        "mixer_touched_count": mixer_touched,
        "bridge_detected_count": bridge_detected,
        "top_exchanges": sorted(exchanges_hit.items(), key=lambda x: -x[1]),
        "typology_distribution": typology_counts,
    }
