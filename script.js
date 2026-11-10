const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let gameLoopId = null;
let lastTime = 0;
let spawnTimer = 0;
let animationId = null;
let gameRunning = false;
let gameOver = false;

const keys = {
  left: false,
  right: false,
  shoot: false,
};

const player = {
  x: WIDTH / 2 - 22,
  y: HEIGHT - 70,
  width: 44,
  height: 26,
  speed: 260,
  cooldown: 0,
};

let bullets = [];
let enemies = [];
let stars = [];
let score = 0;
let lives = 3;

function generateStars() {
  stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    radius: Math.random() * 2.1 + 0.8,
    speed: Math.random() * 45 + 30,
  }));
}

function resetGame() {
  score = 0;
  lives = 3;
  bullets = [];
  enemies = [];
  player.x = WIDTH / 2 - player.width / 2;
  player.y = HEIGHT - 70;
  player.cooldown = 0;
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  gameOver = false;
  generateStars();
}

function startGame() {
  if (gameRunning) return;

  resetGame();
  gameRunning = true;
  lastTime = 0;
  spawnTimer = 0;
  gameLoopId = requestAnimationFrame(gameUpdate);
}

function gameOverState() {
  gameRunning = false;
  gameOver = true;
  cancelAnimationFrame(gameLoopId);
  ctx.fillStyle = 'rgba(7, 11, 22, 0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('OYUN BİTTİ', WIDTH / 2, HEIGHT / 2 - 16);
  ctx.font = '22px Arial';
  ctx.fillText(`Skor: ${score}`, WIDTH / 2, HEIGHT / 2 + 22);
  ctx.font = '18px Arial';
  ctx.fillStyle = '#8ec9ff';
  ctx.fillText('Yeniden Başlat butonuna basın', WIDTH / 2, HEIGHT / 2 + 60);
}

function shoot() {
  const bullet = {
    x: player.x + player.width / 2 - 2,
    y: player.y - 12,
    width: 4,
    height: 14,
    speed: 420,
  };
  bullets.push(bullet);
}

function spawnEnemy() {
  const size = 28 + Math.random() * 18;
  const enemy = {
    x: Math.random() * (WIDTH - size),
    y: -size,
    width: size,
    height: size,
    speed: 120 + Math.random() * 60,
    drift: (Math.random() - 0.5) * 60,
  };
  enemies.push(enemy);
}

function updatePlayer(deltaTime) {
  player.cooldown = Math.max(0, player.cooldown - deltaTime);

  if (keys.left) {
    player.x -= player.speed * deltaTime;
  }
  if (keys.right) {
    player.x += player.speed * deltaTime;
  }

  player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));

  if (keys.shoot && player.cooldown === 0) {
    shoot();
    player.cooldown = 0.22;
  }
}

function updateBullets(deltaTime) {
  bullets = bullets.filter((bullet) => {
    bullet.y -= bullet.speed * deltaTime;
    return bullet.y + bullet.height > 0;
  });
}

function updateEnemies(deltaTime) {
  spawnTimer += deltaTime;
  if (spawnTimer > 0.9) {
    spawnEnemy();
    spawnTimer = 0;
  }

  enemies.forEach((enemy) => {
    enemy.y += enemy.speed * deltaTime;
    enemy.x += enemy.drift * deltaTime;
  });

  enemies = enemies.filter((enemy) => enemy.y < HEIGHT + enemy.height);
}

function checkCollisions() {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];

      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y
      ) {
        bullets.splice(i, 1);
        enemies.splice(j, 1);
        score += 10;
        scoreEl.textContent = String(score);
        break;
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];

    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
      enemies.splice(i, 1);
      lives -= 1;
      livesEl.textContent = String(lives);

      if (lives <= 0) {
        gameOverState();
        return;
      }
    }
  }
}

function updateStars(deltaTime) {
  stars.forEach((star) => {
    star.y += star.speed * deltaTime;
    if (star.y > HEIGHT) {
      star.y = -5;
      star.x = Math.random() * WIDTH;
    }
  });
}

function gameUpdate(timestamp) {
  if (!gameRunning) return;

  if (!lastTime) lastTime = timestamp;
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  updatePlayer(deltaTime);
  updateBullets(deltaTime);
  updateEnemies(deltaTime);
  updateStars(deltaTime);
  checkCollisions();
  draw();

  if (gameRunning) {
    animationId = requestAnimationFrame(gameUpdate);
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

  ctx.fillStyle = '#63d5ff';
  ctx.beginPath();
  ctx.moveTo(0, -player.height / 2);
  ctx.lineTo(player.width / 2, player.height / 2);
  ctx.lineTo(0, player.height / 4);
  ctx.lineTo(-player.width / 2, player.height / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-4, 6, 8, 12);

  ctx.restore();
}

function drawBullets() {
  ctx.fillStyle = '#f8f9ff';
  bullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

    ctx.fillStyle = '#ffb3b3';
    ctx.fillRect(enemy.x + 5, enemy.y + 8, enemy.width - 10, 9);
  });
}

function drawStars() {
  stars.forEach((star) => {
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawStars();
  drawBullets();
  drawEnemies();
  drawPlayer();
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    keys.left = true;
  }
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    keys.right = true;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    keys.shoot = true;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    keys.left = false;
  }
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    keys.right = false;
  }
  if (event.code === 'Space') {
    keys.shoot = false;
  }
});

startBtn.addEventListener('click', () => {
  startGame();
});

restartBtn.addEventListener('click', () => {
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  startGame();
});

resetGame();
draw();
