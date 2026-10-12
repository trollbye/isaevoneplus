// ===== OnePlus One: объёмный телефон в разделе «Дизайн» =====
// Телефон собран из официальных снимков (phonekit.js), так же как на главной. Здесь его поворачивает
// прокрутка: спинка → ребро → экран. Сколько сцены пролистано, сообщает one.js через window.TURN.
// Кадр рисуется, только когда что-то изменилось и сцена рядом с окном: в покое картинка неподвижна.
import { createStage, createPhone, everyMinute, breathe } from "./phonekit.js?v=15";
import { attachSpin } from "./spin.js?v=1";

const canvas = document.getElementById("turnCanvas");
const state = window.TURN;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

// сборка идёт в несколько приёмов с передышками: каждый шаг короткий, и прокрутка страницы из-за них не замирает
await breathe();
const { renderer, scene, camera } = createStage(440, 940, { canvas });
await breathe();
const phone = await createPhone("one");
await breathe();
scene.add(phone.model);

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

// телефон можно крутить мышью и пальцем: это добавка к позе, которую задаёт прокрутка (spin.js)
const spin = attachSpin(canvas, { wake: () => wake() });
let spunAt = 0; // доля прокрутки, на которой телефон крутили рукой
let dirty = true;
let near = false;
let running = false;
let lastP = -1;
let lastEnter = -1;

function draw() {
  const { p, enter } = state;
  // первая половина пути — от спинки до ребра, потом пауза на ребре, потом разворот экраном
  const turn = 0.45 * ease((p - 0.05) / 0.3) + 0.55 * ease((p - 0.55) / 0.33);
  phone.model.rotation.set(0.05, 0.42 + turn * (Math.PI - 0.84), 0);
  // телефон поднимается снизу, пока сцена въезжает на экран
  phone.model.position.y = (1 - ease(enter)) * -2.4;
  phone.model.rotation.x += spin.pitch;
  phone.model.rotation.y += spin.yaw;
  phone.model.scale.setScalar(spin.zoom);
  renderer.render(scene, camera);
}

function frame(now) {
  if (!near) {
    running = false;
    return;
  }
  requestAnimationFrame(frame);
  // страницу листают дальше — то, что накрутили рукой, плавно возвращается
  if (spin.held) spunAt = state.p;
  else if (Math.abs(state.p - spunAt) > 0.004) spin.home();
  const spinning = spin.update(now);
  if (!dirty && !spinning && Math.abs(state.p - lastP) < 0.0004 && Math.abs(state.enter - lastEnter) < 0.0004) return;
  dirty = false;
  lastP = state.p;
  lastEnter = state.enter;
  draw();
}
function wake() {
  if (running || !near) return;
  running = true;
  requestAnimationFrame(frame);
}

new IntersectionObserver(
  (entries) => {
    near = entries[0].isIntersecting;
    wake();
  },
  { rootMargin: "20% 0px" }
).observe(document.getElementById("design"));

window.addEventListener("resize", () => {
  resize();
  wake();
});
// раз в минуту на экране телефона обновляются часы
everyMinute(() => {
  phone.repaint();
  dirty = true;
  wake();
});

canvas.parentElement.classList.add("is-live"); // снимок-заглушка прячется, на его месте живой телефон
resize();
wake();
