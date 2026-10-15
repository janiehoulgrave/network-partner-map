// Reads the public Compass office directory: name, street address and main phone for each office.
// Two independent readers run on the page; whichever finds more offices wins, so a small
// markup change on compass.com doesn't break office matching.
import { fetchPage, segments, clean, fmtPhone, PHONE_RE, stateAbbr } from "./html.js";

export const OFFICES_URL = "https://www.compass.com/about/offices/";
let cache = { at: 0, list: [] };
export let lastRun = { status: null, bytes: 0, byHeading: 0, byText: 0, byData: 0, at: null };
let lastHtml = "";

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

/** Reader 3: office records embedded as data in the page's scripts (JSON or escaped JSON). */
export function parseByData(html) {
  const raw = String(html).replace(/\\"/g, '"').replace(/\\u0026/g, "&").replace(/\\u002F/gi, "/");
  const list = [];
  const KEY = (names) => new RegExp('"(?:' + names + ')"\\s*:\\s*"([^"]{1,140})"', "gi");
  // Pick the matching field closest to this record's ZIP, preferring the side the field usually sits on.
  const pick = (win, center, names, prefer) => {
    let before = null, after = null;
    for (const m of win.matchAll(KEY(names))) {
      if (m.index < center) before = m[1];
      else if (after === null) after = m[1];
    }
    const v = prefer === "after" ? (after ?? before) : (before ?? after);
    return v ? clean(v) : "";
  };
  const zips = [...raw.matchAll(/"(?:zip|zipCode|zipcode|postalCode|postal_code|zip_code)"\s*:\s*"(\d{5})(?:-\d{4})?"/gi)];
  zips.forEach((z, i) => {
    const from = Math.max(i ? zips[i - 1].index + zips[i - 1][0].length : 0, z.index - 1200);
    const to = Math.min(i < zips.length - 1 ? zips[i + 1].index : raw.length, z.index + 1200);
    const win = raw.slice(from, to), c = z.index - from;
    let street = pick(win, c, "address1|addressLine1|address_line_1|addressLineOne|street|streetAddress|street1|line1|address", "before");
    const street2 = pick(win, c, "address2|addressLine2|address_line_2|addressLineTwo|street2|line2|suite|unit", "before");
    const city = pick(win, c, "city|addressLocality|locality|cityName", "before");
    const st = stateAbbr(pick(win, c, "state|stateCode|state_code|addressRegion|region|stateAbbreviation", "before"));
    const phone = pick(win, c, "phone|phoneNumber|phone_number|telephone|officePhone|mainPhone|phoneMain", "after");
    let name = pick(win, c, "officeName|displayName|name|title|label", "before");
    if (!/^\d/.test(street) || !city || !st) return;
    if (street2 && !street.includes(street2)) street = `${street}, ${street2}`;
    if (!name || /^\d/.test(name) || name.length > 80) name = `${city} Office`;
    list.push(make(name, street, city, st, z[1], PHONE_RE.test(phone) ? phone : ""));
  });
  return list;
}

/** A short raw excerpt around some text, for troubleshooting (public page content only). */
export function peek(term) {
  if (!lastHtml || !term) return "";
  const i = lastHtml.indexOf(term);
  return i < 0 ? "(not found)" : lastHtml.slice(Math.max(0, i - 1500), i + 1500);
}

export function parseOffices(html) {
  const a = parseByHeading(html), b = parseByText(html), d = parseByData(html);
  lastRun.byHeading = a.length; lastRun.byText = b.length; lastRun.byData = d.length;
  const best = [a, b, d].sort((x, y) => y.length - x.length)[0];
  const seen = new Set();
  return best.filter((o) => { const k = o.address.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

export async function getOffices() {
  if (cache.list.length && Date.now() - cache.at < 24 * 3600 * 1000) return cache.list;
  let r;
  try { r = await fetchPage(OFFICES_URL, 20000); } catch (e) { r = { ok: false, status: "timeout", html: "" }; }
  lastRun = { ...lastRun, status: r.status, bytes: (r.html || "").length, at: new Date().toISOString() };
  if (!r.ok) return cache.list;
  lastHtml = r.html;
  const list = parseOffices(r.html);
  if (list.length) cache = { at: Date.now(), list };
  return cache.list;
}
