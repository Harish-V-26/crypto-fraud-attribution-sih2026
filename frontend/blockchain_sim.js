/**
 * blockchain_sim.js — Ambient "blockchain universe" layer.
 * MempoolParticles | BlockForge | HexGrid | Starfield
 */

class MempoolParticles {
  constructor(scene, THREE) {
    this.scene = scene; this.THREE = THREE;
    this.count = 220; this.velocities = [];
    this._build();
  }
  _build() {
    const T = this.THREE;
    const geo = new T.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) this._reset(i, true);
    geo.setAttribute('position', new T.BufferAttribute(this.positions, 3));
    const mat = new T.PointsMaterial({ color: 0x4a6a72, size: 1.1, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true });
    this.mesh = new T.Points(geo, mat);
    this.scene.add(this.mesh);
  }
  _reset(i, rand) {
    const r = 55 + Math.random() * 90, theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
    this.positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    this.positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.35;
    this.positions[i*3+2] = r * Math.cos(phi);
    this.velocities[i] = { x:(Math.random()-0.5)*0.07, y:(Math.random()-0.5)*0.015, z:(Math.random()-0.5)*0.07, life: rand ? Math.random() : 0, maxLife: 0.55 + Math.random() * 0.45 };
  }
  update(dt) {
    for (let i = 0; i < this.count; i++) {
      const v = this.velocities[i]; v.life += dt;
      this.positions[i*3]   += v.x * dt * 60;
      this.positions[i*3+1] += v.y * dt * 60;
      this.positions[i*3+2] += v.z * dt * 60;
      if (v.life >= v.maxLife) this._reset(i, false);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
  dispose() { this.scene.remove(this.mesh); }
}

class BlockForge {
  constructor(scene, THREE) {
    this.scene = scene; this.THREE = THREE;
    this.blocks = []; this.timer = 0; this.interval = 12;
    this._spawnBlock();
  }
  _spawnBlock() {
    const T = this.THREE;
    const size = 4 + Math.random() * 3;
    const geo = new T.BoxGeometry(size, size, size);
    const mat = new T.MeshBasicMaterial({ color: 0x4fb3a9, wireframe: true, transparent: true, opacity: 0 });
    const mesh = new T.Mesh(geo, mat);
    const dist = 30 + Math.random() * 55, angle = Math.random() * Math.PI * 2;
    mesh.position.set(Math.cos(angle)*dist, (Math.random()-0.5)*22, Math.sin(angle)*dist);
    mesh.rotation.set(Math.random()*2, Math.random()*2, Math.random()*2);
    this.scene.add(mesh);
    this.blocks.push({ mesh, mat, life: 0, maxLife: 3.5 });
    const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 18px monospace'; ctx.fillStyle='#4fb3a9';
    ctx.fillText('BLOCK #' + (850000 + Math.floor(Math.random()*50000)), 6, 42);
    const tex = new T.CanvasTexture(canvas);
    const sm = new T.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
    const sp = new T.Sprite(sm); sp.scale.set(14, 3.5, 1);
    sp.position.copy(mesh.position).add(new T.Vector3(0, 7, 0));
    this.scene.add(sp);
    setTimeout(() => { this.scene.remove(sp); tex.dispose(); sm.dispose(); }, 3500);
  }
  update(dt) {
    this.timer += dt;
    if (this.timer >= this.interval) { this.timer = 0; this._spawnBlock(); }
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i]; b.life += dt;
      const t = b.life / b.maxLife;
      if (t < 0.3)      { b.mat.opacity = (t/0.3)*0.8; b.mesh.rotation.x+=dt*0.5; b.mesh.rotation.y+=dt*0.8; b.mesh.scale.setScalar(1+t*0.4); }
      else if (t < 0.7) { b.mat.opacity = 0.8; b.mesh.rotation.x+=dt*0.15; b.mesh.rotation.y+=dt*0.25; }
      else               { const f=(t-0.7)/0.3; b.mat.opacity=(1-f)*0.8; b.mesh.scale.setScalar(Math.max(0.01,1.5-f*1.5)); }
      if (b.life >= b.maxLife) {
        this.scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mat.dispose();
        this.blocks.splice(i, 1);
      }
    }
  }
}

function buildHexGrid(scene, THREE, radius, rings) {
  radius = radius || 120; rings = rings || 11;
  const mat = new THREE.LineBasicMaterial({ color: 0x1a2e33, transparent: true, opacity: 0.45 });
  const R=8, w=R*Math.sqrt(3), h=R*1.5, grp=new THREE.Group();
  for (let row=-rings; row<=rings; row++) {
    for (let col=-rings; col<=rings; col++) {
      const cx=col*w+(row%2===0?0:w/2), cz=row*h;
      if (Math.sqrt(cx*cx+cz*cz)>radius) continue;
      const pts=[];
      for (let k=0;k<=6;k++){const a=(k*Math.PI)/3; pts.push(new THREE.Vector3(cx+R*0.9*Math.cos(a),-28,cz+R*0.9*Math.sin(a)));}
      grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }
  scene.add(grp); return grp;
}

function buildStarfield(scene, THREE, count) {
  count = count || 700;
  const pos=new Float32Array(count*3);
  for (let i=0;i<count;i++){
    const r=180+Math.random()*130, theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(phi)*Math.cos(theta); pos[i*3+1]=r*Math.sin(phi)*Math.sin(theta); pos[i*3+2]=r*Math.cos(phi);
  }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({color:0x7899aa,size:0.55,transparent:true,opacity:0.45})));
}

window.BlockchainSim = { MempoolParticles, BlockForge, buildHexGrid, buildStarfield };
