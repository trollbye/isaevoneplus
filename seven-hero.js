// ===== OnePlus 7 Pro: живой телефон на первом экране =====
// Телефон собран из официальных снимков (phonekit.js), так же как на главной. Здесь он наклоняется за курсором,
// а пока листают первый экран — разворачивается экраном и выпускает фронтальную камеру.
// Числа (сколько пролистано, наклон) приходят из page.js через window.HERO.
// Кадр рисуется, только когда что-то изменилось: в покое картинка неподвижна.
import { createStage, createPhone, everyMinute } from "./phonekit.js?v=15";
import { attachSpin } from "./spin.js?v=1";

const holder = document.getElementById("heroPhone");
const canvas = document.getElementById("heroCanvas");
const state = window.HERO;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

// в кадре оставлено место над телефоном: туда выезжает камера
const { renderer, scene, camera } = createStage(440, 940, { canvas, view: 19.6 });
const phone = await createPhone("7pro");
const popup = phone.model.userData.popup;
scene.add(phone.model);
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

// телефон можно крутить мышью и пальцем: это добавка к позе, которую задаёт прокрутка (spin.js)
const spin = attachSpin(holder, { wake: () => wake() });
let spunAt = 0; // доля прокрутки, на которой телефон крутили рукой
let dirty = true;
let near = true;
let running = false;
const last = { p: -1, tiltX: 0, tiltY: 0 };

function draw() {
  const { p, tiltX, tiltY } = state;
  // сначала телефон разворачивается от спинки к экрану, потом из верхнего торца поднимается камера
  const turn = ease((p - 0.06) / 0.46);
  const lift = ease((p - 0.54) / 0.14);
  phone.model.rotation.set(0.05 + tiltY * 0.1 + spin.pitch, 0.36 + turn * (Math.PI - 0.72) + tiltX * 0.26 + spin.yaw, 0);
  phone.model.scale.setScalar(spin.zoom);
  phone.model.position.y = Math.sin(turn * Math.PI) * 0.2 - 0.45;
  popup.position.y = popup.userData.hidden + (popup.userData.shown - popup.userData.hidden) * lift;
  renderer.render(scene, camera);
}

function frame(now) {
  if (!near) {
    running = false;
    return;
  }
  // страницу листают дальше — то, что накрутили рукой, плавно возвращается
  if (spin.held) spunAt = state.p;
  else if (Math.abs(state.p - spunAt) > 0.004) spin.home();
  const spinning = spin.update(now);
  const moved = Math.abs(state.p - last.p) > 0.0004 || Math.abs(state.tiltX - last.tiltX) > 0.0008 || Math.abs(state.tiltY - last.tiltY) > 0.0008;
  if (dirty || moved || spinning) {
    dirty = false;
    Object.assign(last, { p: state.p, tiltX: state.tiltX, tiltY: state.tiltY });
    draw();
  }
  requestAnimationFrame(frame);
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
  { rootMargin: "10% 0px" }
).observe(document.querySelector(".scene-hero"));

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

resize();
wake();
