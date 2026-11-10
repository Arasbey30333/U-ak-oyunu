const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const cashEl = document.getElementById('cash');
const heatEl = document.getElementById('heat');
const hpEl = document.getElementById('hp');
const missionTextEl = document.getElementById('missionText');
const startBtn = document.getElementById('startBtn');
const toastEl = document.getElementById('toast');

const WORLD = { width: 1800, height: 1200 };
const keys = { up: false, down: false, left: false, right: false, boost: false };

let gameRunning = false;
let lastTime = 0;
let cash = 0;
let heat = 0;
let hp = 100;
let missionIndex = 0;
let currentMission = null;
let missionToastTimer = 0;
let stars = [];

const player = {
  x: 180,
  y: 340,
  radius: 16,
  speed: 220,
  boost: 340,
  angle: 0,
  inCar: false,
};

const cars = [
  { x: 420, y: 920, w: 58, h: 104, color: '#ff8a65', id: 'car1' },
  { x: 820, y: 840, w: 58, h: 104, color: '#63d7ff', id: 'car2' },
  { x: 1180, y: 980, w: 58, h: 104, color: '#ffd166', id: 'car3' },
  { x: 1420, y: 660, w: 58, h: 104, color: '#8ee7a2', id: 'car4' }
];

const missions = [
  { x: 560, y: 1030, label: 'Find Package', reward: 130 },
  { x: 1460, y: 650, label: 'Hack the lockup', reward: 220 },
  { x: 1200, y: 240, label: 'Beat the zone', reward: 350 },
  { x: 200, y: 260, label: 'Escape city', reward: 500 }
];

const police = [
  { x: 1380, y: 300, r: 15, color: '#ff6d75', speed: 150 },
  { x: 990, y: 910, r: 15, color: '#ff6d75', speed: 165 },
  { x: 620, y: 520, r: 15, color: '#ff6d75', speed: 170 }
];

const npcs = [
  { x: 540, y: 760, name: 'Nova', color: '#82d8ff' },
  { x: 860, y: 990, name: 'Zey', color: '#96ffb1' },
  { x: 1300, y: 760, name: 'Rift', color: '#ffd76e' }
];

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(missionToastTimer);
  missionToastTimer = setTimeout(() => toastEl.classList.remove('show'), 1500);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateStars() {
  stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2.2 + 0.5,
    speed: Math.random() * 0.3 + 0.15,
    alpha: Math.random() * 0.7 + 0.25,
  }));
}

function updateStars(dt) {
  stars.forEach((star) => {
    star.y += star.speed * 60 * dt;
    if (star.y > canvas.height + 2) {
      star.y = -4;
      star.x = Math.random() * canvas.width;
    }
  });
}

function drawStars() {
  stars.forEach((star) => {
    ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateHud() {
  cashEl.textContent = '$' + cash;
  heatEl.textContent = String(Math.round(heat));
  hpEl.textContent = String(Math.max(0, Math.round(hp)));
  missionTextEl.textContent = currentMission ? currentMission.label : 'Find Package';
}

function resetGame() {
  cash = 0;
  heat = 0;
  hp = 100;
  missionIndex = 0;
  currentMission = missions[0];
  player.x = 180;
  player.y = 340;
  player.inCar = false;
  player.angle = 0;
  updateHud();
  showToast('Mission started');
}

function startGame() {
  gameRunning = true;
  resetGame();
  lastTime = 0;
  requestAnimationFrame(loop);
}

function tryEnterCar() {
  const nearby = cars.find((car) => Math.hypot(player.x - car.x, player.y - car.y) < 70);
  if (!nearby) {
    if (player.inCar) {
      player.inCar = false;
      showToast('Exited vehicle');
    } else {
      showToast('No car nearby');
    }
    return;
  }

  player.inCar = !player.inCar;
  showToast(player.inCar ? 'Vehicle acquired' : 'Exited vehicle');
}

function movePlayer(dt) {
  let moveX = 0;
  let moveY = 0;

  if (keys.left) moveX -= 1;
  if (keys.right) moveX += 1;
  if (keys.up) moveY -= 1;
  if (keys.down) moveY += 1;

  if (moveX || moveY) {
    const len = Math.hypot(moveX, moveY) || 1;
    moveX /= len;
    moveY /= len;
    const speed = keys.boost ? player.boost : player.speed;
    const finalSpeed = player.inCar ? speed * 1.4 : speed;
    player.x += moveX * finalSpeed * dt;
    player.y += moveY * finalSpeed * dt;
    player.angle = Math.atan2(moveY, moveX);
  }

  player.x = clamp(player.x, 26, WORLD.width - 26);
  player.y = clamp(player.y, 26, WORLD.height - 26);
}

function updatePolice(dt) {
  police.forEach((cop) => {
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < 260) {
      cop.x += (dx / dist) * cop.speed * dt;
      cop.y += (dy / dist) * cop.speed * dt;

      if (dist < 30) {
        hp -= 18 * dt;
        heat = clamp(heat + 2.5 * dt, 0, 5);
      }
    } else {
      cop.x += Math.sin((performance.now() + cop.x * 4) / 800) * 0.6;
      cop.y += Math.cos((performance.now() + cop.y * 3) / 900) * 0.6;
    }

    cop.x = clamp(cop.x, 20, WORLD.width - 20);
    cop.y = clamp(cop.y, 20, WORLD.height - 20);
  });

  heat = Math.max(0, heat - 0.18 * dt);
}

function checkMission() {
  if (!currentMission) return;

  const d = Math.hypot(player.x - currentMission.x, player.y - currentMission.y);
  if (d < 55) {
    cash += currentMission.reward;
    heat = clamp(heat + 1, 0, 5);
    missionIndex += 1;

    if (missionIndex < missions.length) {
      currentMission = missions[missionIndex];
      showToast('Mission complete!');
    } else {
      currentMission = { x: 180, y: 340, label: 'Escape city', reward: 600 };
      showToast('Final objective');
    }

    if (missionIndex >= missions.length && Math.hypot(player.x - 180, player.y - 340) < 80) {
      gameRunning = false;
      startBtn.textContent = 'Play Again';
      showToast('You escaped the district');
    }
  }

  updateHud();
}

function drawCity() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();

  ctx.save();
  ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);

  ctx.fillStyle = '#1b2d42';
  const roads = [
    { x: 0, y: 290, w: 1800, h: 110 },
    { x: 0, y: 820, w: 1800, h: 110 },
    { x: 430, y: 0, w: 120, h: 1200 },
    { x: 1040, y: 0, w: 120, h: 1200 },
    { x: 1500, y: 0, w: 120, h: 1200 }
  ];

  roads.forEach((r) => {
    ctx.fillRect(r.x, r.y, r.w, r.h);
  });

  ctx.strokeStyle = '#e7d27b';
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 18]);
  roads.forEach((r) => {
    if (r.w > r.h) {
      for (let x = 30; x < r.w; x += 70) {
        ctx.beginPath();
        ctx.moveTo(r.x + x, r.y + r.h / 2);
        ctx.lineTo(r.x + x + 20, r.y + r.h / 2);
        ctx.stroke();
      }
    } else {
      for (let y = 24; y < r.h; y += 75) {
        ctx.beginPath();
        ctx.moveTo(r.x + r.w / 2, r.y + y);
        ctx.lineTo(r.x + r.w / 2, r.y + y + 22);
        ctx.stroke();
      }
    }
  });
  ctx.setLineDash([]);

  const buildings = [
    { x: 80, y: 70, w: 200, h: 190 },
    { x: 210, y: 520, w: 180, h: 180 },
    { x: 620, y: 90, w: 240, h: 160 },
    { x: 720, y: 570, w: 220, h: 180 },
    { x: 1280, y: 120, w: 220, h: 180 },
    { x: 1320, y: 560, w: 250, h: 210 },
    { x: 70, y: 980, w: 260, h: 180 },
    { x: 710, y: 980, w: 260, h: 170 },
    { x: 1640, y: 980, w: 120, h: 160 }
  ];

  ctx.fillStyle = '#162b40';
  buildings.forEach((b) => {
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#2e4d6a';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  });

  if (currentMission) {
    ctx.fillStyle = '#72f0a6';
    ctx.beginPath();
    ctx.arc(currentMission.x, currentMission.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#edf7ff';
    ctx.font = '12px Arial';
    ctx.fillText(currentMission.label, currentMission.x + 18, currentMission.y + 4);
  }

  cars.forEach((car) => {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x - 28, car.y - 18, 56, 36);
  });

  npcs.forEach((npc) => {
    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eaf1ff';
    ctx.font = '10px Arial';
    ctx.fillText(npc.name, npc.x + 14, npc.y + 4);
  });

  police.forEach((cop) => {
    ctx.fillStyle = cop.color;
    ctx.beginPath();
    ctx.arc(cop.x, cop.y, cop.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(player.angle);

  if (player.inCar) {
    ctx.fillStyle = '#ff8a65';
    ctx.fillRect(-22, -14, 44, 28);
    ctx.fillStyle = '#dfe9ff';
    ctx.fillRect(-10, -4, 20, 8);
  } else {
    ctx.fillStyle = '#67dcff';
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7d36e';
    ctx.fillRect(-4, -4, 8, 18);
  }

  ctx.restore();

  const mapX = canvas.width - 115;
  const mapY = 18;
  const mapW = 90;
  const mapH = 90;
  ctx.fillStyle = 'rgba(10, 20, 30, 0.8)';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = '#6ed8ff';
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  const px = mapX + (player.x / WORLD.width) * mapW;
  const py = mapY + (player.y / WORLD.height) * mapH;
  ctx.fillStyle = '#f7c86c';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
}

function loop(timestamp) {
  if (!gameRunning) return;

  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  updateStars(dt);
  movePlayer(dt);
  updatePolice(dt);
  checkMission();

  if (hp <= 0) {
    hp = 0;
    gameRunning = false;
    startBtn.textContent = 'Try Again';
    showToast('Busted by police');
  }

  drawCity();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (event.key === 'ArrowLeft' || key === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || key === 'd') keys.right = true;
  if (event.key === 'ArrowUp' || key === 'w') keys.up = true;
  if (event.key === 'ArrowDown' || key === 's') keys.down = true;
  if (key === 'shift') keys.boost = true;
  if (key === 'e') tryEnterCar();
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();

  if (event.key === 'ArrowLeft' || key === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || key === 'd') keys.right = false;
  if (event.key === 'ArrowUp' || key === 'w') keys.up = false;
  if (event.key === 'ArrowDown' || key === 's') keys.down = false;
  if (key === 'shift') keys.boost = false;
});

startBtn.addEventListener('click', () => {
  startBtn.textContent = 'Restart Mission';
  startGame();
});

generateStars();
updateHud();
currentMission = missions[0];
drawCity();
