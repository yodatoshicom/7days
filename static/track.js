(function () {
  const SID_KEY = 'weekdash_sid';
  const START_KEY = 'weekdash_start';
  const BOT_RE = /bot|crawler|spider|slurp|bingpreview|chatgpt-user|gptbot|ccbot|claudebot|claude-web|perplexity|facebookexternalhit|linkedinbot|twitterbot|whatsapp|discordbot|telegrambot|applebot|yandex|duckduck|baidu/i;
  const isBot = BOT_RE.test(navigator.userAgent || '');

  let sid = sessionStorage.getItem(SID_KEY);
  if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem(SID_KEY, sid); }

  let startTime = parseInt(sessionStorage.getItem(START_KEY), 10);
  if (!startTime) { startTime = Date.now(); sessionStorage.setItem(START_KEY, String(startTime)); }

  const meta = {
    screen: `${screen.width}x${screen.height}`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: navigator.language,
  };

  function track(event, value, sessionSeconds) {
    const payload = {
      event,
      value: value ?? null,
      path: location.pathname || '/',
      session_id: sid,
      session_seconds: sessionSeconds ?? null,
      viewport: `${innerWidth}x${innerHeight}`,
      ...meta,
    };
    navigator.sendBeacon
      ? navigator.sendBeacon('https://weekdash.vercel.app/api/track', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      : fetch('https://weekdash.vercel.app/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
  }

  track('pageview', document.referrer || null);

  if (isBot) {
    window._track = track;
    return;
  }

  let sessionEnded = false;
  function sendExit() {
    if (sessionEnded) return;
    sessionEnded = true;
    track('session_end', null, Math.round((Date.now() - startTime) / 1000));
  }
  window.addEventListener('pagehide', sendExit);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendExit(); });

  document.addEventListener('click', e => {
    const colorDot = e.target.closest('.ncm-color-dot');
    if (colorDot) {
      track('note_color', colorDot.dataset.color);
      return;
    }
    const deleteBtn = e.target.closest('.ncm-delete');
    if (deleteBtn) {
      track('note_delete');
      return;
    }
    const settingsBtn = e.target.closest('.settings-btn');
    if (settingsBtn) {
      track('settings_open');
      return;
    }
    const bgImport = e.target.closest('#bg-import-btn');
    if (bgImport) {
      track('bg_change', 'import');
      return;
    }
    const bgReset = e.target.closest('#bg-reset-btn');
    if (bgReset) {
      track('bg_change', 'reset');
      return;
    }
    const langBtn = e.target.closest('#lang-picker .settings-toggle-btn');
    if (langBtn) {
      track('lang_change', langBtn.dataset.lang);
      return;
    }
    const sizeBtn = e.target.closest('#text-size-toggle .settings-toggle-btn');
    if (sizeBtn) {
      track('size_change', sizeBtn.dataset.size);
      return;
    }
  });

  window._track = track;
})();
