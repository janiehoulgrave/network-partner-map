// Small, dependency-free HTML helpers used by the page readers.
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", reg: "®", copy: "©", trade: "™", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", bull: "•", middot: "·" };
export function decode(s) {
  return String(s || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => (NAMED[n.toLowerCase()] ?? m));
}
export const clean = (s) => decode(s).replace(/\s+/g, " ").trim();

/** Visible text as a list of short segments, one per element boundary. */
export function segments(html) {
  const body = String(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "\n");
  return body.split("\n").map(clean).filter(Boolean);
}

/** Attributes of every <meta> tag, keyed by property/name. */
export function metas(html) {
  const out = {};
  for (const m of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {};
    for (const a of m[0].matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attrs[a[1].toLowerCase()] = decode(a[3] ?? a[4] ?? "");
    const key = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    if (key && attrs.content && !(key in out)) out[key] = attrs.content;
  }
  return out;
}

/** Every JSON-LD object on the page, flattened (handles @graph and arrays). */
export function jsonLd(html) {
  const out = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    out.push(o);
    if (o["@graph"]) walk(o["@graph"]);
  };
  for (const m of String(html).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1].trim())); } catch (e) { /* ignore bad blocks */ }
  }
  return out;
}

export const PHONE_RE = /(?:\+?1[\s.\-]?)?\(?(\d{3})\)?[\s.\-]?(\d{3})[\s.\-]?(\d{4})/;
export function fmtPhone(s) {
  const m = String(s || "").match(PHONE_RE);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

export const STATES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };
const NAME2AB = Object.fromEntries(Object.entries(STATES).map(([ab, n]) => [n.toLowerCase(), ab]));
export function stateAbbr(s) {
  const v = String(s || "").trim();
  if (/^[A-Za-z]{2}$/.test(v) && STATES[v.toUpperCase()]) return v.toUpperCase();
  return NAME2AB[v.toLowerCase()] || "";
}

export async function fetchPage(url, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    return { ok: r.ok, status: r.status, html: r.ok ? await r.text() : "" };
  } finally { clearTimeout(t); }
}
