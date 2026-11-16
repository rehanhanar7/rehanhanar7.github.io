(() => {
  'use strict';

  const d = document;
  const root = d.documentElement;
  const $ = (s, el = d) => el.querySelector(s);
  const $$ = (s, el = d) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // a dialog's own 'close' event is not delivered reliably everywhere, so watch its `open` attribute
  const onDialogClose = (dlg, fn) => new MutationObserver(() => { if (!dlg.open) fn(); })
    .observe(dlg, { attributes: true, attributeFilter: ['open'] });
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = reduceMQ.matches;
  reduceMQ.addEventListener?.('change', (e) => { reduce = e.matches; });

  /* ---------- year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- split headings into masked words ---------- */
  function splitWords(el, cls, masked) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach((word, i) => {
      const inner = d.createElement('span');
      inner.textContent = word;
      let node = inner;
      if (masked) {
        inner.style.setProperty('--i', i);
        node = d.createElement('span');
        node.className = cls;
        node.append(inner);
      } else {
        inner.className = cls;
      }
      node.setAttribute('aria-hidden', 'true');
      el.append(node, ' ');
    });
  }
  $$('[data-split]').forEach((el) => splitWords(el, 'w', true));
  const stance = $('[data-words]');
  if (stance) splitWords(stance, 'sw', false);
  const stanceWords = stance ? $$('.sw', stance) : [];

  /* ---------- first paint: hero name ---------- */
  const markLoaded = () => { void root.offsetWidth; root.classList.add('is-loaded'); };
  const fontsReady = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, wait(700)]).then(markLoaded);

  /* ---------- reveal on view ---------- */
  const counters = $$('[data-count]');
  if (!reduce) counters.forEach((el) => { el.dataset.final = el.textContent; el.textContent = '0'; });

  function countUp(el) {
    const end = Number(el.dataset.count);
    if (reduce) { el.textContent = end.toLocaleString('en-US'); return; }
    const dur = 1500;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * eased).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('is-in');
      if (el.hasAttribute('data-count')) countUp(el);
      if (el === askEl) startAsk();
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });

  /* ---------- art: component grid ---------- */
  $$('[data-art="grid"]').forEach((grid) => {
    const filled = new Set([1, 2, 4, 7, 8, 11, 12, 13, 15, 18, 21, 22, 24, 26, 27, 30, 33, 34, 36, 38]);
    for (let i = 0; i < 40; i++) {
      const cell = d.createElement('i');
      cell.style.setProperty('--i', (i % 10) + Math.floor(i / 10) * 2);
      if (i === 23) cell.className = 'hot';
      else if (filled.has(i)) cell.className = 'f';
      grid.append(cell);
    }
  });

  /* ---------- ask console ---------- */
  const QA = [
    {
      q: 'What do you build with AI?',
      n: 3,
      a: 'Production RAG and LLM workflow systems. A SharePoint-grounded executive chat that saves ~14 team hours a week, an AI assistant serving 1,000+ employees that halved task turnaround, and a Figma-to-Angular assistant that turned 10 days of page work into about one.',
      src: ['#work', 'Selected work'],
    },
    {
      q: 'How big was UPS?',
      n: 2,
      a: 'A centralised UI platform behind 70+ UPS applications. I led the 12-engineer team that shipped 40+ shared components, adopted by 20+ teams, cutting development effort by about 30%.',
      src: ['#exp-ups', 'Experience · UPS'],
    },
    {
      q: 'Can you lead delivery?',
      n: 3,
      a: 'Yes, and I still write code. I’m a SAFe Advanced Scrum Master who has led teams of 8 to 30, pulled a red-status insurance programme back to contract renewal, and led solutioning behind a $10M+ a year engagement.',
      src: ['#exp-cgi', 'Experience · CGI'],
    },
    {
      q: 'Where have you worked?',
      n: 4,
      a: 'UPS, General Electric, CGI and Wipro, for clients across the US, Canada, Europe, Singapore, Malaysia, Egypt and Saudi Arabia, including on-site delivery at Cairo ICT.',
      src: ['#experience', 'Experience'],
    },
    {
      q: 'What do you build for fun?',
      n: 3,
      a: 'Three live products of my own: Quran Tenets, which reads the Quran as a flow of named passages across 197 topics; Manapparai Tech, a Tamil and English guide to my home town; and Rehan Job Helper, a Chrome extension that autofills job applications and tracks them.',
      src: ['#side', 'Hobby builds'],
    },
  ];

  const askEl = $('[data-ask]');
  let askRun = 0;
  let askStarted = false;

  async function ask(i) {
    if (!askEl) return;
    const id = ++askRun;
    const item = QA[i];
    const qText = $('[data-ask-q]', askEl);
    const aText = $('[data-ask-a]', askEl);
    const caret = $('[data-ask-caret]', askEl);
    const src = $('[data-ask-src]', askEl);
    const live = $('[data-ask-live]', askEl);
    const steps = $$('[data-ask-steps] li', askEl);

    $$('.chip-q', askEl).forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.q) === i)));
    qText.textContent = item.q;
    $('[data-ask-n]', askEl).textContent = `${item.n} passages matched`;
    src.href = item.src[0];
    src.textContent = `Source: ${item.src[1]} →`;

    if (reduce || root.classList.contains('motion-paused')) {
      steps.forEach((s) => { s.className = 'is-done'; });
      aText.textContent = item.a;
      caret.hidden = true;
      src.classList.add('is-on');
      live.textContent = item.a;
      return;
    }

    steps.forEach((s) => { s.className = ''; });
    aText.textContent = '';
    src.classList.remove('is-on');
    caret.hidden = false;

    for (const s of steps) {
      s.className = 'is-run';
      await wait(380 + Math.random() * 220);
      if (id !== askRun) return;
      s.className = 'is-done';
    }

    const words = item.a.split(' ');
    for (let w = 0; w < words.length; w++) {
      aText.textContent += (w ? ' ' : '') + words[w];
      await wait(26 + Math.random() * 38);
      if (id !== askRun) return;
    }
    caret.hidden = true;
    src.classList.add('is-on');
    live.textContent = item.a;
  }

  function startAsk() {
    if (askStarted) return;
    askStarted = true;
    if (!reduce && !root.classList.contains('motion-paused')) ask(0);
  }

  if (askEl) {
    $$('.chip-q', askEl).forEach((chip) => {
      chip.addEventListener('click', () => { askStarted = true; ask(Number(chip.dataset.q)); });
    });
  }

  $$('[data-reveal], .w, [data-split], [data-reveal-title], [data-clip], [data-art], [data-count], [data-ask]').forEach((el) => {
    if (el.matches('.w')) return;
    io.observe(el);
  });

  /* ---------- nav: scrolled state, hide on scroll down (phones), active link ---------- */
  const nav = $('[data-nav]');
  const navLinks = $$('.nav-links a');
  const railLabel = $('[data-rail-label]');
  const railMarker = $('[data-rail]');
  const progressBar = $('[data-progress]');
  const phone = matchMedia('(max-width: 880px)');
  let lastY = scrollY;

  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const label = e.target.dataset.section;
      if (railLabel && railLabel.textContent !== label) railLabel.textContent = label;
      const id = e.target.id;
      navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${id}`)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-section]').forEach((s) => sectionIO.observe(s));

  /* ---------- scroll-linked effects ---------- */
  const cases = $$('.case');
  const desktop = matchMedia('(min-width: 900px)');
  const timeline = $('[data-timeline]');
  const tlFill = $('[data-tl-fill]');
  const tlItems = timeline ? $$('.tl-item', timeline) : [];
  let lastLit = -1;

  let caseTops = [];
  function update() {
    const y = scrollY;
    const vh = innerHeight;
    const max = Math.max(1, d.documentElement.scrollHeight - vh);
    const p = clamp(y / max, 0, 1);

    if (nav) {
      nav.classList.toggle('is-scrolled', y > 8);
      if (Math.abs(y - lastY) > 6) {
        nav.classList.toggle('is-hidden', phone.matches && y > lastY && y > 480);
        lastY = y;
      }
    }
    if (progressBar) progressBar.style.transform = `scaleX(${p})`;
    if (railMarker) railMarker.style.top = `${p * 100}%`;

    // stance: light words up as the paragraph passes through the viewport
    if (stance && !reduce) {
      const r = stance.getBoundingClientRect();
      const sp = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
      const lit = Math.round(sp * stanceWords.length);
      if (lit !== lastLit) {
        stanceWords.forEach((w, i) => w.classList.toggle('on', i < lit));
        lastLit = lit;
      }
    }

    // stacked case cards: shrink and dim a card as the next one slides over it
    if (desktop.matches && !reduce) {
      for (let i = 0; i < cases.length - 1; i++) {
        const c = cases[i];
        const next = cases[i + 1];
        const h = c.offsetHeight;
        if (!caseTops.length) caseTops = cases.map((el) => parseFloat(getComputedStyle(el).top) || 0);
        const top = caseTops[i];
        const nr = next.getBoundingClientRect();
        const cp = clamp((top + h - nr.top) / h, 0, 1);
        c.style.transform = cp ? `scale(${1 - cp * 0.05})` : '';
        c.style.setProperty('--dim', cp.toFixed(3));
      }
    } else if (cases.length && cases[0].style.transform) {
      cases.forEach((c) => { c.style.transform = ''; c.style.removeProperty('--dim'); });
    }

    // timeline progress line and dots
    if (timeline && tlFill) {
      const r = timeline.getBoundingClientRect();
      const mark = vh * 0.55;
      const tp = reduce ? 1 : clamp((mark - r.top) / r.height, 0, 1);
      tlFill.style.transform = `scaleY(${tp})`;
      tlItems.forEach((item) => {
        const dot = item.getBoundingClientRect().top + 12;
        item.classList.toggle('is-on', reduce || dot < mark);
      });
    }
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { caseTops = []; onScroll(); }, { passive: true });
  update();

  /* ---------- mobile menu ---------- */
  const menu = $('#menu');
  const menuBtn = $('.nav-row .nav-menu');
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', () => { menu.showModal(); menuBtn.setAttribute('aria-expanded', 'true'); });
    $('.menu-close', menu).addEventListener('click', () => menu.close());
    onDialogClose(menu, () => menuBtn.setAttribute('aria-expanded', 'false'));
    $$('a[href^="#"]', menu).forEach((a) => a.addEventListener('click', (e) => {
      const target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      menu.close();
      history.pushState(null, '', a.getAttribute('href'));
      // the page is scroll-locked while the menu is open; force a style pass so it is unlocked first
      void root.offsetHeight;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }));
  }

  /* ---------- capabilities accordion ---------- */
  $$('.cap').forEach((cap) => {
    const btn = $('.cap-btn', cap);
    const panel = $('.cap-panel', cap);
    panel.inert = !cap.classList.contains('is-open');
    btn.addEventListener('click', () => {
      const open = !cap.classList.contains('is-open');
      cap.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      panel.inert = !open;
    });
  });

  /* ---------- project sheet ---------- */
  const P = {
    ups: {
      title: 'UPS Enterprise UI Platform', client: 'United Parcel Service', year: '2024 — 2026',
      role: 'Lead Applications Developer',
      stack: 'Angular, Storybook, Figma Code Connect, Zeroheight, Azure DevOps',
      desc: 'A centralised UI platform and design system behind more than seventy UPS applications, built and governed by a twelve-engineer team.',
      points: [
        'Led a 12-engineer centralised UI team supporting 70+ applications',
        'Delivered 40+ reusable components adopted by 20+ teams',
        'Cut development effort by roughly 30% and sped up page delivery by up to 50%',
        'Rolled out Storybook, Zeroheight and Figma Code Connect across 70+ applications, saving ~10 team hours per sprint',
        'Partnered with leadership and UX on the platform roadmap, and mentored engineers into the team',
      ],
    },
    llm: {
      title: 'LLM-Powered UI Assistant', client: 'Enterprise (internal)', year: '2022 — 2026',
      role: 'Lead Full Stack AI Engineer',
      stack: 'Vector database, custom Copilot instructions, Figma, Angular',
      desc: 'A vector-backed LLM assistant with custom Copilot instructions that automates Figma-to-Angular code generation.',
      points: [
        'Cut a full sprint of page work (10 days) down to about 1 day',
        'Lowered deliverables from 8 story points to 3–5, a ~40–60% effort reduction',
        'Grounded generation in the live component library, so output matched the design system',
        'Reduced repetitive UI coding and design clarification cycles',
      ],
    },
    chatbot: {
      title: 'Enterprise AI Chatbot Platform', client: 'Enterprise (internal)', year: '2022 — 2026',
      role: 'Lead Full Stack AI Engineer',
      stack: 'LLM orchestration, REST APIs, Node.js, Azure OpenAI',
      desc: 'A conversational front door for 1,000+ employees, automating software requests, leave approvals and HR queries through API-driven workflow orchestration.',
      points: [
        'Serves 1,000+ users across software requests, leave approvals, timesheet tracking and HR queries',
        'Cut task turnaround time by roughly 50%',
        'Orchestrates existing enterprise APIs rather than replacing them',
        'Reduced repetitive manual data entry across the request lifecycle',
      ],
    },
    mapfre: {
      title: 'MAPFRE Insurance Turnaround', client: 'MAPFRE, via CGI', year: '2021 — 2024',
      role: 'Lead UI Developer',
      stack: 'Angular, JSON-driven configuration, SAFe',
      desc: 'A red-status insurance programme turned around with a configuration-driven, JSON-based UI architecture supporting multiple business flows.',
      points: [
        'Took the project from red status back to delivery as Lead UI Developer',
        'Designed a JSON configuration layer, so new business flows needed configuration, not code',
        'Enabled multi-flow support across product lines',
        'Delivery recovered far enough to win the contract renewal',
      ],
    },
    ge: {
      title: 'GE Cybersecurity Platform', client: 'General Electric', year: '2018 — 2021',
      role: 'Senior Full-Stack Developer · Technical Lead',
      stack: 'Angular 9, React, Node.js, PostgreSQL, Java, Jenkins, Docker',
      desc: 'A full-stack ticket management platform bridging GE application teams and cybersecurity operations, modernised along the way.',
      points: [
        'Bridged GE application teams and cybersecurity operations in a single workflow',
        'Migrated the platform from AngularJS to Angular 9 and React',
        'Moved deployment from manual releases to Jenkins CI/CD and early Docker adoption',
        'Built a Java utility ingesting global vulnerability reports into PostgreSQL',
      ],
    },
    rag: {
      title: 'RAG-Based Executive Chat', client: 'Enterprise (internal)', year: '2022 — 2026',
      role: 'Lead Full Stack AI Engineer',
      stack: 'RAG, LangChain, Pinecone, SharePoint, Azure OpenAI',
      desc: 'A retrieval-augmented chat layer over the organisation’s SharePoint document estate, built for leadership.',
      points: [
        'Self-service knowledge access across the SharePoint document estate',
        'Saved ~14+ team hours a week on document search and status meetings',
        'Retrieval scoped to permissioned content only',
        'Better leadership visibility without adding meetings',
      ],
    },
    talent: {
      title: 'AI Talent Intelligence', client: 'Enterprise (internal)', year: '2022 — 2026',
      role: 'Lead Full Stack AI Engineer',
      stack: 'LLM scoring, PII controls, Azure OpenAI, n8n',
      desc: 'AI-powered hiring and workforce intelligence that replaced manual Excel tracking with automated resume scoring, development plans and skill analysis.',
      points: [
        'Hiring platform for 8+ vendors and 5+ recruiters, scoring ~100+ candidates a month',
        'Cut at least 2 hours a day of manual screening and made evaluation more consistent',
        'Ran secure, PII-controlled LLM workflows through the hiring pipeline',
        'Replaced manual Excel tracking for 107+ employees, saving 50+ hours per review cycle',
      ],
    },
    aviation: {
      title: 'GE Aviation Flight Analyzer', client: 'GE Aviation', year: '2018 — 2021',
      role: 'Senior Full-Stack Developer',
      stack: 'Angular, IoT engine telemetry, time-series visualisation',
      desc: 'A flight phase analyser UI visualising time-series fuel consumption from IoT engine data.',
      points: [
        'Visualised time-series fuel consumption across flight phases',
        'Sourced directly from IoT engine telemetry',
        'Built for analysts comparing performance across fleets and routes',
      ],
    },
    amadeus: {
      title: 'Amadeus India & Europe Bid', client: 'Amadeus, via CGI', year: '2021 — 2024',
      role: 'Pre-sales & solutioning',
      stack: 'Requirements analysis, phased migration strategy, estimation',
      desc: 'A pre-sales engagement across India and Europe, won on the strength of the migration strategy behind it.',
      points: [
        'Analysed 200+ pages of client requirements',
        'Defined the phased migration strategy underpinning the technical response',
        'Helped secure a $10M+ per-year long-term engagement',
        'Awarded Platinum recognition within three months of joining CGI',
      ],
    },
    mto: {
      title: 'MTO Canada', client: 'Ministry of Transportation Ontario, via CGI', year: '2021 — 2024',
      role: 'Lead Analyst · Estimation Lead',
      stack: 'SAFe, estimation modelling, solutioning',
      desc: 'Delivery estimation and solutioning for a government transportation bid.',
      points: [
        'Produced plans that landed at roughly 95% accuracy',
        'Reduced estimation variance by more than 30%',
        'Owned solutioning across the technical response',
        'Reduced contractual risk in the bid submission',
      ],
    },
    via: {
      title: 'VIA Rail Canada', client: 'VIA Rail, via CGI', year: '2021 — 2024',
      role: 'Lead Analyst, offshore delivery',
      stack: 'Angular, Power BI, Agile delivery',
      desc: 'Technical direction for an offshore team of 8 to 11 engineers on Canada’s national rail platform.',
      points: [
        'Directed an offshore team of 8–11 engineers across UI/UX and Power BI',
        'Translated client requirements into execution plans',
        'Enforced coding standards and quality gates on every deliverable',
      ],
    },
    pratigya: {
      title: 'Pratigya CSR Initiative', client: 'CGI', year: '2021 — 2024',
      role: 'Technical Project Manager & full-stack developer',
      stack: 'Angular, Node.js',
      desc: 'A corporate social responsibility platform delivered end to end with a team of eight.',
      points: [
        'Technical Project Manager for an 8-member team',
        'Hands-on full-stack development alongside the leadership role',
        'Owned the initiative end to end, from scope to release',
      ],
    },
    egypt: {
      title: 'Egypt Post Government App', client: 'Egypt Post, via Wipro', year: '2013 — 2018',
      role: 'Delivery lead, on site',
      stack: 'Ionic, Cordova, AngularJS',
      desc: 'A government mobile application delivered for Egypt Post, with on-the-ground support at the Cairo ICT event.',
      points: [
        'Led delivery of the government mobile application',
        'Provided on-site support at Cairo ICT in Egypt',
        'Delivered a QR-based payment demo on a tight deadline',
        'Built on a hybrid Ionic/Cordova stack for reach across devices',
      ],
    },
  };
  const order = Object.keys(P);
  const sheet = $('#project');
  let current = 0;

  function fill(i) {
    current = (i + order.length) % order.length;
    const p = P[order[current]];
    $('[data-p-meta]', sheet).textContent = `${p.year} · ${p.client}`;
    $('[data-p-title]', sheet).textContent = p.title;
    $('[data-p-desc]', sheet).textContent = p.desc;
    $('[data-p-role]', sheet).textContent = p.role;
    $('[data-p-stack]', sheet).textContent = p.stack;
    $('[data-p-count]', sheet).textContent = `${String(current + 1).padStart(2, '0')} / ${order.length}`;
    const list = $('[data-p-points]', sheet);
    list.textContent = '';
    p.points.forEach((t) => { const li = d.createElement('li'); li.textContent = t; list.append(li); });
    $('.sheet-scroll', sheet).scrollTop = 0;
    if (sheet.open) setProjectHash();
  }
  const projectHash = () => `#project-${order[current]}`;
  function setProjectHash() { history.replaceState(null, '', projectHash()); }
  function openProject(i) {
    fill(i);
    if (!sheet.open) sheet.showModal();
    setProjectHash();
  }

  if (sheet) {
    $$('[data-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openProject(order.indexOf(btn.dataset.open));
      });
    });
    $('[data-p-close]', sheet).addEventListener('click', () => sheet.close());
    $('[data-p-prev]', sheet).addEventListener('click', () => fill(current - 1));
    $('[data-p-next]', sheet).addEventListener('click', () => fill(current + 1));
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
    onDialogClose(sheet, () => {
      if (location.hash.startsWith('#project-')) history.replaceState(null, '', location.pathname + location.search);
    });
    $('[data-p-share]', sheet).addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}${projectHash()}`;
      if (navigator.share && matchMedia('(hover: none)').matches) {
        try { await navigator.share({ title: P[order[current]].title, url }); } catch { /* share sheet closed */ }
        return;
      }
      try { await navigator.clipboard.writeText(url); toast('Link to this project copied'); } catch { toast(url); }
    });
    const linked = location.hash.match(/^#project-([\w-]+)$/);
    if (linked && P[linked[1]]) openProject(order.indexOf(linked[1]));
    sheet.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') fill(current + 1);
      if (e.key === 'ArrowLeft') fill(current - 1);
    });
  }

  /* ---------- copy email + toast ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        toast('Email copied');
      } catch {
        location.href = `mailto:${btn.dataset.copy}`;
      }
    });
  });

  /* ---------- shared helpers ---------- */
  const EMAIL = 'rehanhussainimam@gmail.com';
  const closeAll = () => $$('dialog[open]').forEach((dlg) => dlg.close());
  const openUrl = (url) => window.open(url, '_blank', 'noopener');
  function goTo(hash) {
    closeAll();
    const target = $(hash);
    if (!target) return;
    history.pushState(null, '', hash);
    void root.offsetHeight; // let the page unlock after a dialog closes
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  function openCap(cap) {
    closeAll();
    if (!cap.classList.contains('is-open')) $('.cap-btn', cap).click();
    void root.offsetHeight;
    cap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }
  async function copyEmail() {
    try { await navigator.clipboard.writeText(EMAIL); toast('Email copied'); } catch { location.href = `mailto:${EMAIL}`; }
  }

  /* ---------- theme: auto / light / dark ---------- */
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const themeBtn = $('[data-theme-cycle]');
  const effectiveTheme = () => root.dataset.theme || (darkMQ.matches ? 'dark' : 'light');
  function syncTheme() {
    const forced = root.dataset.theme;
    if (themeBtn) themeBtn.textContent = `Theme: ${forced ? forced[0].toUpperCase() + forced.slice(1) : 'Auto'}`;
    $$('meta[name="theme-color"]').forEach((m) => {
      const isDarkTag = (m.getAttribute('media') || '').includes('dark');
      const mode = forced || (isDarkTag ? 'dark' : 'light');
      m.setAttribute('content', mode === 'dark' ? '#0F0F0E' : '#F3F2EE');
    });
  }
  function setTheme(mode) {
    if (mode === 'auto') delete root.dataset.theme;
    else root.dataset.theme = mode;
    try { mode === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', mode); } catch { /* private mode */ }
    syncTheme();
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = { undefined: 'light', light: 'dark', dark: 'auto' }[root.dataset.theme];
      setTheme(next);
      toast(next === 'auto' ? 'Theme follows your device' : `${next[0].toUpperCase() + next.slice(1)} mode on`);
    });
  }
  syncTheme();

  /* ---------- business enquiry ---------- */
  const enq = $('#enquire');
  const form = enq ? $('[data-enquire-form]', enq) : null;
  const DRAFT_KEY = 'enquiry-draft';
  const FIELDS = ['name', 'email', 'company', 'timeline', 'message'];

  function updateCount() {
    const n = form.elements.message.value.trim().length;
    const el = $('[data-enq-count]', enq);
    el.textContent = n >= 20 ? `${n} characters` : `${n} / 20 characters minimum`;
    el.classList.toggle('ok', n >= 20);
  }
  function saveDraft() {
    try {
      const draft = { topic: form.elements.topic.value };
      FIELDS.forEach((f) => { draft[f] = form.elements[f].value; });
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* storage unavailable */ }
  }
  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!draft) return;
      FIELDS.forEach((f) => { if (draft[f] && !form.elements[f].value) form.elements[f].value = draft[f]; });
      $$('input[name="topic"]', form).forEach((r) => { r.checked = r.value === draft.topic || (!draft.topic && r.defaultChecked); });
    } catch { /* storage unavailable */ }
  }
  function compose() {
    const v = (n) => form.elements[n].value.trim();
    const topic = form.elements.topic.value;
    const company = v('company');
    const subject = `Business enquiry: ${topic}${company ? ` · ${company}` : ''}`;
    const body = [
      'Hi Rehan,', '', v('message'), '', '—',
      `Name: ${v('name')}`, `Email: ${v('email')}`,
      company ? `Company: ${company}` : null,
      `Topic: ${topic}`,
      v('timeline') ? `Timeline: ${v('timeline')}` : null,
      '', 'Sent from rehanhanar7.github.io',
    ].filter((line) => line !== null).join('\n');
    return { subject, body };
  }
  function validate() {
    const { name, email, message } = form.elements;
    const problems = [
      [name, !name.value.trim(), 'Please add your name.'],
      [email, !email.value.trim() || !email.checkValidity(), 'Please add a valid email so I can reply.'],
      [message, message.value.trim().length < 20, 'Please add a little more detail (20 characters or more).'],
    ];
    let first = null;
    problems.forEach(([el, bad, msg]) => {
      el.setAttribute('aria-invalid', String(bad));
      if (bad && !first) first = [el, msg];
    });
    const err = $('[data-enq-error]', enq);
    if (first) { err.textContent = first[1]; err.hidden = false; first[0].focus(); return false; }
    err.hidden = true;
    return true;
  }
  function openEnquiry() {
    if (!enq) return;
    closeAll();
    loadDraft();
    updateCount();
    enq.showModal();
    // desktop: start typing straight away; phones: no keyboard until they tap a field
    if (matchMedia('(hover: hover)').matches) form.elements.name.focus();
    else $('#enq-title').focus({ preventScroll: true });
  }

  if (enq) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) return;
      const { subject, body } = compose();
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      enq.classList.add('is-sent');
      $('.sheet-scroll', enq).scrollTop = 0;
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
    });
    form.addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false');
      updateCount();
      saveDraft();
    });
    $$('[data-enq-copy]', enq).forEach((b) => b.addEventListener('click', async () => {
      const { subject, body } = compose();
      try {
        await navigator.clipboard.writeText(`To: ${EMAIL}\nSubject: ${subject}\n\n${body}`);
        toast('Enquiry copied. Paste it into an email.');
      } catch { toast(`Email me at ${EMAIL}`); }
    }));
    $$('[data-enq-close]', enq).forEach((b) => b.addEventListener('click', () => enq.close()));
    enq.addEventListener('click', (e) => { if (e.target === enq) enq.close(); });
    onDialogClose(enq, () => {
      if (!enq.classList.contains('is-sent')) return;
      form.reset();
      enq.classList.remove('is-sent');
      updateCount();
    });
  }
  $$('[data-enquire]').forEach((b) => { if (b.tagName === 'BUTTON') b.addEventListener('click', openEnquiry); });

  /* ---------- floating contact button ---------- */
  const fab = $('.fab');
  let contactInView = false;
  function updateFab() {
    if (fab) fab.classList.toggle('is-on', scrollY > innerHeight * 0.7 && !contactInView);
  }
  const contactEl = $('#contact');
  if (contactEl) new IntersectionObserver(([e]) => { contactInView = e.isIntersecting; updateFab(); }, { threshold: 0.02 }).observe(contactEl);
  addEventListener('scroll', updateFab, { passive: true });
  updateFab();

  /* ---------- pause motion (everything that moves on its own) ---------- */
  const motionBtns = $$('[data-motion-toggle]');
  function syncMotion() {
    const paused = root.classList.contains('motion-paused');
    motionBtns.forEach((b) => { b.setAttribute('aria-pressed', String(paused)); b.textContent = paused ? 'Play motion' : 'Pause motion'; });
  }
  function toggleMotion() {
    const paused = root.classList.toggle('motion-paused');
    try { if (paused) localStorage.setItem('motion', 'paused'); else localStorage.removeItem('motion'); } catch { /* storage unavailable */ }
    syncMotion();
    toast(paused ? 'Motion paused' : 'Motion playing');
  }
  motionBtns.forEach((b) => b.addEventListener('click', toggleMotion));
  syncMotion();

  /* ---------- print / save as PDF: open everything first ---------- */
  let openedForPrint = [];
  addEventListener('beforeprint', () => {
    openedForPrint = $$('details:not([open])');
    openedForPrint.forEach((x) => { x.open = true; });
    $$('.cap-panel').forEach((x) => { x.inert = false; });
  });
  addEventListener('afterprint', () => {
    openedForPrint.forEach((x) => { x.open = false; });
    $$('.cap').forEach((c) => { $('.cap-panel', c).inert = !c.classList.contains('is-open'); });
  });
  const printPage = () => setTimeout(() => window.print(), 60);
  $$('[data-print]').forEach((b) => b.addEventListener('click', printPage));

  /* ---------- share the whole site ---------- */
  async function shareSite() {
    const url = `${location.origin}${location.pathname}`;
    if (navigator.share && matchMedia('(hover: none)').matches) {
      try { await navigator.share({ title: d.title, url }); } catch { /* share sheet closed */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
  }

  /* ---------- tell screen readers which links open a new tab ---------- */
  $$('a[target="_blank"]').forEach((a) => {
    const note = d.createElement('span');
    note.className = 'sr-only';
    note.textContent = ' (opens in a new tab)';
    a.append(note);
  });

  /* ---------- site search ---------- */
  const search = $('#search');
  const sInput = $('#search-input');
  const sList = $('#search-list');
  const sCount = $('[data-search-count]');
  const sLive = $('[data-search-live]');
  let liveTimer;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  $$('[data-kbd]').forEach((k) => { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });

  const ICON = { section: '#', work: '◧', hobby: '✦', skill: '◇', exp: '◷', cred: '✓', action: '→' };
  const FILTER = { all: null, work: ['work'], hobby: ['hobby'], skill: ['skill'], exp: ['exp', 'cred'], action: ['action'] };
  const index = [];
  const seen = new Set();
  function add(item) {
    const key = `${item.group}|${item.title.toLowerCase()}`;
    if (seen.has(key)) return null;
    seen.add(key);
    item.hay = `${item.title} ${item.sub} ${item.kw || ''}`.toLowerCase().replace(/\s+/g, ' ');
    index.push(item);
    return item;
  }
  const textOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  // actions
  const aEnquire = add({ type: 'action', group: 'Actions', title: 'Contact me for business', sub: 'Open the enquiry form', kw: 'hire work with me consult consulting job role enquiry inquiry contact business', run: openEnquiry });
  add({ type: 'action', group: 'Actions', title: 'Email me', sub: EMAIL, kw: 'mail contact gmail', run: () => { location.href = `mailto:${EMAIL}`; } });
  const aCopy = add({ type: 'action', group: 'Actions', title: 'Copy email address', sub: EMAIL, kw: 'clipboard contact', run: copyEmail });
  add({ type: 'action', group: 'Actions', title: 'Open LinkedIn', sub: 'linkedin.com/in/rehanfeb29', kw: 'profile social', ext: true, run: () => openUrl('https://www.linkedin.com/in/rehanfeb29/') });
  add({ type: 'action', group: 'Actions', title: 'Open my CV', sub: 'Plain-text résumé', kw: 'resume cv curriculum', ext: true, run: () => openUrl('/Resume.txt') });
  const aTheme = add({
    type: 'action', group: 'Actions', title: 'Switch light or dark mode', sub: 'Change the colour theme', kw: 'theme dark light mode appearance night colour color',
    run: () => { const next = effectiveTheme() === 'dark' ? 'light' : 'dark'; setTheme(next); toast(`${next[0].toUpperCase() + next.slice(1)} mode on`); },
  });

  add({ type: 'action', group: 'Actions', title: 'Save this page as a PDF', sub: 'A clean, printable CV', kw: 'print pdf download cv resume', run: printPage });
  add({ type: 'action', group: 'Actions', title: 'Share this site', sub: 'Copy or send the link', kw: 'share link copy url send', run: shareSite });
  add({ type: 'action', group: 'Actions', title: 'Pause or play animations', sub: 'Stop everything that moves', kw: 'motion animation reduce stop pause play accessibility', run: toggleMotion });

  // sections
  const sections = [
    ['#about', 'About', 'Who I am and how I work'],
    ['#work', 'Selected work', '5 case studies and 8 more projects'],
    ['#capabilities', 'Capabilities', 'Six disciplines, one stack'],
    ['#experience', 'Experience', '13 years at UPS, CGI, GE and Wipro'],
    ['#side', 'Hobby builds', 'Quran Tenets, Manapparai Tech, Job Helper'],
    ['#credentials', 'Credentials', 'Degree and 9 certifications'],
    ['#contact', 'Contact', 'Email, LinkedIn and CV'],
  ];
  const sectionItems = sections.map(([hash, title, sub]) => add({ type: 'section', group: 'Sections', title, sub, kw: '', run: () => goTo(hash) }));

  // projects
  const projectItems = {};
  order.forEach((key, i) => {
    const p = P[key];
    projectItems[key] = add({
      type: 'work', group: 'Projects', title: p.title, sub: `${p.client} · ${p.year}`,
      kw: [p.role, p.stack, p.desc, p.points.join(' ')].join(' '),
      run: () => openProject(i),
    });
  });

  // hobby builds
  const hobbyItems = $$('.build').map((b) => {
    const link = $('.btn', b);
    return add({ type: 'hobby', group: 'Hobby builds', title: textOf($('h3', b)), sub: textOf($('.build-top .mono', b)), kw: textOf(b), ext: true, run: () => openUrl(link.href) });
  });

  // experience
  $$('.tl-item').forEach((li) => {
    add({ type: 'exp', group: 'Experience', title: textOf($('h3', li)), sub: `${textOf($('.tl-role', li))} · ${textOf($('.tl-when .mono', li))}`, kw: textOf(li), run: () => goTo(`#${li.id}`) });
  });

  // capabilities and the skills inside them
  $$('.cap').forEach((cap) => {
    const name = textOf($('.cap-name', cap));
    add({ type: 'skill', group: 'Capabilities', title: name, sub: 'Capability', kw: textOf(cap), run: () => openCap(cap) });
    $$('.tags li', cap).forEach((t) => add({ type: 'skill', group: 'Skills', title: textOf(t), sub: name, kw: 'skill', run: () => openCap(cap) }));
  });
  // skills that only appear on experience and project cards
  $$('.tl-item .tags li, .case .tags li').forEach((t) => {
    const owner = t.closest('.tl-item, .case');
    const where = owner.matches('.tl-item') ? textOf($('h3', owner)) : textOf($('.case-title', owner));
    const key = owner.matches('.case') ? $('[data-open]', owner).dataset.open : null;
    add({
      type: 'skill', group: 'Skills', title: textOf(t), sub: `Used on ${where}`, kw: 'skill',
      run: () => { if (key) openProject(order.indexOf(key)); else goTo(`#${owner.id}`); },
    });
  });

  // certifications
  $$('.certs li').forEach((li) => {
    const a = $('a', li);
    add({ type: 'cred', group: 'Certifications', title: textOf($('.cert-name', li)), sub: textOf($('.cert-by', li)), kw: 'certification certificate badge course', ext: !!a, run: a ? () => openUrl(a.href) : () => goTo('#credentials') });
  });

  const suggested = [aEnquire, sectionItems[1], hobbyItems[0], projectItems.ups, projectItems.rag, aCopy, aTheme].filter(Boolean);

  function score(item, terms) {
    const title = item.title.toLowerCase();
    const sub = item.sub.toLowerCase();
    let s = 0;
    for (const t of terms) {
      if (!item.hay.includes(t)) return -1;
      if (title.startsWith(t)) s += 30;
      else if (title.includes(` ${t}`)) s += 20;
      else if (title.includes(t)) s += 12;
      else if (sub.includes(t)) s += 6;
      else s += 2;
    }
    if (title === terms.join(' ')) s += 25;
    return s;
  }

  let results = [];
  let active = 0;
  let filter = 'all';

  function highlight(el, text, terms) {
    const lower = text.toLowerCase();
    let at = -1;
    let len = 0;
    terms.forEach((t) => { const k = lower.indexOf(t); if (k >= 0 && (at < 0 || k < at)) { at = k; len = t.length; } });
    if (at < 0) { el.textContent = text; return; }
    const mark = d.createElement('mark');
    mark.textContent = text.slice(at, at + len);
    el.append(text.slice(0, at), mark, text.slice(at + len));
  }
  function option(item, i, terms) {
    const el = d.createElement('div');
    el.className = 's-item';
    el.id = `s-opt-${i}`;
    el.dataset.i = i;
    el.setAttribute('role', 'option');
    el.setAttribute('aria-selected', 'false');
    const ico = d.createElement('span');
    ico.className = 's-ico';
    ico.setAttribute('aria-hidden', 'true');
    ico.textContent = ICON[item.type];
    const txt = d.createElement('span');
    txt.className = 's-text';
    const title = d.createElement('span');
    title.className = 's-title';
    highlight(title, item.title, terms);
    const sub = d.createElement('span');
    sub.className = 's-sub';
    sub.textContent = item.sub;
    txt.append(title, sub);
    const go = d.createElement('span');
    go.className = 's-go';
    go.setAttribute('aria-hidden', 'true');
    go.textContent = item.ext ? '↗' : '↵';
    el.append(ico, txt, go);
    el.addEventListener('mousemove', () => { if (active !== i) setActive(i, false); });
    el.addEventListener('click', () => runItem(i));
    return el;
  }
  function emptyState(q) {
    const box = d.createElement('div');
    box.className = 's-empty';
    const p = d.createElement('p');
    p.textContent = `No results for “${q}”.`;
    const tip = d.createElement('p');
    tip.className = 'mono';
    tip.textContent = 'Try one of these';
    const row = d.createElement('div');
    row.className = 's-try';
    ['RAG', 'Angular', 'UPS', 'Quran', 'SAFe', 'Docker'].forEach((w) => {
      const b = d.createElement('button');
      b.type = 'button';
      b.textContent = w;
      b.addEventListener('click', () => { sInput.value = w; render(); sInput.focus(); });
      row.append(b);
    });
    box.append(p, tip, row);
    return box;
  }
  function setActive(i, scroll = true) {
    if (!results.length) { sInput.removeAttribute('aria-activedescendant'); return; }
    active = (i + results.length) % results.length;
    $$('.s-item', sList).forEach((el) => el.setAttribute('aria-selected', String(Number(el.dataset.i) === active)));
    const el = $(`#s-opt-${active}`);
    sInput.setAttribute('aria-activedescendant', el.id);
    if (scroll) el.scrollIntoView({ block: 'nearest' });
  }
  function render() {
    const q = sInput.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const allow = FILTER[filter];
    let list;
    if (!terms.length) {
      list = allow ? index.filter((it) => allow.includes(it.type)).slice(0, 60) : suggested;
    } else {
      list = index
        .filter((it) => !allow || allow.includes(it.type))
        .map((it) => ({ it, s: score(it, terms) }))
        .filter((r) => r.s >= 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 40)
        .map((r) => r.it);
    }
    const groups = new Map();
    list.forEach((it) => {
      const g = !terms.length && !allow ? 'Suggested' : it.group;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(it);
    });
    results = [];
    sList.textContent = '';
    groups.forEach((items, g) => {
      const wrap = d.createElement('div');
      wrap.className = 's-group';
      wrap.setAttribute('role', 'group');
      const h = d.createElement('p');
      h.className = 's-group-title mono';
      h.id = `s-grp-${results.length}`;
      h.textContent = g;
      wrap.setAttribute('aria-labelledby', h.id);
      wrap.append(h);
      items.forEach((it) => { const i = results.length; results.push(it); wrap.append(option(it, i, terms)); });
      sList.append(wrap);
    });
    if (!results.length) sList.append(emptyState(sInput.value.trim()));
    sCount.textContent = terms.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : `${index.length} things to find`;
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { if (sLive) sLive.textContent = terms.length ? (results.length ? `${results.length} results` : 'No results') : ''; }, 450);
    setActive(0, false);
    sList.scrollTop = 0;
  }
  function runItem(i) {
    const item = results[i];
    if (!item) return;
    search.close();
    item.run();
  }
  function openSearch() {
    if (!search) return;
    closeAll();
    sInput.value = '';
    filter = 'all';
    $$('[data-filter]', search).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
    render();
    search.showModal();
    sInput.focus();
  }

  if (search) {
    sInput.addEventListener('input', render);
    sInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runItem(active); }
    });
    $$('[data-filter]', search).forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      $$('[data-filter]', search).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
      sInput.focus();
    }));
    $('[data-search-close]', search).addEventListener('click', () => search.close());
    search.addEventListener('click', (e) => { if (e.target === search) search.close(); });
    $$('[data-search-open]').forEach((b) => b.addEventListener('click', openSearch));
    d.addEventListener('keydown', (e) => {
      const el = e.target instanceof Element ? e.target : null;
      const typing = el && el.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (search.open) search.close(); else openSearch();
      } else if (e.key === '/' && !typing && !d.querySelector('dialog[open]')) {
        e.preventDefault();
        openSearch();
      }
    });
  }
})();
