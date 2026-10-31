import { mountMirrorLab } from './lab.js';

(() => {
  'use strict';

  const LANG_KEY = 'physics-inquiry-lab-language-v1';
  const root = document.getElementById('site-root');
  const validLanguage = (value) => value === 'en' ? 'en' : 'zh';
  let storedLanguage = 'zh';
  try {
    storedLanguage = validLanguage(localStorage.getItem(LANG_KEY));
  } catch (_) {
    storedLanguage = 'zh';
  }
  const state = {
    lang: storedLanguage,
    search: '',
    lab: null,
    activePath: '',
    activeHash: ''
  };

  const topics = [
    { id: 'optics', zh: '光学', en: 'Optics', sprite: 'prism', status: 'active' },
    { id: 'mechanics', zh: '力学', en: 'Mechanics', sprite: 'pendulum', status: 'soon' },
    { id: 'waves', zh: '波动', en: 'Waves', sprite: 'wave', status: 'soon' },
    { id: 'electromagnetism', zh: '电磁学', en: 'Electromagnetism', sprite: 'coil', status: 'soon' },
    { id: 'heat', zh: '热学', en: 'Thermal physics', sprite: 'thermometer', status: 'soon' }
  ];

  const experiment = {
    path: '#/experiment/mirror-height',
    title: { zh: '照见全身：镜子要多长，挂多高？', en: 'Seeing your whole body: mirror size and position' },
    topic: { zh: '光学', en: 'Optics' },
    keywords: [
      '照见全身', '镜子要多长', '挂多高', 'seeing your whole body', 'mirror size and position',
      '镜子', '平面镜', '镜面', '镜子高度', '镜子长度', '镜底', '镜下缘', '反射', '眼睛', '脚', '全身', '身高', '题目',
      'mirror', 'plane mirror', 'mirror height', 'mirror length', 'bottom edge', 'reflection', 'eyes', 'feet', 'whole body', 'height', 'question',
      '78 cm', '8 cm', '60 cm'
    ]
  };

  const t = (zh, en) => state.lang === 'en' ? en : zh;
  function routeInfo() {
    const raw = location.hash.slice(1) || '/';
    const [path, query = ''] = raw.split('?');
    const params = new URLSearchParams(query);
    const parts = path.split('/').filter(Boolean);
    if (path === '/首页') return { path, page: 'home', params, parts: ['home'] };
    if (path === '/') return { path, page: 'home', params, parts: ['home'] };
    if (path === '/experiments') return { path, page: 'experiments', params, parts };
    if (path === '/experiment/mirror-height') return { path, page: 'experiment', params, parts };
    if (path === '/lab/mirror-height') return { path, page: 'lab', params, parts };
    if (path === '/about') return { path, page: 'about', params, parts };
    return { path, page: 'home', params, parts: ['home'] };
  }

  function navigate(hash) {
    if (location.hash === hash) {
      renderApp(true);
    } else {
      location.hash = hash;
    }
  }

  function iconArrow() {
    return '<svg class="shell-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3.5 10h12M10.5 4.5 16 10l-5.5 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function iconSearch() {
    return '<svg class="search-mark" viewBox="0 0 22 22" fill="none" aria-hidden="true"><circle cx="9.5" cy="9.5" r="6.3" stroke="currentColor" stroke-width="1.7"/><path d="m14.1 14.1 4.4 4.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  }

  function header(info) {
    const current = info.page === 'experiments' ? 'experiments' : info.page === 'about' ? 'about' : info.page === 'home' ? 'home' : '';
    return `<header class="site-header">
      <a class="brand" href="#/" aria-label="${t('Physics Inquiry Lab 首页', 'Physics Inquiry Lab home')}">
        <svg class="brand-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true"><circle cx="18" cy="18" r="12.3" stroke="currentColor" stroke-width="1.45"/><circle cx="18" cy="18" r="3.3" fill="currentColor"/><circle cx="28.2" cy="10.6" r="2" fill="currentColor"/><circle cx="7.8" cy="26.5" r="1.8" fill="currentColor"/></svg>
        <span>Physics <em>Inquiry Lab</em></span>
      </a>
      <nav class="header-nav" aria-label="${t('主导航', 'Primary navigation')}">
        <a href="#/" ${current === 'home' ? 'aria-current="page"' : ''}>${t('首页', 'Home')}</a>
        <a href="#/experiments" ${current === 'experiments' ? 'aria-current="page"' : ''}>${t('实验目录', 'Experiments')}</a>
        <a href="#/about" ${current === 'about' ? 'aria-current="page"' : ''}>${t('关于', 'About')}</a>
        <span class="nav-divider" aria-hidden="true"></span>
        <div class="language-switch" role="group" aria-label="${t('选择语言', 'Choose language')}">
          <button type="button" data-language="zh" aria-pressed="${state.lang === 'zh'}">中文</button>
          <span aria-hidden="true">|</span>
          <button type="button" data-language="en" aria-pressed="${state.lang === 'en'}">EN</button>
        </div>
      </nav>
    </header>`;
  }

  function sceneIllustration(extraClass = '') {
    return `<div class="mirror-scene ${extraClass}" role="img" aria-label="${t('情境插画：女孩站在悬空安装的竖直镜子前。', 'Scene illustration: a girl stands before a vertically mounted mirror with a visible gap above the floor.')}" aria-roledescription="${t('情境插画', 'scene illustration')}">
      <div class="scene-wall" aria-hidden="true"></div>
      <div class="scene-floor" aria-hidden="true"></div>
      <div class="scene-sunlight" aria-hidden="true"></div>
      <img class="scene-girl" src="./assets/girl.png" alt="" draggable="false">
      <div class="scene-mirror" aria-hidden="true"><span></span></div>
      <div class="scene-shadow" aria-hidden="true"></div>
    </div>`;
  }

  function homePage(info) {
    const expanded = info.page === 'experiments';
    const topicFromUrl = info.params.get('topic') || 'optics';
    const activeTopic = topics.some((topic) => topic.id === topicFromUrl) ? topicFromUrl : 'optics';
    const searchFromUrl = info.params.get('q');
    if (searchFromUrl !== null) state.search = searchFromUrl;
    else state.search = '';

    return `<main class="home-page">
      <div class="home-layout">
        <section class="home-hero" aria-labelledby="home-title">
          <div class="hero-copy">
            <span class="hero-rule" aria-hidden="true"></span>
            <h1 id="home-title">${t('从一个问题，<br>开始<span>探索物理</span>', 'Explore physics<br><span>one question at a time</span>')}</h1>
            <p class="hero-subtitle">${t('观察现象，改变条件，理解规律。', 'Observe a phenomenon. Change a condition. Understand the rule.')}</p>
            <div class="hero-actions">
              <a class="button-primary browse-button" href="#/experiments">${t('浏览实验目录', 'Browse experiments')}${iconArrow()}</a>
              <form class="hero-search" role="search" data-search-form>
                ${iconSearch()}
                <input name="q" type="search" autocomplete="off" placeholder="${t('搜索知识点或实验', 'Search a topic or experiment')}" aria-label="${t('搜索知识点或实验', 'Search a topic or experiment')}">
                <button type="submit" aria-label="${t('搜索', 'Search')}">${t('搜索', 'Search')}</button>
              </form>
            </div>
            <p class="search-feedback" data-search-feedback role="status" aria-live="polite"></p>
          </div>
          <article class="preview-card">
            <div class="preview-header">
              <span class="preview-crumb">${t('实验目录　/　光学　/　平面镜', 'Experiments　/　Optics　/　Plane mirror')}</span>
              <span class="preview-label">${t('实验预览', 'Preview')}</span>
            </div>
            <a class="preview-art-link" href="${experiment.path}" aria-label="${t('查看镜子长度与位置题目', 'View the mirror size and position question')}">
              ${sceneIllustration('mirror-scene--hero')}
              <span class="preview-art-copy"><span class="preview-art-heading">${t('照见全身：<br><em>镜子要多长，<br>挂多高？</em>', 'Seeing your whole body:<br><em>mirror size and position</em>')}</span><span class="preview-art-meta">${t('身高78 cm · 眼高70 cm', 'Height 78 cm · eye level 70 cm')}</span></span>
            </a>
            <a class="preview-cta" href="${experiment.path}">${t('查看题目', 'View question')}${iconArrow()}</a>
          </article>
        </section>

        <section class="topics-panel" id="topic-directory" aria-labelledby="topics-title">
          <h2 class="section-heading" id="topics-title"><span aria-hidden="true"></span>${t('按主题探索', 'Explore by topic')}</h2>
          <div class="topic-grid" role="group" aria-label="${t('物理主题', 'Physics topics')}">
            ${topics.map((topic) => `<button class="topic-card topic-card--${topic.sprite}" type="button" data-topic="${topic.id}" aria-pressed="${expanded && topic.id === activeTopic}">
              <span class="topic-art topic-art--${topic.sprite}" aria-hidden="true"></span>
              <span class="topic-card-copy"><span class="topic-name">${topic[state.lang]}</span><span class="topic-status">${topic.status === 'active' ? t('进入主题', 'Explore topic') : t('陆续加入', 'Coming later')}</span></span>
              <span class="topic-chevron" aria-hidden="true">${topic.status === 'active' ? '›' : '›'}</span>
            </button>`).join('')}
          </div>
          ${expanded ? directoryPanel(activeTopic, state.search) : ''}
        </section>
      </div>
    </main>`;
  }

  function directoryPanel(topicId, query) {
    const topic = topics.find((item) => item.id === topicId) || topics[0];
    if (topic.status !== 'active') {
      return `<section class="directory-panel directory-panel--empty" aria-live="polite"><h3>${topic[state.lang]}</h3><p>${t('这个主题的互动实验将陆续加入。', 'Interactive experiments for this topic will be added over time.')}</p></section>`;
    }
    const normalized = String(query || '').trim().toLocaleLowerCase();
    const match = !normalized || experiment.keywords.some((word) => word.toLocaleLowerCase().includes(normalized) || normalized.includes(word.toLocaleLowerCase()));
    if (!match) {
      return `<section class="directory-panel" aria-live="polite"><p class="empty-search">${t('没有找到匹配的实验。可尝试“镜子”“平面镜”或“反射”。', 'No matching experiment. Try “mirror”, “plane mirror” or “reflection”.')}</p></section>`;
    }
    return `<section class="directory-panel" aria-labelledby="directory-title">
      <div class="directory-heading"><div><h3 id="directory-title">${t('光学', 'Optics')}<span>/</span>${t('平面镜', 'Plane mirror')}</h3><p>${t('几何光学', 'Geometrical optics')}</p></div></div>
      <a class="directory-result" href="${experiment.path}">
        <span class="directory-thumbnail">${sceneIllustration('mirror-scene--thumb')}</span>
        <span class="directory-result-copy"><strong>${experiment.title[state.lang]}</strong><span>${t('情境题目 · 平面镜成像', 'Scenario question · plane-mirror image')}</span></span>
        <span class="directory-result-action">${t('查看题目', 'View question')}${iconArrow()}</span>
      </a>
    </section>`;
  }

  function questionPage() {
    const title = experiment.title[state.lang];
    return `<main class="content-page question-page">
      <nav class="breadcrumbs" aria-label="${t('面包屑导航', 'Breadcrumb')}"><a href="#/">${t('首页', 'Home')}</a><span aria-hidden="true">/</span><a href="#/experiments?topic=optics">${t('实验目录', 'Experiments')}</a><span aria-hidden="true">/</span><span aria-current="page">${t('光学', 'Optics')}</span></nav>
      <section class="question-layout" aria-labelledby="question-title">
        <figure class="question-figure">
          ${sceneIllustration('mirror-scene--question')}
          <figcaption>${t('情境插画', 'Scene illustration')}</figcaption>
        </figure>
        <article class="question-card">
          <p class="question-kicker">${t('平面镜 · 自编示例', 'Plane mirror · Worked example')}</p>
          <h1 id="question-title">${title}</h1>
          ${state.lang === 'zh' ? `<div class="question-text" lang="zh-CN">
            <p>课堂演示中，一名身高 78 cm、眼睛离地 70 cm 的学生站在竖直平面镜前 60 cm 处。镜子下缘调整到刚好能让学生看见鞋尖。</p>
            <p><strong>(a)</strong> 镜子下缘离地多高？</p>
            <p><strong>(b)</strong> 若要从鞋尖看到头顶，镜子的最短长度是多少？</p>
          </div>` : `<div class="question-text" lang="en">
            <p>For a classroom demonstration, a student of height 78 cm and eye level 70 cm stands 60 cm from a vertical plane mirror. The lower edge is adjusted until the student can just see their shoes.</p>
            <p><strong>(a)</strong> How high above the floor is the mirror’s lower edge?</p>
            <p><strong>(b)</strong> What is the shortest mirror that lets the student see from shoes to the top of their head?</p>
          </div>`}
          <a class="button-primary start-button" href="#/lab/mirror-height">${t('开始实验', 'Start experiment')}${iconArrow()}</a>
        </article>
      </section>
    </main>`;
  }

  function aboutPage() {
    return `<main class="content-page about-page">
      <nav class="breadcrumbs" aria-label="${t('面包屑导航', 'Breadcrumb')}"><a href="#/">${t('首页', 'Home')}</a><span aria-hidden="true">/</span><span aria-current="page">${t('关于', 'About')}</span></nav>
      <section class="about-card"><span class="hero-rule" aria-hidden="true"></span><h1>${t('关于 Physics Inquiry Lab', 'About Physics Inquiry Lab')}</h1><p>${t('这个参考站只展示一面竖直平面镜的几何光路模型。它不适用于曲面镜、多面镜或其他光学题型；调整距离只改变图示比例位置，不改变本模型的镜边解。', 'This reference site demonstrates a geometrical-ray model for one vertical plane mirror. It does not cover curved mirrors, multiple mirrors, or other optics problems. Changing distance moves the illustration but does not change the mirror-edge solution in this model.')}</p><a class="text-link" href="#/experiments">${t('浏览实验目录', 'Browse experiments')}${iconArrow()}</a></section>
    </main>`;
  }

  function labPage() {
    return `<main class="lab-shell" id="lab-shell" aria-label="${t('镜子互动实验', 'Interactive mirror experiment')}"><div class="lab-mount-point" id="mirror-lab-mount"></div></main>`;
  }

  function setDocumentLanguage() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.title = state.lang === 'zh' ? 'Physics Inquiry Lab · 探索物理' : 'Physics Inquiry Lab · Explore Physics';
  }

  function renderApp(forceScroll = false) {
    const info = routeInfo();
    const locationChanged = state.activeHash !== location.hash;
    const sameLabRoute = info.page === 'lab' && state.activePath === '/lab/mirror-height' && state.lab;
    setDocumentLanguage();

    if (info.page !== 'lab' && state.lab) {
      state.lab.destroy();
      state.lab = null;
    }

    if (sameLabRoute) {
      state.activeHash = location.hash;
      return;
    }

    const page = info.page === 'experiments' ? homePage(info)
      : info.page === 'experiment' ? questionPage()
      : info.page === 'about' ? aboutPage()
      : info.page === 'lab' ? labPage()
      : homePage(info);

    root.innerHTML = `${header(info)}${page}`;
    state.activePath = info.path;
    state.activeHash = location.hash;

    if (info.page === 'lab') {
      const mount = root.querySelector('#mirror-lab-mount');
      state.lab = mountMirrorLab(mount, {
        lang: state.lang,
        onBack: () => navigate('#/experiment/mirror-height')
      });
      if (locationChanged) requestAnimationFrame(scrollPageTop);
      return;
    }

    bindSearchInputs();
    if (info.page === 'experiments' && (forceScroll || locationChanged)) {
      requestAnimationFrame(() => root.querySelector('#topic-directory')?.scrollIntoView({ behavior: motionBehavior(), block: 'center' }));
    } else if (locationChanged) {
      requestAnimationFrame(scrollPageTop);
    }
  }

  function scrollPageTop() {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function motionBehavior() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  }

  function bindSearchInputs() {
    const form = root.querySelector('[data-search-form]');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.elements.namedItem('q');
      const query = String(input?.value || '').trim();
      const encoded = new URLSearchParams({ topic: 'optics', q: query });
      navigate(`#/experiments?${encoded.toString()}`);
    });
  }

  function updateLanguage(nextLanguage) {
    const language = validLanguage(nextLanguage);
    if (state.lang === language) return;
    state.lang = language;
    try {
      localStorage.setItem(LANG_KEY, language);
    } catch (_) {
      // The shell remains usable when local storage is disabled.
    }
    setDocumentLanguage();
    if (state.lab) {
      const info = routeInfo();
      const priorMain = root.querySelector('.lab-shell');
      const replacement = document.createElement('div');
      replacement.innerHTML = header(info).trim();
      const oldHeader = root.querySelector('.site-header');
      oldHeader?.replaceWith(replacement.firstElementChild);
      const labShell = root.querySelector('.lab-shell');
      labShell?.setAttribute('aria-label', language === 'zh' ? '镜子互动实验' : 'Interactive mirror experiment');
      state.lab.setLanguage(language);
      focusSelectedLanguageButton(language);
      if (!priorMain?.isConnected) renderApp();
      return;
    }
    renderApp();
    focusSelectedLanguageButton(language);
  }

  function focusSelectedLanguageButton(language) {
    root.querySelector(`[data-language="${language}"]`)?.focus({ preventScroll: true });
  }

  root.addEventListener('click', (event) => {
    const languageButton = event.target.closest('[data-language]');
    if (languageButton) {
      updateLanguage(languageButton.dataset.language);
      return;
    }
    const topicButton = event.target.closest('[data-topic]');
    if (topicButton) {
      const topicId = topicButton.dataset.topic;
      if (topics.some((topic) => topic.id === topicId)) {
        state.search = '';
        const params = new URLSearchParams({ topic: topicId });
        navigate(`#/experiments?${params.toString()}`);
      }
    }
  });

  window.addEventListener('hashchange', () => renderApp());
  renderApp();
})();
