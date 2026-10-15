// Reads the public Compass office directory: name, street address and main phone for each office.
import { fetchPage, segments, clean, fmtPhone, PHONE_RE, stateAbbr } from "./html.js";

export const OFFICES_URL = "https://www.compass.com/about/offices/";
let cache = { at: 0, list: [] };

export function parseOffices(html) {
  const list = [];
  const parts = String(html).split(/<h3\b/i).slice(1);
  for (const part of parts) {
    const name = clean(((part.match(/^[^>]*>([\s\S]*?)<\/h3>/i) || [])[1] || "").replace(/<[^>]+>/g, " "));
    const rest = part.slice(part.search(/<\/h3>/i) + 5).split(/<h[1-3]\b/i)[0];
    const lines = segments(rest).slice(0, 8);
    const pi = lines.findIndex((l) => PHONE_RE.test(l) && l.replace(/\D/g, "").length >= 10 && l.replace(/\D/g, "").length <= 11);
    let csz = null, ci = -1;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(.*?)[,\s]+([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?$/);
      if (m && stateAbbr(m[2])) { csz = { city: m[1].replace(/,$/, "").trim(), state: m[2].toUpperCase(), zip: m[3] }; ci = i; break; }
    }
    if (!name || !csz || ci < 1) continue;
    const street = lines.slice(0, ci).filter((l) => !PHONE_RE.test(l) || /[a-z]/i.test(l)).join(", ");
    list.push({
      name: /compass/i.test(name) ? name : `Compass ${name}`,
      address: `${street}, ${csz.city}, ${csz.state} ${csz.zip}`,
      phone: pi >= 0 ? fmtPhone(lines[pi]) : "",
      city: csz.city, state: csz.state, zip: csz.zip,
    });
  }
  return list;
}

export async function getOffices() {
  if (cache.list.length && Date.now() - cache.at < 24 * 3600 * 1000) return cache.list;
  const r = await fetchPage(OFFICES_URL, 15000);
  if (!r.ok) return cache.list;
  const list = parseOffices(r.html);
  if (list.length) cache = { at: Date.now(), list };
  return cache.list;
}
