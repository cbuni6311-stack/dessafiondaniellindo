const game = document.getElementById("game");
const player = document.getElementById("player");
const scoreText = document.getElementById("score");
const livesText = document.getElementById("lives");

const startScreen = document.getElementById("startScreen");
const winScreen = document.getElementById("winScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const retryBtn = document.getElementById("retryBtn");
const trophy = document.getElementById("trophy");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

let playerX = 0;
let votes = [];
let gameRunning = false;
let score = 0;
let lives = 3;
let speed = 5;
let spawnTimer = null;
let specialTimer = null;
let totemTimer = null;
let gameLoop = null;
let trophyActive = false;
let trophyPending = false;
let trophyTimer = null;
let lastTime = 0;
let specialObjects = [];

const TROPHY_DISTANCE = 2000;

function movePlayer(direction) {
  if (!gameRunning) return;

  const gameWidth = game.clientWidth;
  const margin = gameWidth * 0.10;
  const step = Math.max(28, gameWidth * 0.045);

  playerX += direction * step;
  playerX = Math.max(margin, Math.min(gameWidth - margin, playerX));
  player.style.left = playerX + "px";

  // Mantém o troféu na altura do personagem e verifica o toque.
  if (trophyActive) {
    positionTrophy();
    if (checkCollision(player, trophy)) {
      winGame();
    }
  }
}

document.addEventListener("keydown", (event) => {
  if (!gameRunning) return;

  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    event.preventDefault();
    movePlayer(-1);
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    event.preventDefault();
    movePlayer(1);
  }
});

function bindMobileButton(button, direction) {
  if (!button) return;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    movePlayer(direction);
  });
}

bindMobileButton(leftBtn, -1);
bindMobileButton(rightBtn, 1);

window.addEventListener("resize", () => {
  if (!gameRunning) return;
  const margin = game.clientWidth * 0.10;
  playerX = Math.max(margin, Math.min(game.clientWidth - margin, playerX));
  player.style.left = playerX + "px";
  if (trophyActive) positionTrophy();
});

// Arrastar o dedo também move o personagem no celular.
let touchStartX = null;
game.addEventListener("touchstart", (event) => {
  if (!gameRunning || event.touches.length !== 1) return;
  touchStartX = event.touches[0].clientX;
}, { passive: true });

game.addEventListener("touchmove", (event) => {
  if (!gameRunning || touchStartX === null || event.touches.length !== 1) return;
  const currentX = event.touches[0].clientX;
  const delta = currentX - touchStartX;
  if (Math.abs(delta) >= 18) {
    movePlayer(delta > 0 ? 1 : -1);
    touchStartX = currentX;
  }
  event.preventDefault();
}, { passive: false });

game.addEventListener("touchend", () => { touchStartX = null; }, { passive: true });

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);

function startGame() {
  // Permite reiniciar quantas vezes for necessário, inclusive após vitória/derrota.
  gameRunning = false;
  clearInterval(spawnTimer);
  clearInterval(specialTimer);
  clearInterval(totemTimer);
  clearTimeout(trophyTimer);
  trophyTimer = null;
  cancelAnimationFrame(gameLoop);
  spawnTimer = null;
  specialTimer = null;
  totemTimer = null;
  gameLoop = null;

  votes.forEach(vote => vote.element.remove());
  votes = [];
  specialObjects.forEach(obj => obj.element.remove());
  specialObjects = [];

  clearInterval(spawnTimer);
  clearInterval(specialTimer);
  clearInterval(totemTimer);
  cancelAnimationFrame(gameLoop);

  score = 0;
  lives = 3;
  speed = 5;
  trophyActive = false;
  trophyPending = false;
  lastTime = 0;

  scoreText.textContent = "0";
  livesText.textContent = "3";

  playerX = game.clientWidth / 2;
  player.style.left = playerX + "px";
  player.style.transform = "translateX(-50%)";

  trophy.classList.remove("trophy-visible");
  trophy.style.left = "-9999px";
  trophy.style.top = "-9999px";

  startScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  gameRunning = true;

  spawnTimer = setInterval(() => {
    if (!trophyActive) spawnVote();
  }, 425);

  // A cada 6 segundos aparece um PURGE. Se o player encostar, perde todas as vidas.
  specialTimer = setInterval(() => {
    if (!trophyActive) spawnSpecial("purge");
  }, 6000);

  // A cada 8 segundos aparece um TOTEM que concede +1 vida ao tocar.
  totemTimer = setInterval(() => {
    if (!trophyActive) spawnSpecial("totem");
  }, 8000);

  gameLoop = requestAnimationFrame(updateGame);
}

function spawnVote() {
  if (!gameRunning || trophyActive) return;

  const gameWidth = game.clientWidth;
  const roadLeft = gameWidth * 0.10;
  const roadRight = gameWidth * 0.90;
  const voteWidth = 75;

  const x = roadLeft + Math.random() * Math.max(1, roadRight - roadLeft - voteWidth);

  const element = document.createElement("div");
  element.classList.add("vote");
  element.textContent = "VOTO";
  element.style.left = x + "px";
  element.style.top = "-100px";

  game.appendChild(element);
  votes.push({ element, x, y: -100 });
}


function spawnSpecial(type) {
  if (!gameRunning || trophyActive) return;

  const gameWidth = game.clientWidth;
  const roadLeft = gameWidth * 0.10;
  const roadRight = gameWidth * 0.90;
  const width = type === "purge" ? 95 : 82;
  const x = roadLeft + Math.random() * Math.max(1, roadRight - roadLeft - width);

  const element = document.createElement("div");
  element.classList.add("special", type);

  if (type === "purge") {
    element.textContent = "PURGE";
  } else {
    const img = document.createElement("img");
    img.src = "totem.webp";
    img.alt = "Totem que concede uma vida";
    element.appendChild(img);
  }

  element.style.left = x + "px";
  element.style.top = "-110px";
  game.appendChild(element);
  specialObjects.push({ element, type, x, y: -110 });
}

function updateGame(timestamp) {
  if (!gameRunning) return;

  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(32, timestamp - lastTime);
  lastTime = timestamp;

  if (!trophyActive) {
    score = Math.min(TROPHY_DISTANCE, score + 0.70 * (dt / 16.67));
    scoreText.textContent = Math.floor(score);
    speed = 5 + score / 350;
  }

  for (let i = specialObjects.length - 1; i >= 0; i--) {
    const obj = specialObjects[i];
    const specialSpeed = obj.type === "purge" ? speed * 2 : speed;
    obj.y += specialSpeed * (dt / 16.67);
    obj.element.style.top = obj.y + "px";

    if (checkCollision(player, obj.element)) {
      obj.element.remove();
      specialObjects.splice(i, 1);

      if (obj.type === "purge") {
        lives = 0;
        livesText.textContent = "0";
        gameOver();
        return;
      }

      if (obj.type === "totem") {
        lives += 1;
        livesText.textContent = lives;
        player.style.transform = "translateX(-50%) scale(1.18)";
        setTimeout(() => {
          if (gameRunning) player.style.transform = "translateX(-50%) scale(1)";
        }, 150);
        continue;
      }
    }

    if (obj.y > game.clientHeight + 120) {
      obj.element.remove();
      specialObjects.splice(i, 1);
    }
  }

  for (let i = votes.length - 1; i >= 0; i--) {
    const vote = votes[i];
    vote.y += speed * (dt / 16.67);
    vote.element.style.top = vote.y + "px";

    if (checkCollision(player, vote.element)) {
      vote.element.remove();
      votes.splice(i, 1);
      loseLife();
      continue;
    }

    if (vote.y > game.clientHeight + 100) {
      vote.element.remove();
      votes.splice(i, 1);
    }
  }

  // Aos 2000 m, inicia uma espera de 2 segundos antes de mostrar o troféu.
  // Depois da espera, ele aparece no meio da tela, na altura do personagem.
  if (!trophyActive && !trophyPending && score >= TROPHY_DISTANCE) {
    trophyPending = true;
    clearInterval(spawnTimer);

    trophyTimer = setTimeout(() => {
      if (!gameRunning || !trophyPending) return;

      trophyPending = false;
      trophyActive = true;

      const gameWidth = game.clientWidth;
      const trophyWidth = trophy.offsetWidth || 86;
      const targetX = gameWidth / 2;

      trophy.style.left = (targetX - trophyWidth / 2) + "px";
      positionTrophy();
      trophy.classList.add("trophy-visible");
      trophyTimer = null;
    }, 2000);
  }

  if (trophyActive) {
    positionTrophy();

    if (checkCollision(player, trophy)) {
      winGame();
      return;
    }
  }

  gameLoop = requestAnimationFrame(updateGame);
}

function positionTrophy() {
  if (!trophyActive) return;

  const playerRect = player.getBoundingClientRect();
  const gameRect = game.getBoundingClientRect();

  // Troféu fica centralizado verticalmente na mesma altura do personagem.
  trophy.style.top =
    (playerRect.top - gameRect.top + playerRect.height / 2 - trophy.offsetHeight / 2) + "px";
}

function checkCollision(a, b) {
  const rectA = a.getBoundingClientRect();
  const rectB = b.getBoundingClientRect();

  return !(
    rectA.right < rectB.left ||
    rectA.left > rectB.right ||
    rectA.bottom < rectB.top ||
    rectA.top > rectB.bottom
  );
}

function loseLife() {
  lives--;
  livesText.textContent = lives;

  player.style.transform = "translateX(-50%) scale(1.18)";
  setTimeout(() => {
    if (gameRunning) player.style.transform = "translateX(-50%) scale(1)";
  }, 150);

  if (lives <= 0) gameOver();
}

function winGame() {
  gameRunning = false;
  trophyActive = false;
  trophy.classList.remove("trophy-visible");
  clearInterval(spawnTimer);
  clearInterval(specialTimer);
  clearInterval(totemTimer);
  clearTimeout(trophyTimer);
  trophyTimer = null;
  cancelAnimationFrame(gameLoop);

  winScreen.classList.remove("hidden");

  votes.forEach(vote => vote.element.remove());
  votes = [];
  specialObjects.forEach(obj => obj.element.remove());
  specialObjects = [];
}

function gameOver() {
  gameRunning = false;
  trophyActive = false;
  trophy.classList.remove("trophy-visible");
  clearInterval(spawnTimer);
  clearInterval(specialTimer);
  clearInterval(totemTimer);
  clearTimeout(trophyTimer);
  trophyTimer = null;
  cancelAnimationFrame(gameLoop);

  gameOverScreen.classList.remove("hidden");

  votes.forEach(vote => vote.element.remove());
  votes = [];
  specialObjects.forEach(obj => obj.element.remove());
  specialObjects = [];
}
