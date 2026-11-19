// World Builder renderer — three.js is vendored in /vendor so the platform
// needs no build step and no paid service. Everything is generated from the
// project spec: streets, buildings, houses, cars, nature, sea, nights.

let THREE_MODULE = null;

export async function loadThree() {
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

export async function createWorld(container, spec, options) {
  const THREE = await loadThree();
  const opts = options || {};
  const state = { spec: JSON.parse(JSON.stringify(spec || {})) };
  const quality = opts.quality || 'auto';
  const high = quality === '4k' || (quality === 'auto' && (window.devicePixelRatio || 1) >= 1.5);

  const worldParams = () =>
    Object.assign(
      {
        size: 240,
        buildings: 26,
        houses: 14,
        trees: 40,
        cars: 8,
        mountains: 8,
        sea: true,
        beach: true,
        night: false,
        roads: true
      },
      (state.spec && state.spec.world) || {}
    );

  const themeParams = () =>
    Object.assign(
      {
        ground: '#2f7d4f',
        sea: '#0891b2',
        sky: '#0e7490',
        road: '#1f2937',
        accent: '#22d3ee'
      },
      (state.spec && state.spec.theme) || {}
    );

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.5, 3000);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
  } catch (err) {
    throw new Error('webgl-unavailable');
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = opts.shadows !== false && high;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'world-canvas';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x2a2f3a, 0.75);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.22);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff3d6, 1.85);
  sun.position.set(90, 150, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.width = high ? 2048 : 1024;
  sun.shadow.mapSize.height = high ? 2048 : 1024;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 500;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  let content = new THREE.Group();
  scene.add(content);
  let carList = [];
  let worldSize = 240;
  let seedState = (Number((state.spec && state.spec.seed) || 0) || 987654321) >>> 0;

  function rand(min, max) {
    seedState = (seedState * 1664525 + 1013904223) >>> 0;
    return min + (seedState / 4294967296) * (max - min);
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function clearContent() {
    content.traverse(function (obj) {
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
    scene.remove(content);
    content = new THREE.Group();
    scene.add(content);
    carList = [];
  }

  function build() {
    const W = worldParams();
    const T = themeParams();
    const night = !!W.night;
    worldSize = Math.max(120, Number(W.size) || 240);
    const size = worldSize;
    seedState = (Number((state.spec && state.spec.seed) || 0) || 987654321) >>> 0;

    clearContent();

    const skyColor = hexColor(night ? '#05060f' : T.sky, 0x0b1020);
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.Fog(skyColor, size * 0.6, size * 1.9);

    sun.intensity = night ? 0.42 : 1.85;
    sun.color.set(night ? 0x93a7ff : 0xfff3d6);
    hemi.intensity = night ? 0.42 : 0.75;
    hemi.color.set(night ? 0x5b6ea8 : 0xbfd8ff);
    hemi.groundColor.set(night ? 0x0a0d16 : 0x2a2f3a);
    ambient.intensity = night ? 0.16 : 0.22;

    // ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({
        color: hexColor(T.ground, 0x2f7d4f),
        roughness: 0.95,
        metalness: 0.02
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    content.add(ground);

    const grid = new THREE.GridHelper(size, 36, 0xffffff, 0xffffff);
    grid.position.y = 0.02;
    if (grid.material) {
      grid.material.transparent = true;
      grid.material.opacity = 0.06;
    }
    content.add(grid);

    // sea + beach
    const seaZ = size * 0.42;
    const seaPresent = W.sea !== false;
    if (seaPresent) {
      const sea = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size * 0.42),
        new THREE.MeshStandardMaterial({
          color: hexColor(T.sea, 0x0891b2),
          roughness: 0.15,
          metalness: 0.55,
          transparent: true,
          opacity: 0.94
        })
      );
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(0, 0.025, seaZ);
      content.add(sea);

      if (W.beach !== false) {
        const beach = new THREE.Mesh(
          new THREE.PlaneGeometry(size, 16),
          new THREE.MeshStandardMaterial({ color: 0xd8c48a, roughness: 1 })
        );
        beach.rotation.x = -Math.PI / 2;
        beach.position.set(0, 0.03, seaZ - size * 0.21 - 8);
        beach.receiveShadow = true;
        content.add(beach);
      }
    }

    const roadWidth = 16;
    const roadY = 0.04;
    if (W.roads !== false) {
      const roadMat = new THREE.MeshStandardMaterial({
        color: hexColor(T.road, 0x1f2937),
        roughness: 0.85,
        metalness: 0.08
      });

      const roadA = new THREE.Mesh(new THREE.PlaneGeometry(size, roadWidth), roadMat);
      roadA.rotation.x = -Math.PI / 2;
      roadA.position.set(0, roadY, 0);
      roadA.receiveShadow = true;
      content.add(roadA);

      const roadB = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, size), roadMat);
      roadB.rotation.x = -Math.PI / 2;
      roadB.position.set(0, roadY, 0);
      roadB.receiveShadow = true;
      content.add(roadB);

      const dashMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: night ? 0.22 : 0.34
      });
      for (let i = -size / 2 + 8; i < size / 2 - 8; i += 16) {
        const dashZ = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 6), dashMat);
        dashZ.rotation.x = -Math.PI / 2;
        dashZ.position.set(0, roadY + 0.012, i);
        content.add(dashZ);

        const dashX = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.4), dashMat);
        dashX.rotation.x = -Math.PI / 2;
        dashX.position.set(i, roadY + 0.012, 0);
        content.add(dashX);
      }
    }

    function isFree(x, z) {
      if (Math.abs(x) < roadWidth * 0.75 || Math.abs(z) < roadWidth * 0.75) return false;
      if (seaPresent && z > seaZ - size * 0.21 - 16) return false;
      return true;
    }

    function place(radius, tries) {
      const attempts = tries || 36;
      for (let i = 0; i < attempts; i++) {
        const x = rand(-size / 2 + radius + 3, size / 2 - radius - 3);
        const z = rand(-size / 2 + radius + 3, size / 2 - radius - 3);
        if (isFree(x, z)) return { x: x, z: z };
      }
      return null;
    }

    // buildings
    const buildingCount = Math.max(0, Math.round(W.buildings));
    for (let i = 0; i < buildingCount; i++) {
      const spot = place(12);
      if (!spot) continue;
      const bw = rand(8, 15);
      const bd = rand(8, 15);
      const bh = rand(12, 46) * (night ? 1.08 : 1);
      const color = new THREE.Color(hexColor(night ? '#2b3350' : '#9aa7c7', 0x9aa7c7));
      color.offsetHSL(rand(-0.02, 0.02), rand(-0.06, 0.05), rand(-0.09, 0.06));
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.2,
        emissive: new THREE.Color(0x2a1f08),
        emissiveIntensity: night ? 0.4 : 0
      });
      const block = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      block.position.set(spot.x, bh / 2, spot.z);
      block.castShadow = true;
      block.receiveShadow = true;
      content.add(block);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(bw * 0.86, 0.7, bd * 0.86),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 })
      );
      cap.position.set(spot.x, bh + 0.35, spot.z);
      content.add(cap);
    }

    // houses
    const houseCount = Math.max(0, Math.round(W.houses));
    for (let i = 0; i < houseCount; i++) {
      const spot = place(8);
      if (!spot) continue;
      const hw = rand(5, 8);
      const hd = rand(5, 8);
      const hh = rand(3.6, 6.4);
      const house = new THREE.Mesh(
        new THREE.BoxGeometry(hw, hh, hd),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(rand(0.05, 0.12), 0.32, night ? 0.26 : 0.72),
          roughness: 0.9
        })
      );
      house.position.set(spot.x, hh / 2, spot.z);
      house.castShadow = true;
      house.receiveShadow = true;
      content.add(house);

      const roofHeight = rand(2.2, 3.4);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(hw, hd) * 0.78, roofHeight, 4),
        new THREE.MeshStandardMaterial({
          color: hexColor(night ? '#5f3b2a' : '#a85b3a', 0xa85b3a),
          roughness: 0.85
        })
      );
      roof.position.set(spot.x, hh + roofHeight / 2, spot.z);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      content.add(roof);
    }

    // trees
    const treeCount = Math.max(0, Math.round(W.trees));
    if (treeCount > 0) {
      const trunkGeo = new THREE.CylinderGeometry(0.36, 0.5, 3.2, 6);
      const leafGeo = new THREE.ConeGeometry(2.1, 5.2, 7);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
      const leafMat = new THREE.MeshStandardMaterial({
        color: night ? 0x1f6b45 : 0x2f9e5c,
        roughness: 0.95
      });
      for (let i = 0; i < treeCount; i++) {
        const spot = place(4, 24);
        if (!spot) continue;
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(spot.x, 1.6, spot.z);
        trunk.castShadow = true;
        content.add(trunk);

        const leaves = new THREE.Mesh(leafGeo, leafMat);
        leaves.position.set(spot.x, 4.4, spot.z);
        leaves.castShadow = true;
        content.add(leaves);
      }
    }

    // mountains
    const mountainCount = Math.max(0, Math.round(W.mountains));
    for (let i = 0; i < mountainCount; i++) {
      const angle = (i / Math.max(1, mountainCount)) * Math.PI * 2 + 0.4;
      const radius = size * rand(0.5, 0.68);
      const mx = Math.cos(angle) * radius;
      const mz = Math.sin(angle) * radius;
      if (seaPresent && mz > seaZ - size * 0.24) continue;
      const mh = rand(42, 105);
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(rand(22, 40), mh, 6),
        new THREE.MeshStandardMaterial({
          color: night ? 0x242c40 : 0x4b5b63,
          roughness: 0.95,
          flatShading: true
        })
      );
      mountain.position.set(mx, mh / 2 - 3, mz);
      content.add(mountain);
    }

    // cars
    const carCount = Math.max(0, Math.round(W.cars));
    const palette = [0xf87171, 0x60a5fa, 0xfbbf24, 0x34d399, 0xe5e7eb, 0xa78bfa];
    for (let i = 0; i < carCount; i++) {
      const alongZ = i % 2 === 0;
      const dir = i % 4 < 2 ? 1 : -1;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.5, 4.6),
        new THREE.MeshStandardMaterial({
          color: palette[i % palette.length],
          roughness: 0.32,
          metalness: 0.6
        })
      );
      mesh.castShadow = true;
      if (alongZ) {
        mesh.position.set(dir > 0 ? 5.5 : -5.5, 0.8, rand(-size / 2, size / 2));
        mesh.rotation.y = dir > 0 ? 0 : Math.PI;
      } else {
        mesh.position.set(rand(-size / 2, size / 2), 0.8, dir > 0 ? 5.5 : -5.5);
        mesh.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      content.add(mesh);
      carList.push({ mesh: mesh, alongZ: alongZ, dir: dir, speed: rand(7, 17) });
    }

    // a landmark so the world reads as designed, not random
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 5.2, 34, 8),
      new THREE.MeshStandardMaterial({
        color: hexColor(T.accent, 0x22d3ee),
        roughness: 0.4,
        metalness: 0.5,
        emissive: new THREE.Color(hexColor(T.accent, 0x22d3ee)),
        emissiveIntensity: night ? 0.55 : 0.12
      })
    );
    tower.position.set(0, 17, -size * 0.3);
    tower.castShadow = true;
    content.add(tower);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 18, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: new THREE.Color(hexColor(T.accent, 0x22d3ee)),
        emissiveIntensity: night ? 1.6 : 0.7,
        roughness: 0.3
      })
    );
    beacon.position.set(0, 36, -size * 0.3);
    content.add(beacon);

    radius = clamp(Math.max(95, size * 0.66), 60, 460);
    updateCamera();
  }

  // ---- camera controls ----
  const target = new THREE.Vector3(0, 10, 0);
  let azim = Math.PI * 0.25;
  let elev = 0.52;
  let radius = 150;

  function updateCamera() {
    const c = Math.cos(elev);
    camera.position.set(
      target.x + radius * c * Math.sin(azim),
      target.y + radius * Math.sin(elev),
      target.z + radius * c * Math.cos(azim)
    );
    camera.lookAt(target);
  }

  const pointers = new Map();
  let drag = null;
  let pinch = null;

  function pointerDistance() {
    const pts = Array.from(pointers.values());
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onDown(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (renderer.domElement.setPointerCapture) {
      try {
        renderer.domElement.setPointerCapture(e.pointerId);
      } catch (err) {
        /* not fatal */
      }
    }
    if (pointers.size === 2) {
      pinch = { dist: pointerDistance(), radius: radius };
      drag = null;
    } else if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY };
    }
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2 && pinch) {
      const dist = pointerDistance();
      if (dist > 4) {
        radius = clamp((pinch.radius * pinch.dist) / dist, 40, 480);
      }
      return;
    }

    if (drag) {
      azim -= (e.clientX - drag.x) * 0.006;
      elev = clamp(elev + (e.clientY - drag.y) * 0.004, 0.1, 1.4);
      drag = { x: e.clientX, y: e.clientY };
    }
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) {
      const only = Array.from(pointers.values())[0];
      drag = { x: only.x, y: only.y };
    } else {
      drag = null;
    }
  }

  function onWheel(e) {
    e.preventDefault();
    radius = clamp(radius + e.deltaY * 0.12, 40, 480);
  }

  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointercancel', onUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  function fit() {
    const w = Math.max(240, container.clientWidth || 640);
    const h = Math.max(200, container.clientHeight || 420);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(function () {
      fit();
    });
    ro.observe(container);
  }
  window.addEventListener('resize', fit);

  // ---- loop ----
  let alive = true;
  let raf = 0;
  let lastT = 0;

  function animate(ts) {
    if (!alive) return;
    raf = requestAnimationFrame(animate);
    const now = ts || performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;

    for (let i = 0; i < carList.length; i++) {
      const car = carList[i];
      if (car.alongZ) {
        car.mesh.position.z += car.dir * car.speed * dt;
        if (car.mesh.position.z > worldSize / 2) car.mesh.position.z = -worldSize / 2;
        if (car.mesh.position.z < -worldSize / 2) car.mesh.position.z = worldSize / 2;
      } else {
        car.mesh.position.x += car.dir * car.speed * dt;
        if (car.mesh.position.x > worldSize / 2) car.mesh.position.x = -worldSize / 2;
        if (car.mesh.position.x < -worldSize / 2) car.mesh.position.x = worldSize / 2;
      }
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  function dispose() {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    renderer.domElement.removeEventListener('pointerdown', onDown);
    renderer.domElement.removeEventListener('pointermove', onMove);
    renderer.domElement.removeEventListener('pointerup', onUp);
    renderer.domElement.removeEventListener('pointercancel', onUp);
    renderer.domElement.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', fit);
    if (ro) ro.disconnect();
    clearContent();
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  fit();
  build();
  updateCamera();
  raf = requestAnimationFrame(animate);

  return {
    apply: function (nextSpec) {
      state.spec = JSON.parse(JSON.stringify(nextSpec || {}));
      build();
    },
    dispose: dispose,
    screenshot: function () {
      renderer.render(scene, camera);
      try {
        return renderer.domElement.toDataURL('image/png');
      } catch (err) {
        return '';
      }
    },
    camera: {
      zoom: function (delta) {
        radius = clamp(radius + delta, 40, 480);
      }
    }
  };
}
