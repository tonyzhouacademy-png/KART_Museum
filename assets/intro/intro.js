(() => {
  'use strict';
  const section = document.querySelector('.museum-prologue');
  if (!section) return;
  const scriptBase = new URL('.', document.currentScript.src);
  const pause = section.querySelector('[data-prologue-pause]');
  const replay = section.querySelector('[data-prologue-replay]');
  const scrub = section.querySelector('[data-prologue-seek]');
  let started = false;
  let scene;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const load = name => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(name, scriptBase).href;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  function icons() {
    const lib = window.KARTIntroIcons;
    if (!lib) return;
    section.querySelectorAll('[data-intro-icon]').forEach(el => { el.innerHTML = lib[el.dataset.introIcon]; });
    pause.innerHTML = lib[paused ? 'Play' : 'Pause'];
    pause.setAttribute('aria-label', paused ? '播放片头' : '暂停片头');
    pause.setAttribute('aria-pressed', String(paused));
  }
  async function start() {
    if (started) { scene?.setActive(true); return; }
    started = true;
    try {
      if (!window.KARTIntroIcons) await load('icons.js');
      icons();
      if (!window.KARTThree) await load('three-local.js');
      if (!window.KARTFacadeData) await load('facade-texture.js');
      const facadeImage = new Image();
      facadeImage.src = window.KARTFacadeData;
      await facadeImage.decode();
      if (!window.createKARTWaterway) await load('river-scene.js');
      if (section.hidden) { started = false; return; }
      scene = window.createKARTWaterway(section, { paused, facadeImage });
      pause.disabled = replay.disabled = false;
      if (scrub) scrub.disabled = false;
      section.dataset.ready = 'true';
    } catch (error) {
      section.dataset.fallback = 'true';
      console.warn('KART prologue: using the still image.', error);
    }
  }
  function open() {
    section.hidden = false;
    document.documentElement.dataset.kartIntro = 'show';
    window.scrollTo({ top: 0, behavior: 'instant' });
    start();
    section.querySelector('.prologue-enter').focus({ preventScroll: true });
  }
  function enter(event) {
    event?.preventDefault();
    scene?.setActive(false);
    section.hidden = true;
    document.documentElement.dataset.kartIntro = 'hide';
    try { sessionStorage.setItem('kart-prologue-seen', '1'); } catch (_) {}
    if (typeof showView === 'function') showView('home');
    history.replaceState(null, '', '#home');
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector('.topbar .brand')?.focus({ preventScroll: true });
  }
  section.querySelectorAll('[data-prologue-enter]').forEach(link => link.addEventListener('click', enter));
  document.querySelectorAll('[data-prologue-open]').forEach(button => button.addEventListener('click', open));
  pause.addEventListener('click', () => { paused = !paused; scene?.setPaused(paused); icons(); });
  replay.addEventListener('click', () => { paused = false; scene?.replay(); icons(); });
  scrub?.addEventListener('input', () => { const seconds = Number(scrub.value); paused = true; scene?.setPaused(true); scene?.seek(seconds); icons(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !section.hidden) enter(event); });
  new IntersectionObserver(([entry]) => scene?.setActive(entry.isIntersecting && !section.hidden), { threshold: .05 }).observe(section);
  document.addEventListener('visibilitychange', () => scene?.setActive(!document.hidden && !section.hidden && section.getBoundingClientRect().bottom > 0));
  section.hidden = document.documentElement.dataset.kartIntro === 'hide';
  if (!section.hidden) start();
})();
