// ===== Кручение объёмной модели мышью и пальцем: общая часть для всех страниц =====
// Страница сама рисует свою модель. Этот файл только слушает указатель и считает три числа-добавки к позе модели:
//   yaw   — поворот вокруг вертикали (его даёт движение вбок),
//   pitch — наклон (движение мыши вверх-вниз; у пальца вертикальный жест листает страницу, поэтому наклона нет),
//   zoom  — крупность (два пальца: развести — ближе, свести — дальше).
// Палец отпустили — модель ещё немного докручивается по инерции. Страницу листают дальше — всё плавно
// возвращается к позе, которую задаёт прокрутка (это включает страница, вызывая home()).
// Как пользоваться: const spin = attachSpin(элемент, { wake });  в цикле рисования — spin.update(now);
// update отвечает true, пока что-то ещё движется и кадр надо перерисовать.
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function attachSpin(element, { wake = () => {}, tilt = 0.5, closest = 1.7, turnsPerWidth = 0.9 } = {}) {
  const spin = { yaw: 0, pitch: 0, zoom: 1, held: false, dragged: false };
  let speed = 0; // скорость поворота, рад/с: с ней модель докручивается после отпускания
  let returning = false;
  let pointer = null; // { id, x, y, time, travel }
  let pinch = null; // { distance, zoom }
  let lastUpdate = 0;

  // вертикальный жест пальцем остаётся странице (она листается), горизонтальный достаётся модели
  element.style.touchAction = "pan-y";
  element.classList.add("can-spin");

  const perPixel = () => (Math.PI * 2 * turnsPerWidth) / Math.max(element.clientWidth, 240);

  element.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (pointer) return; // второй палец — это уже щипок, им занимаются события касаний ниже
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, travel: 0 };
    spin.held = true;
    spin.dragged = false;
    returning = false;
    speed = 0;
    element.classList.add("is-grabbed");
    // мышь «привязывается» к модели: она слушается, даже если курсор ушёл за её край
    if (event.pointerType !== "touch") {
      try {
        element.setPointerCapture(event.pointerId);
      } catch {}
    }
    wake();
  });
  element.addEventListener("pointermove", (event) => {
    if (!pointer || event.pointerId !== pointer.id || pinch) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    const dt = Math.max(event.timeStamp - pointer.time, 1);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.time = event.timeStamp;
    pointer.travel += Math.abs(dx) + Math.abs(dy);
    if (pointer.travel > 6) spin.dragged = true; // это уже не нажатие, а жест: ссылка под моделью не сработает
    const turned = dx * perPixel();
    spin.yaw += turned;
    speed = speed * 0.5 + ((turned / dt) * 1000) * 0.5;
    if (event.pointerType !== "touch") spin.pitch = clamp(spin.pitch + dy * 0.005, -tilt, tilt);
    wake();
  });
  const release = (event) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    // палец постоял перед тем, как его убрали, — докручивать не надо
    if (event.timeStamp - pointer.time > 90) speed = 0;
    pointer = null;
    spin.held = Boolean(pinch);
    element.classList.remove("is-grabbed");
    wake();
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
  // после жеста браузер ещё пришлёт «щелчок»: гасим его, чтобы модель-ссылка не открывала страницу от прокрутки пальцем
  element.addEventListener(
    "click",
    (event) => {
      if (!spin.dragged) return;
      event.preventDefault();
      event.stopPropagation();
      spin.dragged = false;
    },
    true
  );

  // ----- Два пальца: крупность -----
  const spread = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  element.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 2) return;
      event.preventDefault(); // жест наш: страница при этом не увеличивается и не листается
      pinch = { distance: spread(event.touches), zoom: spin.zoom };
      spin.held = true;
      spin.dragged = true;
      returning = false;
      speed = 0;
    },
    { passive: false }
  );
  element.addEventListener(
    "touchmove",
    (event) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      spin.zoom = clamp((pinch.zoom * spread(event.touches)) / Math.max(pinch.distance, 1), 1, closest);
      wake();
    },
    { passive: false }
  );
  const endPinch = (event) => {
    if (!pinch || event.touches.length >= 2) return;
    pinch = null;
    spin.held = Boolean(pointer);
    wake();
  };
  element.addEventListener("touchend", endPinch);
  element.addEventListener("touchcancel", endPinch);

  // Вернуть модель к позе страницы. Лишние полные обороты отбрасываются: назад она идёт коротким путём
  spin.home = () => {
    if (spin.held || returning) return;
    if (Math.abs(spin.yaw) < 0.002 && Math.abs(spin.pitch) < 0.002 && Math.abs(spin.zoom - 1) < 0.002) return;
    spin.yaw = Math.atan2(Math.sin(spin.yaw), Math.cos(spin.yaw));
    speed = 0;
    returning = true;
    wake();
  };

  // Шаг времени: инерция и возврат. Отвечает true, пока модель ещё движется
  spin.update = (now) => {
    const dt = Math.min((now - lastUpdate) / 1000, 0.05);
    lastUpdate = now;
    if (spin.held) return true;
    if (returning) {
      const keep = Math.exp(-dt / 0.16);
      spin.yaw *= keep;
      spin.pitch *= keep;
      spin.zoom = 1 + (spin.zoom - 1) * keep;
      if (Math.abs(spin.yaw) < 0.002 && Math.abs(spin.pitch) < 0.002 && Math.abs(spin.zoom - 1) < 0.002) {
        spin.yaw = spin.pitch = 0;
        spin.zoom = 1;
        returning = false;
      }
      return true;
    }
    if (Math.abs(speed) > 0.05) {
      spin.yaw += speed * dt;
      speed *= Math.exp(-dt / 0.35);
      return true;
    }
    speed = 0;
    return false;
  };
  return spin;
}
