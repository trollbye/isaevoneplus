// ===== OnePlus 12: особые сцены этой страницы =====
// Общий page.js умеет первый экран и таблицы. Здесь к нему добавляются четыре сцены:
// «light»  — кадр с белым телефоном проявляется кругом света;
// «lens»   — крупный снимок камеры: свет по очереди выделяет объективы;
// «strip»  — лента официальных фотографий едет в сторону;
// «layers» — начинка телефона раскладывается на десять слоёв.
// Каждая сцена получает p — сколько её прокрутки пройдено (0..1) и enter — насколько она въехала на экран.
// Живой телефон на первом экране рисует hero-live.js.
{
  const FRAME = 2464; // ширина общего кадра, в котором стоят слои телефона
  const CENTER = 1093; // середина слоёв в этом кадре: в собранном виде все они стоят здесь
  const REACH = 76; // круг света такого размера (в процентах от кадра) открывает кадр целиком

  // части сцены ищутся один раз и запоминаются на самой сцене
  const parts = (scene) => {
    if (!scene.parts) {
      const find = (selector) => scene.element.querySelector(selector);
      const all = (selector) => [...scene.element.querySelectorAll(selector)];
      scene.parts = {
        steps: all(".steps li"),
        frame: find(".light-frame"),
        image: find(".light-image"),
        rings: all(".light-rings i"),
        lens: find(".lens"),
        strip: find(".strip"),
        fill: find(".strip-bar i"),
        box: find(".vitrine"),
        smoke: find(".layers-smoke"),
        // для каждого слоя — на сколько кадра он сдвинут от середины
        layers: all(".layer").map((element) => {
          const style = getComputedStyle(element);
          const center = parseFloat(style.getPropertyValue("--x")) + parseFloat(style.getPropertyValue("--w")) / 2;
          return { element, offset: (CENTER - center) / FRAME };
        }),
      };
    }
    return scene.parts;
  };

  // размеры, которые зависят от окна, считаются заново после его изменения
  let sizes = {};
  window.addEventListener("resize", () => (sizes = {}));

  // подпись в списке слева: активна одна
  const light = (steps, active) => steps.forEach((item, index) => item.classList.toggle("is-on", index === active));

  window.SCENE_KINDS = {
    light(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { frame, image, rings } = parts(scene);

      // пока сцена въезжает, от кадра виден маленький глазок; дальше круг света расходится на весь кадр
      const open = ease((enter - 0.6) / 0.4) * 0.09 + ease((p - 0.03) / 0.42) * 0.91;
      frame.style.clipPath = `circle(${(open * REACH).toFixed(2)}% at 52% 53%)`;
      image.style.transform = `scale(${(1.2 - ease(p / 0.8) * 0.2).toFixed(3)})`;

      // три кольца бегут чуть впереди края круга и гаснут, когда кадр открыт; их размер считается от ширины кадра
      sizes.frame ??= Math.hypot(frame.offsetWidth, frame.offsetHeight) / Math.SQRT2;
      rings.forEach((ring, index) => {
        const size = (open + 0.05 * (index + 1)) * REACH * 0.02 * sizes.frame;
        ring.style.width = ring.style.height = `${size.toFixed(1)}px`;
        ring.style.opacity = (Math.sin(Math.min(open * 1.15, 1) * Math.PI) * (0.7 - index * 0.2)).toFixed(3);
      });

      // заголовок появляется сразу, рядом с глазком: экран не стоит пустым, пока круг мал
      const show = ease((p - 0.02) / 0.14) * (1 - ease((p - 0.9) / 0.1));
      scene.copy.style.opacity = show.toFixed(3);
      scene.copy.style.transform = `translate3d(0, ${((1 - ease((p - 0.02) / 0.14)) * 46).toFixed(1)}px, 0)`;
      scene.stats.forEach((item, index) => {
        const on = ease((p - 0.34 - index * 0.06) / 0.16);
        item.style.opacity = on.toFixed(3);
        item.style.transform = `translate3d(0, ${((1 - on) * 24).toFixed(1)}px, 0)`;
      });
    },

    lens(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { lens, steps } = parts(scene);
      lens.style.transform = `translate3d(0, calc(var(--vh) * ${((1 - enter) * 10).toFixed(2)}), 0) scale(${(0.94 + ease(p) * 0.06).toFixed(3)})`;
      lens.style.opacity = ease(enter / 0.7).toFixed(3);

      // сначала снимок виден целиком, потом свет обходит три объектива и в конце снова открывает всё
      const active = p < 0.4 ? 0 : p < 0.68 ? 1 : 2;
      const on = p > 0.1 && p < 0.94 ? active : -1;
      if (scene.on !== on) {
        scene.on = on;
        lens.dataset.on = on;
      }
      light(steps, active);
    },

    strip(p, enter, scene) {
      const { clamp } = window.SCENE_TOOLS;
      const { strip, fill } = parts(scene);
      // лента длиннее окна: за сцену она проезжает ровно на эту разницу
      sizes.travel ??= Math.max(strip.offsetWidth - window.innerWidth, 0);
      const go = clamp((p - 0.05) / 0.88, 0, 1);
      strip.style.transform = `translate3d(${((1 - enter) * 90 - go * sizes.travel).toFixed(1)}px, 0, 0)`;
      fill.style.transform = `scaleX(${go.toFixed(4)})`;
    },

    layers(p, enter, scene) {
      const { ease, clamp } = window.SCENE_TOOLS;
      const { box, layers, smoke, steps } = parts(scene);
      box.style.transform = `translate3d(0, calc(var(--vh) * ${((1 - enter) * 8).toFixed(2)}), 0)`;
      box.style.opacity = ease(enter / 0.7).toFixed(3);

      // слои стоят стопкой, потом разъезжаются на свои места: крайние трогаются первыми, средние чуть позже
      sizes.box ??= box.offsetWidth;
      const spread = clamp((p - 0.14) / 0.48, 0, 1);
      const last = layers.length - 1;
      layers.forEach(({ element, offset }, index) => {
        const lag = (1 - Math.abs(index - last / 2) / (last / 2)) * 0.25;
        const apart = ease((spread - lag) / 0.75);
        element.style.transform = `translate3d(${(offset * sizes.box * (1 - apart)).toFixed(1)}px, 0, 0)`;
      });
      smoke.style.opacity = ease((p - 0.68) / 0.14).toFixed(3);
      light(steps, p < 0.2 ? 0 : p < 0.66 ? 1 : 2);
    },
  };
}
