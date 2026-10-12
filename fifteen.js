// ===== OnePlus 15: особые сцены этой страницы =====
// Общий page.js умеет первый экран, тёмный кадр с камерой и таблицы. Здесь к нему добавляются сцены:
// «lit»   — крупный текст, слова в котором загораются по мере прокрутки;
// «spin»  — раздел «Дизайн»: живой телефон поворачивается (сам телефон рисует hero-live.js);
// «burst» — серия из десяти снимков: прокрутка листает кадры по порядку;
// «chips» — три чипа: вперёд по очереди выходит каждый;
// «cell»  — батарея: полоски ёмкости растут и сравниваются с соперниками;
// «hz»    — экран: стрелка шкалы идёт от 60 до 165 Гц.
// Каждая сцена получает p — сколько её прокрутки пройдено (0..1) и enter — насколько она въехала на экран.
// Ещё здесь подсветка плиток с цифрами и подгрузка объёмного разбора камеры.
{
  const byId = (id) => document.getElementById(id);
  const all = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const phone = window.PHONES["15"];

  // ----- Текст, который загорается -----
  // Текст написан в phone.html обычным абзацем. Здесь он режется на слова; то, что выделено тегом <b>
  // (главные цифры), загорается целиком и светится холодным светом
  const words = [];
  [...byId("lit").childNodes].forEach((node) => {
    const key = node.nodeType === Node.ELEMENT_NODE;
    const pieces = key ? [node.textContent] : node.textContent.split(/(\s+)/);
    const fragment = document.createDocumentFragment();
    pieces.forEach((piece) => {
      if (!piece.trim()) return fragment.append(piece); // пробелы остаются пробелами
      const span = document.createElement("span");
      span.textContent = piece;
      if (key) span.className = "is-key";
      words.push(span);
      fragment.append(span);
    });
    node.replaceWith(fragment);
  });

  // ----- Дизайн: сколько раздела пролистано, узнаёт hero-live.js — он и поворачивает телефон -----
  window.TURN15 = { p: 0, enter: 0 };
  const turnPhone = byId("turnPhone");
  const spinWord = byId("spinWord");
  const design = byId("design");
  // подсказка «Покрути телефон» пропадает, как только его покрутили
  turnPhone.addEventListener("pointerdown", () => design.classList.add("was-spun"), { once: true });

  // ----- Серия: десять кадров стопкой и лента под ними -----
  const BURST = 10;
  const burstShots = [];
  const burstThumbs = [];
  for (let index = 0; index < BURST; index++) {
    const source = `assets/15/burst-${index}.webp`;
    let shot = index ? null : byId("burstFrame").querySelector("img");
    if (!shot) {
      shot = new Image();
      Object.assign(shot, { src: source, alt: "", width: 1270, height: 872, loading: "lazy", decoding: "async" });
      byId("burstFrame").appendChild(shot);
    }
    burstShots.push(shot);
    const item = document.createElement("li");
    const thumb = new Image();
    Object.assign(thumb, { src: source, alt: "", width: 1270, height: 872, loading: "lazy", decoding: "async" });
    item.appendChild(thumb);
    byId("burstStrip").appendChild(item);
    burstThumbs.push(item);
  }
  let burstAt = -1;

  // ----- Батарея: полоски ёмкости. Числа берутся из той же строки, что и в таблице сравнения -----
  const capacity = phone.versus.rows.find((row) => row.label === "Ёмкость");
  const bars = capacity.values.map((value, index) => {
    const item = document.createElement("li");
    if (index === 0) item.className = "is-lead";
    const name = document.createElement("span");
    name.textContent = phone.versus.rivals[index];
    const number = document.createElement("b");
    number.textContent = "0";
    item.append(name, number, document.createElement("i"));
    byId("cellBars").appendChild(item);
    return { item, number, value, shown: -1 };
  });
  const spaced = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // ----- Экран: шкала частоты -----
  const HZ_FROM = 60;
  const HZ_TO = 165;
  const dialNow = byId("dialNow");
  const dialNote = byId("dialNote");
  const dialScale = byId("dialScale");
  let hzShown = -1;

  // части сцены ищутся один раз и запоминаются на самой сцене
  const parts = (scene, find) => (scene.parts ||= find(scene.element));
  const light = (steps, active) => steps.forEach((item, index) => item.classList.toggle("is-on", index === active));
  // «окно»: 1, пока p между from и to, с плавными краями шириной soft
  const within = (p, from, to, soft, ease) => ease((p - from + soft) / soft) * (1 - ease((p - to) / soft));

  window.SCENE_KINDS = {
    // к 80% прокрутки горят все слова
    lit(p) {
      const { clamp } = window.SCENE_TOOLS;
      const reach = (p / 0.8) * (words.length + 2);
      words.forEach((word, index) => {
        word.style.opacity = (0.12 + clamp(reach - index, 0, 1) * 0.88).toFixed(3);
      });
    },

    spin(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { steps } = parts(scene, (element) => ({ steps: all(".steps li", element) }));
      Object.assign(window.TURN15, { p, enter });
      turnPhone.style.opacity = ease(enter / 0.7).toFixed(3);
      // название цвета огромными буквами проезжает за телефоном
      spinWord.style.transform = `translate3d(${(30 - p * 110).toFixed(2)}vw, 0, 0)`;
      light(steps, p < 0.36 ? 0 : p < 0.62 ? 1 : 2);
    },

    burst(p, enter, scene) {
      const { clamp, ease } = window.SCENE_TOOLS;
      const { view, copy } = parts(scene, (element) => ({ view: element.querySelector(".burst-view"), copy: element.querySelector(".side-copy") }));
      const show = ease(enter / 0.8);
      view.style.opacity = show.toFixed(3);
      view.style.transform = `translate3d(0, ${((1 - show) * 8).toFixed(2)}vh, 0)`;
      copy.style.opacity = ease((enter - 0.4) / 0.6).toFixed(3);
      // кадры идут по порядку между 12% и 86% сцены: по одному на равный отрезок прокрутки
      const at = Math.floor(clamp((p - 0.12) / 0.74, 0, 0.9999) * BURST);
      if (at === burstAt) return;
      burstAt = at;
      burstShots.forEach((shot, index) => shot.classList.toggle("is-on", index === at));
      burstThumbs.forEach((thumb, index) => thumb.classList.toggle("is-on", index === at));
      byId("burstNow").textContent = String(at + 1).padStart(2, "0");
    },

    chips(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { chips, floor, steps } = parts(scene, (element) => ({
        // порядок тот же, что у подписей: главный чип, чип касаний, чип Wi-Fi
        chips: [".is-main", ".is-touch", ".is-wifi"].map((name) => element.querySelector(`.chip${name}`)),
        floor: element.querySelector(".chips-floor"),
        steps: all(".steps li", element),
      }));
      const rise = ease((enter - 0.25) / 0.75);
      floor.style.opacity = ease(enter / 0.6).toFixed(3);
      // у каждого чипа свой отрезок прокрутки: на нём он выходит вперёд и становится ярче, остальные отступают
      const turns = [within(p, -1, 0.33, 0.1, ease), within(p, 0.43, 0.6, 0.1, ease), within(p, 0.7, 2, 0.1, ease)];
      // На узком экране три чипа в ряд не помещаются: тот, что вышел вперёд, встаёт в середину,
      // главный чип уступает ему место, а остальные гаснут сильнее
      const stacked = window.STACKED.matches;
      const pull = stacked ? 31 : 0;
      const dim = stacked ? 0.14 : 0.4;
      const side = [turns[2] - turns[1], -turns[1], turns[2]]; // куда сдвигается каждый: главный, чип касаний, чип Wi-Fi
      chips.forEach((chip, index) => {
        const front = turns[index];
        // пока сцена въезжает, чипы съезжаются с разных сторон
        const drift = (index - 1) * (1 - rise) * 6 + side[index] * pull;
        chip.style.transform = `translate3d(${drift.toFixed(2)}vw, ${((1 - rise) * 14 - front * 2.4 + (0.5 - p) * (index + 1) * 1.2).toFixed(2)}vh, 0) scale(${(0.84 + front * 0.22).toFixed(4)})`;
        chip.style.opacity = (rise * (dim + front * (1 - dim))).toFixed(3);
      });
      light(steps, p < 0.38 ? 0 : p < 0.65 ? 1 : 2);
    },

    cell(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { photo, word, glow } = parts(scene, (element) => ({ photo: element.querySelector(".cell-phone"), word: element.querySelector(".cell-word"), glow: element.querySelector(".glow-cell") }));
      const show = ease(enter / 0.8);
      photo.style.opacity = show.toFixed(3);
      photo.style.transform = `translate3d(${((1 - show) * 10).toFixed(2)}vw, 0, 0) scale(${(0.94 + ease(p) * 0.08).toFixed(4)})`;
      glow.style.opacity = (0.35 + ease((p - 0.1) / 0.5) * 0.65).toFixed(3); // батарея «заряжается»: свечение набирает силу
      word.style.transform = `translate3d(${(18 - p * 36).toFixed(2)}vw, 0, 0)`;
      // полоски растут одна за другой; число на каждой набегает вместе с ней
      const top = bars[0].value;
      bars.forEach((bar, index) => {
        const grown = ease((p - 0.14 - index * 0.09) / 0.3);
        bar.item.style.setProperty("--fill", ((grown * bar.value) / top).toFixed(4));
        const number = Math.round((grown * bar.value) / 10) * 10;
        if (number === bar.shown) return;
        bar.shown = number;
        bar.number.textContent = spaced(grown >= 1 ? bar.value : number);
      });
    },

    hz(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { word, device, game, back } = parts(scene, (element) => ({
        word: element.querySelector(".hz-word"),
        device: element.querySelector(".hz-phone"),
        game: element.querySelector(".hz-phone .is-game"),
        back: element.querySelector(".hz-bg"),
      }));
      const show = ease(enter / 0.8);
      back.style.opacity = (show * 0.72).toFixed(3);
      word.style.opacity = (show * (0.35 + ease((p - 0.1) / 0.55) * 0.65)).toFixed(3);
      word.style.transform = `translate3d(${((0.5 - p) * 5).toFixed(2)}vw, 0, 0)`;
      device.style.opacity = show.toFixed(3);
      device.style.transform = `translate3d(${((1 - show) * 14 + (0.5 - p) * 3).toFixed(2)}vw, 0, 0)`;
      game.style.opacity = ease((p - 0.66) / 0.1).toFixed(3); // под конец на экране телефона игра: там и нужны 165 Гц
      // стрелка шкалы идёт от 60 до 165
      const turn = ease((p - 0.14) / 0.5);
      dialScale.style.setProperty("--at", turn.toFixed(4));
      const hz = Math.round(HZ_FROM + (HZ_TO - HZ_FROM) * turn);
      if (hz === hzShown) return;
      hzShown = hz;
      dialNow.textContent = hz;
      dialNote.textContent = hz < 100 ? "обычный экран" : hz < 140 ? "iPhone и Galaxy — 120" : "OnePlus 15 в играх";
      dialScale.classList.toggle("is-top", hz >= 160);
    },
  };

  // ----- Плитки с цифрами: свет следует за курсором -----
  // Плитки собирает page.js, поэтому слушаем всю сетку и на каждое движение говорим каждой плитке,
  // где относительно неё находится курсор
  const grid = byId("specGrid");
  grid.addEventListener(
    "pointermove",
    (event) => {
      for (const tile of grid.children) {
        const box = tile.getBoundingClientRect();
        tile.style.setProperty("--mx", `${Math.round(event.clientX - box.left)}px`);
        tile.style.setProperty("--my", `${Math.round(event.clientY - box.top)}px`);
      }
    },
    { passive: true }
  );

  // ----- Объёмный разбор камеры загружается не вместе со страницей, а чуть позже -----
  // Его сборка занимает у процессора заметное время. Если делать её в момент, когда до разбора долистали, прокрутка
  // на миг замирает. Поэтому он собирается в свободную минуту вскоре после открытия страницы, пока читают первый экран;
  // а если до него долистали раньше — сразу
  let teardownAsked = false;
  const loadTeardown = () => {
    if (teardownAsked) return;
    teardownAsked = true;
    import("./teardown3d.js?v=23").catch((error) => {
      document.documentElement.classList.add("no-3d"); // видеокарта не справилась: раздел с разбором прячется
      console.error(error);
    });
  };
  window.whenCalm(loadTeardown);
  new IntersectionObserver((entries) => entries[0].isIntersecting && loadTeardown(), { rootMargin: "150% 0px" }).observe(byId("teardown"));
}
