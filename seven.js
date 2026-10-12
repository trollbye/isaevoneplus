// ===== OnePlus 7 Pro: особые сцены этой страницы =====
// Общий page.js умеет первый экран, тёмные кадры и таблицы. Здесь к нему добавляются две сцены:
// «xray» — выдвижная камера крупным планом: она поднимается, потом корпус становится прозрачным
//          и видно механизм (мотор, винт, каретка);
// «hud»  — сканер: полоса света проходит по снимку сверху вниз и проявляет его.
// Каждая сцена получает p — сколько её прокрутки пройдено (0..1) и enter — насколько она въехала на экран.
// Живой телефон на первом экране рисует seven-hero.js.
{
  const LIFT = 230; // на сколько пикселей сцены блок камеры выезжает из корпуса

  // ----- Сцена с камерой нарисована в координатах 1920 × 1000 и целиком масштабируется под окно -----
  const stage = document.getElementById("xrayStage");
  function fitStage() {
    const wide = !window.STACKED.matches;
    let scale;
    let x;
    let compact = true; // мелкая сцена: у подписей остаются только названия
    if (wide) {
      // слева стоит текст, сцена начинается за ним: в окно должен поместиться кусок от отметки 150 до 1690
      // (там кончаются подписи), а справа ещё остаётся место под точки-навигацию
      const side = Math.max(window.innerWidth * 0.06, (window.innerWidth - 1320) / 2);
      const left = side + 400;
      const room = window.innerWidth - left - 60;
      scale = Math.min(room / 1540, window.innerHeight / 1240);
      compact = scale < 0.46;
      // без вторых строк подписи короче, поэтому сцену можно показать крупнее
      if (compact) scale = Math.min(room / 1400, window.innerHeight / 1240);
      x = left - 150 * scale;
    } else {
      // на узком окне текст стоит сверху, а в ширину помещается кусок от 635 до 1595: камера, винт, мотор и их подписи
      scale = Math.min(window.innerWidth / 960, (window.innerHeight * 0.62) / 1000);
      x = window.innerWidth / 2 - 1115 * scale;
    }
    stage.classList.toggle("is-compact", compact);
    stage.style.setProperty("--s", scale.toFixed(4));
    stage.style.setProperty("--x", `${Math.round(x)}px`);
    // во сколько раз увеличить буквы подписей, чтобы на экране они не стали мельче читаемого
    stage.style.setProperty("--k", Math.max(1, (compact ? 13 : 14.5) / (28 * scale)).toFixed(3));
  }
  fitStage();
  window.addEventListener("resize", fitStage);

  // части сцены ищутся один раз и запоминаются на самой сцене
  const parts = (scene) => {
    if (!scene.parts) {
      const find = (selector) => scene.element.querySelector(selector);
      const all = (selector) => [...scene.element.querySelectorAll(selector)];
      scene.parts = {
        steps: all(".steps li"),
        body: find(".xray-body"),
        inside: find(".xray-inside"),
        lines: find(".xray-lines"),
        module: find(".xray-module"),
        carriage: find("#xrayCarriage"),
        thread: find("#xrayThread"),
        cable: find("#xrayCable"),
        scan: find(".xray-scan"),
        tags: all(".xray-tag"),
        riders: all(".xray-tag.is-ride"),
        leaders: all(".xray-leader"),
        top: find(".hud-top"),
        line: find(".hud-line"),
      };
    }
    return scene.parts;
  };

  window.SCENE_KINDS = {
    xray(p, enter, scene) {
      const { ease, clamp } = window.SCENE_TOOLS;
      const { steps, body, inside, lines, module, carriage, thread, cable, scan, tags, riders, leaders } = parts(scene);

      // Порядок: камера поднимается в «настоящем» виде → корпус становится прозрачным →
      // камера опускается и поднимается снова, чтобы было видно, как работает механизм
      const rise = ease((p - 0.05) / 0.14);
      const clear = ease((p - 0.28) / 0.12);
      const down = ease((p - 0.5) / 0.12);
      const again = ease((p - 0.68) / 0.12);
      const lift = LIFT * (rise - down + again);

      const shift = `translate3d(0, ${(-lift).toFixed(1)}px, 0)`;
      module.style.transform = shift;
      // пока корпус непрозрачный, часть камеры внутри него не видна: снимок обрезается по верхней грани телефона
      // (иначе камера просвечивала бы там, где снимок корпуса гаснет книзу)
      const hidden = Math.max(0, 275 - lift) * (1 - clear);
      module.style.clipPath = hidden > 0.5 ? `inset(0 0 ${hidden.toFixed(1)}px 0)` : "none";
      carriage.setAttribute("transform", `translate(0 ${(-lift).toFixed(1)})`);
      // подписи камеры и пружины едут вместе с ними
      riders.forEach((tag) => {
        tag.style.transform = shift;
      });
      // витки на винте бегут, пока каретка едет; шлейф тянется за камерой
      thread.setAttribute("stroke-dashoffset", (lift * 1.6).toFixed(1));
      cable.setAttribute("d", `M975 ${(806 - lift).toFixed(0)}C975 ${(900 - lift * 0.4).toFixed(0)} 860 ${(860 - lift * 0.2).toFixed(0)} 860 948`);

      body.style.opacity = (1 - clear * 0.88).toFixed(3);
      inside.style.opacity = (clear * 0.75).toFixed(3);
      lines.style.opacity = clear.toFixed(3);
      // полоса сканера проходит сверху вниз ровно в момент, когда корпус становится прозрачным
      const sweep = clamp((p - 0.26) / 0.16, 0, 1);
      scan.style.transform = `translate3d(0, ${(250 + sweep * 720).toFixed(0)}px, 0)`;
      scan.style.opacity = Math.sin(sweep * Math.PI).toFixed(3);

      // подписи появляются по очереди, линия-выноска — вместе со своей подписью
      const shown = (index) => ease((p - 0.4 - index * 0.06) / 0.06);
      tags.forEach((tag, index) => {
        tag.style.opacity = shown(index).toFixed(3);
      });
      leaders.forEach((leader) => {
        leader.style.opacity = (shown(Number(leader.dataset.tag)) * 0.5).toFixed(3);
      });
      const active = p < 0.27 ? 0 : p < 0.64 ? 1 : 2;
      steps.forEach((item, index) => item.classList.toggle("is-on", index === active));
    },

    hud(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { top, line } = parts(scene);
      // полоса идёт сверху вниз, снимок открывается следом за ней
      const sweep = ease((enter - 0.7) / 0.3) * 0.12 + ease((p - 0.02) / 0.36) * 0.88;
      top.style.clipPath = `inset(0 0 ${((1 - sweep) * 100).toFixed(2)}% 0)`;
      line.style.transform = `translate3d(0, ${(sweep * line.parentElement.offsetHeight).toFixed(1)}px, 0)`;
      line.style.opacity = (sweep > 0.002 && sweep < 0.998 ? 1 : 0).toFixed(0);

      const show = ease((p - 0.1) / 0.2) * (1 - ease((p - 0.88) / 0.12));
      scene.copy.style.opacity = show.toFixed(3);
      scene.copy.style.transform = `translate3d(0, ${((1 - ease((p - 0.1) / 0.2)) * 46).toFixed(1)}px, 0)`;
      scene.stats.forEach((item, index) => {
        const on = ease((p - 0.22 - index * 0.06) / 0.16);
        item.style.opacity = on.toFixed(3);
        item.style.transform = `translate3d(0, ${((1 - on) * 24).toFixed(1)}px, 0)`;
      });
    },
  };
}
