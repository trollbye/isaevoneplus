// ===== OnePlus Open: особые сцены этой страницы =====
// Общий page.js умеет тёмные кадры и таблицы. Здесь к нему добавляются три сцены:
// «unfold»  — первый экран: ролик, на котором телефон раскрывается. Это обычное видео: оно один раз проигрывается
//             само, когда страницу открыли, и замирает на последнем кадре. Прокрутка им не управляет;
// «book»    — раскрытый телефон из двух половинок: он распрямляется, потом на экране встают одно, два и три окна;
// «outside» — сложенный телефон поворачивается (сам объёмный телефон рисует open-turn.js).
// Каждая сцена получает p — сколько её прокрутки пройдено (0..1) и enter — насколько она въехала на экран.
// Ещё здесь гармошка со снимками: наведи или нажми — снимок раскроется.
{
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.OPENTURN = { p: 0, enter: 0 };

  // ----- Ролик раскрытия -----
  // Файл assets/open/unfold.mp4 собран из кадров официального ролика OnePlus (скрипт .claude/tools/film.mjs):
  // 60 кадров в секунду, плавный разгон и мягкая остановка. Показывает его сам браузер, как любое видео, —
  // расшифровкой занимается видеочип, поэтому ролик идёт ровно и не зависит от того, чем занята страница.
  // Пока ролик не начался, на его месте стоит первый кадр (poster), после конца остаётся последний.
  // Вместе с роликом расходятся половинки слова за ним: это анимация в open.css той же длины, что и ролик,
  // она запускается классом is-playing в ту же секунду, что и он. Сам ролик на странице ничем не двигается:
  // лёгкий отъезд кадра запечён в файл (иначе слабая видеокарта теряет кадры — см. open.css).
  const holder = document.getElementById("unfoldFrames");
  const sceneBox = holder.closest(".scene");
  const film = holder.querySelector("video");
  // playing — ролик сейчас идёт, done — он доигран или показан сразу последним кадром,
  // until — до какого момента страницу лучше не занимать тяжёлой работой (сборкой объёмного телефона ниже по странице)
  const state = (window.UNFOLD = { playing: false, done: false, until: 0 });
  let near = true; // первый экран рядом с окном
  let started = false;
  let wide = !window.STACKED.matches; // на широком окне текст стоит сбоку от ролика, на узком — под ним

  // Раскрытый телефон без ролика: при режиме «без анимаций» или если браузер не смог прочитать видео.
  // Тогда на месте ролика сразу стоит его последний кадр
  function still() {
    if (state.done) return;
    state.playing = false;
    state.done = true;
    started = true;
    blocked = false;
    sceneBox.classList.remove("is-playing");
    sceneBox.classList.add("is-done");
    film.poster = film.dataset.last;
    film.removeAttribute("src");
    film.load();
  }
  // Ролик стартует, когда страница загрузилась, вкладка открыта и первый экран виден. Если страницу открыли ниже
  // первого экрана, он начнётся, когда до него долистают.
  // После загрузки страница ещё полсекунды дорисовывает первый экран (картинки, шрифты): если запустить ролик
  // в это время, он спотыкается на первых кадрах (проверено замером), поэтому старт — через полсекунды и в свободную минуту.
  //
  // Загружен ли сам ролик. Компьютер загружает его заранее целиком (preload="auto"), и старт этого ждёт: тогда ролик
  // идёт без остановок. Но Safari на iPhone (и Chrome на Android при мобильном интернете) видео заранее не загружает
  // вообще: пока ролик не запустили, readyState там не поднимается выше 1, а событие «canplaythrough» не приходит.
  // Раньше старт ждал полной загрузки без срока — и на телефоне не наступал никогда: на первом экране так и стоял
  // первый кадр. Теперь загрузку ждём, только пока браузер её на самом деле ведёт (у ролика прибавляются данные).
  // Не ведёт — ролик запускается как есть: браузер начнёт грузить его по запросу и покажет, как только сможет
  let loadedAt = 0; // когда страница загрузилась
  let fetched = 0; // сколько секунд ролика браузер уже загрузил
  let fetchedAt = 0; // когда это число последний раз выросло
  const PATIENCE = 600; // столько миллисекунд без новых данных значит: сам браузер ролик не загружает
  const LIMIT = 8000; // дольше этого после загрузки страницы старт не ждёт ни при каких условиях
  const loading = (now) => {
    const ranges = film.buffered;
    const end = ranges.length ? ranges.end(ranges.length - 1) : 0;
    if (end > fetched + 0.01) {
      fetched = end;
      fetchedAt = now;
    }
    // networkState 2 — «идёт загрузка»; любое другое значение значит, что браузер её остановил или не начинал
    return film.networkState === 2 && now - fetchedAt < PATIENCE;
  };
  // Запуск. Браузер может его запретить: iPhone в режиме энергосбережения начинает видео только после касания.
  // Тогда ролик ждёт первого касания или нажатия клавиши (blocked), а если первый экран пролистали, не дождавшись, —
  // сцена unfold ниже ставит последний кадр: под текстом «стал планшет» должен быть раскрытый телефон
  let blocked = false;
  const play = () => {
    const played = film.play();
    if (!played) return;
    played.catch((error) => {
      if (state.done || state.playing) return;
      if (error && error.name === "NotAllowedError") blocked = true;
      else still();
    });
  };
  const retry = () => {
    if (!blocked || state.done || state.playing) return;
    blocked = false; // одно касание — одна попытка; запретят снова — флаг вернётся
    play();
  };
  ["pointerup", "touchend", "click", "keydown"].forEach((type) => window.addEventListener(type, retry, { capture: true, passive: true }));
  function start() {
    if (started || !near || document.hidden || !loadedAt) return;
    const now = performance.now();
    const wait = loadedAt + 500 - now;
    if (wait > 0) return void setTimeout(start, wait);
    if (film.readyState < 4 && loading(now) && now - loadedAt < LIMIT) return void setTimeout(start, 150);
    started = true;
    if (window.requestIdleCallback) requestIdleCallback(play, { timeout: 300 });
    else play();
  }
  film.addEventListener("playing", () => {
    if (state.done) return;
    blocked = false;
    state.playing = true;
    state.until = performance.now() + 7000; // ролик идёт 4 секунды, и ещё 3 секунды после него страницу не занимаем
    sceneBox.classList.add("is-playing");
  });
  film.addEventListener("ended", () => {
    state.playing = false;
    state.done = true;
  });
  film.addEventListener("error", still);
  film.addEventListener("canplaythrough", start);
  document.addEventListener("visibilitychange", start);
  const loaded = () => {
    loadedAt = fetchedAt = performance.now();
    start();
  };
  if (document.readyState === "complete") loaded();
  else window.addEventListener("load", loaded);
  new IntersectionObserver((entries) => {
    near = entries[0].isIntersecting;
    start();
  }).observe(sceneBox);
  if (reduced) still();

  window.addEventListener("resize", () => (wide = !window.STACKED.matches));

  // части сцены ищутся один раз и запоминаются на самой сцене
  const parts = (scene) => {
    if (!scene.parts) {
      const find = (selector) => scene.element.querySelector(selector);
      const all = (selector) => [...scene.element.querySelectorAll(selector)];
      scene.parts = {
        steps: all(".steps li"),
        hero: find(".hero-copy"),
        after: find(".hero-after"),
        curtain: find(".unfold-curtain"),
        word: find(".bigword"),
        book: find(".book"),
        halves: all(".book-half"),
        screens: [all(".book-half.is-left img"), all(".book-half.is-right img")],
        stage: find(".outside-stage"),
      };
      // слово за кадрами делится на две половинки: щель света проходит между ними
      const word = scene.parts.word;
      if (word) {
        const text = word.textContent;
        word.textContent = "";
        [text.slice(0, Math.ceil(text.length / 2)), text.slice(Math.ceil(text.length / 2))].forEach((half) => {
          const span = document.createElement("span");
          span.textContent = half;
          word.appendChild(span);
        });
      }
    }
    return scene.parts;
  };
  const light = (steps, active) => steps.forEach((item, index) => item.classList.toggle("is-on", index === active));

  window.SCENE_KINDS = {
    unfold(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { hero, after: second, curtain } = parts(scene);

      // Прокрутка на первом экране меняет только тексты: первый уходит, второй приходит. На широком окне между ними короткая пауза —
      // кадр открыт целиком; на узком текст стоит под кадром и ему не мешает, поэтому один сменяет другой сразу
      const gone = ease((p - (wide ? 0.04 : 0.1)) / 0.22);
      hero.style.opacity = (1 - gone).toFixed(3);
      hero.style.transform = `translate3d(0, ${(gone * -70).toFixed(1)}px, 0)`;
      const from = wide ? 0.4 : 0.3;
      const show = ease((p - from) / 0.2);
      second.style.opacity = show.toFixed(3);
      // шторка под текстом: уходит вместе с первым текстом и возвращается со вторым
      curtain.style.opacity = Math.max(1 - gone, show).toFixed(3);
      second.style.transform = `translate3d(0, ${((1 - show) * 40).toFixed(1)}px, 0)`;
      // браузер не дал запустить ролик (см. blocked), а первый экран уже листают: под второй текст встаёт последний кадр
      if (blocked && show > 0.02) still();
      scene.stats.forEach((item, index) => {
        const on = ease((p - from - 0.08 - index * 0.05) / 0.16);
        item.style.opacity = on.toFixed(3);
        item.style.transform = `translate3d(0, ${((1 - on) * 24).toFixed(1)}px, 0)`;
      });
    },

    book(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { book, halves, screens, steps } = parts(scene);
      book.style.opacity = ease(enter / 0.7).toFixed(3);

      // половинки стоят под углом, как у приоткрытой книги, и распрямляются в плоский экран
      const flat = ease((p - 0.03) / 0.27);
      const angle = 72 * (1 - flat);
      halves[0].style.transform = `rotateY(${angle.toFixed(2)}deg)`;
      halves[1].style.transform = `rotateY(${(-angle).toFixed(2)}deg)`;
      book.style.setProperty("--shade", ((angle / 72) * 0.72).toFixed(3)); // пока экран согнут, он в тени
      book.style.transform = `translate3d(0, calc(var(--vh) * ${((1 - enter) * 8).toFixed(2)}), 0) scale(${(0.86 + flat * 0.14).toFixed(4)})`;

      // на экране по очереди: одно окно, два, три — новый снимок проявляется поверх прежнего
      const second = ease((p - 0.42) / 0.08);
      const third = ease((p - 0.7) / 0.08);
      screens.forEach((stack) => {
        stack[1].style.opacity = second.toFixed(3);
        stack[2].style.opacity = third.toFixed(3);
      });
      light(steps, p < 0.44 ? 0 : p < 0.72 ? 1 : 2);
    },

    outside(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { stage, steps } = parts(scene);
      Object.assign(window.OPENTURN, { p, enter });
      stage.style.opacity = ease(enter / 0.7).toFixed(3);
      light(steps, p < 0.3 ? 0 : p < 0.62 ? 1 : 2);
    },
  };

  // ----- Гармошка со снимками: раскрыт один, остальные сложены в узкие полоски -----
  const fan = [...document.querySelectorAll("#fan figure")];
  const unfoldPhoto = (figure) => fan.forEach((item) => item.classList.toggle("is-on", item === figure));
  fan.forEach((figure) => {
    figure.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") unfoldPhoto(figure);
    });
    figure.addEventListener("click", () => unfoldPhoto(figure));
    figure.addEventListener("focus", () => unfoldPhoto(figure));
  });
}

// Объёмный телефон раздела «Снаружи» загружается не вместе со страницей, а позже: в спокойную минуту (страницу
// не листают, ролик раскрытия не идёт) или сразу, если до раздела долистали раньше. Его сборка на время занимает
// процессор, поэтому она не начинается, пока на первом экране играет ролик, и ещё три секунды после него:
// как раз тогда страницу обычно начинают листать
{
  let asked = false;
  const loadPhone = () => {
    if (asked) return;
    asked = true;
    import("./open-turn.js?v=10").catch((error) => console.error(error));
  };
  window.whenCalm(loadPhone, () => window.UNFOLD.playing || performance.now() < window.UNFOLD.until);
  new IntersectionObserver((entries) => entries[0].isIntersecting && loadPhone(), { rootMargin: "150% 0px" }).observe(document.getElementById("outside"));
}
