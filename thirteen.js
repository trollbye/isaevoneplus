// ===== OnePlus 13: особые сцены этой страницы =====
// Общий page.js умеет тёмные кадры и таблицы. Здесь к нему добавляются четыре сцены:
// «model»  — первый экран и осмотр объёмной модели: подписи сменяют друг друга, пока модель поворачивается;
// «zoom»   — семь снимков одного места, от 0,6× до 30×: кадр приближается;
// «deck»   — стопка из трёх кадров: верхний улетает, под ним открывается следующий;
// «charge» — зарядка: растут проценты, минуты и полоска.
// Каждая сцена получает p — сколько её прокрутки пройдено (0..1) и enter — насколько она въехала на экран.
// Саму объёмную модель рисует thirteen-3d.js: ему достаточно знать p, оно лежит в window.MODEL13.
{
  window.MODEL13 = { p: 0 };
  const FULL = 36; // за столько минут телефон заряжается от 1 до 100%

  // части сцены ищутся один раз и запоминаются на самой сцене
  const parts = (scene) => {
    if (!scene.parts) {
      const find = (selector) => scene.element.querySelector(selector);
      const all = (selector) => [...scene.element.querySelectorAll(selector)];
      scene.parts = {
        steps: all(".steps li"),
        word: find(".bigword"),
        hero: find(".hero-copy"),
        hint: find(".model-hint"),
        notes: all(".model-notes li"),
        shots: all(".zoom-view img"),
        value: find(".zoom-value"),
        ticks: find(".zoom-ticks"),
        deck: find(".deck"),
        cards: all(".deck figure"),
        box: find(".charge"),
        percent: find("#chargeValue"),
        time: find("#chargeTime"),
        fill: find("#chargeFill"),
      };
    }
    return scene.parts;
  };

  // текст меняется, только когда он действительно другой: так страница не перерисовывает его каждый кадр
  const write = (element, text) => {
    if (element.textContent !== text) element.textContent = text;
  };
  // кратность зума по-русски: «0,6×», «2,4×», «30×»
  const times = (value) => `${value < 10 ? value.toFixed(1).replace(".", ",") : Math.round(value)}×`;

  window.SCENE_KINDS = {
    model(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { word, hero, hint, notes } = parts(scene);
      window.MODEL13.p = p;

      // первый текст и цифра за телефоном уходят, когда модель подлетает камерой
      const away = ease((p - 0.07) / 0.09);
      hero.style.opacity = (1 - away).toFixed(3);
      hero.style.transform = `translate3d(0, ${(away * -70).toFixed(1)}px, 0)`;
      word.style.opacity = (1 - ease((p - 0.07) / 0.12)).toFixed(3);
      word.style.transform = `translate3d(${(p * -30).toFixed(2)}vw, 0, 0)`;
      hint.style.opacity = (1 - ease(p / 0.05)).toFixed(3);

      // три подписи осмотра: каждая видна, пока модель стоит в своей позе
      [0.2, 0.52, 0.78].forEach((from, index) => {
        const until = [0.42, 0.68, 2][index];
        const shown = ease((p - from) / 0.06) * (1 - ease((p - until) / 0.05));
        notes[index].style.opacity = shown.toFixed(3);
        notes[index].style.transform = `translate3d(0, ${((1 - ease((p - from) / 0.06)) * 40).toFixed(1)}px, 0)`;
      });
    },

    zoom(p, enter, scene) {
      const { ease, clamp } = window.SCENE_TOOLS;
      const { shots, value, ticks } = parts(scene);
      // шкала под кадром собирается один раз из кратностей снимков
      if (!scene.levels) {
        scene.levels = shots.map((shot) => Number(shot.dataset.x));
        scene.marks = scene.levels.map((level) => {
          const mark = document.createElement("li");
          mark.textContent = `${String(level).replace(".", ",")}×`;
          ticks.appendChild(mark);
          return mark;
        });
      }
      const last = shots.length - 1;
      const position = clamp((p - 0.05) / 0.86, 0, 1) * last;
      const index = Math.min(Math.floor(position), last);
      const t = position - index;
      // текущий снимок плавно увеличивается, в конце поверх него проявляется следующий, уже приближённый
      shots.forEach((shot, order) => {
        const on = order === index ? 1 : order === index + 1 ? ease((t - 0.55) / 0.45) : 0;
        shot.style.opacity = on.toFixed(3);
        shot.style.transform = `scale(${(order === index ? 1 + t * 0.34 : 1).toFixed(4)})`;
      });
      // число над кадром растёт вместе с приближением
      const from = scene.levels[index];
      const to = scene.levels[Math.min(index + 1, last)];
      write(value, times(from * Math.pow(to / from, t)));
      const nearest = Math.round(position);
      scene.marks.forEach((mark, order) => mark.classList.toggle("is-on", order === nearest));
    },

    deck(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { deck, cards, steps } = parts(scene);
      deck.style.transform = `translate3d(0, calc(var(--vh) * ${((1 - enter) * 9).toFixed(2)}), 0)`;
      deck.style.opacity = ease(enter / 0.7).toFixed(3);

      // первый кадр улетает на 30% сцены, второй на 62%; третий остаётся
      const gone = [ease((p - 0.3) / 0.16), ease((p - 0.62) / 0.16), 0];
      let lifted = 0; // сколько кадров уже улетело: нижние за это время поднимаются на их место
      cards.forEach((card, index) => {
        const depth = index - lifted;
        const out = gone[index];
        const tilt = (index % 2 ? 2.4 : -2) * Math.min(depth, 1) - out * 16;
        card.style.transform =
          `translate3d(${(out * -58 + depth * 2.2).toFixed(2)}%, ${(out * -118 + depth * 4.4).toFixed(2)}%, 0) ` +
          `rotate(${tilt.toFixed(2)}deg) scale(${(1 - depth * 0.05).toFixed(4)})`;
        card.style.opacity = (1 - ease((out - 0.55) / 0.45)).toFixed(3);
        lifted += out;
      });
      const active = p < 0.38 ? 0 : p < 0.7 ? 1 : 2;
      steps.forEach((item, index) => item.classList.toggle("is-on", index === active));
    },

    charge(p, enter, scene) {
      const { ease, clamp } = window.SCENE_TOOLS;
      const { box, percent, time, fill } = parts(scene);
      box.style.transform = `translate3d(0, calc(var(--vh) * ${((1 - enter) * 8).toFixed(2)}), 0)`;
      box.style.opacity = ease(enter / 0.7).toFixed(3);

      // заряд идёт от 1 до 100% между 12% и 74% сцены
      const go = clamp((p - 0.12) / 0.62, 0, 1);
      write(percent, String(Math.round(1 + go * 99)));
      write(time, String(Math.round(go * FULL)));
      fill.style.transform = `scaleX(${go.toFixed(4)})`;

      const show = ease((p - 0.03) / 0.14) * (1 - ease((p - 0.9) / 0.1));
      scene.copy.style.opacity = show.toFixed(3);
      scene.copy.style.transform = `translate3d(0, ${((1 - ease((p - 0.03) / 0.14)) * 46).toFixed(1)}px, 0)`;
      scene.stats.forEach((item, index) => {
        const on = ease((p - 0.16 - index * 0.06) / 0.16);
        item.style.opacity = on.toFixed(3);
        item.style.transform = `translate3d(0, ${((1 - on) * 24).toFixed(1)}px, 0)`;
      });
    },
  };

  // «Без анимаций» (так настроен телефон или компьютер) сцены стоят на месте и прокрутка их не двигает:
  // зарядка сразу показана в конце — 100% за 36 минут, а не «1% и 0 минут»
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.getElementById("chargeValue").textContent = "100";
    document.getElementById("chargeTime").textContent = String(FULL);
    document.getElementById("chargeFill").style.transform = "scaleX(1)";
  }
}
