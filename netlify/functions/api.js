const crypto = require('crypto');
const SU = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SK = process.env.SUPABASE_SERVICE_KEY;
const AK = process.env.ADMIN_KEY;

const res = (code, body, extra = {}) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  body: JSON.stringify(body),
});
const sign = (v) => crypto.createHmac('sha256', AK).update(v).digest('hex');
const makeToken = () => { const e = Date.now() + 7 * 864e5; return e + '.' + sign(String(e)); };
const valid = (cookie) => {
  const m = /tn_s=(\d+)\.([a-f0-9]+)/.exec(cookie || '');
  if (!m || +m[1] < Date.now()) return false;
  const a = Buffer.from(sign(m[1])), b = Buffer.from(m[2]);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const sameKey = (a, b) => {
  const h = (x) => crypto.createHash('sha256').update(String(x)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};
const db = async (path, opt = {}) => {
  const r = await fetch(SU + '/rest/v1/' + path, {
    ...opt,
    headers: { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opt.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return t ? JSON.parse(t) : null;
};
const slugify = (s) =>
  (String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)) || 'menu';

async function create(body) {
  const base = slugify(body.data && body.data.name);
  for (let n = 0; n < 20; n++) {
    const slug = n ? base + '-' + (n + 1) : base;
    try {
      const rows = await db('menus', { method: 'POST', body: JSON.stringify({ slug, active: body.active !== false, data: body.data || {} }) });
      return rows[0];
    } catch (e) {
      if (!/23505|duplicate/i.test(e.message)) throw e;
    }
  }
  throw new Error('Adresse indisponible');
}

exports.handler = async (ev) => {
  try {
    if (!SU || !SK || !AK) return res(500, { error: 'Variables Netlify manquantes (SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_KEY)' });
    const path = ev.path.replace(/^.*?\/api(?=\/|$)/, '') || '/';
    const m = ev.httpMethod;
    let body = {};
    if (ev.body) body = JSON.parse(ev.isBase64Encoded ? Buffer.from(ev.body, 'base64').toString() : ev.body);

    // Public : menu d'un client
    let mm = /^\/menu\/([^/]+)$/.exec(path);
    if (m === 'GET' && mm) {
      const rows = await db(`menus?slug=eq.${encodeURIComponent(decodeURIComponent(mm[1]))}&active=eq.true&select=slug,data`);
      if (!rows.length) return res(404, { error: 'Menu introuvable' });
      return res(200, rows[0], { 'Cache-Control': 'public, max-age=30' });
    }

    // Authentification
    if (m === 'POST' && path === '/login') {
      if (!sameKey(body.key || '', AK)) {
        await new Promise((r) => setTimeout(r, 700));
        return res(401, { error: 'Code incorrect' });
      }
      return res(200, { ok: true }, { 'Set-Cookie': `tn_s=${makeToken()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` });
    }
    if (m === 'POST' && path === '/logout') return res(200, { ok: true }, { 'Set-Cookie': 'tn_s=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
    if (m === 'GET' && path === '/me') return res(200, { ok: valid(ev.headers.cookie) });

    // Zone admin
    if (!valid(ev.headers.cookie)) return res(401, { error: 'Non autorisé' });

    if (m === 'POST' && path === '/upload') {
      const mt = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(body.image || '');
      if (!mt) return res(400, { error: 'Image invalide' });
      const buf = Buffer.from(mt[2], 'base64');
      if (buf.length > 4e6) return res(413, { error: 'Image trop lourde' });
      const ext = mt[1].split('/')[1].replace('jpeg', 'jpg');
      const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const r = await fetch(`${SU}/storage/v1/object/menu-images/${name}`, {
        method: 'POST',
        headers: { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': mt[1] },
        body: buf,
      });
      if (!r.ok) return res(500, { error: 'Stockage photos : ' + (await r.text()) });
      return res(200, { url: `${SU}/storage/v1/object/public/menu-images/${name}` });
    }

    mm = /^\/clients(?:\/([0-9a-f-]{36}))?$/.exec(path);
    if (mm) {
      const id = mm[1];
      if (m === 'GET' && !id) return res(200, { items: await db('menus?select=id,slug,active,name:data->>name,updated_at&order=updated_at.desc') });
      if (m === 'GET' && id) {
        const rows = await db(`menus?id=eq.${id}&select=id,slug,active,data`);
        return rows.length ? res(200, rows[0]) : res(404, { error: 'Client introuvable' });
      }
      if (m === 'POST' && !id) return res(200, await create(body));
      if (m === 'PUT' && id) {
        const patch = { updated_at: new Date().toISOString() };
        if (body.data && typeof body.data === 'object') patch.data = body.data;
        if (typeof body.active === 'boolean') patch.active = body.active;
        const rows = await db(`menus?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
        return rows.length ? res(200, rows[0]) : res(404, { error: 'Client introuvable' });
      }
      if (m === 'DELETE' && id) {
        await db(`menus?id=eq.${id}`, { method: 'DELETE' });
        return res(200, { ok: true });
      }
    }
    return res(404, { error: 'Route inconnue' });
  } catch (e) {
    return res(500, { error: 'Erreur serveur : ' + String(e.message).slice(0, 300) });
  }
};
