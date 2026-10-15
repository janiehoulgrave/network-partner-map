// Reads the public Compass office directory: name, street address and main phone for each office.
// Two independent readers run on the page; whichever finds more offices wins, so a small
// markup change on compass.com doesn't break office matching.
import { fetchPage, segments, clean, fmtPhone, PHONE_RE, stateAbbr } from "./html.js";

export const OFFICES_URL = "https://www.compass.com/about/offices/";
let cache = { at: 0, list: [] };
export let lastRun = { status: null, bytes: 0, byHeading: 0, byText: 0, at: null };

const CSZ = /^(.*?)[,\s]+([A-Za-z]{2})\.?,?\s+(\d{5})(?:-\d{4})?$/;                 // "Chevy Chase MD 20815"
const FULL = /^(\d[^,]*(?:,\s*[^,]+)*?),\s*([^,]+?),?\s+([A-Za-z]{2})\.?,?\s+(\d{5})(?:-\d{4})?$/; // "5471 Wisconsin Ave, Suite 300, Chevy Chase, MD 20815"
const isPhone = (l) => PHONE_RE.test(l) && /^[\s\d().+\-:a-z]*$/i.test(l) && l.replace(/\D/g, "").length >= 10 && l.replace(/\D/g, "").length <= 11;
const officeName = (n) => (/compass/i.test(n) ? n : `Compass ${n}`).replace(/\s+/g, " ").trim();
const make = (name, street, city, st, zip, phone) => ({
  name: officeName(name),
  address: `${street}, ${city}, ${st.toUpperCase()} ${zip}`,
  phone: phone ? fmtPhone(phone) : "",
  city, state: st.toUpperCase(), zip,
});

/** Reader 1: each office is a heading (h2–h4) followed by its address lines and phone. */
export function parseByHeading(html) {
  const list = [];
  const parts = String(html).split(/<h[2-4]\b/i).slice(1);
  for (const part of parts) {
    const name = clean(((part.match(/^[^>]*>([\s\S]*?)<\/h[2-4]>/i) || [])[1] || "").replace(/<[^>]+>/g, " "));
    const rest = part.slice(Math.max(0, part.search(/<\/h[2-4]>/i)) + 5);
    const lines = segments(rest).slice(0, 8);
    let hit = null;
    for (let i = 0; i < lines.length && !hit; i++) {
      const f = lines[i].match(FULL);
      if (f && stateAbbr(f[3])) { hit = { street: f[1], city: f[2], st: f[3], zip: f[4], i }; break; }
      const m = lines[i].match(CSZ);
      if (m && stateAbbr(m[2]) && i >= 1) {
        const street = lines.slice(0, i).filter((l) => !isPhone(l)).join(", ");
        if (/\d/.test(street)) hit = { street, city: m[1].replace(/,$/, "").trim(), st: m[2], zip: m[3], i };
      }
    }
    if (!name || !hit || name.length > 80) continue;
    const phone = lines.slice(hit.i + 1, hit.i + 4).find(isPhone) || lines.find(isPhone) || "";
    list.push(make(name, hit.street, hit.city, hit.st, hit.zip, phone));
  }
  return list;
}

/** Reader 2: scan all visible text for "street / city ST ZIP / phone" runs, whatever the tags are. */
export function parseByText(html) {
  const segs = segments(html), list = [];
  for (let i = 0; i < segs.length; i++) {
    let street = null, city, st, zip, startIdx;
    const f = segs[i].match(FULL);
    if (f && stateAbbr(f[3])) { street = f[1]; city = f[2]; st = f[3]; zip = f[4]; startIdx = i; }
    else {
      const m = segs[i].match(CSZ);
      if (!m || !stateAbbr(m[2]) || i < 1) continue;
      const prev = [segs[i - 2], segs[i - 1]].filter(Boolean);
      // street line(s): "5471 Wisconsin Ave", optionally followed by "Suite 300"
      if (/^\d/.test(prev[prev.length - 1] || "")) { street = prev[prev.length - 1]; startIdx = i - 1; }
      else if (prev.length === 2 && /^\d/.test(prev[0]) && /^(suite|ste|floor|fl|unit|#|\d)/i.test(prev[1])) { street = prev.join(", "); startIdx = i - 2; }
      if (!street) continue;
      city = m[1].replace(/,$/, "").trim(); st = m[2]; zip = m[3];
    }
    let name = "";
    for (let j = startIdx - 1; j >= Math.max(0, startIdx - 3); j--) {
      const s = segs[j];
      if (s && s.length <= 60 && !/^\d/.test(s) && !isPhone(s)) { name = s; break; }
    }
    const phone = segs.slice(i + 1, i + 4).find(isPhone) || "";
    if (name) list.push(make(name, street, city, st, zip, phone));
  }
  return list;
}

export function parseOffices(html) {
  const a = parseByHeading(html), b = parseByText(html);
  lastRun.byHeading = a.length; lastRun.byText = b.length;
  const best = a.length >= b.length ? a : b;
  const seen = new Set();
  return best.filter((o) => { const k = o.address.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

export async function getOffices() {
  if (cache.list.length && Date.now() - cache.at < 24 * 3600 * 1000) return cache.list;
  let r;
  try { r = await fetchPage(OFFICES_URL, 20000); } catch (e) { r = { ok: false, status: "timeout", html: "" }; }
  lastRun = { ...lastRun, status: r.status, bytes: (r.html || "").length, at: new Date().toISOString() };
  if (!r.ok) return cache.list;
  const list = parseOffices(r.html);
  if (list.length) cache = { at: Date.now(), list };
  return cache.list;
}
