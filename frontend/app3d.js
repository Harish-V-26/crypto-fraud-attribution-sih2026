/**
 * app3d.js — Blockchain Clone 3D Simulation Engine
 * Complete rewrite using Three.js directly.
 *
 * Classes:
 *   SoundEngine       — WebAudio cues (mutable)
 *   WalletNode        — 3D node per type (sphere/icosahedron/octahedron)
 *   TransactionEdge   — animated tube with value-stream particles
 *   InspectorPanel    — HTML side-panel synced to selected node
 *   TraceReplay       — step-by-step BFS hop animator
 *   BlockchainUniverse — main scene orchestrator
 */

const API = 'http://localhost:8000';

/* ──────────────────────────── CONSTANTS ──────────────────────────────────── */
const C = {
  BRIDGE:   { color: 0xff8844, emissive: 0x5a2a10, size: 4.8, geo: 'torus'  },
  DEFI:     { color: 0x8899ff, emissive: 0x1a1e50, size: 4.0, geo: 'tetra'  },
  SOURCE:   { color: 0x4fb3a9, emissive: 0x1a4a47, size: 5,   geo: 'sphere' },
  LAYERING: { color: 0x5c7a82, emissive: 0x1c2e33, size: 3.2, geo: 'sphere' },
  MIXER:    { color: 0xc85a4f, emissive: 0x4a1a18, size: 4.2, geo: 'icosa'  },
  EXCHANGE: { color: 0xd99a3f, emissive: 0x5a3a10, size: 5.5, geo: 'octa'   },
};
const TYPE_KEY = { bridge:'BRIDGE', defi:'DEFI', source:'SOURCE', layering:'LAYERING', mixer:'MIXER', exchange:'EXCHANGE' };

/* ──────────────────────────── SoundEngine ────────────────────────────────── */
class SoundEngine {
  constructor() {
    this.muted = true; // starts muted — user must opt-in
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ this.ctx=null; }
  }
  _beep(freq, dur, type, vol) {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.connect(g); g.connect(this.ctx.destination);
    osc.frequency.value = freq; osc.type = type || 'sine';
    g.gain.setValueAtTime(vol||0.12, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  }
  hop()      { this._beep(440, 0.18); }
  mixer()    { this._beep(180, 0.35, 'sawtooth', 0.15); }
  exchange() { this._beep(660, 0.45); setTimeout(()=>this._beep(880,0.3),150); }
  toggle()   { this.muted = !this.muted; return !this.muted; }
}

/* ──────────────────────────── WalletNode ─────────────────────────────────── */
class WalletNode {
  constructor(scene, THREE, nodeData, position) {
    this.scene = scene; this.THREE = THREE;
    this.data = nodeData; this.position = position;
    this.meshes = []; this.rings = []; this.time = 0;
    this._build();
  }

  _build() {
    const T = this.THREE, key = TYPE_KEY[this.data.type] || 'LAYERING', cfg = C[key];
    let geo;
    if (cfg.geo === 'icosa') geo = new T.IcosahedronGeometry(cfg.size, 0);
    else if (cfg.geo === 'octa') geo = new T.OctahedronGeometry(cfg.size);
    else if (cfg.geo === 'torus') geo = new T.TorusGeometry(cfg.size * 0.8, cfg.size * 0.3, 12, 20);
    else if (cfg.geo === 'tetra') geo = new T.TetrahedronGeometry(cfg.size);
    else geo = new T.SphereGeometry(cfg.size, 16, 12);

    const mat = new T.MeshStandardMaterial({
      color: cfg.color, emissive: cfg.emissive,
      roughness: 0.4, metalness: 0.6,
      transparent: true, opacity: 0,
    });
    this.mesh = new T.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.userData = { nodeData: this.data };
    this.scene.add(this.mesh);
    this.meshes.push(this.mesh);

    // Glow halo ring
    const ringGeo = new T.RingGeometry(cfg.size * 1.5, cfg.size * 1.7, 32);
    const ringMat = new T.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false });
    this.ring = new T.Mesh(ringGeo, ringMat);
    this.ring.position.copy(this.position);
    this.ring.rotation.x = -Math.PI / 2;
    this.scene.add(this.ring);
    this.meshes.push(this.ring);

    // Extra orbiting particles for mixer
    if (this.data.type === 'mixer') this._addMixerOrbit(T, cfg);

    // Floating label sprite
    this._buildLabel(T, cfg);

    // Spawn animation: fade in + scale up
    this._spawnAnim();
  }

  _addMixerOrbit(T, cfg) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const og = new T.SphereGeometry(0.4, 6, 6);
      const om = new T.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.75 });
      const mesh = new T.Mesh(og, om);
      mesh.userData.orbitIdx = i; mesh.userData.orbitCount = count;
      this.scene.add(mesh); this.meshes.push(mesh);
      this.rings.push(mesh);
    }
  }

  _buildLabel(T, cfg) {
    const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 72;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 15px IBM Plex Mono, monospace';
    ctx.fillStyle = '#' + cfg.color.toString(16).padStart(6, '0');
    const label = this.data.label || 'Wallet';
    const addr  = (this.data.id || '').slice(0, 14) + '…';
    ctx.fillText(label, 8, 28);
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillStyle = '#8a999e';
    ctx.fillText(addr, 8, 52);
    const tex = new T.CanvasTexture(canvas);
    const sm  = new T.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    this.labelSprite = new T.Sprite(sm);
    const sz = C[TYPE_KEY[this.data.type]||'LAYERING'].size;
    this.labelSprite.scale.set(18, 4.5, 1);
    this.labelSprite.position.copy(this.position).add(new T.Vector3(0, sz + 6, 0));
    this.scene.add(this.labelSprite);
    this.meshes.push(this.labelSprite);
  }

  _spawnAnim() {
    this.mesh.scale.setScalar(0.01);
    const start = performance.now();
    const dur = 600;
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      this.mesh.scale.setScalar(ease);
      this.mesh.material.opacity = ease * 0.95;
      this.ring.material.opacity = ease * 0.3;
      if (this.labelSprite) this.labelSprite.material.opacity = ease * 0.9;
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    // Confirmation rings (3 expanding rings)
    setTimeout(() => this._confirmRings(), 300);
  }

  _confirmRings() {
    const T = this.THREE, key = TYPE_KEY[this.data.type]||'LAYERING', cfg = C[key];
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const rg = new T.RingGeometry(cfg.size, cfg.size * 1.1, 32);
        const rm = new T.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false });
        const ring = new T.Mesh(rg, rm);
        ring.position.copy(this.position); ring.rotation.x = -Math.PI/2;
        this.scene.add(ring);
        const start = performance.now(), dur = 1000;
        const expand = () => {
          const t = Math.min(1, (performance.now()-start)/dur);
          ring.scale.setScalar(1 + t * 4); rm.opacity = (1-t) * 0.6;
          if (t < 1) requestAnimationFrame(expand);
          else { this.scene.remove(ring); rg.dispose(); rm.dispose(); }
        };
        requestAnimationFrame(expand);
      }, i * 200);
    }
  }

  update(dt) {
    this.time += dt;
    const key = TYPE_KEY[this.data.type]||'LAYERING', cfg = C[key];
    // Pulse halo ring
    if (this.ring) {
      this.ring.material.opacity = 0.15 + 0.12 * Math.sin(this.time * 2.5);
      this.ring.scale.setScalar(1 + 0.05 * Math.sin(this.time * 2));
    }
    // Spin for mixer/exchange
    if (this.data.type === 'mixer' || this.data.type === 'exchange' || this.data.type === 'bridge' || this.data.type === 'defi') {
      this.mesh.rotation.y += dt * (this.data.type === 'mixer' ? 0.8 : 0.25);
    }
    // Orbit particles for mixer
    if (this.data.type === 'mixer') {
      this.rings.forEach((m, i) => {
        const angle = this.time * 1.5 + (i / this.rings.length) * Math.PI * 2;
        const r = cfg.size * 2.2;
        m.position.set(
          this.position.x + Math.cos(angle) * r,
          this.position.y + Math.sin(this.time * 0.8 + i) * 1.5,
          this.position.z + Math.sin(angle) * r,
        );
      });
    }
    // Bob source wallet
    if (this.data.type === 'source') {
      this.mesh.position.y = this.position.y + Math.sin(this.time * 1.2) * 0.8;
      if (this.ring) this.ring.position.y = this.mesh.position.y;
      if (this.labelSprite) this.labelSprite.position.y = this.position.y + cfg.size + 6 + Math.sin(this.time * 1.2) * 0.8;
    }
  }

  setSelected(on) {
    if (on) {
      this.mesh.material.emissiveIntensity = 3;
    } else {
      this.mesh.material.emissiveIntensity = 1;
    }
  }

  setFrozen(on) {
    this.mesh.material.color.set(on ? 0x4466ff : C[TYPE_KEY[this.data.type]||'LAYERING'].color);
  }

  getObjects() { return [this.mesh]; }
}

/* ──────────────────────────── TransactionEdge ────────────────────────────── */
class TransactionEdge {
  constructor(scene, THREE, fromPos, toPos, edgeData, color) {
    this.scene = scene; this.THREE = THREE;
    this.fromPos = fromPos; this.toPos = toPos;
    this.data = edgeData; this.color = color || 0x4fb3a9;
    this.particles = []; this.time = 0;
    this._build();
  }

  _build() {
    const T = this.THREE;
    const dir = new T.Vector3().subVectors(this.toPos, this.fromPos);
    const len = dir.length();

    // Tube along the path
    const mid = new T.Vector3().addVectors(this.fromPos, this.toPos).multiplyScalar(0.5);
    mid.y += len * 0.15; // slight arc
    const curve = new T.QuadraticBezierCurve3(this.fromPos.clone(), mid, this.toPos.clone());

    const geo = new T.TubeGeometry(curve, 20, 0.18, 6, false);
    const mat = new T.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.25 });
    this.tube = new T.Mesh(geo, mat);
    this.scene.add(this.tube);

    this.curve = curve;
    this.tubeLen = len;

    // Value label sprite midpoint
    this._buildValueLabel(T, mid);

    // Spawn 5 flow particles along the edge
    for (let i = 0; i < 5; i++) {
      const pg = new T.SphereGeometry(0.45, 6, 6);
      const pm = new T.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.85 });
      const pm_ = new T.Mesh(pg, pm);
      pm_.userData.t = i / 5;
      this.scene.add(pm_);
      this.particles.push(pm_);
    }

    // Arrow head at destination
    const arrowDir = new T.Vector3().subVectors(this.toPos, mid).normalize();
    const arrowGeo = new T.ConeGeometry(0.6, 1.8, 8);
    const arrowMat = new T.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.7 });
    this.arrow = new T.Mesh(arrowGeo, arrowMat);
    this.arrow.position.copy(this.toPos).addScaledVector(arrowDir, -2.5);
    this.arrow.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), arrowDir);
    this.scene.add(this.arrow);
  }

  _buildValueLabel(T, pos) {
    if (!this.data) return;
    const val = this.data.value ? this.data.value.toFixed(4) : '';
    const txid = this.data.txid ? this.data.txid.slice(0,8) + '...' : '';
    if (!val && !txid) return;

    const canvas = document.createElement('canvas'); canvas.width=220; canvas.height=56;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 14px monospace'; ctx.fillStyle='#d99a3f';
    if (val) ctx.fillText(val + ' BTC', 6, 24);
    ctx.font = '11px monospace'; ctx.fillStyle='#8a999e';
    if (txid) ctx.fillText('tx: ' + txid, 6, 46);

    const tex = new T.CanvasTexture(canvas);
    const sm  = new T.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false });
    this.valueLabel = new T.Sprite(sm);
    this.valueLabel.scale.set(12, 3, 1);
    this.valueLabel.position.copy(pos).add(new T.Vector3(0, 3, 0));
    this.scene.add(this.valueLabel);
  }

  update(dt) {
    this.time += dt;
    this.particles.forEach(p => {
      p.userData.t = (p.userData.t + dt * 0.22) % 1;
      const pt = this.curve.getPoint(p.userData.t);
      p.position.copy(pt);
      // pulse opacity with travel direction
      const t = p.userData.t;
      p.material.opacity = t < 0.1 ? t*10 : t > 0.9 ? (1-t)*10 : 0.85;
    });
    // gentle tube pulse
    this.tube.material.opacity = 0.2 + 0.07 * Math.sin(this.time * 1.8);
  }

  dispose() {
    this.scene.remove(this.tube); this.tube.geometry.dispose(); this.tube.material.dispose();
    this.particles.forEach(p => { this.scene.remove(p); p.geometry.dispose(); p.material.dispose(); });
    if (this.arrow) { this.scene.remove(this.arrow); this.arrow.geometry.dispose(); this.arrow.material.dispose(); }
    if (this.valueLabel) { this.scene.remove(this.valueLabel); }
  }
}

/* ──────────────────────────── InspectorPanel ─────────────────────────────── */
class InspectorPanel {
  constructor() {
    this.el = document.getElementById('inspector');
    this.visible = false;
  }
  show(nodeData, chain) {
    if (!this.el) return;
    const addr = nodeData.id || '';
    const typeLabel = { source:'Victim-reported', layering:'Layering / intermediary', mixer:'Mixer / tumbler', exchange:'Exchange / VASP' }[nodeData.type] || nodeData.type;
    const explorerUrl = chain === 'bitcoin'
      ? 'https://blockstream.info/address/' + addr
      : 'https://etherscan.io/address/' + addr;

    this.el.innerHTML = `
      <div class="ins-header">
        <span class="ins-type ins-type--${nodeData.type}">${typeLabel}</span>
        <button id="inspCloseBtn" style="background:transparent;border:none;color:#8a999e;font-size:18px;cursor:pointer;padding:0;">✕</button>
      </div>
      <div class="ins-label">${nodeData.label || 'Wallet'}</div>
      <div class="ins-addr mono">${addr}</div>
      <div class="ins-row"><span class="ins-key">Type</span><span class="ins-val">${nodeData.type}</span></div>
      <div class="ins-row"><span class="ins-key">Chain</span><span class="ins-val">${chain || '—'}</span></div>
      <div class="ins-actions">
        <a href="${explorerUrl}" target="_blank" class="ins-btn">Open in explorer ↗</a>
        ${nodeData.type === 'exchange' ? '<button id="freezeBtn" class="ins-btn ins-btn--freeze">❄ Toggle Freeze</button>' : ''}
      </div>
    `;
    this.el.classList.add('open');
    this.visible = true;

    document.getElementById('inspCloseBtn')?.addEventListener('click', () => this.hide());
    return document.getElementById('freezeBtn');
  }
  hide() { this.el?.classList.remove('open'); this.visible = false; }
}

/* ──────────────────────────── TraceReplay ────────────────────────────────── */
class TraceReplay {
  constructor(universe) {
    this.u = universe;
    this.hops = [];
    this.currentHop = -1;
    this.speed = 1;
    this.playing = false;
    this.timer = null;
  }

  load(hopsData) {
    this.hops = hopsData;
    this.currentHop = -1;
    this.u.clearTrace();
    this._updateScrubber();
    this._updateStatus('Ready — press Play to replay trace');
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    document.getElementById('playBtn')?.setAttribute('data-playing','1');
    this._next();
  }

  pause() {
    this.playing = false;
    document.getElementById('playBtn')?.removeAttribute('data-playing');
    clearTimeout(this.timer);
  }

  stepForward() {
    if (this.currentHop < this.hops.length - 1) { this.currentHop++; this._revealHop(this.currentHop); }
  }

  stepBack() {
    if (this.currentHop > 0) {
      this.u.clearTrace();
      const target = this.currentHop - 1;
      this.currentHop = -1;
      for (let i = 0; i <= target; i++) { this.currentHop = i; this._revealHop(i, true); }
    }
  }

  restart() { this.pause(); this.u.clearTrace(); this.currentHop = -1; this._updateScrubber(); this._updateStatus('Restarted — press Play'); }

  _next() {
    if (!this.playing) return;
    if (this.currentHop >= this.hops.length - 1) { this.playing = false; document.getElementById('playBtn')?.removeAttribute('data-playing'); return; }
    this.currentHop++;
    this._revealHop(this.currentHop);
    const delay = 1200 / this.speed;
    this.timer = setTimeout(() => this._next(), delay);
  }

  _revealHop(i, instant) {
    const hop = this.hops[i];
    if (!hop) return;
    this.u.revealHop(hop, i, this.hops, instant);
    this._updateScrubber();
    const role = { source:'REPORTED', layering:'LAYERING wallet found', mixer:'⚠ MIXER detected!', exchange:'✓ EXCHANGE attributed' }[hop.node_type] || hop.node_type;
    this._updateStatus(`Hop ${i}/${this.hops.length-1} — ${role}: ${hop.label || hop.address.slice(0,14)+'…'}`);
  }

  _updateScrubber() {
    const el = document.getElementById('scrubber');
    if (el) { el.max = Math.max(0, this.hops.length - 1); el.value = Math.max(0, this.currentHop); }
    const pct = document.getElementById('scrubPct');
    if (pct && this.hops.length > 1) pct.textContent = `${this.currentHop + 1} / ${this.hops.length}`;
  }

  _updateStatus(msg) {
    const el = document.getElementById('statusBar');
    if (el) el.textContent = msg;
  }

  setSpeed(s) { this.speed = s; }
}

/* ──────────────────────────── BlockchainUniverse ─────────────────────────── */
class BlockchainUniverse {
  constructor() {
    this.THREE = window.THREE;
    this.nodes  = new Map();  // address -> WalletNode
    this.edges  = [];         // TransactionEdge[]
    this.raycaster = new this.THREE.Raycaster();
    this.mouse  = new this.THREE.Vector2();
    this.selectedNode = null;
    this.chain  = 'bitcoin';
    this.caseData = null;
    this.frozen = new Set();
    this.sound  = new SoundEngine();
    this.inspector = new InspectorPanel();
    this.replay = new TraceReplay(this);

    this._initScene();
    this._initAmbient();
    this._bindEvents();
    this._bindUI();
    this._loop();
  }

  /* ── Scene init ── */
  _initScene() {
    const T = this.THREE;
    this.scene    = new T.Scene();
    this.camera   = new T.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000);
    this.camera.position.set(0, 45, 110);
    this.renderer = new T.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    // Lights
    this.scene.add(new T.AmbientLight(0x334455, 2.5));
    const dir = new T.DirectionalLight(0x88ccdd, 1.5);
    dir.position.set(30, 80, 40);
    this.scene.add(dir);
    const pt = new T.PointLight(0x4fb3a9, 2, 200);
    pt.position.set(0, 20, 0);
    this.scene.add(pt);

    // OrbitControls
    if (window.OrbitControls) {
      this.controls = new window.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true; this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 15; this.controls.maxDistance = 400;
    }
  }

  _initAmbient() {
    const { MempoolParticles, BlockForge, buildHexGrid, buildStarfield } = window.BlockchainSim;
    this.mempool = new MempoolParticles(this.scene, this.THREE);
    this.forge   = new BlockForge(this.scene, this.THREE);
    buildHexGrid(this.scene, this.THREE);
    buildStarfield(this.scene, this.THREE);
  }

  /* ── UI bindings ── */
  _bindUI() {
    document.getElementById('playBtn')?.addEventListener('click', () => {
      if (document.getElementById('playBtn').getAttribute('data-playing')) this.replay.pause();
      else this.replay.play();
    });
    document.getElementById('stepFwd')?.addEventListener('click', () => this.replay.stepForward());
    document.getElementById('stepBwd')?.addEventListener('click', () => this.replay.stepBack());
    document.getElementById('restartBtn')?.addEventListener('click', () => { this.replay.restart(); });
    document.getElementById('speedSel')?.addEventListener('change', e => this.replay.setSpeed(parseFloat(e.target.value)));
    document.getElementById('scrubber')?.addEventListener('input', e => {
      this.replay.pause();
      const target = parseInt(e.target.value);
      this.clearTrace();
      this.replay.currentHop = -1;
      for (let i = 0; i <= target; i++) { this.replay.currentHop = i; this.replay._revealHop(i, true); }
    });
    document.getElementById('muteBtn')?.addEventListener('click', e => {
      const on = this.sound.toggle();
      e.target.textContent = on ? '🔊 Sound ON' : '🔇 Sound OFF';
    });
    document.getElementById('loadBtn')?.addEventListener('click', () => this._loadSelectedCase());
    document.getElementById('caseSelect')?.addEventListener('change', () => this._loadSelectedCase());
  }

  /* ── Events ── */
  _bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = innerWidth/innerHeight; this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    this.renderer.domElement.addEventListener('click', e => this._onClick(e));
    this.renderer.domElement.addEventListener('mousemove', e => {
      this.mouse.x = (e.clientX/innerWidth)*2-1;
      this.mouse.y = -(e.clientY/innerHeight)*2+1;
    });
  }

  _onClick(e) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const objs = [];
    this.nodes.forEach(n => objs.push(...n.getObjects()));
    const hits = this.raycaster.intersectObjects(objs, false);
    if (hits.length > 0) {
      const nd = hits[0].object.userData.nodeData;
      if (nd) this._selectNode(nd);
    } else {
      this.inspector.hide();
      if (this.selectedNode) { this.selectedNode.setSelected(false); this.selectedNode = null; }
    }
  }

  _selectNode(nodeData) {
    // Deselect previous
    if (this.selectedNode) this.selectedNode.setSelected(false);
    const wn = this.nodes.get(nodeData.id);
    if (wn) { wn.setSelected(true); this.selectedNode = wn; }

    // Inspector panel
    const freezeBtn = this.inspector.show(nodeData, this.chain);
    if (freezeBtn && wn) {
      freezeBtn.addEventListener('click', () => {
        const frozen = this.frozen.has(nodeData.id);
        if (frozen) { this.frozen.delete(nodeData.id); wn.setFrozen(false); }
        else { this.frozen.add(nodeData.id); wn.setFrozen(true); }
      });
    }

    // Camera fly-to
    if (wn) this._flyTo(wn.mesh.position);
  }

  _flyTo(target) {
    const T = this.THREE;
    const start = this.camera.position.clone();
    const dir   = new T.Vector3().subVectors(target, start).normalize();
    const end   = target.clone().addScaledVector(dir, -40);
    end.y = Math.max(end.y, 10);
    const startTime = performance.now(), dur = 900;
    const animate = () => {
      const t = Math.min(1, (performance.now()-startTime)/dur);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      this.camera.position.lerpVectors(start, end, ease);
      if (this.controls) this.controls.target.lerp(target, ease);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  /* ── Trace management ── */
  clearTrace() {
    this.nodes.forEach(n => {
      n.meshes.forEach(m => this.scene.remove(m));
      if (n.labelSprite) this.scene.remove(n.labelSprite);
    });
    this.nodes.clear();
    this.edges.forEach(e => e.dispose());
    this.edges = [];
    this.frozen.clear();
    this.selectedNode = null;
    this.inspector.hide();
    // Update HUD
    this._updateHUD(null, null);
  }

  revealHop(hop, i, allHops, instant) {
    const T = this.THREE;
    const key = TYPE_KEY[hop.node_type] || 'LAYERING';
    const cfg = C[key];

    // Position: spread hops along X axis, slight random Y/Z
    const spread = 28;
    const x = (i - (allHops.length-1)/2) * spread;
    const y = (Math.sin(i * 1.3) * 8);
    const z = (Math.cos(i * 1.7) * 6);
    const pos = new T.Vector3(x, y, z);

    if (!this.nodes.has(hop.address)) {
      const wn = new WalletNode(this.scene, T, { id: hop.address, type: hop.node_type, label: hop.label }, pos);
      this.nodes.set(hop.address, wn);
    }

    // Draw edge to previous hop
    if (i > 0) {
      const prev = allHops[i-1];
      const fromNode = this.nodes.get(prev.address);
      const toNode   = this.nodes.get(hop.address);
      if (fromNode && toNode) {
        const edgeColor = hop.node_type === 'mixer' ? 0xc85a4f : hop.node_type === 'exchange' ? 0xd99a3f : 0x4fb3a9;
        const edge = new TransactionEdge(this.scene, T, fromNode.position.clone(), toNode.position.clone(),
          { txid: hop.txid, value: hop.value }, edgeColor);
        this.edges.push(edge);
      }
    }

    // Sounds
    if (!instant) {
      if (hop.node_type === 'mixer') this.sound.mixer();
      else if (hop.node_type === 'exchange') this.sound.exchange();
      else this.sound.hop();
    }

    // Update HUD counters
    const exchangeHop = allHops.slice(0, i+1).find(h => h.node_type === 'exchange');
    const mixerTouched = allHops.slice(0, i+1).some(h => h.node_type === 'mixer');
    this._updateHUD(exchangeHop, mixerTouched ? i : null);

    // Update stats counters in HUD
    document.getElementById('hudHops').textContent = i;
    if (hop.value) {
      const prev = parseFloat(document.getElementById('hudBTC').textContent) || 0;
      document.getElementById('hudBTC').textContent = (prev + hop.value).toFixed(4);
    }
    if (mixerTouched) document.getElementById('hudMixer').textContent = '⚠ YES';
    if (exchangeHop) document.getElementById('hudExchange').textContent = exchangeHop.label || 'Found';
  }

  _updateHUD(exchangeHop, mixerHop) {
    const attrEl = document.getElementById('hudAttr');
    if (attrEl) {
      if (exchangeHop) {
        attrEl.innerHTML = `<span style="color:#d99a3f;font-weight:600">↳ ${exchangeHop.label}</span><br><small style="color:#8a999e">Freeze request ENABLED</small>`;
        attrEl.style.borderColor = '#d99a3f';
      } else {
        attrEl.innerHTML = '<span style="color:#5c7a82">Tracing…</span>';
        attrEl.style.borderColor = '#2a353b';
      }
    }
  }

  /* ── Case loading ── */
  async _loadSelectedCase() {
    const sel = document.getElementById('caseSelect');
    const caseId = sel?.value;
    if (!caseId || caseId.startsWith('No') || caseId.startsWith('Backend')) return;
    document.getElementById('statusBar').textContent = 'Loading case data…';
    try {
      const caseData = await fetch(`${API}/api/case/${caseId}`).then(r=>r.json());
      const hopsData = await fetch(`${API}/api/case/${caseId}/hops`).then(r=>r.json());
      this.caseData = caseData;
      this.chain = caseData.chain || 'bitcoin';
      this._updateRiskHUD(caseData.risk_assessment);
      this.replay.load(hopsData.hops);
      document.getElementById('statusBar').textContent = `Case ${caseId} loaded — press ▶ Play to replay`;
    } catch(e) {
      document.getElementById('statusBar').textContent = 'Failed to load case: ' + e.message;
    }
  }

  _updateRiskHUD(risk) {
    if (!risk) return;
    const el = document.getElementById('hudRisk');
    if (!el) return;
    const colors = { LOW:'#6fd196', MEDIUM:'#d99a3f', HIGH:'#e08360', CRITICAL:'#f07a6e' };
    el.innerHTML = `
      <div style="font-size:11px;color:#8a999e;margin-bottom:4px">RISK SCORE</div>
      <div style="font-size:28px;font-weight:700;color:${colors[risk.risk_band]||'#fff'}">${risk.risk_score}<span style="font-size:14px;color:#8a999e">/100</span></div>
      <div style="font-size:12px;color:${colors[risk.risk_band]||'#fff'};margin-top:2px">${risk.risk_band}</div>
      <div style="margin-top:8px;height:4px;background:#1c252a;border-radius:2px">
        <div style="height:4px;border-radius:2px;background:${colors[risk.risk_band]||'#fff'};width:${risk.risk_score}%"></div>
      </div>
    `;
  }

  /* ── Main loop ── */
  _loop() {
    let last = performance.now();
    const tick = () => {
      requestAnimationFrame(tick);
      const now = performance.now(), dt = Math.min((now-last)/1000, 0.05);
      last = now;
      this.mempool?.update(dt);
      this.forge?.update(dt);
      this.nodes.forEach(n => n.update(dt));
      this.edges.forEach(e => e.update(dt));
      this.controls?.update();
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(tick);
  }
}

/* ──────────────────────────── Bootstrap ─────────────────────────────────── */
async function loadCaseOptions() {
  const select = document.getElementById('caseSelect');
  try {
    const cases = await fetch(`${API}/api/cases`).then(r=>r.json());
    select.innerHTML = '';
    if (!cases.length) { select.innerHTML = '<option>No cases yet — trace a wallet on the dashboard</option>'; return []; }
    cases.slice().reverse().forEach(c => {
      const opt = document.createElement('option'); opt.value = c.case_id;
      const attr = c.trace_result?.attribution?.exchange;
      opt.textContent = `${c.case_id}  —  ${c.chain}  —  ${attr ? '→ '+attr : 'unresolved'}`;
      select.appendChild(opt);
    });
    return cases;
  } catch(e) {
    select.innerHTML = '<option>Backend not reachable — start the FastAPI server</option>';
    return [];
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const cases = await loadCaseOptions();

  // Check URL param for preselect
  const urlParams = new URLSearchParams(location.search);
  const preselect = urlParams.get('case_id');
  if (preselect) document.getElementById('caseSelect').value = preselect;

  // Start universe (ambient always-on)
  window.universe = new BlockchainUniverse();

  // Auto-load last case if available
  if (cases.length > 0) {
    const targetId = preselect || cases[cases.length-1].case_id;
    document.getElementById('caseSelect').value = targetId;
    await window.universe._loadSelectedCase();
    window.universe.replay.play();
  }
});

