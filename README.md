const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const cashEl = document.getElementById('cash');
const heatEl = document.getElementById('heat');
const hpEl = document.getElementById('hp');
const missionTextEl = document.getElementById('missionText');
const startBtn = document.getElementById('startBtn');
const toastEl = document.getElementById('toast');

const world = {
  width: 2000,
  height: 1500,
};

const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  boost: false,
};

let gameRunning = false;
let lastTime = 0;
let missionTimer = 0;
let currentMission = 0;
let cash = 0;
let heat = 0;
let playerHP = 100;
let bestScore = 0;

const player = {
  x: 270,
  y: 840,
  radius: 18,
  speed: 200,
  boostSpeed: 340,
  angle: 0,
  inCar: false,
  carId: null,
};

const parkedCars = [
  { x: 400, y: 1010, w: 56, h: 102, color: '#ff7e54', id: 'car_1' },
  { x: 820, y: 960, w: 56, h: 102, color: '#63d0ff', id: 'car_2' },
  { x: 1150, y: 1160, w: 56, h: 102, color: '#ffd166', id: 'car_3' },
  { x: 1500, y: 930, w: 56, h: 102, color: '#72f0a6', id: 'car_4' },
  { x: 930, y: 720, w: 56, h: 102, color: '#d57aff', id: 'car_5' },
  { x: 1470, y: 680, w: 56, h: 102, color: '#7ab2ff', id: 'car_6' },
];

const missionTargets = [
  { x: 520, y: 1180, label: 'Get package', reward: 120 },
  { x: 1500, y: 710, label: 'Hit the safehouse', reward: 220 },
  { x: 980, y: 300, label: 'Escape the zone', reward: 350 },
];

const police = [
  { x: 1630, y: 390, radius: 16, color: '#ff6a74', speed: 170 },
  { x: 1530, y: 1090, radius: 16, color: '#ff6a74', speed: 190 },
  { x: 700, y: 460, radius: 16, color: '#ff6a74', speed: 180 },
];

const npcs = [
  { x: 640, y: 820, name: 'Nova', color: '#82d8ff' },
  { x: 1220, y: 850, name: 'Rift', color: '#ffd43d' },
  { x: 1050, y: 1260, name: 'Zey', color: '#7af0b0' },
];

let missionTarget = null;
let lastMessage = '';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 1400);
}

function resetGame() {
  cash = 0;
  heat = 0;
  playerHP = 100;
  currentMission = 0;
  player.x = 270;
  player.y = 840;
  player.inCar = false;
  player.carId = null;
  missionTarget = { ...missionTargets[0] };
  updateHud();
  showToast('Mission started');
}

function startGame() {
  if (!gameRunning) {
    gameRunning = true;
    resetGame();
    lastTime = 0;
    requestAnimationFrame(loop);
  }
}

function updateHud() {
  cashEl.textContent = `$${cash}`;
  heatEl.textContent = String(heat);
  hpEl.textContent = String(Math.max(0, Math.round(playerHP)));
  missionTextEl.textContent = missionTarget ? missionTarget.label : 'Escape';
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function tryEnterCar() {
  const nearbyCar = parkedCars.find((car) => Math.hypot(player.x - car.x, player.y - car.y) < 70);
  if (!nearbyCar) {
    if (player.inCar) {
      player.inCar = false;
      player.carId = null;
      showToast('Exited vehicle');
      return;
    }
    showToast('No car nearby');
    return;
  }

  if (!player.inCar) {
    player.inCar = true;
    player.carId = nearbyCar.id;
    showToast('Vehicle acquired');
  } else {
    player.inCar = false;
    player.carId = null;
    showToast('Exited vehicle');
  }
}

function movePlayer(dt) {
  let moveX = 0;
  let moveY = 0;

  if (keys.left) moveX -= 1;
  if (keys.right) moveX += 1;
  if (keys.up) moveY -= 1;
  if (keys.down) moveY += 1;

  const len = Math.hypot(moveX, moveY) || 1;
  moveX /= len;
  moveY /= len;

  let speed = player.speed;
  if (keys.boost) speed *= 1.35;

  if (player.inCar) {
    speed *= 1.5;
  }

  player.x += moveX * speed * dt;
  player.y += moveY * speed * dt;

  if (moveX || moveY) {
    player.angle = Math.atan2(moveY, moveX);
  }

  player.x = clamp(player.x, 26, world.width - 26);
  player.y = clamp(player.y, 26, world.height - 26);
}

function updatePolice(dt) {
  police.forEach((cop) => {
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const d = Math.hypot(dx, dy) || 1;

    if (d < 260) {
      cop.x += (dx / d) * cop.speed * dt;
      cop.y += (dy / d) * cop.speed * dt;
      if (d < 28) {
        playerHP -= 15 * dt;
        heat = clamp(heat + 4 * dt, 0, 5);
      }
    } else {
      cop.x += Math.sin((performance.now() / 600) + cop.x) * 0.5;
      cop.y += Math.cos((performance.now() / 700) + cop.y) * 0.5;
    }

    cop.x = clamp(cop.x, 20, world.width - 20);
    cop.y = clamp(cop.y, 20, world.height - 20);
  });

  if (heat > 0) {
    heat = Math.max(0, heat - 0.2 * dt);
  }
}

function updateMission(dt) {
  const target = missionTargets[currentMission];
  if (!target) return;

  const d = distance(player, target);
  if (d < 52) {
    cash += target.reward;
    heat = clamp(heat + 1, 0, 5);
    currentMission += 1;

    if (currentMission < missionTargets.length) {
      missionTarget = { ...missionTargets[currentMission] };
      showToast('Mission complete! Next target');
    } else {
      missionTarget = { x: 230, y: 880, label: 'Escape city', reward: 500 };
      showToast('Final objective reached');
      bestScore = Math.max(bestScore, cash);
      gameRunning = false;
      startBtn.textContent = 'Play Again';
      showToast('You won the district!');
    }
  }

  if (currentMission >= missionTargets.length && distance(player, { x: 230, y: 880 }) < 70) {
    startBtn.textContent = 'Play Again';
    showToast('Escape successful');
    gameRunning = false;
  }

  updateHud();
}

function drawRoads() {
  const roads = [
    { x: 0, y: 360, w: 2000, h: 140 },
    { x: 0, y: 980, w: 2000, h: 120 },
    { x: 450, y: 0, w: 150, h: 1500 },
    { x: 1090, y: 0, w: 150, h: 1500 },
    { x: 1620, y: 0, w: 160, h: 1500 },
  ];

  ctx.fillStyle = '#1e2e41';
  roads.forEach((road) => {
    ctx.fillRect(road.x, road.y, road.w, road.h);
  });

  ctx.strokeStyle = '#f8d57e';
  ctx.lineWidth = 4;
  ctx.setLineDash([22, 18]);
  roads.forEach((road) => {
    if (road.w > road.h) {
      for (let x = 40; x < road.w; x += 80) {
        ctx.beginPath();
        ctx.moveTo(road.x + x, road.y + road.h / 2);
        ctx.lineTo(road.x + x + 30, road.y + road.h / 2);
        ctx.stroke();
      }
    } else {
      for (let y = 30; y < road.h; y += 80) {
        ctx.beginPath();
        ctx.moveTo(road.x + road.w / 2, road.y + y);
        ctx.lineTo(road.x + road.w / 2, road.y + y + 30);
        ctx.stroke();
      }
    }
  });
  ctx.setLineDash([]);
}

function drawBuildings() {
  const blocks = [
    { x: 100, y: 80, w: 220, h: 200 },
    { x: 210, y: 540, w: 180, h: 180 },
    { x: 620, y: 120, w: 250, h: 180 },
    { x: 760, y: 620, w: 220, h: 210 },
    { x: 1280, y: 120, w: 240, h: 180 },
    { x: 1320, y: 600, w: 260, h: 210 },
    { x: 100, y: 1150, w: 280, h: 200 },
    { x: 720, y: 1160, w: 260, h: 170 },
    { x: 1720, y: 1160, w: 200, h: 200 },
  ];

  ctx.fillStyle = '#172a3e';
  blocks.forEach((b) => {
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#2a496f';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  });
}

function drawMiniMap() {
  const mapX = canvas.width - 120;
  const mapY = 20;
  const mapW = 90;
  const mapH = 90;

  ctx.fillStyle = 'rgba(10, 19, 29, 0.8)';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = '#6dd6ff';
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  const px = mapX + (player.x / world.width) * mapW;
  const py = mapY + (player.y / world.height) * mapH;

  ctx.fillStyle = '#f7c86c';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMissionMarker() {
  if (!missionTarget) return;

  const x = missionTarget.x - player.x + canvas.width / 2;
  const y = missionTarget.y - player.y + canvas.height / 2;

  ctx.fillStyle = '#72f0a6';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dffff1';
  ctx.stroke();

  ctx.fillStyle = '#edf7ff';
  ctx.font = '12px Arial';
  ctx.fillText(missionTarget.label, x + 18, y + 4);
}

function drawPlayer() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const screenX = player.x - (player.x - centerX);
  const screenY = player.y - (player.y - centerY);

  const vx = player.x - centerX;
  const vy = player.y - centerY;
  const drawX = centerX + vx;
  const drawY = centerY + vy;

  if (player.inCar) {
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#ff7e54';
    ctx.fillRect(-22, -14, 44, 28);
    ctx.fillStyle = '#dcecff';
    ctx.fillRect(-10, -3, 20, 7);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#63d9ff';
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#efdb7b';
    ctx.fillRect(-4, -4, 8, 18);
    ctx.restore();
  }
}

function drawCars() {
  parkedCars.forEach((car) => {
    const sx = car.x - player.x + canvas.width / 2;
    const sy = car.y - player.y + canvas.height / 2;
    ctx.fillStyle = car.color;
    ctx.fillRect(sx - 28, sy - 14, 56, 28);
  });

  npcs.forEach((npc) => {
    const sx = npc.x - player.x + canvas.width / 2;
    const sy = npc.y - player.y + canvas.height / 2;
    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dcecff';
    ctx.font = '10px Arial';
    ctx.fillText(npc.name, sx + 12, sy + 4);
  });
}

function drawPolice() {
  police.forEach((cop) => {
    const sx = cop.x - player.x + canvas.width / 2;
    const sy = cop.y - player.y + canvas.height / 2;
    ctx.fillStyle = '#ff6a74';
    ctx.beginPath();
    ctx.arc(sx, sy, cop.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0d1826';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);
  drawRoads();
  drawBuildings();
  drawCars();
  drawPolice();
  if (missionTarget) {
    const markerX = missionTarget.x;
    const markerY = missionTarget.y;
    ctx.fillStyle = '#72f0a6';
    ctx.beginPath();
    ctx.arc(markerX, markerY, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawPlayer();
  drawMiniMap();
  drawMissionMarker();
}

function loop(timestamp) {
  if (!gameRunning) return;

  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.03);
  lastTime = timestamp;

  movePlayer(dt);
  updatePolice(dt);
  updateMission(dt);

  if (playerHP <= 0) {
    playerHP = 0;
    gameRunning = false;
    startBtn.textContent = 'Try Again';
    showToast('You were busted');
  }

  updateHud();
  drawWorld();
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
  if (event.code === 'Space') {
    event.preventDefault();
  }
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
  gameRunning = true;
  resetGame();
  lastTime = 0;
  requestAnimationFrame(loop);
});

resetGame();
updateHud();
drawWorld();
