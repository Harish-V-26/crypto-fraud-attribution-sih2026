const API = "http://localhost:8000";

const SAMPLES = [
  { label: "BTC sample", addr: "1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF", chain: "bitcoin" },
  { label: "ETH sample", addr: "0x000000000000000000000000000000deadbeef",  chain: "ethereum" },
];

let riskChart, exchangeChart, typologyChart, bridgeChart;

async function checkHealth() {
  const banner = document.getElementById("modeBanner");
  try {
    const res = await fetch(`${API}/api/health`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    banner.textContent = `Backend connected — v${data.version || "2.0"}`;
    banner.className = "mode-banner live";
  } catch {
    banner.textContent = "Backend not running — start the FastAPI server (see README)";
    banner.className = "mode-banner down";
  }
}

function renderSamples() {
  const el = document.getElementById("sampleWallets");
  el.innerHTML = "Try a sample: ";
  SAMPLES.forEach(s => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "chip"; btn.textContent = s.label;
    btn.onclick = () => { document.getElementById("addr").value = s.addr; document.getElementById("chain").value = s.chain; };
    el.appendChild(btn);
  });
}

document.getElementById("intakeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const address   = document.getElementById("addr").value.trim();
  const chain     = document.getElementById("chain").value;
  const complaint_category  = document.getElementById("category").value;
  const reporting_officer   = document.getElementById("officer").value.trim() || undefined;
  const submitBtn = e.target.querySelector("button");
  submitBtn.disabled = true; submitBtn.textContent = "Tracing…";
  const errBanner = document.getElementById("tracingError") || (() => {
    const d = document.createElement("div"); d.id = "tracingError";
    d.style.cssText = "margin-top:10px;padding:10px 14px;border-radius:4px;background:#3a1e18;border:1px solid #c85a4f;color:#e08360;font-size:13px;display:none;";
    document.getElementById("intakeForm").after(d); return d;
  })();
  errBanner.style.display = "none";
  try {
    const res = await fetch(`${API}/api/complaint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ victim_reported_address: address, chain, complaint_category, reporting_officer }),
    });
    if (!res.ok) throw new Error(await res.text());
    const caseData = await res.json();
    await renderCase(caseData);
    await refreshDashboard();
  } catch (err) {
    errBanner.style.display = "block";
    errBanner.innerHTML = `<strong>⚠ Trace error:</strong> ${err.message}<br><span style="font-size:12px;color:#8a999e;margin-top:4px;display:block;">Backend is running — this may be a library load issue. Try refreshing the page (Ctrl+F5).</span>`;
    console.error("Trace failed:", err);
  } finally {
    submitBtn.disabled = false; submitBtn.textContent = "Trace & attribute";
  }
});

async function renderCase(caseData) {
  document.getElementById("resultsPanel").style.display = "block";
  document.getElementById("caseId").textContent = caseData.case_id;

  const risk = caseData.risk_assessment;
  const badge = document.getElementById("riskBadge");
  badge.textContent = `${risk.risk_band} · ${risk.risk_score}/100`;
  badge.className = `risk-badge ${risk.risk_band}`;

  const trace = caseData.trace_result;
  const attrBox = document.getElementById("attributionBox");
  if (trace.attribution) {
    attrBox.innerHTML = `
      <div style="font-size:22px;font-weight:600;color:var(--accent)">${trace.attribution.exchange}</div>
      <div class="mono" style="font-size:12px;color:var(--text-dim);margin-top:4px">${trace.attribution.type} · resolved in ${trace.flags.hops_to_exchange} hop(s)</div>`;
  } else {
    attrBox.innerHTML = `<div style="color:var(--amber);font-weight:600">No exchange resolved within trace depth</div>
      <div style="font-size:12.5px;color:var(--text-dim);margin-top:4px">
        ${trace.flags.cross_chain_detected ? "⚠ Cross-chain bridge detected — funds may have moved to another blockchain." : "Recommend deeper trace or cross-chain bridge analysis."}
      </div>`;
  }

  const reasonsList = document.getElementById("reasonsList");
  reasonsList.innerHTML = "";
  if (!risk.reasons.length) {
    reasonsList.innerHTML = "<li>No elevated risk indicators detected</li>";
  } else {
    risk.reasons.forEach(r => { const li = document.createElement("li"); li.textContent = r; reasonsList.appendChild(li); });
  }

  document.getElementById("dataSourceTag").textContent = trace.data_source === "live" ? "[live blockchain data]" : "[simulated data — offline/no API key]";

  // ML Analysis
  renderMLPanel(caseData.ml_analysis);

  // Cross-chain Analysis
  renderCrossChainPanel(caseData.cross_chain_analysis);

  renderGraph(trace.graph);
  document.getElementById("view3dLink").href = `3d_view.html?case_id=${caseData.case_id}`;

  const report = await (await fetch(`${API}/api/report/${caseData.case_id}`)).json();
  document.getElementById("reportBox").textContent = JSON.stringify(report, null, 2);
  document.getElementById("downloadReport").onclick = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${report.report_id}.json`; a.click();
  };

  document.getElementById("resultsPanel").scrollIntoView({ behavior: "smooth" });
}

function renderMLPanel(ml) {
  if (!ml) return;
  const bandColors = { "HIGHLY ANOMALOUS": "#f07a6e", "UNUSUAL": "#d99a3f", "TYPICAL": "#6fd196" };
  document.getElementById("mlTypology").textContent = ml.top_fraud_typology || "Unknown";
  document.getElementById("mlConfidence").textContent = (ml.typology_confidence || 0).toFixed(1) + "%";
  document.getElementById("mlAnomalyScore").textContent = (ml.anomaly_score || 0).toFixed(1) + "/100";
  const bandEl = document.getElementById("mlAnomalyBand");
  bandEl.textContent = ml.anomaly_band || "";
  bandEl.style.color = bandColors[ml.anomaly_band] || "#8a999e";

  const patternsEl = document.getElementById("mlPatterns");
  if (ml.patterns_detected && ml.patterns_detected.length > 0) {
    patternsEl.innerHTML = "<div style='font-size:12px;color:var(--text-dim);margin-bottom:6px'>Fraud patterns matched:</div>" +
      ml.patterns_detected.map(p => `
        <div style="display:inline-block;margin:3px 4px;padding:4px 10px;border-radius:12px;background:#3a1e18;color:#e08360;font-size:12px;font-family:var(--font-mono)">
          ⚡ ${p.pattern_name} <span style="color:#8a999e">(+${p.risk_boost} risk)</span>
        </div>`).join("");
  } else {
    patternsEl.innerHTML = "<div style='font-size:12px;color:#8a999e'>No named fraud patterns matched.</div>";
  }

  document.getElementById("mlRecommendation").textContent = ml.investigative_recommendation || "";

  // Typology breakdown mini-bar
  if (ml.all_typologies) {
    const topColors = ["#4fb3a9","#d99a3f","#c85a4f","#5c7a82","#8a999e","#6fd196"];
    const bars = ml.all_typologies.slice(0,6).map((t, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11.5px;">
        <span style="width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-dim)">${t.typology}</span>
        <div style="flex:1;height:6px;background:#1c252a;border-radius:3px;">
          <div style="width:${t.confidence}%;height:6px;border-radius:3px;background:${topColors[i]};transition:width 0.6s"></div>
        </div>
        <span style="font-family:var(--font-mono);color:${topColors[i]};min-width:38px">${t.confidence.toFixed(1)}%</span>
      </div>`).join("");
    patternsEl.innerHTML += `<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px"><div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">All typology probabilities:</div>${bars}</div>`;
  }
}

function renderCrossChainPanel(cc) {
  if (!cc) return;
  const card = document.getElementById("crossChainCard");
  const content = document.getElementById("crossChainContent");

  if (cc.bridge_events_detected === 0 && cc.defi_events_detected === 0) {
    card.style.display = "none"; return;
  }
  card.style.display = "block";

  let html = `<div style="margin-bottom:10px;padding:8px 12px;border-radius:4px;background:#1a0e0a;border:1px solid #c85a4f;font-size:13px;color:#e08360">
    <strong>⚠ ${cc.cross_chain_risk} CROSS-CHAIN RISK</strong> — ${cc.summary}
  </div>`;

  if (cc.bridge_hops && cc.bridge_hops.length > 0) {
    html += `<h4 style="font-size:13px;color:var(--amber);margin:12px 0 6px">🌉 Bridge Events (${cc.bridge_hops.length})</h4>`;
    cc.bridge_hops.forEach(b => {
      const chains = b.destination_correlations.map(c => c.destination_chain.toUpperCase()).join(", ");
      html += `<div class="card" style="margin-bottom:10px;padding:14px;">
        <div style="font-weight:600;color:var(--amber)">${b.bridge_name}</div>
        <div class="mono" style="font-size:11px;color:var(--text-dim);margin:4px 0">${b.bridge_contract}</div>
        <div style="font-size:12.5px">Destination chains: <strong style="color:var(--accent)">${chains}</strong></div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:6px">${b.analyst_note || ""}</div>
        ${b.destination_correlations.map(c => `
          <div style="margin-top:8px;padding:8px;background:var(--panel-alt);border-radius:4px;font-size:12px">
            <span style="color:var(--accent)">${c.destination_chain.toUpperCase()}</span> estimated address:
            <span class="mono" style="font-size:11px">${c.estimated_destination_address}</span>
          </div>`).join("")}
      </div>`;
    });
  }

  if (cc.defi_hops && cc.defi_hops.length > 0) {
    html += `<h4 style="font-size:13px;color:#8899ff;margin:12px 0 6px">⚙ DeFi Protocol Events (${cc.defi_hops.length})</h4>`;
    cc.defi_hops.forEach(d => {
      html += `<div class="card" style="margin-bottom:8px;padding:12px;">
        <div style="font-weight:600;color:#8899ff">${d.protocol} <span style="font-size:11px;color:var(--text-dim)">[${d.category}]</span></div>
        <div class="mono" style="font-size:11px;color:var(--text-dim);margin:3px 0">${d.contract_address}</div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:4px">${d.analyst_note}</div>
      </div>`;
    });
  }

  content.innerHTML = html;
}

function renderGraph(graph) {
  const container = document.getElementById("graphContainer");

  // Safety guard — vis.js CDN may fail on slow/restricted connections
  if (typeof vis === "undefined") {
    container.innerHTML = `
      <div style="padding:24px;text-align:center;color:#8a999e;font-size:13px;">
        <div style="font-size:18px;margin-bottom:8px;">⚠ 2D graph library failed to load</div>
        <div>The vis.js CDN did not load (check your internet connection).</div>
        <div style="margin-top:10px;color:#4fb3a9;">
          The <strong>3D simulation</strong> works offline — use the button below ↓
        </div>
      </div>`;
    return;
  }

  const colors = {
    source: "#4fb3a9", layering: "#5c6b70", mixer: "#c85a4f",
    exchange: "#d99a3f", bridge: "#ff8844", defi: "#8899ff",
  };
  const nodes = new vis.DataSet(graph.nodes.map(n => ({
    id: n.id,
    label: n.label + "\n" + n.id.slice(0, 10) + "…",
    color: { background: colors[n.type] || "#5c6b70", border: "#0f1417" },
    font: { color: "#0f1417", size: 11, face: "IBM Plex Mono" },
    shape: n.type === "mixer" ? "diamond" : n.type === "bridge" ? "star" : n.type === "defi" ? "triangle" : "box",
    margin: 10,
  })));
  const edges = new vis.DataSet(graph.edges.map(e => ({
    from: e.from, to: e.to, arrows: "to", color: { color: "#3a454b" },
  })));
  new vis.Network(container, { nodes, edges }, {
    layout: { hierarchical: { direction: "LR", sortMethod: "directed", nodeSpacing: 140 } },
    physics: false, interaction: { zoomView: true, dragView: true },
  });
}

async function refreshDashboard() {
  const stats = await (await fetch(`${API}/api/dashboard/stats`)).json();

  document.getElementById("statTotal").textContent    = stats.total_cases;
  document.getElementById("statMixer").textContent    = stats.mixer_touched_count;
  document.getElementById("statCritical").textContent = stats.risk_distribution.CRITICAL || 0;
  document.getElementById("statBridge").textContent   = stats.bridge_detected_count || 0;

  const topTyp = Object.entries(stats.typology_distribution || {}).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById("statTypology").textContent = topTyp ? topTyp[0] : "—";
  const topEx = (stats.top_exchanges || [])[0];
  document.getElementById("statExchange").textContent = topEx ? topEx[0] : "—";

  // Risk chart
  const riskCtx = document.getElementById("riskChart");
  if (riskChart) riskChart.destroy();
  riskChart = new Chart(riskCtx, {
    type: "bar",
    data: {
      labels: Object.keys(stats.risk_distribution),
      datasets: [{ data: Object.values(stats.risk_distribution), backgroundColor: ["#6fd196","#d99a3f","#e08360","#f07a6e"] }],
    },
    options: { plugins: { legend: { display: false }, title: { display: true, text: "Cases by risk band", color: "#8a999e" } },
      scales: { x: { ticks: { color: "#8a999e" }, grid: { color: "#2a353b" } }, y: { ticks: { color: "#8a999e" }, grid: { color: "#2a353b" }, beginAtZero: true } } },
  });

  // Exchange chart
  const exCtx = document.getElementById("exchangeChart");
  if (exchangeChart) exchangeChart.destroy();
  const exLabels = stats.top_exchanges.map(([name]) => name);
  const exValues = stats.top_exchanges.map(([,count]) => count);
  exchangeChart = new Chart(exCtx, {
    type: "doughnut",
    data: { labels: exLabels.length ? exLabels : ["No attributions"], datasets: [{ data: exValues.length ? exValues : [1], backgroundColor: ["#4fb3a9","#d99a3f","#c85a4f","#5c6b70","#8a999e"] }] },
    options: { plugins: { legend: { labels: { color: "#8a999e" } }, title: { display: true, text: "Exchange attributions", color: "#8a999e" } } },
  });

  // Typology chart (NEW)
  const typCtx = document.getElementById("typologyChart");
  if (typologyChart) typologyChart.destroy();
  const typLabels = Object.keys(stats.typology_distribution || {});
  const typValues = Object.values(stats.typology_distribution || {});
  typologyChart = new Chart(typCtx, {
    type: "bar",
    data: { labels: typLabels.length ? typLabels : ["No data"], datasets: [{ data: typValues.length ? typValues : [0], backgroundColor: "#8899ff" }] },
    options: { plugins: { legend: { display: false }, title: { display: true, text: "AI/ML fraud typology distribution", color: "#8a999e" } },
      scales: { x: { ticks: { color: "#8a999e", font: { size: 10 } }, grid: { color: "#2a353b" } }, y: { ticks: { color: "#8a999e" }, grid: { color: "#2a353b" }, beginAtZero: true } } },
  });

  // Bridge chart (NEW)
  const bridgeCtx = document.getElementById("bridgeChart");
  if (bridgeChart) bridgeChart.destroy();
  const bridgeData = [
    stats.bridge_detected_count || 0,
    (stats.total_cases || 0) - (stats.bridge_detected_count || 0),
  ];
  bridgeChart = new Chart(bridgeCtx, {
    type: "doughnut",
    data: { labels: ["Cross-chain detected", "Single-chain only"], datasets: [{ data: bridgeData, backgroundColor: ["#ff8844","#2a353b"] }] },
    options: { plugins: { legend: { labels: { color: "#8a999e" } }, title: { display: true, text: "Cross-chain bridge activity", color: "#8a999e" } } },
  });
}

checkHealth();
renderSamples();
refreshDashboard();
