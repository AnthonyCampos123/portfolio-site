const canvas = document.querySelector("#liquidCanvas");
const context = canvas.getContext("2d", { alpha: true });
const dijkstraCanvas = document.querySelector("#dijkstraCanvas");
const dijkstraContext = dijkstraCanvas.getContext("2d", { alpha: true });
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

const graphModel = {
  source: 0,
  nodes: [
    { label: "S", x: 0.13, y: 0.28 },
    { label: "A", x: 0.34, y: 0.16 },
    { label: "B", x: 0.56, y: 0.28 },
    { label: "C", x: 0.82, y: 0.18 },
    { label: "D", x: 0.26, y: 0.66 },
    { label: "E", x: 0.52, y: 0.76 },
    { label: "F", x: 0.78, y: 0.62 }
  ],
  edges: [
    [0, 1, 4],
    [0, 4, 2],
    [1, 2, 5],
    [1, 4, 1],
    [2, 3, 3],
    [2, 5, 2],
    [3, 6, 4],
    [4, 2, 8],
    [4, 5, 10],
    [5, 6, 1],
    [2, 6, 6]
  ]
};

const dijkstraSteps = computeDijkstraSteps(graphModel);

function computeDijkstraSteps(graph) {
  const distances = Array(graph.nodes.length).fill(Infinity);
  const previous = Array(graph.nodes.length).fill(null);
  const settled = new Set();
  const steps = [];

  distances[graph.source] = 0;

  while (settled.size < graph.nodes.length) {
    let current = -1;
    let best = Infinity;

    distances.forEach((distance, index) => {
      if (!settled.has(index) && distance < best) {
        best = distance;
        current = index;
      }
    });

    if (current === -1) break;
    settled.add(current);

    graph.edges.forEach(([from, to, weight]) => {
      if (from !== current || settled.has(to)) return;
      const candidate = distances[current] + weight;
      if (candidate < distances[to]) {
        distances[to] = candidate;
        previous[to] = current;
      }
    });

    steps.push({
      current,
      distances: [...distances],
      previous: [...previous],
      settled: new Set(settled)
    });
  }

  return steps;
}

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  dijkstraCanvas.width = Math.floor(width * pixelRatio);
  dijkstraCanvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  dijkstraCanvas.style.width = `${width}px`;
  dijkstraCanvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  dijkstraContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
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

  drawDijkstraSSSP(time);

  animationFrame = requestAnimationFrame(drawLiquid);
}

function drawDijkstraSSSP(time) {
  const stepDuration = 2400;
  const stepIndex = Math.floor(time / stepDuration) % dijkstraSteps.length;
  const stepProgress = (time % stepDuration) / stepDuration;
  const step = dijkstraSteps[stepIndex];
  const previousStep = dijkstraSteps[(stepIndex - 1 + dijkstraSteps.length) % dijkstraSteps.length];
  const transition = easeInOut(Math.min(stepProgress / 0.42, 1));
  const relaxProgress = easeInOut((stepProgress * 1.08) % 1);
  const nodeRadius = width < 680 ? 17 : 22;
  const positions = graphModel.nodes.map((node, index) => ({
    ...node,
    x: node.x * width + Math.sin(time * 0.00018 + index) * 7 + (pointer.x - 0.5) * 8,
    y: node.y * height + Math.cos(time * 0.00016 + index) * 7 + (pointer.y - 0.5) * 8
  }));

  dijkstraContext.clearRect(0, 0, width, height);
  dijkstraContext.textAlign = "center";
  dijkstraContext.textBaseline = "middle";

  graphModel.edges.forEach(([from, to, weight], edgeIndex) => {
    const start = positions[from];
    const end = positions[to];
    const isTreeEdge = step.previous[to] === from;
    const wasTreeEdge = previousStep.previous[to] === from;
    const treeAlpha = isTreeEdge ? (wasTreeEdge ? 1 : transition) : 0;
    const isRelaxing = from === step.current && !step.settled.has(to);

    dijkstraContext.beginPath();
    dijkstraContext.moveTo(start.x, start.y);
    dijkstraContext.lineTo(end.x, end.y);
    dijkstraContext.strokeStyle = `rgba(23, 79, 119, ${0.1 + treeAlpha * 0.2})`;
    dijkstraContext.lineWidth = 1 + treeAlpha * 0.85;
    dijkstraContext.stroke();

    if (isRelaxing) {
      const stagger = Math.max(0, Math.min(1, relaxProgress - (edgeIndex % 3) * 0.12));
      const pulse = easeInOut(stagger);
      const x = start.x + (end.x - start.x) * pulse;
      const y = start.y + (end.y - start.y) * pulse;
      const glow = dijkstraContext.createRadialGradient(x, y, 0, x, y, 28);
      glow.addColorStop(0, `rgba(21, 73, 110, ${0.09 + transition * 0.14})`);
      glow.addColorStop(0.42, "rgba(82, 151, 198, 0.12)");
      glow.addColorStop(1, "rgba(82, 151, 198, 0)");
      dijkstraContext.fillStyle = glow;
      dijkstraContext.beginPath();
      dijkstraContext.arc(x, y, 28, 0, Math.PI * 2);
      dijkstraContext.fill();
    }

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    dijkstraContext.font = `800 ${width < 680 ? 8 : 9}px Inter, system-ui, sans-serif`;
    dijkstraContext.fillStyle = "rgba(34, 80, 114, 0.2)";
    dijkstraContext.fillText(String(weight), midX, midY);
  });

  positions.forEach((node, index) => {
    const isSource = index === graphModel.source;
    const isSettled = step.settled.has(index);
    const wasSettled = previousStep.settled.has(index);
    const isCurrent = index === step.current;
    const distance = step.distances[index];
    const settleAlpha = isSettled ? (wasSettled ? 1 : transition) : 0;
    const currentPulse = (Math.sin(time * 0.0032) + 1) / 2;
    const glowSize = isCurrent ? nodeRadius + 16 + currentPulse * 12 : nodeRadius + 8 + settleAlpha * 5;

    const glow = dijkstraContext.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize);
    glow.addColorStop(0, isCurrent ? `rgba(23, 79, 119, ${0.11 + currentPulse * 0.08})` : `rgba(255, 255, 255, ${0.12 + settleAlpha * 0.1})`);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    dijkstraContext.fillStyle = glow;
    dijkstraContext.beginPath();
    dijkstraContext.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
    dijkstraContext.fill();

    dijkstraContext.beginPath();
    dijkstraContext.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
    dijkstraContext.fillStyle = isCurrent
      ? `rgba(24, 68, 101, ${0.18 + currentPulse * 0.08})`
      : `rgba(255, 255, 255, ${0.18 + settleAlpha * 0.16})`;
    dijkstraContext.fill();
    dijkstraContext.strokeStyle = isCurrent || isSource ? `rgba(22, 62, 94, ${0.28 + currentPulse * 0.08})` : `rgba(57, 116, 158, ${0.14 + settleAlpha * 0.1})`;
    dijkstraContext.lineWidth = isCurrent ? 1.6 + currentPulse * 0.5 : 1 + settleAlpha * 0.25;
    dijkstraContext.stroke();

    dijkstraContext.font = `900 ${width < 680 ? 9 : 11}px Inter, system-ui, sans-serif`;
    dijkstraContext.fillStyle = "rgba(18, 45, 66, 0.48)";
    dijkstraContext.fillText(node.label, node.x, node.y - 2);
    dijkstraContext.font = `800 ${width < 680 ? 7 : 8}px Inter, system-ui, sans-serif`;
    dijkstraContext.fillStyle = "rgba(34, 80, 114, 0.32)";
    dijkstraContext.fillText(distance === Infinity ? "inf" : `d=${distance}`, node.x, node.y + nodeRadius + 11);
  });
}

function easeInOut(amount) {
  return amount < 0.5 ? 2 * amount * amount : 1 - Math.pow(-2 * amount + 2, 2) / 2;
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
  drawDijkstraSSSP(0);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("scroll", setScrollProgress, { passive: true });
window.addEventListener("pointermove", updatePointer, { passive: true });

prefersReducedMotion.addEventListener("change", event => {
  if (event.matches) {
    cancelAnimationFrame(animationFrame);
    context.clearRect(0, 0, width, height);
    dijkstraContext.clearRect(0, 0, width, height);
    drawDijkstraSSSP(0);
  } else {
    animationFrame = requestAnimationFrame(drawLiquid);
  }
});
