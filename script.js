'use strict';

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas?.getContext('2d');
  const byId = (id) => document.getElementById(id);
  if (!canvas || !ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const WORLD = { width: 1800, height: 1200 };
  const keys = { up: false, down: false, left: false, right: false, boost: false };
  const initialCops = [
    { x: 1380, y: 300, radius: 14, speed: 105 },
    { x: 990, y: 910, radius: 14, speed: 115 },
    { x: 620, y: 520, radius: 14, speed: 120 },
  ];
  const missions = [
    { x: 560, y: 1030, label: 'Paket noktasına git', reward: 130 },
    { x: 1460, y: 650, label: 'Güvenli eve ulaş', reward: 220 },
    { x: 1200, y: 240, label: 'Şehir çıkışına git', reward: 350 },
  ];
  const buildings = [
    {x:70,y:65,w:225,h:180},{x:620,y:70,w:250,h:175},{x:1245,y:65,w:210,h:180},{x:1655,y:70,w:100,h:175},
    {x:205,y:515,w:190,h:185},{x:700,y:545,w:225,h:190},{x:1260,y:535,w:255,h:205},{x:80,y:985,w:250,h:175},
    {x:700,y:980,w:270,h:175},{x:1660,y:975,w:105,h:185},{x:620,y:250,w:90,h:60},{x:1040,y:530,w:100,h:65},
  ];
  const roads = [
    { x: 0, y: 285, w: WORLD.width, h: 115 },
    { x: 0, y: 815, w: WORLD.width, h: 115 },
    { x: 430, y: 0, w: 120, h: WORLD.height },
    { x: 1035, y: 0, w: 120, h: WORLD.height },
    { x: 1515, y: 0, w: 120, h: WORLD.height },
  ];
  const cars = [
    { x: 420, y: 735, color: '#ff8b67' },
    { x: 820, y: 460, color: '#65d8ff' },
    { x: 1190, y: 1000, color: '#ffd166' },
    { x: 1450, y: 455, color: '#7de5a6' },
  ];
  const npcs = [
    { x: 580, y: 720, name: 'Nova', color: '#89dcff' },
    { x: 900, y: 1000, name: 'Zey', color: '#a0f0b5' },
    { x: 1340, y: 760, name: 'Rift', color: '#ffd679' },
  ];
  const player = { x: 180, y: 340, angle: -Math.PI / 2, radius: 13, speed: 205, inCar: false };
  let cops = [];
  let stars = [];
  let running = false;
  let raf = 0;
  let lastTime = 0;
  let cash = 0;
  let hp = 100;
  let heat = 0;
  let missionIndex = 0;
  let toastTimer = 0;

  function makeStars() {
    stars = Array.from({ length: 95 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.35,
      a: Math.random() * 0.55 + 0.15,
      speed: Math.random() * 7 + 4,
    }));
  }

  function showToast(message) {
    const toast = byId('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1700);
  }

  function currentMission() {
    return missions[missionIndex] || null;
  }

  function updateHud() {
    byId('cash').textContent = `$${cash}`;
    byId('heat').textContent = `${Math.max(0, Math.min(5, Math.round(heat)))} / 5`;
    byId('hp').textContent = String(Math.max(0, Math.round(hp)));
    const mission = currentMission();
    byId('missionText').textContent = mission ? mission.label : 'Görev tamamlandı';
  }

  function resetGame() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    cash = 0;
    hp = 100;
    heat = 0;
    missionIndex = 0;
    player.x = 180;
    player.y = 340;
    player.angle = -Math.PI / 2;
    player.inCar = false;
    cops = initialCops.map((cop) => ({ ...cop }));
    makeStars();
    updateHud();
    draw();
  }

  function startGame() {
    if (running) return;
    running = true;
    lastTime = 0;
    byId('screenMessage').classList.add('hidden');
    byId('startBtn').innerHTML = 'GÖREVİ BAŞLAT <span>→</span>';
    raf = requestAnimationFrame(loop);
    canvas.focus({ preventScroll: true });
    showToast('Görev başladı — pakete ulaş!');
  }

  function drawStars() {
    ctx.save();
    for (const star of stars) {
      ctx.globalAlpha = star.a;
      ctx.fillStyle = '#d8f1ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function updateStars(dt) {
    for (const star of stars) {
      star.y += star.speed * dt;
      if (star.y > H) { star.y = -2; star.x = Math.random() * W; }
    }
  }

  function drawGround() {
    ctx.fillStyle = '#10251f';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.strokeStyle = '#183229';
    ctx.lineWidth = 1;
    for (let x = 0; x < WORLD.width; x += 50) {
      for (let y = 0; y < WORLD.height; y += 50) {
        ctx.strokeRect(x, y, 50, 50);
      }
    }
  }

  function drawRoads() {
    for (const road of roads) {
      ctx.fillStyle = '#263443';
      ctx.fillRect(road.x, road.y, road.w, road.h);
      ctx.fillStyle = '#344555';
      if (road.w > road.h) {
        ctx.fillRect(road.x, road.y + 8, road.w, 2);
        ctx.fillRect(road.x, road.y + road.h - 10, road.w, 2);
        ctx.strokeStyle = '#d4bd70'; ctx.lineWidth = 2; ctx.setLineDash([17, 18]);
        ctx.beginPath(); ctx.moveTo(road.x, road.y + road.h / 2); ctx.lineTo(road.x + road.w, road.y + road.h / 2); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.fillRect(road.x + 8, road.y, 2, road.h);
        ctx.fillRect(road.x + road.w - 10, road.y, 2, road.h);
        ctx.strokeStyle = '#d4bd70'; ctx.lineWidth = 2; ctx.setLineDash([17, 18]);
        ctx.beginPath(); ctx.moveTo(road.x + road.w / 2, road.y); ctx.lineTo(road.x + road.w / 2, road.y + road.h); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }

  function drawBuildings() {
    buildings.forEach((b, i) => {
      ctx.fillStyle = '#0a151d'; ctx.fillRect(b.x + 7, b.y + 8, b.w, b.h);
      ctx.fillStyle = i % 2 ? '#263b49' : '#2c3b4a'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#496273'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      ctx.fillStyle = '#456072'; ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 3);
      for (let wx = b.x + 13; wx < b.x + b.w - 8; wx += 23) {
        for (let wy = b.y + 25; wy < b.y + b.h - 12; wy += 24) {
          ctx.fillStyle = ((Math.floor(wx / 23) + Math.floor(wy / 24) + i) % 3 === 0) ? '#d9b866' : '#627d88';
          ctx.fillRect(wx, wy, 8, 5);
        }
      }
    });
  }

  function drawCar(car, isPlayerCar = false) {
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(isPlayerCar ? player.angle : Math.PI / 2);
    ctx.fillStyle = '#071019'; ctx.fillRect(-21, -13, 46, 30);
    ctx.fillStyle = isPlayerCar ? '#ff8b67' : car.color; ctx.fillRect(-23, -15, 46, 30);
    ctx.fillStyle = '#152c3a'; ctx.fillRect(-10, -11, 19, 22);
    ctx.fillStyle = '#b7e7f2'; ctx.fillRect(-8, -9, 14, 5); ctx.fillRect(-8, 4, 14, 5);
    ctx.fillStyle = '#fff0a6'; ctx.fillRect(18, -10, 4, 6); ctx.fillRect(18, 5, 4, 6);
    ctx.restore();
  }

  function drawPerson(x, y, color, name, isCop = false) {
    ctx.save(); ctx.translate(x, y);
    if (isCop) {
      ctx.fillStyle = '#ff5268'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('POL', 0, 3);
      ctx.fillStyle = '#69dfff'; ctx.fillRect(-12, -18, 9, 4); ctx.fillRect(3, -18, 9, 4);
    } else {
      ctx.fillStyle = '#07121b'; ctx.beginPath(); ctx.ellipse(1, 4, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -6, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0d7b6'; ctx.beginPath(); ctx.arc(0, -15, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dce9f0'; ctx.font = '10px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(name, 0, 22);
    }
    ctx.restore();
  }

  function drawMissionMarker() {
    const mission = currentMission();
    if (!mission) return;
    const pulse = 21 + Math.sin(performance.now() / 180) * 4;
    ctx.strokeStyle = '#75f0b1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mission.x, mission.y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#6ee6a5'; ctx.globalAlpha = .3; ctx.beginPath(); ctx.arc(mission.x, mission.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#dfffee'; ctx.font = 'bold 11px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GÖREV', mission.x, mission.y - 31);
  }

  function drawMinimap() {
    const x = W - 132, y = 20, size = 108;
    ctx.fillStyle = '#07131eeF'; ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#6cdcff'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, size, size);
    ctx.fillStyle = '#283b4b';
    roads.forEach((r) => ctx.fillRect(x + r.x / WORLD.width * size, y + r.y / WORLD.height * size, Math.max(2, r.w / WORLD.width * size), Math.max(2, r.h / WORLD.height * size)));
    const mission = currentMission();
    if (mission) { ctx.fillStyle = '#70f0ad'; ctx.beginPath(); ctx.arc(x + mission.x / WORLD.width * size, y + mission.y / WORLD.height * size, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffd36e'; ctx.beginPath(); ctx.arc(x + player.x / WORLD.width * size, y + player.y / WORLD.height * size, 4, 0, Math.PI * 2); ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#081522'); gradient.addColorStop(1, '#10251f');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    drawStars();
    ctx.save(); ctx.translate(W / 2 - player.x, H / 2 - player.y);
    drawGround(); drawRoads(); drawBuildings(); drawMissionMarker();
    cars.forEach((car) => drawCar(car));
    npcs.forEach((npc) => drawPerson(npc.x, npc.y, npc.color, npc.name));
    cops.forEach((cop) => drawPerson(cop.x, cop.y, '#ff637a', '', true));
    ctx.restore();
    if (player.inCar) drawCar({ x: W / 2, y: H / 2 }, true);
    else drawPerson(W / 2, H / 2, '#63dfff', 'KAAN');
    drawMinimap();
  }

  function enterCar() {
    const close = cars.some((car) => Math.hypot(player.x - car.x, player.y - car.y) < 65);
    if (player.inCar || close) {
      player.inCar = !player.inCar;
      showToast(player.inCar ? 'Arabaya bindin — daha hızlısın!' : 'Arabadan indin.');
    } else showToast('Yakında binebileceğin bir araba yok.');
  }

  function movePlayer(dt) {
    let dx = Number(keys.right) - Number(keys.left);
    let dy = Number(keys.down) - Number(keys.up);
    const length = Math.hypot(dx, dy);
    if (!length) return;
    dx /= length; dy /= length;
    player.angle = Math.atan2(dy, dx);
    const speed = (keys.boost ? 310 : player.speed) * (player.inCar ? 1.55 : 1);
    player.x = Math.max(20, Math.min(WORLD.width - 20, player.x + dx * speed * dt));
    player.y = Math.max(20, Math.min(WORLD.height - 20, player.y + dy * speed * dt));
  }

  function updateCops(dt) {
    cops.forEach((cop) => {
      const dx = player.x - cop.x, dy = player.y - cop.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (heat > 0 && distance < 390) {
        cop.x += dx / distance * cop.speed * (1 + heat * .12) * dt;
        cop.y += dy / distance * cop.speed * (1 + heat * .12) * dt;
        if (distance < 28) { hp = Math.max(0, hp - 15 * dt); }
      }
      cop.x = Math.max(15, Math.min(WORLD.width - 15, cop.x));
      cop.y = Math.max(15, Math.min(WORLD.height - 15, cop.y));
    });
    heat = Math.max(0, heat - .035 * dt);
  }

  function updateMission() {
    const mission = currentMission();
    if (!mission || Math.hypot(player.x - mission.x, player.y - mission.y) > 48) return;
    cash += mission.reward;
    heat = Math.min(5, heat + 1);
    missionIndex += 1;
    updateHud();
    if (missionIndex >= missions.length) {
      running = false;
      byId('messageKicker').textContent = 'ŞEHİR SENİN';
      byId('messageTitle').textContent = 'Görev tamamlandı!';
      byId('messageText').textContent = `Harika iş, Kaan. Toplam kazancın $${cash}. Tekrar oynayarak yeni rekor kırabilirsin.`;
      byId('startBtn').innerHTML = 'YENİDEN OYNA <span>↻</span>';
      byId('screenMessage').classList.remove('hidden');
      showToast('Bütün görevler tamamlandı!');
    } else {
      showToast(`Görev tamamlandı! +$${mission.reward}`);
    }
  }

  function loop(timestamp) {
    if (!running) return;
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, .04) : 0;
    lastTime = timestamp;
    updateStars(dt); movePlayer(dt); updateCops(dt); updateMission(); updateHud(); draw();
    if (hp <= 0) {
      running = false;
      byId('messageKicker').textContent = 'GÖREV BAŞARISIZ';
      byId('messageTitle').textContent = 'Polis seni yakaladı';
      byId('messageText').textContent = 'Biraz daha dikkatli sür ve takibi atlat.';
      byId('startBtn').innerHTML = 'TEKRAR DENE <span>↻</span>';
      byId('screenMessage').classList.remove('hidden');
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  function setKey(event, pressed) {
    const key = event.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') keys.up = pressed;
    if (key === 'arrowdown' || key === 's') keys.down = pressed;
    if (key === 'arrowleft' || key === 'a') keys.left = pressed;
    if (key === 'arrowright' || key === 'd') keys.right = pressed;
    if (key === 'shift') keys.boost = pressed;
    if (pressed && key === 'e' && !event.repeat && running) enterCar();
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) event.preventDefault();
  }

  window.addEventListener('keydown', (event) => setKey(event, true));
  window.addEventListener('keyup', (event) => setKey(event, false));
  window.addEventListener('blur', () => Object.keys(keys).forEach((key) => { keys[key] = false; }));
  byId('startBtn').addEventListener('click', () => { if (!running) { resetGame(); startGame(); } });
  byId('restartBtn').addEventListener('click', () => {
    resetGame();
    byId('messageKicker').textContent = 'GECE BAŞLIYOR';
    byId('messageTitle').textContent = 'Şehir seni bekliyor';
    byId('messageText').textContent = 'Paket noktasına ulaş, görevleri tamamla ve polis takibinden kurtul.';
    byId('startBtn').innerHTML = 'ŞEHRİ KEŞFET <span>→</span>';
    byId('screenMessage').classList.remove('hidden');
  });

  makeStars();
  cops = initialCops.map((cop) => ({ ...cop }));
  updateHud();
  draw();
})();
