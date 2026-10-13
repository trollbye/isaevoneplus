// ===== Живой телефон на первом экране (OnePlus 12 и 15) и в разделе «Дизайн» (OnePlus 15) =====
// Телефон собран из официальных снимков (phonekit.js), так же как на главной. Здесь он:
// наклоняется за курсором, разворачивается экраном, пока листают первый экран, и меняет цвет по кнопкам —
// при смене цвета делает полный оборот, а корпус подменяется в тот момент, когда телефон стоит ребром.
// Его можно крутить мышью и пальцем (spin.js).
// У OnePlus 15 этот же телефон стоит ещё и в разделе «Дизайн»: холст один, он переезжает туда, когда до раздела
// долистали, и обратно, когда вернулись к первому экрану. Два телефона сразу не видны никогда, а видеокарте
// так вдвое легче, чем держать два отдельных.
// Числа (сколько пролистано, наклон, выбранный цвет) приходят из page.js через window.HERO,
// для раздела «Дизайн» — из fifteen.js через window.TURN15.
// Кадр рисуется, только когда что-то изменилось: в покое картинка неподвижна.
import { createStage, createPhone, everyMinute } from "./phonekit.js?v=15";
import { attachSpin } from "./spin.js?v=2";

const holder = document.getElementById("heroPhone");
const canvas = document.getElementById("heroCanvas");
const turnHolder = document.getElementById("turnPhone"); // место телефона в разделе «Дизайн» (есть только у OnePlus 15)
const state = window.HERO;
// расцветки берутся из data.js: модель указана на странице (<body data-phone="12">), без неё это OnePlus 15
const colors = (window.PHONES[document.body.dataset.phone] || window.PHONES["15"]).colors;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

const { renderer, scene, camera } = createStage(440, 940, { canvas, view: 18.8 });

// телефоны по цветам: каждый загружается один раз
const loaded = {};
function load(color) {
  loaded[color.key] ||= createPhone(color.model).then((phone) => {
    phone.model.visible = false;
    scene.add(phone.model);
    return phone;
  });
  return loaded[color.key];
}

let current = await load(colors.find((color) => color.key === state.color) || colors[0]);
current.model.visible = true;
holder.classList.add("is-live"); // снимок-заглушка прячется, на его месте холст с живым телефоном

// холст подгоняется под свой размер на странице; на плотных экранах рисуем не больше чем в полтора раза крупнее
function resize() {
  const box = canvas.getBoundingClientRect();
  if (!box.width) return;
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setSize(Math.round(box.width * scale), Math.round(box.height * scale), false);
  camera.aspect = box.width / box.height;
  camera.updateProjectionMatrix();
  dirty = true;
}

// телефон можно крутить мышью и пальцем: это добавка к позе, которую задаёт прокрутка
const spin = attachSpin(canvas, { wake: () => wake() });
let spunAt = 0; // доля прокрутки, на которой телефон крутили рукой

let dirty = true;
let place = "hero"; // где сейчас стоит холст: "hero" — первый экран, "turn" — раздел «Дизайн»
const near = { hero: true, turn: false };
let running = false;
let swap = null; // идущая смена цвета: { phone, start, done }
const last = { p: -1, tiltX: 0, tiltY: 0, enter: -1 };

// сколько пролистано там, где телефон стоит сейчас
const progress = () => (place === "turn" ? window.TURN15.p : state.p);

function draw(now) {
  let yaw;
  let pitch = 0.05;
  let lift;
  if (place === "turn") {
    const { p, enter } = window.TURN15;
    // спинка → ребро, пауза на ребре (видна толщина), потом разворот экраном
    const turn = 0.45 * ease((p - 0.05) / 0.3) + 0.55 * ease((p - 0.55) / 0.33);
    yaw = 0.42 + turn * (Math.PI - 0.84);
    lift = (1 - ease(enter)) * -2.4; // телефон поднимается снизу, пока раздел въезжает на экран
  } else {
    const { p, tiltX, tiltY } = state;
    // спинка → экран, пока листают первый экран
    const turn = ease((p - 0.08) / 0.56);
    yaw = 0.36 + turn * (Math.PI - 0.72) + tiltX * 0.26;
    pitch += tiltY * 0.1;
    lift = Math.sin(turn * Math.PI) * 0.2;
  }
  let turnover = 0; // полный оборот при смене цвета
  if (swap) {
    const t = clamp((now - swap.start) / 850, 0, 1);
    turnover = ease(t) * Math.PI * 2;
    // телефон стоит ребром, когда общий угол равен четверти оборота: в этот момент подменяем корпус
    const edge = (((Math.PI / 2 - yaw) % Math.PI) + Math.PI) % Math.PI;
    if (!swap.done && turnover >= edge) {
      current.model.visible = false;
      current = swap.phone;
      current.model.visible = true;
      swap.done = true;
    }
    if (t >= 1) swap = null;
  }
  // в режиме просмотра (spin.js) позу задаёт он сам, прокрутка в это время ничего не решает
  if (!spin.pose(current.model, camera)) {
    current.model.rotation.set(pitch + spin.pitch, yaw + turnover + spin.yaw, 0);
    current.model.scale.setScalar(spin.zoom);
    current.model.position.y = lift;
  }
  renderer.render(scene, camera);
}

function frame(now) {
  if (!near[place]) {
    running = false;
    return;
  }
  // страницу листают дальше — то, что накрутили рукой, плавно возвращается
  const p = progress();
  if (spin.held) spunAt = p;
  else if (Math.abs(p - spunAt) > 0.004) spin.home();
  const spinning = spin.update(now);
  const enter = place === "turn" ? window.TURN15.enter : 1;
  const moved = Math.abs(p - last.p) > 0.0004 || Math.abs(enter - last.enter) > 0.0004 || Math.abs(state.tiltX - last.tiltX) > 0.0008 || Math.abs(state.tiltY - last.tiltY) > 0.0008;
  if (dirty || moved || swap || spinning) {
    dirty = false;
    Object.assign(last, { p, enter, tiltX: state.tiltX, tiltY: state.tiltY });
    draw(now);
  }
  requestAnimationFrame(frame);
}
function wake() {
  if (running || !near[place]) return;
  running = true;
  requestAnimationFrame(frame);
}

// Холст переезжает туда, где он сейчас нужен. Между первым экраном и разделом «Дизайн» лежит целая сцена,
// поэтому оба места одновременно рядом с окном не бывают
function settle() {
  const wanted = near.turn && !near.hero ? "turn" : near.hero ? "hero" : place;
  if (wanted !== place) {
    place = wanted;
    (place === "turn" ? turnHolder : holder).appendChild(canvas);
    if (place === "turn") turnHolder.classList.add("is-live");
    spunAt = progress();
    resize();
    spin.place(); // кнопка «Покрутить в 3D» переезжает вслед за холстом
  }
  wake();
}

// смена цвета по кнопкам: page.js меняет state.color и присылает событие
window.addEventListener("phonecolor", async () => {
  const color = colors.find((item) => item.key === state.color);
  const phone = await load(color);
  if (state.color !== color.key || phone === (swap ? swap.phone : current)) return; // цвет уже сменили ещё раз или он тот же
  swap = { phone, start: performance.now(), done: false };
  wake();
});

const watch = (name, element) =>
  new IntersectionObserver(
    (entries) => {
      near[name] = entries[0].isIntersecting;
      settle();
    },
    { rootMargin: "10% 0px" }
  ).observe(element);
watch("hero", document.querySelector(".scene-hero"));
if (turnHolder) watch("turn", turnHolder.closest(".scene"));

window.addEventListener("resize", () => {
  resize();
  wake();
});
// раз в минуту на экранах обновляются часы
everyMinute(() => {
  Object.values(loaded).forEach((ready) => ready.then((phone) => phone.repaint()));
  dirty = true;
  wake();
});

resize();
wake();
// Остальные цвета догружаются заранее, чтобы смена цвета срабатывала сразу: на компьютере — вскоре после первого,
// на телефоне — только когда палец коснулся кнопок цвета (иначе мобильный интернет тратится на то, что могут и не открыть)
const preload = () => colors.forEach((color) => load(color).catch((error) => console.error(error)));
if (window.matchMedia("(pointer: coarse)").matches) {
  document.querySelectorAll(".hero-colors").forEach((box) => box.addEventListener("pointerdown", preload, { once: true, passive: true }));
} else if (colors.length > 1) setTimeout(preload, 1500);
