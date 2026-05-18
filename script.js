const canvas = document.querySelector("#liquidCanvas");
const context = canvas.getContext("2d", { alpha: true });
const stateCanvas = document.querySelector("#stateCanvas");
const stateContext = stateCanvas.getContext("2d", { alpha: true });
const progress = document.querySelector("#scrollProgress");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const nav = document.querySelector(".site-nav");
const navLinks = [...document.querySelectorAll(".nav-link")];
const sections = navLinks
  .map(link => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const pointer = {
  x: 0.5,
  y: 0.5,
  targetX: 0.5,
  targetY: 0.5
};

const palette = [
  "rgba(180, 224, 250, 0.34)",
  "rgba(255, 255, 255, 0.44)",
  "rgba(126, 186, 224, 0.18)",
  "rgba(235, 249, 255, 0.4)"
];

let width = 0;
let height = 0;
let animationFrame = 0;

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  stateCanvas.width = Math.floor(width * pixelRatio);
  stateCanvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  stateCanvas.style.width = `${width}px`;
  stateCanvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  stateContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  updateNavGlow();
}

function drawLiquid(time) {
  context.clearRect(0, 0, width, height);
  pointer.x += (pointer.targetX - pointer.x) * 0.035;
  pointer.y += (pointer.targetY - pointer.y) * 0.035;

  const t = time * 0.00018;
  const fields = [
    { x: 0.14 + pointer.x * 0.1, y: 0.18 + pointer.y * 0.08, r: 0.52, phase: 0 },
    { x: 0.78 - pointer.x * 0.08, y: 0.18 + pointer.y * 0.1, r: 0.46, phase: 1.7 },
    { x: 0.3 + pointer.x * 0.04, y: 0.86 - pointer.y * 0.06, r: 0.54, phase: 2.6 },
    { x: 0.9 - pointer.x * 0.06, y: 0.74 - pointer.y * 0.05, r: 0.42, phase: 4.1 }
  ];

  fields.forEach((field, index) => {
    const driftX = Math.sin(t + field.phase) * width * 0.06;
    const driftY = Math.cos(t * 1.2 + field.phase) * height * 0.05;
    const x = field.x * width + driftX;
    const y = field.y * height + driftY;
    const radius = Math.max(width, height) * field.r;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

    gradient.addColorStop(0, palette[index]);
    gradient.addColorStop(0.42, palette[index].replace(/0\.\d+\)/, "0.09)"));
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    context.globalCompositeOperation = index === 0 ? "source-over" : "lighter";
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });

  drawStateMachine(time);

  animationFrame = requestAnimationFrame(drawLiquid);
}

function drawStateMachine(time) {
  const scale = Math.min(width / 1280, height / 760);
  const nodeWidth = Math.max(86, 128 * scale);
  const nodeHeight = Math.max(34, 46 * scale);
  const states = [
    { label: "INIT", x: 0.16, y: 0.24 },
    { label: "AUTH", x: 0.46, y: 0.17 },
    { label: "VERIFY", x: 0.78, y: 0.3 },
    { label: "BUILD", x: 0.26, y: 0.66 },
    { label: "SHIP", x: 0.62, y: 0.72 }
  ];
  const transitions = [
    [0, 1],
    [1, 2],
    [1, 3],
    [3, 4],
    [2, 4],
    [4, 0]
  ];
  const activeIndex = Math.floor(time * 0.0007) % transitions.length;
  const progressAmount = (time * 0.0007) % 1;

  stateContext.clearRect(0, 0, width, height);
  stateContext.font = `800 ${width < 680 ? 9 : 11}px Inter, system-ui, sans-serif`;
  stateContext.textAlign = "center";
  stateContext.textBaseline = "middle";

  const positionedStates = states.map((state, index) => {
    const drift = Math.sin(time * 0.00022 + index) * 6;
    return {
      ...state,
      x: state.x * width + drift + (pointer.x - 0.5) * 8,
      y: state.y * height + Math.cos(time * 0.0002 + index) * 6 + (pointer.y - 0.5) * 8
    };
  });

  transitions.forEach((transition, index) => {
    const from = positionedStates[transition[0]];
    const to = positionedStates[transition[1]];
    const isActive = index === activeIndex;
    const controlX = (from.x + to.x) / 2 + (to.y - from.y) * 0.08;
    const controlY = (from.y + to.y) / 2 - (to.x - from.x) * 0.08;

    stateContext.beginPath();
    stateContext.moveTo(from.x, from.y);
    stateContext.quadraticCurveTo(controlX, controlY, to.x, to.y);
    stateContext.strokeStyle = isActive ? "rgba(22, 62, 94, 0.28)" : "rgba(57, 116, 158, 0.11)";
    stateContext.lineWidth = isActive ? 1.7 : 1;
    stateContext.stroke();

    if (isActive) {
      const point = getQuadraticPoint(from, { x: controlX, y: controlY }, to, progressAmount);
      const glow = stateContext.createRadialGradient(point.x, point.y, 0, point.x, point.y, 26);
      glow.addColorStop(0, "rgba(22, 62, 94, 0.22)");
      glow.addColorStop(0.36, "rgba(72, 132, 176, 0.14)");
      glow.addColorStop(1, "rgba(72, 132, 176, 0)");
      stateContext.fillStyle = glow;
      stateContext.beginPath();
      stateContext.arc(point.x, point.y, 26, 0, Math.PI * 2);
      stateContext.fill();
    }
  });

  positionedStates.forEach((state, index) => {
    const isActive = transitions[activeIndex].includes(index);
    const radius = 14;
    stateContext.beginPath();
    roundedRect(stateContext, state.x - nodeWidth / 2, state.y - nodeHeight / 2, nodeWidth, nodeHeight, radius);
    stateContext.fillStyle = isActive ? "rgba(24, 68, 101, 0.2)" : "rgba(255, 255, 255, 0.22)";
    stateContext.fill();
    stateContext.strokeStyle = isActive ? "rgba(24, 68, 101, 0.3)" : "rgba(57, 116, 158, 0.16)";
    stateContext.lineWidth = isActive ? 1.35 : 1;
    stateContext.stroke();
    stateContext.fillStyle = isActive ? "rgba(18, 45, 66, 0.5)" : "rgba(34, 80, 114, 0.24)";
    stateContext.fillText(state.label, state.x, state.y);
  });
}

function getQuadraticPoint(start, control, end, amount) {
  const inverse = 1 - amount;
  return {
    x: inverse * inverse * start.x + 2 * inverse * amount * control.x + amount * amount * end.x,
    y: inverse * inverse * start.y + 2 * inverse * amount * control.y + amount * amount * end.y
  };
}

function roundedRect(ctx, x, y, widthValue, heightValue, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + widthValue - radius, y);
  ctx.quadraticCurveTo(x + widthValue, y, x + widthValue, y + radius);
  ctx.lineTo(x + widthValue, y + heightValue - radius);
  ctx.quadraticCurveTo(x + widthValue, y + heightValue, x + widthValue - radius, y + heightValue);
  ctx.lineTo(x + radius, y + heightValue);
  ctx.quadraticCurveTo(x, y + heightValue, x, y + heightValue - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function setScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const amount = scrollable <= 0 ? 0 : window.scrollY / scrollable;
  progress.style.width = `${Math.min(amount * 100, 100)}%`;
  setActiveNavLink();
}

function updateNavGlow(activeLink = document.querySelector(".nav-link.is-active") || navLinks[0]) {
  if (!nav || !activeLink) return;

  const navRect = nav.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  const left = linkRect.left - navRect.left;
  const progressAmount = navRect.width <= 0 ? 0 : (left + linkRect.width / 2) / navRect.width;

  nav.style.setProperty("--nav-left", `${left}px`);
  nav.style.setProperty("--nav-width", `${linkRect.width}px`);
  nav.style.setProperty("--nav-progress", progressAmount.toFixed(3));
}

function setActiveNavLink() {
  if (!sections.length) return;

  const anchorLine = window.scrollY + window.innerHeight * 0.38;
  let activeSection = sections[0];

  sections.forEach(section => {
    if (section.offsetTop <= anchorLine) {
      activeSection = section;
    }
  });

  navLinks.forEach(link => {
    const isActive = link.getAttribute("href") === `#${activeSection.id}`;
    link.classList.toggle("is-active", isActive);
    if (isActive) updateNavGlow(link);
  });
}

function setupReveals() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  document.querySelectorAll("[data-reveal]").forEach(element => observer.observe(element));
}

function setupTiltCards() {
  document.querySelectorAll(".tilt-card").forEach(card => {
    card.addEventListener("pointermove", event => {
      if (prefersReducedMotion.matches) return;

      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${y * -4}deg) rotateY(${x * 5}deg) translateY(-4px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function setupMagneticButtons() {
  document.querySelectorAll(".magnetic").forEach(button => {
    button.addEventListener("pointermove", event => {
      if (prefersReducedMotion.matches) return;

      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.18;
      button.style.transform = `translate(${x}px, ${y}px)`;
    });

    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });
}

function setupNavInteraction() {
  if (!navLinks.length) return;

  navLinks.forEach(link => {
    link.addEventListener("pointerenter", () => updateNavGlow(link));
    link.addEventListener("focus", () => updateNavGlow(link));
  });

  nav.addEventListener("pointerleave", () => updateNavGlow());
  setActiveNavLink();
}

function updatePointer(event) {
  pointer.targetX = event.clientX / window.innerWidth;
  pointer.targetY = event.clientY / window.innerHeight;
}

resizeCanvas();
setupReveals();
setupTiltCards();
setupMagneticButtons();
setupNavInteraction();
setScrollProgress();

if (!prefersReducedMotion.matches) {
  animationFrame = requestAnimationFrame(drawLiquid);
} else {
  drawStateMachine(0);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("scroll", setScrollProgress, { passive: true });
window.addEventListener("pointermove", updatePointer, { passive: true });

prefersReducedMotion.addEventListener("change", event => {
  if (event.matches) {
    cancelAnimationFrame(animationFrame);
    context.clearRect(0, 0, width, height);
    stateContext.clearRect(0, 0, width, height);
    drawStateMachine(0);
  } else {
    animationFrame = requestAnimationFrame(drawLiquid);
  }
});
