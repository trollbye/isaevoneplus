// ===== Кручение объёмной модели мышью и пальцем: общая часть для всех страниц =====
// Страница сама рисует свою модель. Этот файл только слушает указатель и считает три числа-добавки к позе модели:
//   yaw   — поворот вокруг вертикали (его даёт движение вбок),
//   pitch — наклон (движение мыши вверх-вниз; у пальца вертикальный жест листает страницу, поэтому наклона нет),
//   zoom  — крупность (два пальца: развести — ближе, свести — дальше).
// Палец отпустили — модель ещё немного докручивается по инерции. Страницу листают дальше — всё плавно
// возвращается к позе, которую задаёт прокрутка (это включает страница, вызывая home()).
// Как пользоваться: const spin = attachSpin(элемент, { wake });  в цикле рисования — spin.update(now);
// update отвечает true, пока что-то ещё движется и кадр надо перерисовать.
//
// Режим просмотра (телефоны и планшеты). На сенсорном экране вертикальный жест листает страницу, поэтому наклонить
// модель пальцем нельзя и верхнюю с нижней гранью не увидеть. Для этого у модели есть кнопка «Покрутить в 3D»
// (и нажатие на саму модель): модель открывается на весь экран, и там её крутят в любую сторону (viewer.js).
// Пока режим открыт, в spin.view лежит готовая поза { yaw, pitch, zoom, x, y } — страница рисует модель по ней,
// а не по прокрутке. Для телефонов из phonekit.js это делает spin.pose(модель, камера).
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
// когда страницу листали в последний раз: касание, которым останавливают прокрутку, режим просмотра не открывает
let scrolledAt = 0;
window.addEventListener("scroll", () => (scrolledAt = performance.now()), { passive: true });

// viewer: false — без режима просмотра (плитки на главной — это ссылки); { host } — куда поставить кнопку,
// если не годится место по умолчанию (рамка, в которой лежит холст)
export function attachSpin(element, { wake = () => {}, tilt = 0.5, closest = 1.7, turnsPerWidth = 0.9, viewer = {} } = {}) {
  const spin = { yaw: 0, pitch: 0, zoom: 1, held: false, dragged: false, view: null, span: 18.5, width: 7.6, element };
  let viewMoved = false; // поза просмотра изменилась — нужен новый кадр
  spin.touch = () => {
    viewMoved = true;
    wake();
  };
  // Ставит телефон из phonekit.js в позу просмотра и приближает камерой (а не размером модели: так грань, повёрнутая
  // к зрителю, не упирается в ближнюю границу кадра). Отвечает true, если режим просмотра открыт
  spin.pose = (model, camera) => {
    const view = spin.view;
    const zoom = view ? view.zoom : 1;
    if (camera.zoom !== zoom) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    if (!view) {
      if (model.position.x) model.position.x = 0;
      return false;
    }
    spin.span = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360); // сколько сантиметров видно по высоте
    model.rotation.set(view.pitch, view.yaw, 0);
    model.position.set(view.x * spin.span, view.y * spin.span, 0);
    model.scale.setScalar(1);
    return true;
  };
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
    if (spin.view) return; // в режиме просмотра жесты разбирает viewer.js
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (pointer) return; // второй палец — это уже щипок, им занимаются события касаний ниже
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, start: event.timeStamp, travel: 0, onButton: Boolean(event.target.closest && event.target.closest(".view3d-open")) };
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
    if (!pointer || event.pointerId !== pointer.id || pinch || spin.view) return;
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
    // короткое касание модели пальцем без движения открывает режим просмотра
    const tapped = event.type === "pointerup" && event.pointerType !== "mouse" && pointer.travel <= 6 && event.timeStamp - pointer.start < 350 && !pointer.onButton;
    pointer = null;
    if (tapped && spin.open && performance.now() - scrolledAt > 300) spin.open();
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
      if (event.touches.length !== 2 || spin.view) return;
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
    if (spin.held || returning || spin.view) return;
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
    if (spin.view) {
      // в режиме просмотра кадр нужен, только когда поза поменялась
      const moved = viewMoved;
      viewMoved = false;
      return moved;
    }
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

  // ----- Кнопка «Покрутить в 3D» и вход в режим просмотра -----
  if (viewer) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "view3d-open";
    button.textContent = "Покрутить в 3D";
    // кнопка стоит в рамке модели; если холст переехал в другую рамку (OnePlus 15), страница зовёт place() ещё раз
    spin.place = () => {
      if (spin.view) return;
      const host = viewer.host || (element.tagName === "CANVAS" ? element.parentElement : element);
      if (host && button.parentElement !== host) host.appendChild(button);
    };
    spin.place();
    // подсказка: когда кнопку впервые видно целиком, вокруг неё дважды расходится кольцо (стили — в style.css)
    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        seen.disconnect();
        button.classList.add("is-new");
        button.addEventListener("animationend", () => button.classList.remove("is-new"));
      },
      { threshold: 0.9 }
    );
    seen.observe(button);
    let opening = false;
    spin.open = () => {
      if (opening || spin.view) return;
      opening = true;
      import("./viewer.js?v=1")
        .then((module) => module.openViewer(spin, button))
        .catch((error) => console.error(error))
        .finally(() => (opening = false));
    };
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      spin.open();
    });
  }
  return spin;
}
