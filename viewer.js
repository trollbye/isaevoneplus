// ===== Режим просмотра телефона в 3D (телефоны и планшеты) =====
// На сенсорном экране вертикальный жест листает страницу, поэтому на самой странице модель крутится только вбок.
// Здесь она открывается на весь экран: страница под ней не листается, один палец крутит модель в любую сторону,
// два пальца приближают и двигают её, кнопки внизу плавно ставят её нужной гранью.
// Отдельной сцены у режима нет: на весь экран переезжает тот же холст, что стоит на странице, а позу ему
// задаёт spin.view (см. spin.js) — { yaw, pitch, zoom, x, y }:
//   yaw   — поворот вокруг вертикали: 0 — спинкой к зрителю, π — экраном;
//   pitch — наклон: +π/2 — на зрителя смотрит верхняя грань, −π/2 — нижняя;
//   zoom  — крупность, x и y — сдвиг в долях высоты кадра.
// Файл подгружается при первом открытии режима.
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const HALF = Math.PI / 2;
const CLOSEST = 6; // самое сильное приближение
const TURN = 0.0085; // на столько радиан поворачивает модель один пиксель пути пальца

// Ракурсы: [название на кнопке, yaw, pitch, грань узкая — её стоит показать крупнее].
// «Спереди» и «Сзади» стоят не строго в лоб, а чуть вполоборота: строго в лоб стекло зеркалит свет студии,
// и экран выглядит белым пятном
const VIEWS = {
  front: ["Спереди", Math.PI - 0.2, 0.05, false],
  back: ["Сзади", 0.2, 0.05, false],
  top: ["Сверху", Math.PI, HALF, true],
  bottom: ["Снизу", Math.PI, -HALF, true],
  left: ["Слева", -HALF, 0, false],
  right: ["Справа", HALF, 0, false],
};

let overlay = null;
let stage = null;
let closeButton = null;
let hint = null;
let nameBox = null;
let buttons = {};
let active = null; // { spin, element, parent, next, opener, overflow }
let hinted = false; // подсказка про жесты показана: второй раз за одно посещение страницы она не нужна
let tween = 0; // идущий плавный поворот к ракурсу

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

function build() {
  if (overlay) return;
  overlay = make("div", "view3d");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Телефон в 3D");
  overlay.tabIndex = -1;
  const top = make("div", "view3d-top");
  nameBox = make("p", "view3d-name");
  closeButton = make("button", "view3d-close", "Готово");
  closeButton.type = "button";
  top.append(nameBox, closeButton);
  stage = make("div", "view3d-stage");
  const bottom = make("div", "view3d-bottom");
  hint = make("p", "view3d-hint", "Води пальцем — телефон крутится. Двумя пальцами — ближе.");
  const views = make("div", "view3d-views");
  views.setAttribute("role", "group");
  views.setAttribute("aria-label", "Ракурсы");
  for (const [key, [label]] of Object.entries(VIEWS)) {
    const button = make("button", "", label);
    button.type = "button";
    button.addEventListener("click", () => show(key));
    buttons[key] = button;
    views.appendChild(button);
  }
  bottom.append(hint, views);
  overlay.append(top, stage, bottom);
  document.body.appendChild(overlay);

  closeButton.addEventListener("click", () => close());
  // страница под режимом не листается и не тянется: все касания на нём — наши
  overlay.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
  // Safari: щипок двумя пальцами не должен увеличивать саму страницу
  overlay.addEventListener("gesturestart", (event) => event.preventDefault());
  listen();
}

// ----- Жесты: один палец крутит, два — приближают и двигают -----
const fingers = new Map(); // палец → где он сейчас
function listen() {
  const drop = (event) => {
    fingers.delete(event.pointerId);
    stage.classList.toggle("is-grabbed", fingers.size > 0);
  };
  stage.addEventListener("pointerdown", (event) => {
    if (!active || (event.pointerType === "mouse" && event.button !== 0)) return;
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {}
    fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.classList.add("is-grabbed");
    cancelAnimationFrame(tween);
    mark(null);
    hideHint();
  });
  stage.addEventListener("pointermove", (event) => {
    const finger = fingers.get(event.pointerId);
    if (!active || !finger) return;
    const view = active.spin.view;
    const dx = event.clientX - finger.x;
    const dy = event.clientY - finger.y;
    if (fingers.size === 1) {
      // чем крупнее модель, тем медленнее поворот: под пальцем она должна идти примерно за ним
      const step = TURN / Math.max(1, view.zoom * 0.6);
      view.yaw += dx * step;
      view.pitch = clamp(view.pitch + dy * step, -HALF, HALF);
    } else if (fingers.size === 2) {
      const [first, second] = [...fingers.values()];
      const other = finger === first ? second : first;
      const before = Math.hypot(finger.x - other.x, finger.y - other.y);
      const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      const tall = stage.clientHeight || 1;
      view.zoom = clamp((view.zoom * after) / Math.max(before, 1), 1, CLOSEST);
      // середина между пальцами сдвинулась — на столько же сдвигается модель (палец двигается один, середина — вдвое меньше)
      view.x += dx / 2 / (tall * view.zoom);
      view.y -= dy / 2 / (tall * view.zoom);
      hold(view);
    }
    finger.x = event.clientX;
    finger.y = event.clientY;
    active.spin.touch();
  });
  stage.addEventListener("pointerup", drop);
  stage.addEventListener("pointercancel", drop);
  // колёсико мыши (планшет с мышью, проверка на компьютере): приближение
  stage.addEventListener(
    "wheel",
    (event) => {
      if (!active) return;
      event.preventDefault();
      const view = active.spin.view;
      view.zoom = clamp(view.zoom * Math.exp(-event.deltaY * 0.0015), 1, CLOSEST);
      hold(view);
      active.spin.touch();
    },
    { passive: false }
  );
  window.addEventListener("keydown", (event) => {
    if (active && event.key === "Escape") close();
  });
  // кнопка «Назад» на телефоне закрывает режим, а не уводит со страницы
  window.addEventListener("popstate", () => {
    if (active) close(true);
  });
  window.addEventListener("resize", () => active && hold(active.spin.view));
}

// Модель нельзя утащить за край: сдвиг разрешён настолько, насколько она при этом приближении не помещается в кадр
function hold(view) {
  const wide = stage.clientWidth / Math.max(stage.clientHeight, 1); // ширина кадра в долях его высоты
  const half = 0.44; // половина высоты телефона в долях высоты кадра (с запасом: модель могла лечь набок)
  const reachX = Math.max(0, half - wide / (2 * view.zoom)) + 0.04;
  const reachY = Math.max(0, half - 1 / (2 * view.zoom)) + 0.04;
  view.x = clamp(view.x, -reachX, reachX);
  view.y = clamp(view.y, -reachY, reachY);
}

// какое приближение нужно, чтобы узкая грань (верх или низ) встала почти во всю ширину экрана
function edgeZoom() {
  const { spin } = active;
  const wide = stage.clientWidth / Math.max(stage.clientHeight, 1);
  // 0.72, а не 0.9: грань повёрнута к зрителю и стоит к нему ближе середины телефона, поэтому выглядит крупнее
  return clamp((0.72 * wide * spin.span) / spin.width, 1, CLOSEST);
}

function mark(key) {
  for (const [name, button] of Object.entries(buttons)) button.classList.toggle("is-on", name === key);
}
function hideHint() {
  hint.classList.add("is-gone");
}

// Плавный поворот к ракурсу. Вокруг вертикали модель идёт коротким путём
function show(key) {
  if (!active) return;
  const [, yaw, pitch, narrow] = VIEWS[key];
  const view = active.spin.view;
  const from = { ...view };
  const turns = Math.round((view.yaw - yaw) / (Math.PI * 2));
  const to = { yaw: yaw + turns * Math.PI * 2, pitch, zoom: narrow ? edgeZoom() : 1, x: 0, y: 0 };
  mark(key);
  hideHint();
  cancelAnimationFrame(tween);
  const started = performance.now();
  const long = reduced ? 1 : 520;
  const step = (now) => {
    const t = clamp((now - started) / long, 0, 1);
    const eased = t * t * (3 - 2 * t);
    for (const name of ["yaw", "pitch", "zoom", "x", "y"]) view[name] = from[name] + (to[name] - from[name]) * eased;
    active.spin.touch();
    if (t < 1) tween = requestAnimationFrame(step);
  };
  tween = requestAnimationFrame(step);
}

// для проверок: текущая поза и перерисовка (см. .claude/tools/viewer-check.mjs)
window.VIEW3D = { view: () => (active ? active.spin.view : null), redraw: () => active && active.spin.touch() };

export function openViewer(spin, opener) {
  if (active) return;
  build();
  const element = spin.element;
  active = { spin, element, parent: element.parentNode, next: element.nextSibling, opener, overflow: root.style.overflow };
  // Начальная поза — экраном вполоборота. На странице телефон чаще стоит спинкой, и экран видеокарта рисует впервые:
  // на это уходит заметная доля секунды. Пусть она придётся на открытие режима, а не на первое движение пальца
  spin.view = { yaw: Math.PI - 0.5, pitch: 0.1, zoom: 1, x: 0, y: 0 };
  const brand = document.querySelector(".brand");
  nameBox.textContent = brand ? brand.textContent.trim() : "";
  stage.appendChild(element);
  element.classList.add("in-view3d");
  root.classList.add("view3d-on");
  root.style.overflow = "hidden";
  overlay.classList.add("is-open");
  mark(null);
  hint.classList.toggle("is-gone", hinted);
  if (!hinted) setTimeout(hideHint, 4500);
  hinted = true;
  fingers.clear();
  try {
    history.pushState({ view3d: true }, "");
  } catch {}
  // холст теперь другого размера: страницы подгоняют его по событию resize
  window.dispatchEvent(new Event("resize"));
  spin.touch();
  overlay.focus({ preventScroll: true }); // фокус уходит в режим (для клавиатуры и чтения с экрана), рамки при этом не видно
}

function close(viaBack) {
  if (!active) return;
  const { spin, element, parent, next, opener, overflow } = active;
  cancelAnimationFrame(tween);
  element.classList.remove("in-view3d");
  parent.insertBefore(element, next && next.parentNode === parent ? next : null);
  active = null;
  spin.view = null;
  spin.yaw = spin.pitch = 0;
  spin.zoom = 1;
  root.classList.remove("view3d-on");
  root.style.overflow = overflow;
  overlay.classList.remove("is-open");
  fingers.clear();
  window.dispatchEvent(new Event("resize"));
  spin.touch();
  if (!viaBack && history.state && history.state.view3d) history.back();
  if (opener && opener.focus) opener.focus({ preventScroll: true });
}
