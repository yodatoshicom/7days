export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://weekdash.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { event, value, path, session_id, session_seconds, screen, viewport, tz, lang } = req.body || {};

  if (typeof event !== 'string' || event.length > 50) return res.status(400).end();
  if (value != null && (typeof value !== 'string' || value.length > 2048)) return res.status(400).end();
  if (typeof session_id !== 'string' || session_id.length > 64) return res.status(400).end();
  if (path != null && (typeof path !== 'string' || path.length > 2048)) return res.status(400).end();
  if (session_seconds != null && typeof session_seconds !== 'number') return res.status(400).end();
  if (screen != null && (typeof screen !== 'string' || screen.length > 50)) return res.status(400).end();
  if (viewport != null && (typeof viewport !== 'string' || viewport.length > 50)) return res.status(400).end();
  if (tz != null && (typeof tz !== 'string' || tz.length > 100)) return res.status(400).end();
  if (lang != null && (typeof lang !== 'string' || lang.length > 50)) return res.status(400).end();

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    'unknown';

  const ua = req.headers['user-agent'] || '';

  let browser = 'other';
  if (/Googlebot/i.test(ua))                 browser = 'Googlebot';
  else if (/Bingbot/i.test(ua))              browser = 'Bingbot';
  else if (/Applebot/i.test(ua))             browser = 'Applebot';
  else if (/DuckDuckBot/i.test(ua))          browser = 'DuckDuckBot';
  else if (/YandexBot/i.test(ua))            browser = 'YandexBot';
  else if (/Baiduspider/i.test(ua))          browser = 'Baiduspider';
  else if (/GPTBot/i.test(ua))               browser = 'GPTBot';
  else if (/ChatGPT-User/i.test(ua))         browser = 'ChatGPT-User';
  else if (/ClaudeBot|Claude-Web/i.test(ua)) browser = 'ClaudeBot';
  else if (/CCBot/i.test(ua))                browser = 'CCBot';
  else if (/PerplexityBot/i.test(ua))        browser = 'PerplexityBot';
  else if (/facebookexternalhit/i.test(ua))  browser = 'Facebook';
  else if (/LinkedInBot/i.test(ua))          browser = 'LinkedInBot';
  else if (/Twitterbot/i.test(ua))           browser = 'Twitterbot';
  else if (/WhatsApp/i.test(ua))             browser = 'WhatsApp';
  else if (/Discordbot/i.test(ua))           browser = 'Discordbot';
  else if (/Telegrambot/i.test(ua))          browser = 'Telegrambot';
  else if (/bot|crawler|spider|slurp/i.test(ua)) browser = 'Bot';
  else if (/Edg\//.test(ua))                 browser = 'Edge';
  else if (/Chrome\//.test(ua))              browser = 'Chrome';
  else if (/Firefox\//.test(ua))             browser = 'Firefox';
  else if (/Safari\//.test(ua))              browser = 'Safari';

  let os = 'other';
  if (/iPhone|iPad/.test(ua))      os = 'iOS';
  else if (/Android/.test(ua))     os = 'Android';
  else if (/Macintosh/.test(ua))   os = 'macOS';
  else if (/Windows/.test(ua))     os = 'Windows';
  else if (/Linux/.test(ua))       os = 'Linux';

  const country = req.headers['x-vercel-ip-country'] || null;
  const city    = req.headers['x-vercel-ip-city']    || null;

  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/weekdash_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ event, value, path, browser, os, ip, session_id, session_seconds, screen, viewport, tz, lang, country, city }),
    });
    if (!r.ok) throw new Error(await r.text());
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('track error:', e.message);
    res.status(500).json({ ok: false });
  }
}
