const { createHash, timingSafeEqual, scryptSync, createHmac } = require('node:crypto');
const cookie = 'laila_admin';
const ttl = 4 * 3600;
const storePath = 'data/rsvps.json';
const storeRepo = process.env.RSVP_GITHUB_REPO || '';
const ghToken = process.env.RSVP_GITHUB_TOKEN || '';
const hash = s => createHash('sha256').update(s).digest('hex');
const equal = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const api = (path, init = {}) => fetch(`https://api.github.com/repos/${storeRepo}${path}`, {
  ...init,
  headers: {
    Authorization: 'Bearer ' + ghToken,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'lailawaadam-rsvp',
    ...(init.body ? {'Content-Type': 'application/json'} : {})
  },
  signal: AbortSignal.timeout(9000)
});

async function readStore() {
  const res = await api(`/contents/${storePath}`);
  if (res.status === 404) return {rows: [], sha: null};
  const data = await res.json();
  if (!res.ok || !data.content) throw new Error('storage');
  return {rows: JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')).rows || [], sha: data.sha};
}
async function writeStore(rows, sha) {
  const body = {message: 'rsvp: update responses', content: Buffer.from(JSON.stringify({rows})).toString('base64')};
  if (sha) body.sha = sha;
  return api(`/contents/${storePath}`, {method: 'PUT', body: JSON.stringify(body)});
}
async function mutate(fn) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const {rows, sha} = await readStore();
    const outcome = fn(rows);
    if (outcome.done) return outcome;
    const res = await writeStore(outcome.rows, sha);
    if (res.ok) return outcome;
    if (![409, 422].includes(res.status)) throw new Error('storage');
  }
  throw new Error('conflict');
}

const signed = (expires, secret) => createHmac('sha256', secret).update(`${cookie}:${expires}`).digest('hex');
function authorized(req, secret) {
  const value = (req.headers.cookie || '').match(/(?:^|;\s*)laila_admin=([^;]*)/)?.[1] || '';
  const [expires, proof] = value.split('.');
  return /^\d{10}$/.test(expires) && +expires > Math.floor(Date.now() / 1000) && typeof proof === 'string' && equal(proof, signed(expires, secret));
}
function setCookie(res, value, age) {
  res.setHeader('Set-Cookie', `${cookie}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/api/rsvp; Max-Age=${age}`);
}
const phoneDigits = v => v.replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) - (c.charCodeAt(0) < 1776 ? 1632 : 1776)));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const reply = (status, data) => res.status(status).json(data);
  try {
    const config = process.env.RSVP_ADMIN_PASSWORD_HASH || '';
    const secret = process.env.RSVP_SESSION_SECRET || '';
    if (!storeRepo || !ghToken || !/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(config) || !/^[a-f0-9]{64}$/.test(secret)) return reply(503, {error: 'unconfigured'});

    if (req.method === 'GET') {
      if (!authorized(req, secret)) return reply(401, {error: 'auth'});
      const {rows} = await readStore();
      return reply(200, {rows: rows.slice().sort((a, b) => b.updated.localeCompare(a.updated))});
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return reply(405, {error: 'method'}); }
    if (req.headers['sec-fetch-site'] === 'cross-site' || req.headers['content-type']?.split(';')[0] !== 'application/json' || req.headers['x-rsvp-request'] !== '1') return reply(403, {error: 'request'});
    if (Number(req.headers['content-length']) > 4096) return reply(413, {error: 'size'});
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch { return reply(400, {error: 'invalid'}); } }
    if (!b || typeof b !== 'object') return reply(400, {error: 'invalid'});

    if (b.action === 'login') {
      const [salt, expected] = config.split(':');
      if (typeof b.password !== 'string' || b.password.length > 160 || !equal(scryptSync(b.password, salt, 32).toString('hex'), expected)) return reply(401, {error: 'auth'});
      const expires = String(Math.floor(Date.now() / 1000) + ttl);
      setCookie(res, `${expires}.${signed(expires, secret)}`, ttl);
      return reply(200, {ok: true});
    }
    if (b.action === 'logout') { setCookie(res, '', 0); return reply(200, {ok: true}); }
    if (b.action === 'delete') {
      if (!authorized(req, secret)) return reply(401, {error: 'auth'});
      if (typeof b.id !== 'string' || !/^[a-f0-9]{64}$/.test(b.id)) return reply(400, {error: 'invalid'});
      const out = await mutate(rows => {
        const kept = rows.filter(r => r.id !== b.id);
        return kept.length === rows.length ? {done: true, status: 404} : {rows: kept, status: 200};
      });
      return reply(out.status || 200, out.status === 404 ? {error: 'missing'} : {ok: true});
    }
    if (b.action !== 'submit') return reply(400, {error: 'invalid'});

    const name = typeof b.name === 'string' ? b.name.trim().replace(/\s+/gu, ' ') : '';
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    const phone = typeof b.phone === 'string' && b.phone.length <= 32 ? phoneDigits(b.phone).replace(/[\s().-]/g, '') : '';
    if (name.length > 100 || name.split(' ').filter(s => /\p{L}/u.test(s)).length < 2 || email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email) || !/^\+?\d{7,15}$/.test(phone) || !['yes', 'no'].includes(b.attendance) || (b.attendance === 'yes' && (!Number.isInteger(b.guests) || b.guests < 1 || b.guests > 4))) return reply(400, {error: 'invalid'});

    const id = hash(email);
    const row = {id, name, email, phone, attendance: b.attendance, guests: b.attendance === 'yes' ? b.guests : 0, updated: new Date().toISOString()};
    const out = await mutate(rows => {
      // A public submission never overwrites an existing reply.
      if (rows.some(r => r.id === id)) return {done: true, status: 409};
      if (rows.length >= 2000) return {done: true, status: 503};
      return {rows: [...rows, row], status: 201};
    });
    if (out.done && out.status === 409) return reply(409, {error: 'duplicate'});
    if (out.done && out.status === 503) return reply(503, {error: 'capacity'});
    return reply(201, {ok: true});
  } catch {
    return reply(503, {error: 'unavailable'});
  }
};
