// ===== Главная страница: шесть объёмных телефонов =====
// Сами телефоны собирает phonekit.js из официальных снимков. Здесь — их поведение на главной:
// в покое телефон стоит спинкой, при наведении плавно поворачивается экраном.
// Все шесть рисует один общий «холст» по очереди, а картинка копируется в рамку своего телефона.
// Кадр перерисовывается, только пока телефон двигается: в покое картинка неподвижна.
import { createStage, createPhone, everyMinute } from "./phonekit.js?v=15";
import { attachSpin } from "./spin.js?v=2";

const units = [...document.querySelectorAll(".unit")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const WIDTH = 440;
const HEIGHT = 940;
const { renderer, scene, camera } = createStage(WIDTH, HEIGHT);

// ----- Телефоны и их рамки на странице -----
async function preparePhone(unit) {
  const { spec, model, repaint } = await createPhone(unit.dataset.model);
  const frame = unit.querySelector("canvas");
  frame.width = WIDTH;
  frame.height = HEIGHT;
  model.visible = false;
  scene.add(model);
  return { unit, spec, model, repaint, paint: frame.getContext("2d"), turn: 0, target: 0, tiltX: 0, tiltY: 0, aimX: 0, aimY: 0, dirty: true, spin: null, spunAt: 0 };
}
const phones = (await Promise.all(units.map((unit) => preparePhone(unit).catch((error) => (console.error(error), null))))).filter(Boolean);

// раз в минуту часы на всех экранах перерисовываются
everyMinute(() =>
  phones.forEach((phone) => {
    phone.repaint();
    phone.dirty = true;
  })
);

function draw(phone) {
  const turn = ease(phone.turn);
  // спинкой к зрителю с лёгким поворотом → экраном к зрителю с таким же поворотом в другую сторону
  phone.model.rotation.set(0.05 + phone.tiltY * 0.14 + phone.spin.pitch, 0.34 + turn * (Math.PI - 0.68) + phone.tiltX * 0.22 + phone.spin.yaw, 0);
  phone.model.scale.setScalar(phone.spin.zoom);
  phone.model.position.y = Math.sin(turn * Math.PI) * 0.25 - (phone.model.userData.popup ? 0.3 : 0);
  const popup = phone.model.userData.popup;
  // камера выезжает, когда телефон уже почти развернулся экраном
  if (popup) popup.position.y = popup.userData.hidden + (popup.userData.shown - popup.userData.hidden) * ease((phone.turn - 0.55) / 0.45);

  phones.forEach((other) => (other.model.visible = other === phone));
  renderer.render(scene, camera);
  phone.paint.clearRect(0, 0, WIDTH, HEIGHT);
  phone.paint.drawImage(renderer.domElement, 0, 0);
}

let lastTime = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const step = Math.min(now - lastTime, 50);
  if (step < 15 || document.hidden) return; // не чаще ~60 кадров в секунду
  lastTime = now;
  for (const phone of phones) {
    const gap = phone.target - phone.turn;
    const tilting = Math.abs(phone.aimX - phone.tiltX) > 0.002 || Math.abs(phone.aimY - phone.tiltY) > 0.002;
    // покрутили рукой и отпустили — через полторы секунды телефон сам встаёт обратно
    if (phone.spin.held) phone.spunAt = now;
    else if (now - phone.spunAt > 1500) phone.spin.home();
    const spinning = phone.spin.update(now);
    if (!phone.dirty && Math.abs(gap) < 0.0005 && !tilting && !spinning) continue; // телефон стоит — не перерисовываем
    phone.turn = reducedMotion || Math.abs(gap) < 0.0005 ? phone.target : phone.turn + Math.sign(gap) * Math.min(Math.abs(gap), step / 850);
    phone.tiltX += (phone.aimX - phone.tiltX) * 0.12;
    phone.tiltY += (phone.aimY - phone.tiltY) * 0.12;
    phone.dirty = false;
    draw(phone);
  }
}

phones.forEach((phone) => {
  const { unit } = phone;
  const hit = unit.querySelector(".unit-hit"); // нажимается и реагирует на курсор только сам телефон с названием
  const soon = Boolean(unit.dataset.soon); // у модели ещё нет своей страницы
  // телефон можно покрутить мышью или пальцем (spin.js); если его крутили, ссылка не срабатывает
  phone.spin = attachSpin(unit.querySelector(".unit-stage"), { closest: 1.25, viewer: false }) /* плитка — ссылка на страницу модели: режим просмотра открывается уже там */;
  hit.addEventListener("dragstart", (event) => event.preventDefault()); // иначе браузер начнёт «перетаскивать ссылку»
  if (canHover) {
    hit.addEventListener("pointerenter", () => (phone.target = 1));
    hit.addEventListener("pointerleave", () => {
      phone.target = 0;
      phone.aimX = phone.aimY = 0;
    });
    hit.addEventListener("pointermove", (event) => {
      const box = hit.getBoundingClientRect();
      phone.aimX = ((event.clientX - box.left) / box.width) * 2 - 1;
      phone.aimY = ((event.clientY - box.top) / box.height) * 2 - 1;
    });
    hit.addEventListener("focus", () => (phone.target = 1));
  } else if (soon) {
    // на сенсорном экране нажатие разворачивает модель экраном, повторное — обратно
    hit.addEventListener("click", () => (phone.target = phone.target ? 0 : 1));
  }
  hit.addEventListener("blur", () => (phone.target = 0));
});

document.documentElement.classList.add("has-3d");
requestAnimationFrame(frame);
