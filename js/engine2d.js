// OMAR AI runtime — 2D game engine.
// No imports, and every declaration is a top-level `export function`, so an
// exported project can inline this file's source and run on its own.

export function createGame(canvas, spec, options) {
  const opts = options || {};
  const specData = spec || {};
  const ctx = canvas.getContext('2d', { alpha: false });

  const rules = Object.assign(
    {
      speed: 240,
      hp: 3,
      enemies: 6,
      obstacles: 8,
      collectibles: 10,
      time: 90,
      shoot: false
    },
    specData.rules || {}
  );

  const theme = Object.assign(
    {
      bg1: '#0b1020',
      bg2: '#141b33',
      ground: '#1c2540',
      player: '#7c5cff',
      accent: '#22d3ee',
      enemy: '#f87171',
      sky: '#0b1020'
    },
    specData.theme || {}
  );

  const genre = specData.genre || 'adventure';
  const raceMode = genre === 'racing';

  let W = 640;
  let H = 360;
  let dpr = opts.dpr || 1;

  const state = {
    score: 0,
    hp: rules.hp,
    maxHp: rules.hp,
    time: rules.time,
    level: 1,
    goal: 100,
    kills: 0,
    collected: 0,
    over: false,
    paused: false,
    reason: '',
    started: false
  };

  const player = { x: W / 2, y: H / 2, r: 14, dir: -Math.PI / 2, iframe: 0, flash: 0 };
  let collectibles = [];
  let enemies = [];
  let rocks = [];
  let bullets = [];

  const keys = Object.create(null);
  let pointer = { active: false, x: 0, y: 0 };
  let shootCooldown = 0;
  let alive = true;
  let loopOn = false;
  let raf = 0;
  let last = 0;
  let hudAt = 0;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function playerRadius() {
    return Math.max(9, Math.min(W, H) * 0.036);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(240, Math.round(rect.width || canvas.clientWidth || 640));
    H = Math.max(180, Math.round(rect.height || canvas.clientHeight || 360));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    player.r = playerRadius();
    player.x = clamp(player.x, player.r, W - player.r);
    player.y = clamp(player.y, player.r, H - player.r);
  }

  function farFromPlayer(minDist) {
    let x = 0;
    let y = 0;
    for (let i = 0; i < 30; i++) {
      x = rand(24, W - 24);
      y = rand(24, H - 24);
      const dx = x - player.x;
      const dy = y - player.y;
      if (Math.sqrt(dx * dx + dy * dy) > minDist) break;
    }
    return { x: x, y: y };
  }

  function spawnCollectible() {
    const p = farFromPlayer(Math.min(W, H) * 0.22);
    collectibles.push({
      x: p.x,
      y: p.y,
      r: Math.max(8, Math.min(W, H) * 0.022),
      phase: Math.random() * Math.PI * 2
    });
  }

  function spawnEnemy(far) {
    const p = far
      ? farFromPlayer(Math.min(W, H) * 0.45)
      : { x: rand(0, W), y: rand(0, H) };
    enemies.push({
      x: p.x,
      y: p.y,
      r: Math.max(9, Math.min(W, H) * 0.028),
      speed: rand(26, 44) + state.level * 7,
      wobble: Math.random() * Math.PI * 2
    });
  }

  function spawnRock() {
    const p = farFromPlayer(Math.min(W, H) * 0.25);
    const w = rand(18, 42);
    rocks.push({
      x: p.x,
      y: p.y,
      w: w,
      h: rand(14, 34),
      rot: rand(0, Math.PI)
    });
  }

  function reset() {
    state.score = 0;
    state.hp = rules.hp;
    state.maxHp = rules.hp;
    state.time = rules.time;
    state.level = 1;
    state.goal = 100;
    state.kills = 0;
    state.collected = 0;
    state.over = false;
    state.paused = false;
    state.reason = '';
    state.started = true;
    player.x = W / 2;
    player.y = H * 0.62;
    player.r = playerRadius();
    player.dir = -Math.PI / 2;
    player.iframe = 0;
    player.flash = 0;
    collectibles = [];
    enemies = [];
    rocks = [];
    bullets = [];
    pointer.active = false;
    shootCooldown = 0;

    const total = Math.max(3, Math.round(rules.collectibles));
    for (let i = 0; i < total; i++) spawnCollectible();
    const foes = Math.max(0, Math.round(rules.enemies));
    for (let i = 0; i < foes; i++) spawnEnemy(true);
    const blocks = Math.max(0, Math.round(rules.obstacles));
    for (let i = 0; i < blocks; i++) spawnRock();

    emit(true);
  }

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
      opts.onOver({ score: state.score, level: state.level, kills: state.kills, reason: state.reason });
    }
  }

  function damage() {
    if (player.iframe > 0 || state.over) return;
    state.hp -= 1;
    player.iframe = 1.15;
    player.flash = 0.35;
    emit(true);
    if (state.hp <= 0) {
      state.hp = 0;
      gameOver('hp');
    }
  }

  function shoot() {
    if (!rules.shoot || state.over || state.paused) return;
    if (shootCooldown > 0) return;
    shootCooldown = 0.24;
    const speed = 520;
    bullets.push({
      x: player.x + Math.cos(player.dir) * (player.r + 6),
      y: player.y + Math.sin(player.dir) * (player.r + 6),
      vx: Math.cos(player.dir) * speed,
      vy: Math.sin(player.dir) * speed,
      life: 1.1
    });
    if (typeof opts.onShoot === 'function') opts.onShoot();
  }

  function keyName(e) {
    return String(e.key || '').toLowerCase();
  }

  function onKeyDown(e) {
    const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.target && e.target.isContentEditable) return;
    const k = keyName(e);
    keys[k] = true;
    if (k === ' ' || k === 'spacebar') {
      if (e.preventDefault) e.preventDefault();
      shoot();
    }
    if (
      k === 'arrowup' ||
      k === 'arrowdown' ||
      k === 'arrowleft' ||
      k === 'arrowright'
    ) {
      if (e.preventDefault) e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys[keyName(e)] = false;
  }

  function localPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onPointerDown(e) {
    const p = localPoint(e.clientX, e.clientY);
    pointer.active = true;
    pointer.x = p.x;
    pointer.y = p.y;
    if (rules.shoot) {
      const dir = Math.atan2(p.y - player.y, p.x - player.x);
      player.dir = dir;
      shoot();
    }
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        /* not fatal */
      }
    }
  }

  function onPointerMove(e) {
    if (!pointer.active) return;
    const p = localPoint(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
  }

  function onPointerUp() {
    pointer.active = false;
  }

  function step(dt) {
    if (state.paused || state.over) return;

    state.time -= dt;
    if (state.time <= 0 && rules.time > 0) {
      state.time = 0;
      gameOver('time');
      return;
    }

    if (shootCooldown > 0) shootCooldown -= dt;
    if (player.iframe > 0) player.iframe -= dt;
    if (player.flash > 0) player.flash -= dt;

    let dx = 0;
    let dy = 0;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;

    if (!dx && !dy && pointer.active) {
      const tx = pointer.x - player.x;
      const ty = pointer.y - player.y;
      const dist = Math.sqrt(tx * tx + ty * ty);
      if (dist > player.r * 0.9) {
        dx = tx / dist;
        dy = ty / dist;
      }
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.01) {
      dx /= len;
      dy /= len;
      player.dir = Math.atan2(dy, dx);
      const speed = rules.speed * (raceMode ? 1.15 : 1);
      player.x += dx * speed * dt;
      player.y += dy * speed * dt;
    }

    player.x = clamp(player.x, player.r, W - player.r);
    player.y = clamp(player.y, player.r, H - player.r);

    // obstacles: push the player out
    for (let i = 0; i < rocks.length; i++) {
      const rock = rocks[i];
      const rr = Math.max(rock.w, rock.h) * 0.5;
      const ox = player.x - rock.x;
      const oy = player.y - rock.y;
      const d = Math.sqrt(ox * ox + oy * oy) || 1;
      const min = rr + player.r;
      if (d < min) {
        const push = (min - d) / d;
        player.x += ox * push;
        player.y += oy * push;
      }
    }

    // collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      c.phase += dt * 3;
      const ox = player.x - c.x;
      const oy = player.y - c.y;
      if (Math.sqrt(ox * ox + oy * oy) < c.r + player.r) {
        collectibles.splice(i, 1);
        state.score += 10;
        state.collected += 1;
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
      foe.wobble += dt * 2;
      const ox = player.x - foe.x;
      const oy = player.y - foe.y;
      const d = Math.sqrt(ox * ox + oy * oy) || 1;
      foe.x += (ox / d) * foe.speed * dt;
      foe.y += (oy / d) * foe.speed * dt;
      if (d < foe.r + player.r) {
        damage();
        foe.x -= (ox / d) * 34;
        foe.y -= (oy / d) * 34;
      }
    }

    // bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let gone = b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20;
      if (!gone) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const foe = enemies[j];
          const bx = b.x - foe.x;
          const by = b.y - foe.y;
          if (Math.sqrt(bx * bx + by * by) < foe.r + 4) {
            enemies.splice(j, 1);
            state.score += 15;
            state.kills += 1;
            spawnEnemy(true);
            gone = true;
            emit(true);
            break;
          }
        }
      }
      if (gone) bullets.splice(i, 1);
    }

    emit(false);
  }

  function starPath(cx, cy, outer, inner, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = rot + (Math.PI / 5) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, theme.bg1 || '#0b1020');
    g.addColorStop(1, theme.bg2 || '#141b33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (raceMode) {
      const roadW = W * 0.62;
      const x0 = (W - roadW) / 2;
      ctx.fillStyle = 'rgba(8, 11, 20, 0.7)';
      ctx.fillRect(x0, 0, roadW, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      ctx.setLineDash([18, 16]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, H);
      ctx.moveTo(x0 + roadW, 0);
      ctx.lineTo(x0 + roadW, H);
      ctx.stroke();
    } else {
      const cell = Math.max(44, Math.min(W, H) / 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.045)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += cell) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
      }
      for (let y = 0; y <= H; y += cell) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
      }
      ctx.stroke();
    }
  }

  function drawRocks() {
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i];
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      const w = r.w;
      const h = r.h;
      const rad = 5;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + rad, -h / 2);
      ctx.lineTo(w / 2 - rad, -h / 2);
      ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rad);
      ctx.lineTo(w / 2, h / 2 - rad);
      ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - rad, h / 2);
      ctx.lineTo(-w / 2 + rad, h / 2);
      ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rad);
      ctx.lineTo(-w / 2, -h / 2 + rad);
      ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rad, -h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCollectibles() {
    for (let i = 0; i < collectibles.length; i++) {
      const c = collectibles[i];
      const pulse = 1 + Math.sin(c.phase) * 0.12;
      ctx.save();
      ctx.shadowColor = theme.accent || '#22d3ee';
      ctx.shadowBlur = 18;
      ctx.fillStyle = theme.accent || '#22d3ee';
      starPath(c.x, c.y, c.r * 1.35 * pulse, c.r * 0.62 * pulse, c.phase * 0.4);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemies() {
    for (let i = 0; i < enemies.length; i++) {
      const foe = enemies[i];
      const angle = Math.atan2(player.y - foe.y, player.x - foe.x);
      ctx.save();
      ctx.translate(foe.x, foe.y);
      ctx.rotate(angle);
      ctx.shadowColor = theme.enemy || '#f87171';
      ctx.shadowBlur = 14;
      ctx.fillStyle = theme.enemy || '#f87171';
      ctx.beginPath();
      ctx.moveTo(foe.r * 1.15, 0);
      ctx.lineTo(-foe.r * 0.8, foe.r * 0.78);
      ctx.lineTo(-foe.r * 0.8, -foe.r * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.arc(foe.x + Math.cos(angle) * foe.r * 0.15, foe.y + Math.sin(angle) * foe.r * 0.15, foe.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBullets() {
    if (!bullets.length) return;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const blinking = player.iframe > 0 && Math.floor(player.iframe * 12) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blinking ? 0.55 : 1;
    ctx.shadowColor = theme.player || '#7c5cff';
    ctx.shadowBlur = 22;
    ctx.fillStyle = theme.player || '#7c5cff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, player.r * 0.22);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
      player.x + Math.cos(player.dir) * player.r * 1.5,
      player.y + Math.sin(player.dir) * player.r * 1.5
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground();
    drawRocks();
    drawCollectibles();
    drawEnemies();
    drawBullets();
    drawPlayer();
    drawVignette();
  }

  function frame(ts) {
    if (!alive) return;
    const now = ts || performance.now();
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    step(dt);
    draw();
    if (loopOn) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!alive) return;
    if (!state.started) reset();
    if (loopOn) return;
    loopOn = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    loopOn = false;
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
    stop();
    reset();
    start();
  }

  function destroy() {
    alive = false;
    stop();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    if (ro) ro.disconnect();
    window.removeEventListener('resize', resize);
  }

  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(function () {
      resize();
    });
    ro.observe(canvas.parentElement || canvas);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  resize();
  reset();
  draw();

  return {
    start: start,
    stop: stop,
    pause: pause,
    resume: resume,
    restart: restart,
    destroy: destroy,
    state: state
  };
}
