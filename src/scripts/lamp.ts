// A bulb on an elastic cord: a point mass under gravity, held to a fixed anchor by a
// spring. Small sideways offsets swing like a pendulum; a hard pull stretches the cord
// and it recoils. It only moves when clicked or dragged. All units are SVG pixels (the lamp's SVG is drawn 1:1) and seconds.

const ANCHOR = { x: 20, y: 0 };
const REST_LENGTH = 46; // unstretched cord; gravity settles the bulb at about 48
const GRAVITY = 600;
const STIFFNESS = 200; // spring per unit mass: higher recoils faster
const CORD_DAMPING = 10; // damps bouncing along the cord
const AIR_DAMPING = 0.7; // damps the swing: lower swings for longer
const MAX_STRETCH = 1.6; // the cord never gets longer than this times its rest length
const PULL_TRIGGER = 10; // stretch in px that counts as pulling the switch
const MAX_THROW = 700; // px/s cap on the speed a drag can release with
const STEP = 1 / 240;

type Vec = { x: number; y: number };

export function mountLamp() {
  const lamp = document.getElementById("theme-lamp") as HTMLButtonElement | null;
  if (!lamp) return;
  const svg = lamp.querySelector("svg")!;
  const cord = lamp.querySelector<SVGPathElement>("[data-cord]")!;
  const bulb = lamp.querySelector<SVGGElement>("[data-bulb]")!;

  // ---- theme
  const root = document.documentElement;
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const current = () => root.dataset.theme ?? (mq.matches ? "dark" : "light");
  const sync = () => {
    const dark = current() === "dark";
    lamp.setAttribute("aria-checked", String(dark));
    lamp.title = dark ? "Pull for light mode" : "Pull for dark mode";
  };
  const toggle = () => {
    const next = current() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    sync();
  };
  mq.addEventListener("change", sync);
  sync();

  const still = matchMedia("(prefers-reduced-motion: reduce)");

  // ---- state
  const restY = ANCHOR.y + REST_LENGTH + GRAVITY / STIFFNESS;
  const p: Vec = { x: ANCHOR.x, y: restY };
  const v: Vec = { x: 0, y: 0 };
  let running = false;
  let last = 0;
  let acc = 0;
  let dragging = false;
  let armed = true; // one toggle per pull: re-arms once the cord relaxes

  const stretch = () => Math.hypot(p.x - ANCHOR.x, p.y - ANCHOR.y) - REST_LENGTH - GRAVITY / STIFFNESS;

  function draw() {
    const dx = p.x - ANCHOR.x;
    const dy = p.y - ANCHOR.y;
    const angle = (-Math.atan2(dx, dy) * 180) / Math.PI;
    // When slack, the cord bows out to the side by however much length it has spare.
    const len = Math.hypot(dx, dy) || 1;
    const sag = len < REST_LENGTH ? Math.sqrt(REST_LENGTH ** 2 - len ** 2) / 2 : 0;
    const cx = (ANCHOR.x + p.x) / 2 + (dy / len) * sag;
    const cy = (ANCHOR.y + p.y) / 2 - (dx / len) * sag;
    cord.setAttribute("d", `M${ANCHOR.x} ${ANCHOR.y}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    bulb.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
  }

  function step(dt: number) {
    const dx = p.x - ANCHOR.x;
    const dy = p.y - ANCHOR.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // A cord only pulls: past its rest length it acts as a damped spring, shorter than that
    // it goes slack and the bulb falls freely.
    const radialV = v.x * ux + v.y * uy;
    const f = len > REST_LENGTH ? -STIFFNESS * (len - REST_LENGTH) - CORD_DAMPING * radialV : 0;
    v.x += (f * ux - AIR_DAMPING * v.x) * dt;
    v.y += (f * uy + GRAVITY - AIR_DAMPING * v.y) * dt;
    p.x += v.x * dt;
    p.y += v.y * dt;
    limitLength();
  }

  // The cord can only stretch so far: past that, it's taut and stops outward motion.
  function limitLength() {
    const dx = p.x - ANCHOR.x;
    const dy = p.y - ANCHOR.y;
    const len = Math.hypot(dx, dy);
    const max = REST_LENGTH * MAX_STRETCH;
    if (len <= max) return;
    const ux = dx / len;
    const uy = dy / len;
    p.x = ANCHOR.x + ux * max;
    p.y = ANCHOR.y + uy * max;
    const out = v.x * ux + v.y * uy;
    if (out > 0) { v.x -= out * ux; v.y -= out * uy; }
  }

  // A pull is a stretch while the cord hangs roughly straight down, not a wide swing.
  function checkPull() {
    const s = stretch();
    const downward = (p.y - ANCHOR.y) / Math.hypot(p.x - ANCHOR.x, p.y - ANCHOR.y) > 0.82;
    if (armed && s > PULL_TRIGGER && downward && (dragging || v.y > 0)) { armed = false; toggle(); }
    else if (!armed && s < PULL_TRIGGER / 3) armed = true;
  }

  function frame(t: number) {
    acc += Math.min(0.05, (t - last) / 1000);
    last = t;
    if (!dragging) {
      while (acc >= STEP) { step(STEP); acc -= STEP; }
    } else acc = 0;
    checkPull();
    draw();
    const settled = !dragging && Math.hypot(v.x, v.y) < 1.5 && Math.hypot(p.x - ANCHOR.x, p.y - restY) < 0.4;
    if (settled) {
      p.x = ANCHOR.x; p.y = restY; v.x = 0; v.y = 0;
      draw();
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    acc = 0;
    requestAnimationFrame(frame);
  }

  // ---- input
  const toSvg = (e: PointerEvent): Vec => {
    const m = svg.getScreenCTM();
    if (!m) return { x: p.x, y: p.y };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };

  let grab: Vec = { x: 0, y: 0 }; // where on the bulb it was grabbed
  let lastPointer = { x: 0, y: 0, t: 0 };
  let travel = 0;
  let suppressClick = false;

  lamp.addEventListener("pointerdown", (e) => {
    if (still.matches || e.button !== 0) return;
    const at = toSvg(e);
    dragging = true;
    travel = 0;
    grab = { x: at.x - p.x, y: at.y - p.y };
    lastPointer = { x: at.x, y: at.y, t: performance.now() };
    lamp.setPointerCapture(e.pointerId);
    lamp.classList.add("dragging");
    wake();
  });

  // Only a held bulb follows the pointer; hovering does nothing.
  lamp.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const at = toSvg(e);
    const now = performance.now();
    const dt = Math.max(1, now - lastPointer.t) / 1000;
    travel += Math.hypot(at.x - lastPointer.x, at.y - lastPointer.y);
    // The hand moves the bulb directly; remember its speed for the throw on release.
    const nx = at.x - grab.x;
    const ny = at.y - grab.y;
    v.x = (nx - p.x) / dt;
    v.y = (ny - p.y) / dt;
    p.x = nx;
    p.y = ny;
    limitLength();
    lastPointer = { x: at.x, y: at.y, t: now };
    wake();
  });

  const release = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    lamp.classList.remove("dragging");
    if (lamp.hasPointerCapture(e.pointerId)) lamp.releasePointerCapture(e.pointerId);
    // A drag isn't also a click; a tap without movement falls through to the click handler.
    suppressClick = travel > 4;
    // Keep a hard fling believable.
    const speed = Math.hypot(v.x, v.y);
    if (speed > MAX_THROW) { v.x *= MAX_THROW / speed; v.y *= MAX_THROW / speed; }
    wake();
  };
  lamp.addEventListener("pointerup", release);
  lamp.addEventListener("pointercancel", release);

  // Click, tap, Enter and Space: a quick tug on the cord. The pull itself flips the theme.
  lamp.addEventListener("click", () => {
    if (suppressClick) { suppressClick = false; return; }
    if (still.matches) { toggle(); return; }
    armed = true;
    v.y += 360;
    v.x += (Math.random() - 0.5) * 60;
    wake();
  });

  draw();
}
