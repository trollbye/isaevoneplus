// ===== OnePlus One: особые сцены этой страницы =====
// Общий page.js умеет первый экран и тёмные кадры. Здесь к нему добавляются две сцены:
// «turn» — объёмный телефон поворачивается от спинки к экрану (его рисует one-turn.js),
// «plate» — песочный лист каталога въезжает сбоку и ложится рядом с текстом.
// Каждая сцена получает p — сколько её прокрутки пройдено (0..1) и enter — насколько она въехала на экран.
{
  // one-turn.js читает отсюда, сколько сцены с телефоном пролистано
  window.TURN = { p: 0, enter: 0 };

  // Двухцветный текст. Заголовок рядом с листом чуть заходит на бумагу. Чтобы буквы на бумаге были тёмными,
  // внутрь листа кладётся копия текста тёмного цвета. Лист обрезает её по своему краю, а сцена ниже
  // удерживает копию ровно поверх белого текста, как бы лист ни двигался и ни наклонялся.
  // Широким листам копия не нужна: там текст стоит над листом и на него не заходит.
  document.querySelectorAll(".scene-plate:not(.is-wide)").forEach((scene) => {
    const ink = scene.querySelector(".shot-copy").cloneNode(true);
    ink.className = "ink-copy";
    const holder = document.createElement("div");
    holder.className = "sheet-ink";
    holder.setAttribute("aria-hidden", "true"); // для программ чтения с экрана текст уже есть в белом варианте
    holder.appendChild(ink);
    scene.querySelector(".sheet").appendChild(holder);
  });

  // части сцены ищутся один раз и запоминаются на самой сцене
  const parts = (scene) => {
    if (!scene.parts) {
      const find = (selector) => scene.element.querySelector(selector);
      const copy = find(".shot-copy");
      const ink = find(".ink-copy");
      scene.parts = {
        word: find(".spin-word, .plate-word"),
        sheet: find(".sheet"),
        holder: find(".sheet-ink"),
        steps: [...scene.element.querySelectorAll(".steps li")],
        // белый текст и его тёмная копия двигаются одинаково
        copies: [copy, ink].filter(Boolean),
        stats: [copy, ink].filter(Boolean).map((block) => [...block.querySelectorAll(".stats li")]),
      };
    }
    return scene.parts;
  };

  window.SCENE_KINDS = {
    turn(p, enter, scene) {
      const { word, steps } = parts(scene);
      window.TURN.p = p;
      window.TURN.enter = enter;
      word.style.transform = `translate3d(${(30 - p * 110).toFixed(2)}vw, 0, 0)`;
      // подписи сменяются вместе с поворотом: спинка, ребро, экран
      const active = p < 0.36 ? 0 : p < 0.6 ? 1 : 2;
      steps.forEach((item, index) => item.classList.toggle("is-on", index === active));
    },

    plate(p, enter, scene) {
      const { ease } = window.SCENE_TOOLS;
      const { word, sheet, holder, copies, stats } = parts(scene);
      // лист въезжает справа с наклоном и ложится почти ровно, в конце сцены уходит вверх
      const lay = ease(enter * 0.5 + p * 1.6);
      const leave = ease((p - 0.86) / 0.14);
      const x = ((1 - lay) * 26).toFixed(2);
      const y = ((1 - lay) * 9 - leave * 10).toFixed(2);
      const tilt = ((1 - lay) * 9 - 1.4).toFixed(2);
      sheet.style.transform = `translate3d(${x}vw, calc(var(--vh) * ${y}), 0) rotate(${tilt}deg)`;
      sheet.style.opacity = (ease(enter / 0.55) * (1 - leave)).toFixed(3);
      // тёмная копия текста получает обратное движение: лист едет и наклоняется, а она остаётся на месте
      if (holder) holder.style.transform = `rotate(${-tilt}deg) translate3d(${-x}vw, calc(var(--vh) * ${-y}), 0)`;
      word.style.transform = `translate3d(${(52 - (enter * 0.4 + p * 0.6) * 84).toFixed(2)}vw, 0, 0)`;

      const show = (ease((p - 0.08) / 0.2) * (1 - ease((p - 0.88) / 0.12))).toFixed(3);
      const rise = `translate3d(0, ${((1 - ease((p - 0.08) / 0.2)) * 46).toFixed(1)}px, 0)`;
      copies.forEach((block) => {
        block.style.opacity = show;
        block.style.transform = rise;
      });
      stats.forEach((items) =>
        items.forEach((item, index) => {
          const on = ease((p - 0.2 - index * 0.06) / 0.16);
          item.style.opacity = on.toFixed(3);
          item.style.transform = `translate3d(0, ${((1 - on) * 24).toFixed(1)}px, 0)`;
        })
      );
    },
  };
}

// Объёмный телефон раздела «Дизайн» загружается не вместе со страницей, а позже: в спокойную минуту (страницу
// не листают) или сразу, если до раздела долистали раньше. Его сборка на время занимает процессор, поэтому
// она не должна совпадать с движением на экране
{
  let asked = false;
  const loadPhone = () => {
    if (asked) return;
    asked = true;
    import("./one-turn.js?v=16").catch((error) => console.error(error));
  };
  window.whenCalm(loadPhone);
  new IntersectionObserver((entries) => entries[0].isIntersecting && loadPhone(), { rootMargin: "150% 0px" }).observe(document.getElementById("design"));
}
