// OMAR AI — real 3D game runtime (three.js).
// A playable third-person world generated from the project spec: streets,
// buildings, trees, collectibles, enemies, jumping, shooting and a camera
// that follows the player. Quality comes from the studio (Full HD / 4K).

let THREE_MODULE = null;

export async function loadEngineThree() {
  if (THREE_MODULE) return THREE_MODULE;
  const mod = await import('../vendor/three.module.js');
  THREE_MODULE = mod;
  return mod;
}

function hexColor(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const text = value.trim();
  if (text.charAt(0) === '#') {
    const parsed = parseInt(text.slice(1), 16);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

export async function createGame3D(canvas, spec, options) {
  const T = await loadEngineThree();
  const opts = options || {};
  const config = spec || {};

  const rules = Object.assign(
    { speed: 220, hp: 3, enemies: 6, obstacles: 10, collectibles: 12, time: 100, shoot: false },
    config.rules || {}
  );
  const theme = Object.assign(
    {
      ground: '#2f7d4f',
      player: '#7c5cff',
      accent: '#22d3ee',
      enemy: '#f87171',
      sky: '#0e7490',
      road: '#1f2937'
    },
    config.theme || {}
  );
  const worldCfg = Object.assign(
    { size: 130, buildings: 26, trees: 28, night: false, roads: true },
    config.world || {}
  );

  const night = !!worldCfg.night;
  const area = Math.max(80, Math.min(200, Number(worldCfg.size) || 130));
  const half = area / 2;

  const state = {
    score: 0,
    hp: rules.hp,
    maxHp: rules.hp,
    time: rules.time,
    level: 1,
    goal: 100,
    kills: 0,
    over: false,
    paused: false,
    reason: ''
  };

  /* ------------------------------------------------------------- renderer */

  let renderer;
  try {
    renderer = new T.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch (err) {
    throw new Error('webgl-unavailable');
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.dpr || 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = opts.shadows !== false;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  const skyColor = hexColor(night ? '#05060f' : theme.sky, 0x0e7490);
  scene.background = new T.Color(skyColor);
  scene.fog = new T.Fog(skyColor, 48, area * 1.8);

  const camera = new T.PerspectiveCamera(62, 1, 0.1, 1200);

  const hemi = new T.HemisphereLight(
    night ? 0x5b6ea8 : 0xbfd8ff,
    night ? 0x0a0d16 : 0x2a2f3a,
    night ? 0.6 : 0.9
  );
  scene.add(hemi);

  const sun = new T.DirectionalLight(night ? 0x93a7ff : 0xfff3d6, night ? 0.65 : 1.7);
  sun.position.set(45, 80, 35);
  sun.castShadow = opts.shadows !== false;
  const shadowSize = opts.high ? 2048 : 1024;
  sun.shadow.mapSize.width = shadowSize;
  sun.shadow.mapSize.height = shadowSize;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0007;
  scene.add(sun);

  /* ---------------------------------------------------------------- world */

  let seed = (Number(config.seed) || 20240607) >>> 0;
  function rand(min, max) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return min + (seed / 4294967296) * (max - min);
  }

  const worldGroup = new T.Group();
  scene.add(worldGroup);
  const obstacles = [];

  const ground = new T.Mesh(
    new T.PlaneGeometry(area * 1.7, area * 1.7),
    new T.MeshStandardMaterial({
      color: hexColor(theme.ground, 0x2f7d4f),
      roughness: 0.95,
      metalness: 0.02
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const grid = new T.GridHelper(area * 1.7, 52, 0xffffff, 0xffffff);
  grid.position.y = 0.02;
  if (grid.material) {
    grid.material.transparent = true;
    grid.material.opacity = 0.05;
  }
  worldGroup.add(grid);

  if (worldCfg.roads !== false) {
    const roadMat = new T.MeshStandardMaterial({
      color: hexColor(theme.road, 0x1f2937),
      roughness: 0.9
    });
    const roadA = new T.Mesh(new T.PlaneGeometry(area * 1.7, 14), roadMat);
    roadA.rotation.x = -Math.PI / 2;
    roadA.position.y = 0.03;
    roadA.receiveShadow = true;
    worldGroup.add(roadA);

    const roadB = new T.Mesh(new T.PlaneGeometry(14, area * 1.7), roadMat);
    roadB.rotation.x = -Math.PI / 2;
    roadB.position.y = 0.03;
    roadB.receiveShadow = true;
    worldGroup.add(roadB);

    const dashMat = new T.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.24
    });
    for (let i = -half; i < half; i += 14) {
      const dashZ = new T.Mesh(new T.PlaneGeometry(1.2, 5), dashMat);
      dashZ.rotation.x = -Math.PI / 2;
      dashZ.position.set(0, 0.045, i);
      worldGroup.add(dashZ);

      const dashX = new T.Mesh(new T.PlaneGeometry(5, 1.2), dashMat);
      dashX.rotation.x = -Math.PI / 2;
      dashX.position.set(i, 0.045, 0);
      worldGroup.add(dashX);
    }
  }

  function freeSpot(minRadius, tries) {
    const attempts = tries || 40;
    for (let i = 0; i < attempts; i++) {
      const x = rand(-half + 8, half - 8);
      const z = rand(-half + 8, half - 8);
      if (Math.abs(x) < 10 || Math.abs(z) < 10) continue;
      if (Math.sqrt(x * x + z * z) < minRadius) continue;
      return { x: x, z: z };
    }
    return null;
  }

  const buildingCount = Math.max(4, Math.min(40, Math.round(worldCfg.buildings || 20)));
  for (let i = 0; i < buildingCount; i++) {
    const spot = freeSpot(17);
    if (!spot) continue;
    const bw = rand(5, 11);
    const bd = rand(5, 11);
    const bh = rand(6, 24);
    const color = new T.Color(hexColor(night ? '#2b3350' : '#8f9fbd', 0x8f9fbd));
    color.offsetHSL(rand(-0.02, 0.02), rand(-0.05, 0.05), rand(-0.08, 0.06));
    const block = new T.Mesh(
      new T.BoxGeometry(bw, bh, bd),
      new T.MeshStandardMaterial({
        color: color,
        roughness: 0.72,
        metalness: 0.16,
        emissive: new T.Color(0x2a1f08),
        emissiveIntensity: night ? 0.35 : 0
      })
    );
    block.position.set(spot.x, bh / 2, spot.z);
    block.castShadow = true;
    block.receiveShadow = true;
    worldGroup.add(block);
    obstacles.push({ x: spot.x, z: spot.z, hw: bw / 2, hd: bd / 2 });
  }

  const treeCount = Math.max(0, Math.min(60, Math.round(worldCfg.trees || 20)));
  if (treeCount > 0) {
    const trunkGeo = new T.CylinderGeometry(0.22, 0.34, 2.4, 6);
    const leafGeo = new T.ConeGeometry(1.5, 3.6, 7);
    const trunkMat = new T.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
    const leafMat = new T.MeshStandardMaterial({
      color: night ? 0x1f6b45 : 0x2f9e5c,
      roughness: 0.95
    });
    for (let i = 0; i < treeCount; i++) {
      const spot = freeSpot(12, 24);
      if (!spot) continue;
      const trunk = new T.Mesh(trunkGeo, trunkMat);
      trunk.position.set(spot.x, 1.2, spot.z);
      trunk.castShadow = true;
      worldGroup.add(trunk);

      const leaves = new T.Mesh(leafGeo, leafMat);
      leaves.position.set(spot.x, 3.4, spot.z);
      leaves.castShadow = true;
      worldGroup.add(leaves);
    }
  }

  /* --------------------------------------------------------------- player */

  const playerGroup = new T.Group();
  scene.add(playerGroup);

  const playerColor = hexColor(theme.player, 0x7c5cff);
  const accentColor = hexColor(theme.accent, 0x22d3ee);

  const body = new T.Mesh(
    new T.CapsuleGeometry(0.46, 0.95, 6, 14),
    new T.MeshStandardMaterial({
      color: playerColor,
      roughness: 0.42,
      metalness: 0.28,
      emissive: new T.Color(playerColor),
      emissiveIntensity: 0.18
    })
  );
  body.position.y = 1.12;
  body.castShadow = true;
  playerGroup.add(body);

  const head = new T.Mesh(
    new T.SphereGeometry(0.42, 18, 14),
    new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.1 })
  );
  head.position.y = 2.12;
  head.castShadow = true;
  playerGroup.add(head);

  const visor = new T.Mesh(
    new T.BoxGeometry(0.52, 0.16, 0.06),
    new T.MeshStandardMaterial({
      color: accentColor,
      emissive: new T.Color(accentColor),
      emissiveIntensity: 1.1,
      roughness: 0.3
    })
  );
  visor.position.set(0, 2.14, 0.38);
  playerGroup.add(visor);

  const nose = new T.Mesh(
    new T.ConeGeometry(0.24, 0.7, 10),
    new T.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.3 })
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.15, 0.62);
  playerGroup.add(nose);

  const blob = new T.Mesh(
    new T.CircleGeometry(0.72, 24),
    new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.05;
  playerGroup.add(blob);

  const player = { x: 0, y: 0, z: 2, vy: 0, iframe: 0, dir: Math.PI };

  /* ---------------------------------------------------------- entities ---- */

  const pickGeo = new T.OctahedronGeometry(0.52, 0);
  const pickMat = new T.MeshStandardMaterial({
    color: accentColor,
    emissive: new T.Color(accentColor),
    emissiveIntensity: 1.35,
    roughness: 0.25,
    metalness: 0.4
  });

  const foeGeo = new T.ConeGeometry(0.72, 1.7, 8);
  const foeMat = new T.MeshStandardMaterial({
    color: hexColor(theme.enemy, 0xf87171),
    emissive: new T.Color(hexColor(theme.enemy, 0xf87171)),
    emissiveIntensity: 0.45,
    roughness: 0.5
  });

  const bulletGeo = new T.SphereGeometry(0.2, 10, 8);
  const bulletMat = new T.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: new T.Color(0xfef08a),
    emissiveIntensity: 2,
    roughness: 0.4
  });

  const collectibles = [];
  const enemies = [];
  const bullets = [];

  function spawnCollectible() {
    const spot = freeSpot(7, 30) || {
      x: rand(-half + 6, half - 6),
      z: rand(-half + 6, half - 6)
    };
    const mesh = new T.Mesh(pickGeo, pickMat);
    mesh.position.set(spot.x, 1.2, spot.z);
    mesh.castShadow = true;
    scene.add(mesh);
    collectibles.push({ mesh: mesh, x: spot.x, z: spot.z, phase: rand(0, Math.PI * 2) });
  }

  function spawnEnemy(far) {
    const spot = freeSpot(far ? 26 : 16, 40) || {
      x: rand(-half + 8, half - 8),
      z: rand(-half + 8, half - 8)
    };
    const mesh = new T.Mesh(foeGeo, foeMat);
    mesh.position.set(spot.x, 0.9, spot.z);
    mesh.castShadow = true;
    scene.add(mesh);
    enemies.push({
      mesh: mesh,
      x: spot.x,
      z: spot.z,
      phase: rand(0, Math.PI * 2),
      speed: 2.2 + state.level * 0.35 + rand(0, 1.2)
    });
  }

  function removeEntity(list, index) {
    const item = list[index];
    if (item && item.mesh) scene.remove(item.mesh);
    list.splice(index, 1);
  }

  function clearAll() {
    while (collectibles.length) removeEntity(collectibles, collectibles.length - 1);
    while (enemies.length) removeEntity(enemies, enemies.length - 1);
    while (bullets.length) removeEntity(bullets, bullets.length - 1);
  }

  /* --------------------------------------------------------------- camera */

  let yaw = Math.PI;
  let pitch = 0.46;
  let distance = 17;

  const camTarget = new T.Vector3(0, 2, 0);
  const camGoal = new T.Vector3();
  const forwardVec = new T.Vector3();
  const rightVec = new T.Vector3();
  const moveVec = new T.Vector3();
  const UP = new T.Vector3(0, 1, 0);

  function cameraGoal() {
    const cosPitch = Math.cos(pitch);
    camTarget.set(player.x, player.y + 1.9, player.z);
    camGoal.set(
      player.x + Math.sin(yaw) * cosPitch * distance,
      player.y + 2.1 + Math.sin(pitch) * distance,
      player.z + Math.cos(yaw) * cosPitch * distance
    );
  }

  /* ---------------------------------------------------------------- input */

  const keyState = Object.create(null);
  const touch = { x: 0, y: 0 };

  function isTyping(target) {
    if (!target) return false;
    const tag = target.tagName ? target.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  function jump() {
    if (player.y > 0.05) return;
    player.vy = 10.5;
  }

  let fireCooldown = 0;

  function fire() {
    if (fireCooldown > 0) return;
    fireCooldown = 0.22;
    const dx = Math.sin(player.dir);
    const dz = Math.cos(player.dir);
    const mesh = new T.Mesh(bulletGeo, bulletMat);
    mesh.position.set(player.x + dx * 1.1, 1.2, player.z + dz * 1.1);
    scene.add(mesh);
    bullets.push({
      mesh: mesh,
      x: player.x + dx * 1.1,
      z: player.z + dz * 1.1,
      vx: dx * 34,
      vz: dz * 34,
      life: 1.3
    });
  }

  function action() {
    if (state.paused || state.over) return;
    if (rules.shoot) fire();
    else jump();
  }

  function onKeyDown(e) {
    if (isTyping(e.target)) return;
    const key = String(e.key || '').toLowerCase();
    const code = String(e.code || '');

    if (key === 'arrowup' || key === 'w' || code === 'ArrowUp') keyState.up = true;
    if (key === 'arrowdown' || key === 's' || code === 'ArrowDown') keyState.down = true;
    if (key === 'arrowleft' || key === 'a' || code === 'ArrowLeft') keyState.left = true;
    if (key === 'arrowright' || key === 'd' || code === 'ArrowRight') keyState.right = true;

    if (key === ' ' || key === 'spacebar' || code === 'Space') {
      keyState.space = true;
      if (e.preventDefault) e.preventDefault();
      if (!e.repeat) action();
    }

    if (key === 'enter' && state.over) restart();
    if (key === 'p' || key === 'escape') {
      if (state.paused) resume();
      else pause();
    }
    if (key === 'r') restart();
  }

  function onKeyUp(e) {
    if (isTyping(e.target)) return;
    const key = String(e.key || '').toLowerCase();
    const code = String(e.code || '');

    if (key === 'arrowup' || key === 'w' || code === 'ArrowUp') keyState.up = false;
    if (key === 'arrowdown' || key === 's' || code === 'ArrowDown') keyState.down = false;
    if (key === 'arrowleft' || key === 'a' || code === 'ArrowLeft') keyState.left = false;
    if (key === 'arrowright' || key === 'd' || code === 'ArrowRight') keyState.right = false;
    if (key === ' ' || key === 'spacebar' || code === 'Space') keyState.space = false;
  }

  function onBlur() {
    keyState.up = false;
    keyState.down = false;
    keyState.left = false;
    keyState.right = false;
    keyState.space = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  let dragId = null;
  let dragX = 0;
  let dragY = 0;

  function onCanvasDown(e) {
    dragId = e.pointerId;
    dragX = e.clientX;
    dragY = e.clientY;
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        /* not fatal */
      }
    }
  }

  function onCanvasMove(e) {
    if (dragId !== e.pointerId) return;
    yaw -= (e.clientX - dragX) * 0.006;
    pitch = Math.max(0.12, Math.min(1.15, pitch + (e.clientY - dragY) * 0.004));
    dragX = e.clientX;
    dragY = e.clientY;
  }

  function onCanvasUp(e) {
    if (dragId === e.pointerId) dragId = null;
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', onCanvasDown);
  canvas.addEventListener('pointermove', onCanvasMove);
  canvas.addEventListener('pointerup', onCanvasUp);
  canvas.addEventListener('pointercancel', onCanvasUp);

  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(any-pointer: coarse)').matches;

  let joyEl = null;
  let knobEl = null;
  let actEl = null;
  let joyId = null;

  function joyUpdate(e) {
    if (!joyEl) return;
    const rect = joyEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = rect.width / 2;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    if (knobEl) {
      knobEl.style.transform =
        'translate(-50%, -50%) translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
    }
    touch.x = dx / max;
    touch.y = dy / max;
  }

  function joyEnd(e) {
    if (joyId !== null && e.pointerId !== joyId) return;
    joyId = null;
    touch.x = 0;
    touch.y = 0;
    if (knobEl) knobEl.style.transform = 'translate(-50%, -50%)';
  }

  function buildTouchControls() {
    const host = canvas.parentElement;
    if (!coarse || !host) return;

    joyEl = document.createElement('div');
    joyEl.className = 'joy';
    knobEl = document.createElement('div');
    knobEl.className = 'joy-knob';
    joyEl.appendChild(knobEl);

    actEl = document.createElement('button');
    actEl.type = 'button';
    actEl.className = 'act-btn';
    actEl.textContent = rules.shoot ? '✦' : '↑';

    host.appendChild(joyEl);
    host.appendChild(actEl);

    joyEl.addEventListener('pointerdown', function (e) {
      joyId = e.pointerId;
      if (joyEl.setPointerCapture) {
        try {
          joyEl.setPointerCapture(e.pointerId);
        } catch (err) {
          /* not fatal */
        }
      }
      joyUpdate(e);
      if (e.preventDefault) e.preventDefault();
    });
    joyEl.addEventListener('pointermove', function (e) {
      if (joyId === e.pointerId) joyUpdate(e);
    });
    joyEl.addEventListener('pointerup', joyEnd);
    joyEl.addEventListener('pointercancel', joyEnd);

    actEl.addEventListener('pointerdown', function (e) {
      if (e.preventDefault) e.preventDefault();
      action();
    });
  }

  function removeTouchControls() {
    if (joyEl && joyEl.parentNode) joyEl.parentNode.removeChild(joyEl);
    if (actEl && actEl.parentNode) actEl.parentNode.removeChild(actEl);
    joyEl = null;
    knobEl = null;
    actEl = null;
  }

  buildTouchControls();

  /* ----------------------------------------------------------- state glue */

  let hudAt = 0;

  function emit(force) {
    if (typeof opts.onState !== 'function') return;
    const now = performance.now();
    if (!force && now - hudAt < 110) return;
    hudAt = now;
    opts.onState({
      score: state.score,
      hp: state.hp,
      maxHp: state.maxHp,
      time: Math.max(0, Math.ceil(state.time)),
      level: state.level,
      goal: state.goal,
      kills: state.kills,
      over: state.over,
      paused: state.paused,
      reason: state.reason
    });
  }

  function gameOver(reason) {
    if (state.over) return;
    state.over = true;
    state.reason = reason || 'hp';
    emit(true);
    if (typeof opts.onOver === 'function') {
      opts.onOver({
        score: state.score,
        level: state.level,
        kills: state.kills,
        reason: state.reason
      });
    }
  }

  function damage() {
    if (player.iframe > 0 || state.over) return;
    state.hp -= 1;
    player.iframe = 1.15;
    if (state.hp <= 0) {
      state.hp = 0;
      gameOver('hp');
    } else {
      emit(true);
    }
  }

  /* ----------------------------------------------------------------- reset */

  function reset() {
    clearAll();

    state.score = 0;
    state.hp = rules.hp;
    state.maxHp = rules.hp;
    state.time = rules.time;
    state.level = 1;
    state.goal = 100;
    state.kills = 0;
    state.over = false;
    state.paused = false;
    state.reason = '';

    player.x = 0;
    player.z = 2;
    player.y = 0;
    player.vy = 0;
    player.iframe = 0;
    player.dir = Math.PI;

    const picks = Math.max(6, Math.min(20, Math.round(rules.collectibles) + 2));
    for (let i = 0; i < picks; i++) spawnCollectible();

    const foes = Math.max(0, Math.min(14, Math.round(rules.enemies)));
    for (let i = 0; i < foes; i++) spawnEnemy(true);

    yaw = Math.PI;
    pitch = 0.46;
    distance = 17;
    cameraGoal();
    camera.position.copy(camGoal);
    camera.lookAt(camTarget);

    syncVisuals(0);
    emit(true);
  }

  /* ------------------------------------------------------------------ step */

  function resolveObstacles() {
    const r = 0.8;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const minX = o.x - o.hw - r;
      const maxX = o.x + o.hw + r;
      const minZ = o.z - o.hd - r;
      const maxZ = o.z + o.hd + r;
      if (player.x > minX && player.x < maxX && player.z > minZ && player.z < maxZ) {
        const dl = player.x - minX;
        const dr = maxX - player.x;
        const dt = player.z - minZ;
        const db = maxZ - player.z;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) player.x = minX;
        else if (m === dr) player.x = maxX;
        else if (m === dt) player.z = minZ;
        else player.z = maxZ;
      }
    }
  }

  function syncVisuals(dt) {
    playerGroup.position.set(player.x, player.y, player.z);
    playerGroup.rotation.y = player.dir;
    const blink = player.iframe > 0 && Math.floor(player.iframe * 14) % 2 === 0;
    body.visible = !blink;
    head.visible = !blink;

    for (let i = 0; i < collectibles.length; i++) {
      const item = collectibles[i];
      item.mesh.position.set(item.x, 1.2 + Math.sin(item.phase) * 0.16, item.z);
      item.mesh.rotation.y += dt * 1.6;
    }

    for (let i = 0; i < enemies.length; i++) {
      const foe = enemies[i];
      foe.mesh.position.set(foe.x, 0.9 + Math.sin(foe.phase) * 0.1, foe.z);
      foe.mesh.rotation.y = Math.atan2(player.x - foe.x, player.z - foe.z);
    }

    for (let i = 0; i < bullets.length; i++) {
      bullets[i].mesh.position.set(bullets[i].x, 1.2, bullets[i].z);
    }
  }

  function step(dt) {
    if (fireCooldown > 0) fireCooldown -= dt;
    if (player.iframe > 0) player.iframe -= dt;

    if (rules.time > 0) {
      state.time -= dt;
      if (state.time <= 0) {
        state.time = 0;
        gameOver('time');
        return;
      }
    }

    let inputX = 0;
    let inputY = 0;
    if (keyState.up) inputY -= 1;
    if (keyState.down) inputY += 1;
    if (keyState.left) inputX -= 1;
    if (keyState.right) inputX += 1;
    inputX += touch.x;
    inputY += touch.y;

    const inLen = Math.sqrt(inputX * inputX + inputY * inputY);
    if (inLen > 1) {
      inputX /= inLen;
      inputY /= inLen;
    }

    forwardVec.set(player.x - camera.position.x, 0, player.z - camera.position.z);
    if (forwardVec.lengthSq() < 0.0001) forwardVec.set(0, 0, 1);
    forwardVec.normalize();
    rightVec.crossVectors(forwardVec, UP).normalize();

    moveVec.set(0, 0, 0);
    moveVec.addScaledVector(forwardVec, -inputY);
    moveVec.addScaledVector(rightVec, inputX);

    if (moveVec.lengthSq() > 0.0001) {
      moveVec.normalize();
      const speed = Math.max(4, (Number(rules.speed) || 220) / 22);
      player.x += moveVec.x * speed * dt;
      player.z += moveVec.z * speed * dt;
      player.dir = Math.atan2(moveVec.x, moveVec.z);
    }

    const limit = half - 2;
    player.x = Math.max(-limit, Math.min(limit, player.x));
    player.z = Math.max(-limit, Math.min(limit, player.z));
    resolveObstacles();

    player.vy -= 26 * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) {
      player.y = 0;
      player.vy = 0;
    }

    // collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const item = collectibles[i];
      item.phase += dt * 2;
      const dx = item.x - player.x;
      const dz = item.z - player.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.7) {
        removeEntity(collectibles, i);
        state.score += 10;
        spawnCollectible();
        if (state.score >= state.goal) {
          state.level += 1;
          state.goal += 100;
          state.hp = Math.min(state.maxHp, state.hp + 1);
          spawnEnemy(true);
          spawnEnemy(true);
        }
        emit(true);
      }
    }

    // enemies
    for (let i = 0; i < enemies.length; i++) {
      const foe = enemies[i];
      foe.phase += dt * 2;
      const dx = player.x - foe.x;
      const dz = player.z - foe.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      if (dist > 1.3) {
        foe.x += (dx / dist) * foe.speed * dt;
        foe.z += (dz / dist) * foe.speed * dt;
      }
      if (dist < 1.5) damage();
    }

    // bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.z += bullet.vz * dt;
      bullet.life -= dt;
      let done = bullet.life <= 0;

      if (!done) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const foe = enemies[j];
          const bx = foe.x - bullet.x;
          const bz = foe.z - bullet.z;
          if (Math.sqrt(bx * bx + bz * bz) < 1.4) {
            removeEntity(enemies, j);
            state.score += 15;
            state.kills += 1;
            spawnEnemy(true);
            done = true;
            emit(true);
            break;
          }
        }
      }

      if (done) removeEntity(bullets, i);
    }

    emit(false);
  }

  /* ------------------------------------------------------------------ loop */

  let alive = true;
  let raf = 0;
  let last = 0;

  function frame(ts) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);

    const now = ts || performance.now();
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    if (!state.paused && !state.over) step(dt);
    syncVisuals(dt);

    cameraGoal();
    camera.position.lerp(camGoal, 1 - Math.pow(0.0009, dt));
    camera.lookAt(camTarget);
    renderer.render(scene, camera);
  }

  function start() {
    if (!alive) return;
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function pause() {
    state.paused = true;
    emit(true);
  }

  function resume() {
    state.paused = false;
    last = performance.now();
    emit(true);
  }

  function restart() {
    reset();
    start();
  }

  /* --------------------------------------------------------------- resize */

  function resize() {
    const w = Math.max(220, canvas.clientWidth || 640);
    const h = Math.max(160, canvas.clientHeight || 360);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement || canvas);
  }
  window.addEventListener('resize', resize);

  /* -------------------------------------------------------------- dispose */

  function disposeTree(root) {
    root.traverse(function (obj) {
      if (obj.isMesh || obj.isLine) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(function (m) {
            m.dispose();
          });
        }
      }
    });
  }

  function destroy() {
    alive = false;
    stopLoop();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', onCanvasDown);
    canvas.removeEventListener('pointermove', onCanvasMove);
    canvas.removeEventListener('pointerup', onCanvasUp);
    canvas.removeEventListener('pointercancel', onCanvasUp);
    if (ro) ro.disconnect();
    removeTouchControls();
    disposeTree(scene);
    try {
      renderer.dispose();
    } catch (err) {
      /* not fatal */
    }
  }

  /* ------------------------------------------------------------------ boot */

  resize();
  reset();
  emit(true);
  start();

  return {
    start: start,
    stop: stopLoop,
    pause: pause,
    resume: resume,
    restart: restart,
    destroy: destroy,
    state: state
  };
}
