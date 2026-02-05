const PROXIMITY_RADIUS = 105;
const MIN_POINTER_CLEARANCE = 86;
const EDGE_PADDING = 16;
const MOVE_COOLDOWN_MS = 260;
const MAX_TRIES = 18;
const BOUNCE_STEP = 92;
const JITTER_RANGE = 18;
const ROAM_RADIUS_X = 170;
const ROAM_RADIUS_Y = 120;

const yesButton = document.getElementById("yes-btn");
const noButton = document.getElementById("no-btn");
const buttonArea = document.getElementById("button-area");
const successMessage = document.getElementById("success-message");
const confettiLayer = document.getElementById("confetti-layer");

let lastMoveTimestamp = 0;
let hasMovedToAbsolute = false;
let startCenter = null;
let startSize = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rectsOverlap(rectA, rectB) {
  return !(
    rectA.right <= rectB.left ||
    rectA.left >= rectB.right ||
    rectA.bottom <= rectB.top ||
    rectA.top >= rectB.bottom
  );
}

function getNoRect() {
  return noButton.getBoundingClientRect();
}

function getNoCenter() {
  const rect = getNoRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function normalizeNoButtonPositioning() {
  if (hasMovedToAbsolute) {
    return;
  }

  const rect = getNoRect();
  startCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  startSize = {
    width: rect.width,
    height: rect.height,
  };

  noButton.style.transform = "none";
  noButton.style.position = "fixed";
  noButton.style.left = `${rect.left}px`;
  noButton.style.top = `${rect.top}px`;
  hasMovedToAbsolute = true;
}

function getAllowedCenterBounds() {
  const halfW = startSize.width / 2;
  const halfH = startSize.height / 2;

  const viewportMinX = EDGE_PADDING + halfW;
  const viewportMaxX = window.innerWidth - EDGE_PADDING - halfW;
  const viewportMinY = EDGE_PADDING + halfH;
  const viewportMaxY = window.innerHeight - EDGE_PADDING - halfH;

  const roamMinX = startCenter.x - ROAM_RADIUS_X;
  const roamMaxX = startCenter.x + ROAM_RADIUS_X;
  const roamMinY = startCenter.y - ROAM_RADIUS_Y;
  const roamMaxY = startCenter.y + ROAM_RADIUS_Y;

  return {
    minX: Math.max(viewportMinX, roamMinX),
    maxX: Math.min(viewportMaxX, roamMaxX),
    minY: Math.max(viewportMinY, roamMinY),
    maxY: Math.min(viewportMaxY, roamMaxY),
  };
}

function centerToRect(centerX, centerY) {
  const halfW = startSize.width / 2;
  const halfH = startSize.height / 2;

  return {
    left: centerX - halfW,
    top: centerY - halfH,
    right: centerX + halfW,
    bottom: centerY + halfH,
  };
}

function isValidCandidate(centerX, centerY, pointerX, pointerY, yesRect) {
  const candidateRect = centerToRect(centerX, centerY);
  if (rectsOverlap(candidateRect, yesRect)) {
    return false;
  }

  const pointerDistance = Math.hypot(centerX - pointerX, centerY - pointerY);
  return pointerDistance >= MIN_POINTER_CLEARANCE;
}

function moveNoButtonAway(pointerX, pointerY) {
  const now = performance.now();
  if (now - lastMoveTimestamp < MOVE_COOLDOWN_MS) {
    return;
  }

  normalizeNoButtonPositioning();

  const yesRect = yesButton.getBoundingClientRect();
  const currentCenter = getNoCenter();
  const bounds = getAllowedCenterBounds();

  const dx = currentCenter.x - pointerX;
  const dy = currentCenter.y - pointerY;
  const magnitude = Math.hypot(dx, dy) || 1;
  const nx = dx / magnitude;
  const ny = dy / magnitude;

  let chosenCenter = null;

  for (let i = 0; i < MAX_TRIES; i += 1) {
    const jitterX = (Math.random() * 2 - 1) * JITTER_RANGE;
    const jitterY = (Math.random() * 2 - 1) * JITTER_RANGE;

    const nextCenterX = clamp(currentCenter.x + nx * BOUNCE_STEP + jitterX, bounds.minX, bounds.maxX);
    const nextCenterY = clamp(currentCenter.y + ny * BOUNCE_STEP + jitterY, bounds.minY, bounds.maxY);

    if (isValidCandidate(nextCenterX, nextCenterY, pointerX, pointerY, yesRect)) {
      chosenCenter = { x: nextCenterX, y: nextCenterY };
      break;
    }
  }

  if (!chosenCenter) {
    let farthestDistance = -1;

    for (let i = 0; i < MAX_TRIES * 2; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radiusX = 38 + Math.random() * ROAM_RADIUS_X;
      const radiusY = 28 + Math.random() * ROAM_RADIUS_Y;

      const orbitX = clamp(startCenter.x + Math.cos(angle) * radiusX, bounds.minX, bounds.maxX);
      const orbitY = clamp(startCenter.y + Math.sin(angle) * radiusY, bounds.minY, bounds.maxY);

      const candidateRect = centerToRect(orbitX, orbitY);
      if (rectsOverlap(candidateRect, yesRect)) {
        continue;
      }

      const pointerDistance = Math.hypot(orbitX - pointerX, orbitY - pointerY);
      if (pointerDistance > farthestDistance) {
        farthestDistance = pointerDistance;
        chosenCenter = { x: orbitX, y: orbitY };
      }
    }
  }

  if (!chosenCenter) {
    const fallbackCenterX = clamp(currentCenter.x - nx * (BOUNCE_STEP * 0.55), bounds.minX, bounds.maxX);
    const fallbackCenterY = clamp(currentCenter.y - ny * (BOUNCE_STEP * 0.55), bounds.minY, bounds.maxY);
    chosenCenter = { x: fallbackCenterX, y: fallbackCenterY };
  }

  const nextRect = centerToRect(chosenCenter.x, chosenCenter.y);
  noButton.style.left = `${nextRect.left}px`;
  noButton.style.top = `${nextRect.top}px`;
  lastMoveTimestamp = now;
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

  const center = getNoCenter();
  const bounds = getAllowedCenterBounds();
  const clampedCenterX = clamp(center.x, bounds.minX, bounds.maxX);
  const clampedCenterY = clamp(center.y, bounds.minY, bounds.maxY);
  const rect = centerToRect(clampedCenterX, clampedCenterY);

  noButton.style.left = `${rect.left}px`;
  noButton.style.top = `${rect.top}px`;
});
