const PROXIMITY_RADIUS = 100;
const EDGE_PADDING = 16;
const MOVE_COOLDOWN_MS = 280;
const MAX_TRIES = 45;

const yesButton = document.getElementById("yes-btn");
const noButton = document.getElementById("no-btn");
const buttonArea = document.getElementById("button-area");
const successMessage = document.getElementById("success-message");
const confettiLayer = document.getElementById("confetti-layer");

let lastMoveTimestamp = 0;
let hasMovedToAbsolute = false;

function rectsOverlap(rectA, rectB) {
  return !(
    rectA.right <= rectB.left ||
    rectA.left >= rectB.right ||
    rectA.bottom <= rectB.top ||
    rectA.top >= rectB.bottom
  );
}

function getNoCenter() {
  const rect = noButton.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function normalizeNoButtonPositioning() {
  if (hasMovedToAbsolute) {
    return;
  }

  const rect = noButton.getBoundingClientRect();
  noButton.style.transform = "none";
  noButton.style.left = `${rect.left}px`;
  noButton.style.top = `${rect.top}px`;
  hasMovedToAbsolute = true;
}

function moveNoButtonAway(pointerX, pointerY) {
  const now = performance.now();
  if (now - lastMoveTimestamp < MOVE_COOLDOWN_MS) {
    return;
  }

  normalizeNoButtonPositioning();

  const noRect = noButton.getBoundingClientRect();
  const yesRect = yesButton.getBoundingClientRect();

  const maxX = window.innerWidth - noRect.width - EDGE_PADDING;
  const maxY = window.innerHeight - noRect.height - EDGE_PADDING;

  let chosenX = null;
  let chosenY = null;

  for (let i = 0; i < MAX_TRIES; i += 1) {
    const candidateX =
      EDGE_PADDING + Math.random() * Math.max(1, maxX - EDGE_PADDING);
    const candidateY =
      EDGE_PADDING + Math.random() * Math.max(1, maxY - EDGE_PADDING);

    const candidateRect = {
      left: candidateX,
      top: candidateY,
      right: candidateX + noRect.width,
      bottom: candidateY + noRect.height,
    };

    const centerX = candidateX + noRect.width / 2;
    const centerY = candidateY + noRect.height / 2;
    const distance = Math.hypot(centerX - pointerX, centerY - pointerY);

    if (rectsOverlap(candidateRect, yesRect)) {
      continue;
    }

    if (distance < PROXIMITY_RADIUS * 1.2) {
      continue;
    }

    chosenX = candidateX;
    chosenY = candidateY;
    break;
  }

  if (chosenX !== null && chosenY !== null) {
    noButton.style.left = `${chosenX}px`;
    noButton.style.top = `${chosenY}px`;
    lastMoveTimestamp = now;
  }
}

function handlePointerProximity(clientX, clientY) {
  const center = getNoCenter();
  const distance = Math.hypot(clientX - center.x, clientY - center.y);

  if (distance <= PROXIMITY_RADIUS) {
    moveNoButtonAway(clientX, clientY);
  }
}

function spawnHearts(total = 30) {
  const symbols = ["💖", "💗", "💘", "❤️", "💕"];
  for (let i = 0; i < total; i += 1) {
    const heart = document.createElement("span");
    heart.className = "confetti-heart";
    heart.textContent = symbols[Math.floor(Math.random() * symbols.length)];

    const left = Math.random() * 100;
    const drift = -40 + Math.random() * 80;
    const delay = Math.random() * 1.2;
    const duration = 2.6 + Math.random() * 2.2;

    heart.style.left = `${left}%`;
    heart.style.setProperty("--drift", `${drift}px`);
    heart.style.setProperty("--delay", `${delay}s`);
    heart.style.setProperty("--duration", `${duration}s`);

    confettiLayer.appendChild(heart);

    setTimeout(() => {
      heart.remove();
    }, (duration + delay + 0.3) * 1000);
  }
}

function handleYesClick() {
  yesButton.disabled = true;
  noButton.disabled = true;
  yesButton.hidden = true;
  noButton.hidden = true;
  buttonArea.hidden = true;

  document.body.classList.add("success");
  successMessage.hidden = false;

  spawnHearts(34);
}

window.addEventListener("mousemove", (event) => {
  if (document.body.classList.contains("success")) {
    return;
  }
  handlePointerProximity(event.clientX, event.clientY);
});

window.addEventListener(
  "touchstart",
  (event) => {
    if (document.body.classList.contains("success")) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const touchX = touch.clientX;
    const touchY = touch.clientY;
    const center = getNoCenter();
    const nearTouch = Math.hypot(touchX - center.x, touchY - center.y) <= PROXIMITY_RADIUS;

    if (nearTouch) {
      event.preventDefault();
      moveNoButtonAway(touchX, touchY);
    }
  },
  { passive: false }
);

yesButton.addEventListener("click", handleYesClick);

window.addEventListener("resize", () => {
  if (!hasMovedToAbsolute) {
    return;
  }

  const noRect = noButton.getBoundingClientRect();
  const maxX = window.innerWidth - noRect.width - EDGE_PADDING;
  const maxY = window.innerHeight - noRect.height - EDGE_PADDING;

  const clampedX = Math.min(Math.max(noRect.left, EDGE_PADDING), maxX);
  const clampedY = Math.min(Math.max(noRect.top, EDGE_PADDING), maxY);

  noButton.style.left = `${clampedX}px`;
  noButton.style.top = `${clampedY}px`;
});
