(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------- Syntax highlighting ---------------- */
  const KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'return', 'new', 'typeof', 'class', 'if', 'else',
    'this', 'async', 'await', 'of', 'in', 'instanceof', 'void', 'delete', 'throw', 'try', 'catch'
  ]);
  const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);
  const TOKEN = /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b(?:0[xXbBoO][\da-fA-F_]+n?|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?)\b)|([A-Za-z_$][\w$]*)/g;

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(code) {
    const src = code.textContent;
    let out = '';
    let last = 0;
    for (const match of src.matchAll(TOKEN)) {
      const [text, comment, string, number, ident] = match;
      let cls = null;
      if (comment) cls = 'c';
      else if (string) cls = 's';
      else if (number) cls = 'n';
      else if (ident) cls = KEYWORDS.has(text) ? 'k' : LITERALS.has(text) ? 'n' : null;

      out += escapeHtml(src.slice(last, match.index));
      out += cls ? '<span class="tok-' + cls + '">' + escapeHtml(text) + '</span>' : escapeHtml(text);
      last = match.index + text.length;
    }
    out += escapeHtml(src.slice(last));
    code.innerHTML = out;
  }

  document.querySelectorAll('code.language-js, code.language-jsx').forEach(highlight);

  /* ---------------- Copy buttons ---------------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      area.remove();
      return ok;
    }
  }

  document.querySelectorAll('.prose pre > code').forEach((code) => {
    if (code.closest('.q')) return;
    const pre = code.parentElement;
    const wrap = document.createElement('div');
    wrap.className = 'code-block';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code');
    let resetTimer;
    button.addEventListener('click', async () => {
      const ok = await copyText(code.textContent);
      button.textContent = ok ? 'Copied' : 'Copy failed';
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    });
    wrap.appendChild(button);
  });

  /* ---------------- Reveal on scroll ---------------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => revealer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------- Reading dock ---------------- */
  const dock = document.querySelector('.reading-control');
  const pill = dock.querySelector('.reading-pill');
  const pillLabel = dock.querySelector('.reading-label');
  const ringFill = dock.querySelector('.ring__fill');
  const menu = dock.querySelector('.reading-menu');
  const RING = 2 * Math.PI * 8;
  const defaultLabel = pillLabel.textContent;

  document.querySelectorAll('.toc a').forEach((link) => {
    const item = document.createElement('a');
    item.href = link.getAttribute('href');
    item.textContent = link.textContent;
    menu.appendChild(item);
  });
  const menuLinks = Array.from(menu.querySelectorAll('a'));
  const sections = menuLinks
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);

  function setMenuOpen(open) {
    dock.classList.toggle('is-open', open);
    pill.setAttribute('aria-expanded', String(open));
    menu.inert = !open;
  }

  pill.addEventListener('click', () => setMenuOpen(!dock.classList.contains('is-open')));
  menuLinks.forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
  document.addEventListener('click', (event) => {
    if (!dock.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dock.classList.contains('is-open')) {
      setMenuOpen(false);
      pill.focus();
    }
  });
  setMenuOpen(false);

  function updateDock() {
    const max = root.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    ringFill.style.strokeDashoffset = String(RING * (1 - progress));

    let current = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top - 140 <= 0) current = section;
    }
    const currentHref = current ? '#' + current.id : null;
    menuLinks.forEach((link) => {
      if (link.getAttribute('href') === currentHref) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const active = menuLinks.find((link) => link.getAttribute('href') === currentHref);
    pillLabel.textContent = active ? active.textContent : defaultLabel;
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(() => {
        updateDock();
        ticking = false;
      });
    }
  }, { passive: true });
  window.addEventListener('resize', updateDock);
  updateDock();

  /* ---------------- Share ---------------- */
  const shareButton = document.querySelector('[data-share]');
  const shareLabel = shareButton.querySelector('[data-share-label]');
  let shareTimer;

  shareButton.addEventListener('click', async () => {
    const url = window.location.href.split('#')[0];
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    const ok = await copyText(url);
    shareLabel.textContent = ok ? 'Link copied' : 'Copy failed';
    window.clearTimeout(shareTimer);
    shareTimer = window.setTimeout(() => { shareLabel.textContent = 'Share'; }, 1800);
  });

  /* ---------------- Quiz ---------------- */
  const cards = Array.from(document.querySelectorAll('.q'));
  const total = cards.length;
  const scoreEl = document.querySelector('[data-score]');
  const gradedEl = document.querySelector('[data-graded]');
  const verdictEl = document.querySelector('[data-verdict]');
  const meterFill = document.querySelector('.meter__fill');

  function verdict(right, graded) {
    if (graded === 0) return 'Reveal each answer, then grade yourself honestly.';
    if (graded < total) return 'Graded ' + graded + ' of ' + total + '. Keep going.';
    if (right === total) return 'Ten out of ten. You are a genuine JS pro. Use the cheat sheet below as a refresher.';
    if (right >= 8) return 'Strong. You know the rules, and the deep dive will close the last gaps.';
    if (right >= 5) return 'Good instincts, shaky rules. The sections below fix exactly that.';
    return 'This post was written for you. Every answer is explained below, step by step.';
  }

  function updateScore() {
    const graded = cards.filter((card) => card.dataset.grade);
    const right = graded.filter((card) => card.dataset.grade === 'yes').length;
    if (scoreEl.textContent !== String(right)) {
      scoreEl.classList.remove('bump');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('bump');
    }
    scoreEl.textContent = right;
    gradedEl.textContent = graded.length;
    meterFill.style.transform = 'scaleX(' + right / total + ')';
    verdictEl.textContent = verdict(right, graded.length);
  }

  function setAnswerOpen(card, open) {
    const toggle = card.querySelector('.q__toggle');
    const answer = card.querySelector('.q__answer');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.q__toggle-label').textContent = open ? 'Hide answer' : 'Show answer';
    answer.classList.toggle('is-open', open);
    answer.inert = !open;
  }

  function setGrade(card, grade) {
    card.dataset.grade = grade;
    card.classList.toggle('is-right', grade === 'yes');
    card.classList.toggle('is-wrong', grade === 'no');
    card.querySelector('.q__status').textContent = grade === 'yes' ? 'Got it' : grade === 'no' ? 'Missed' : '';
    card.querySelectorAll('[data-grade]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.grade === grade));
    });
  }

  cards.forEach((card) => {
    setAnswerOpen(card, false);
    card.querySelector('.q__toggle').addEventListener('click', () => {
      setAnswerOpen(card, !card.querySelector('.q__answer').classList.contains('is-open'));
    });
    card.querySelectorAll('[data-grade]').forEach((button) => {
      button.addEventListener('click', () => {
        const grade = button.dataset.grade;
        setGrade(card, card.dataset.grade === grade ? '' : grade);
        updateScore();
      });
    });
  });

  function resetQuiz() {
    cards.forEach((card) => {
      setGrade(card, '');
      setAnswerOpen(card, false);
    });
    updateScore();
  }

  document.querySelector('[data-reset]').addEventListener('click', () => {
    resetQuiz();
    document.getElementById('challenge').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  document.querySelectorAll('[data-retake]').forEach((link) => {
    link.addEventListener('click', resetQuiz);
  });

  updateScore();
})();
