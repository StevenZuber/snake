(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const msgEl = document.getElementById("message");
  const ptsEl = document.getElementById("pts");
  const bestEl = document.getElementById("best");
  const newBestEl = document.getElementById("new-best");
  const pauseBadge = document.getElementById("pause-badge");
  const controls = document.getElementById("controls");

  // --- Constants ---
  const CELL = 20;
  const SNAKE_COLOR = "#0fffab";
  const FOOD_COLOR = "#e94560";
  const BG_COLOR = "#16213e";

  // --- Sizing ---
  let cols, rows;

  function resize() {
    const maxW = Math.min(window.innerWidth - 24, 400);
    const maxH = Math.min(window.innerHeight - 200, 400);
    cols = Math.floor(maxW / CELL);
    rows = Math.floor(maxH / CELL);
    canvas.width = cols * CELL;
    canvas.height = rows * CELL;
  }
  resize();

  // Show d-pad on touch devices
  if ("ontouchstart" in window) {
    controls.style.display = "block";
  }

  // --- Game state ---
  let snake, dir, nextDir, food, score, highScore, speed;
  let alive, started, paused, loopId;
  let shakeFrames = 0;
  let particles = [];
  let animFrame = 0;
  let isNewBest = false;

  highScore = parseInt(localStorage.getItem("snake-hi") || "0", 10);
  bestEl.textContent = highScore;

  function init() {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    speed = 130;
    alive = true;
    paused = false;
    particles = [];
    shakeFrames = 0;
    isNewBest = false;
    newBestEl.style.display = "none";
    ptsEl.textContent = "0";
    placeFood();
  }

  function placeFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows),
      };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  // --- Particles ---
  function spawnParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      const spd = 1.5 + Math.random() * 2;
      particles.push({
        x: x * CELL + CELL / 2,
        y: y * CELL + CELL / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1,
        decay: 0.03 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? FOOD_COLOR : SNAKE_COLOR,
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Screen shake ---
  function applyShake() {
    if (shakeFrames > 0) {
      const intensity = shakeFrames * 1.2;
      const sx = (Math.random() - 0.5) * intensity;
      const sy = (Math.random() - 0.5) * intensity;
      ctx.translate(sx, sy);
      shakeFrames--;
    }
  }

  // --- Update ---
  function tick() {
    if (!alive) return;
    if (paused) {
      loopId = setTimeout(tick, speed);
      return;
    }

    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
      return die();
    }
    // Self collision
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      return die();
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      ptsEl.textContent = score;
      spawnParticles(food.x, food.y);

      if (score > highScore) {
        highScore = score;
        bestEl.textContent = highScore;
        localStorage.setItem("snake-hi", String(highScore));
        if (!isNewBest) {
          isNewBest = true;
          newBestEl.style.display = "inline";
        }
      }
      placeFood();
      if (speed > 60) speed -= 2;
    } else {
      snake.pop();
    }

    animFrame++;
    updateParticles();
    draw();
    loopId = setTimeout(tick, speed);
  }

  function die() {
    alive = false;
    shakeFrames = 8;
    draw();
    const bestLine = isNewBest ? "<br><span style='color:#ffd700;font-weight:700'>New High Score!</span>" : "";
    msgEl.innerHTML = `<h2>Game Over</h2><p>Score: ${score}${bestLine}<br>Tap or press any key to restart</p>`;
    msgEl.style.display = "block";
  }

  // --- Draw ---
  function draw() {
    ctx.save();
    applyShake();

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(canvas.width, y * CELL);
      ctx.stroke();
    }

    // Food — pulsing glow
    const pulse = Math.sin(animFrame * 0.15) * 0.3 + 0.7;
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    const baseR = CELL / 2 - 2;

    // Glow
    const glow = ctx.createRadialGradient(fx, fy, baseR * 0.3, fx, fy, baseR * 2.5);
    glow.addColorStop(0, `rgba(233, 69, 96, ${0.4 * pulse})`);
    glow.addColorStop(1, "rgba(233, 69, 96, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(fx - baseR * 3, fy - baseR * 3, baseR * 6, baseR * 6);

    // Food circle
    ctx.fillStyle = FOOD_COLOR;
    ctx.beginPath();
    ctx.arc(fx, fy, baseR * (0.85 + pulse * 0.15), 0, Math.PI * 2);
    ctx.fill();

    // Food shine
    ctx.fillStyle = `rgba(255, 255, 255, ${0.25 * pulse})`;
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2, baseR * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Snake — smooth rounded segments with connectors
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const t = i / Math.max(snake.length, 1);
      const alpha = 1 - t * 0.55;
      const r = 15;
      const g = 255;
      const b = 171;

      if (i === 0) {
        // Head — slightly larger, fully opaque
        ctx.fillStyle = SNAKE_COLOR;
        const pad = 1;
        roundRect(
          ctx,
          seg.x * CELL + pad,
          seg.y * CELL + pad,
          CELL - pad * 2,
          CELL - pad * 2,
          5
        );
        ctx.fill();

        // Eyes
        ctx.fillStyle = BG_COLOR;
        const er = 2.5;
        const ecx = seg.x * CELL + CELL / 2;
        const ecy = seg.y * CELL + CELL / 2;
        let e1x, e1y, e2x, e2y;
        if (dir.x === 1) {
          e1x = ecx + 4; e1y = ecy - 4; e2x = ecx + 4; e2y = ecy + 4;
        } else if (dir.x === -1) {
          e1x = ecx - 4; e1y = ecy - 4; e2x = ecx - 4; e2y = ecy + 4;
        } else if (dir.y === -1) {
          e1x = ecx - 4; e1y = ecy - 4; e2x = ecx + 4; e2y = ecy - 4;
        } else {
          e1x = ecx - 4; e1y = ecy + 4; e2x = ecx + 4; e2y = ecy + 4;
        }
        ctx.beginPath(); ctx.arc(e1x, e1y, er, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e2x, e2y, er, 0, Math.PI * 2); ctx.fill();
      } else {
        // Body segment
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        const pad = 2;
        roundRect(
          ctx,
          seg.x * CELL + pad,
          seg.y * CELL + pad,
          CELL - pad * 2,
          CELL - pad * 2,
          4
        );
        ctx.fill();

        // Connector between segments
        const prev = snake[i - 1];
        const dx = prev.x - seg.x;
        const dy = prev.y - seg.y;
        if (Math.abs(dx) + Math.abs(dy) === 1) {
          const prevAlpha = 1 - ((i - 1) / Math.max(snake.length, 1)) * 0.55;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha + prevAlpha) / 2})`;
          const connPad = 3;
          if (dx !== 0) {
            // Horizontal connector
            const cx = Math.min(seg.x, prev.x) * CELL + CELL - connPad;
            ctx.fillRect(cx, seg.y * CELL + connPad, connPad * 2, CELL - connPad * 2);
          } else {
            // Vertical connector
            const cy = Math.min(seg.y, prev.y) * CELL + CELL - connPad;
            ctx.fillRect(seg.x * CELL + connPad, cy, CELL - connPad * 2, connPad * 2);
          }
        }
      }
    }

    // Particles
    drawParticles();

    // Death overlay
    if (!alive) {
      ctx.fillStyle = "rgba(233, 69, 96, 0.3)";
      ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
    }

    // Pause dim
    if (paused) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // --- Input ---
  function setDir(x, y) {
    if (dir.x === -x && dir.y === -y) return;
    nextDir = { x, y };
  }

  function togglePause() {
    if (!alive || !started) return;
    paused = !paused;
    pauseBadge.style.display = paused ? "block" : "none";
    if (paused) draw();
  }

  function startOrRestart() {
    if (paused) {
      togglePause();
      return;
    }
    if (!started || !alive) {
      started = true;
      msgEl.style.display = "none";
      clearTimeout(loopId);
      init();
      draw();
      loopId = setTimeout(tick, speed);
    }
  }

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Escape") {
      e.preventDefault();
      if (!started || !alive) {
        startOrRestart();
      } else {
        togglePause();
      }
      return;
    }
    switch (e.key) {
      case "ArrowUp":    case "w": e.preventDefault(); setDir(0, -1); break;
      case "ArrowDown":  case "s": e.preventDefault(); setDir(0, 1);  break;
      case "ArrowLeft":  case "a": e.preventDefault(); setDir(-1, 0); break;
      case "ArrowRight": case "d": e.preventDefault(); setDir(1, 0);  break;
      default: return;
    }
    startOrRestart();
  });

  // Swipe detection
  let touchStartX, touchStartY;
  document.addEventListener("touchstart", (e) => {
    if (e.target.closest("#controls")) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    if (e.target.closest("#controls")) return;
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 20) {
      // Tap — start/restart or pause
      if (started && alive) {
        togglePause();
      } else {
        startOrRestart();
      }
      return;
    }

    if (absDx > absDy) {
      setDir(dx > 0 ? 1 : -1, 0);
    } else {
      setDir(0, dy > 0 ? 1 : -1);
    }
    startOrRestart();
  }, { passive: true });

  // D-pad buttons
  document.getElementById("btn-up").addEventListener("click",    () => { setDir(0, -1); startOrRestart(); });
  document.getElementById("btn-down").addEventListener("click",  () => { setDir(0, 1);  startOrRestart(); });
  document.getElementById("btn-left").addEventListener("click",  () => { setDir(-1, 0); startOrRestart(); });
  document.getElementById("btn-right").addEventListener("click", () => { setDir(1, 0);  startOrRestart(); });

  // Handle resize
  window.addEventListener("resize", () => {
    resize();
    if (started) {
      snake = snake.filter((s) => s.x < cols && s.y < rows);
      if (snake.length === 0) init();
      if (food.x >= cols || food.y >= rows) placeFood();
      draw();
    }
  });

  // Animation loop for particles and food pulse when idle
  function animate() {
    if (alive && !paused && started) {
      // Tick handles drawing during gameplay
    } else if (started && paused) {
      animFrame++;
      updateParticles();
      draw();
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // Draw empty board on load (no snake/food visible until game starts)
  function drawEmpty() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(canvas.width, y * CELL);
      ctx.stroke();
    }
  }
  drawEmpty();
})();
