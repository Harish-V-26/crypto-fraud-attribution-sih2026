# Real-Time Crypto Fraud Attribution System
### SIH 2026 — Prototype build

Automated tracing of victim-reported cryptocurrency wallet addresses to the
nearest exchange/VASP deposit address, with risk scoring, a mock NCRP/SAHYOG
intake pipeline, an investigator dashboard, and an interactive **3D
fund-flow visualization**.

---

## 1. What's real vs. simulated (be upfront about this at judging)

| Layer | Status | Detail |
|---|---|---|
| Blockchain data ingestion | **Real** | Bitcoin via Blockstream's public Esplora API (no key needed). Ethereum via Etherscan API (free key). |
| Transaction graph tracing (BFS) | **Real** | Genuine graph-walk logic over real transaction data when reachable. |
| Common-input-ownership clustering | **Real** | Standard blockchain-forensics heuristic, implemented from scratch. |
| Risk scoring | **Real** | Transparent, rule-based, explainable (not a black box — matters for evidentiary use). |
| Exchange/VASP attribution labels | **Simulated / sample** | Real-world attribution databases (Chainalysis Reactor, Elliptic, TRM Labs) are proprietary and not publicly accessible to anyone, including production fraud-fighting companies who license them commercially. We ship a small curated sample of *publicly documented* exchange hot-wallet labels (`backend/data/known_exchanges.json`) to demonstrate the matching pipeline. **Verify/expand this list from Etherscan/Blockchair's public label pages before your live demo** — the sample addresses are illustrative and should be checked, not assumed accurate. |
| SAHYOG / NCRP integration | **Simulated** | These are closed government systems with no public API. `backend/mock_lea/sahyog_ncrp_mock.py` implements the *expected shape* of that integration (complaint ingest → case → auto-trace) so the full pipeline demos end-to-end. Flag this honestly to judges — say it's built to the anticipated contract, ready to swap in real API access once sanctioned by I4C/NCRP. |
| Cross-chain bridge tracing | **Not implemented** (roadmap) | Real implementation needs indexing across every chain's bridge contracts — out of scope for a hackathon prototype. Mention as a stated roadmap item. |
| Offline/no-internet demo mode | **Real, automatic** | If the live blockchain APIs are unreachable (bad venue wifi, no API key set), the system automatically falls back to a deterministic seeded simulation — same wallet always produces the same trace, so your demo never breaks and is reproducible for screenshots/judging.

**Positioning for judges:** don't claim the exchange-attribution list is comprehensive — nobody's is, without a commercial license. Position the deliverable as *the automation pipeline and graph-tracing engine* (which is real and yours), with a *pluggable* attribution data layer that a licensed VASP directory would slot into in production. That's an honest and still very strong pitch.

---

## 2. Setup

### Backend
```bash
cd backend
pip install -r requirements.txt

# Optional: enables live Ethereum data (free key, 2 min signup at etherscan.io/apis)
export ETHERSCAN_API_KEY=your_key_here

uvicorn main:app --reload --port 8000
```
Bitcoin needs no key — it uses Blockstream's public API automatically.
Without `ETHERSCAN_API_KEY` set, Ethereum tracing automatically uses simulation mode.

### Frontend
No build step. Just open `frontend/index.html` in a browser (or serve it,
e.g. `python3 -m http.server 5500` from the `frontend/` folder, then visit
`http://localhost:5500`).

The dashboard talks to `http://localhost:8000` — edit the `API` constant at
the top of `app.js` / `app3d.js` if you deploy the backend elsewhere.

---

## 3. Using it

1. Open the dashboard, submit a wallet address (or click a sample chip).
2. This simulates a complaint arriving from NCRP/SAHYOG, opens a case, and
   immediately traces it: `POST /api/complaint`.
3. See the attribution result, risk score + reasons, and 2D fund-flow graph.
4. Click **"View in 3D simulation"** to open an interactive, rotatable 3D
   graph of the same fund flow, with particles animating direction of
   money movement, color-coded by node type (victim wallet / layering
   wallet / mixer / exchange).
5. The dashboard panel aggregates stats across all cases traced this
   session (risk distribution, mixer-touch rate, top attributed exchanges).
6. Download a standardized investigation report (JSON) from any case.

---

## 4. Architecture

```
backend/
  main.py                     FastAPI app — all endpoints
  blockchain/
    bitcoin_client.py         Live BTC data (Blockstream) + auto mock fallback
    ethereum_client.py        Live ETH data (Etherscan) + auto mock fallback
    mock_data.py              Deterministic seeded simulation generator
  engine/
    tracer.py                 BFS wallet tracing + exchange/mixer matching
    clustering.py             Common-input-ownership clustering (BTC)
    risk_scoring.py           Rule-based, explainable risk scoring
  mock_lea/
    sahyog_ncrp_mock.py       Simulated NCRP/SAHYOG complaint intake + case store
  data/
    known_exchanges.json      Curated public exchange/mixer label sample

frontend/
  index.html / app.js / style.css     Investigator dashboard (2D graph, stats, report)
  3d_view.html / app3d.js             3D fund-flow simulation (Three.js via 3d-force-graph)
```

## 5. Roadmap (good to mention proactively to judges)
- Licensed VASP attribution database integration (pluggable — the matching
  interface in `engine/tracer.py` already treats it as swappable data)
- Real SAHYOG/NCRP API integration once sanctioned
- Cross-chain bridge correlation (Wormhole, LayerZero, etc.)
- ML anomaly-detection layer on top of the rule-based risk score, trained
  once real (labeled) case data is available from LEA partners
- Multi-address batch tracing + automated periodic re-scan of unresolved cases
