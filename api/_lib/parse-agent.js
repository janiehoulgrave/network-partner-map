// Reads a Compass agent profile page into partner fields.
// Uses several independent signals (structured data, meta tags, visible text) so one layout change doesn't break everything.
import { segments, metas, jsonLd, clean, fmtPhone, PHONE_RE, stateAbbr, STATES } from "./html.js";

const STOP = /^(client testimonials|testimonials|about|about me|awards|social media|work with|listings|sales|rentals|transactions|past sales|contact|reviews|my listings|scroll down|instagram|facebook|linkedin|twitter|zillow|youtube|tiktok)\b/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function parseAgent(html) {
  const segs = segments(html);
  const meta = metas(html);
  const ld = jsonLd(html);
  const out = { name: "", title: "", photo: "", email: "", mobile: "", office: "", city: "", state: "", specialties: [], languages: [] };

  // 1) Structured data, if Compass provides it
  const person = ld.find((o) => /RealEstateAgent|Person/i.test([].concat(o["@type"] || []).join(" ")));
  if (person) {
    out.name = clean(person.name || "");
    const img = person.image && (typeof person.image === "string" ? person.image : person.image.url);
    if (img) out.photo = img;
    if (person.email) out.email = String(person.email).replace(/^mailto:/i, "");
    if (person.jobTitle) out.title = clean(person.jobTitle);
    const addr = person.address || (person.worksFor && person.worksFor.address);
    if (addr && typeof addr === "object") {
      out.city = clean(addr.addressLocality || "");
      out.state = stateAbbr(addr.addressRegion || "");
    }
    const kn = person.knowsLanguage;
    if (kn) out.languages = [].concat(kn).map((l) => clean(typeof l === "string" ? l : l.name || "")).filter(Boolean);
  }
  const crumbs = ld.find((o) => /BreadcrumbList/i.test(String(o["@type"] || "")));

  // 2) Page title: "Maryam Redjaee, Chevy Chase Real Estate Agent - Compass"
  const titleTag = clean((String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || meta["og:title"] || "");
  const tm = titleTag.match(/^(.+?),\s*(.+?)\s+Real Estate Agent/i);
  if (tm) { out.name = out.name || tm[1].trim(); out.city = out.city || tm[2].trim(); }
  if (!out.name) {
    const h1 = clean((String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
    out.name = h1 || titleTag.split(/[,|\-–]/)[0].trim();
  }

  // 3) State from the breadcrumb (Agents › Maryland › Chevy Chase › Name)
  if (!out.state) {
    if (crumbs && Array.isArray(crumbs.itemListElement)) {
      for (const it of crumbs.itemListElement) {
        const ab = stateAbbr(clean(it.name || (it.item && it.item.name) || ""));
        if (ab) { out.state = ab; break; }
      }
    }
    if (!out.state) {
      for (let i = segs.length - 1; i > 0; i--) {
        if (/(^|\s)agents$/i.test(segs[i - 1]) && stateAbbr(segs[i])) {
          out.state = stateAbbr(segs[i]);
          if (!out.city && segs[i + 1] && segs[i + 1] !== out.name) out.city = segs[i + 1];
          break;
        }
      }
    }
  }

  // 4) Photo: og:image, else an <img> whose alt is the agent's name
  if (!out.photo) {
    const og = meta["og:image"] || meta["twitter:image"] || "";
    if (og && !/logo|default|placeholder/i.test(og)) out.photo = og;
  }
  if (!out.photo && out.name) {
    const first = out.name.split(" ")[0].toLowerCase();
    for (const m of String(html).matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const alt = clean((tag.match(/\balt\s*=\s*"([^"]*)"/i) || [])[1] || "").toLowerCase();
      const src = (tag.match(/\bsrc\s*=\s*"([^"]+)"/i) || [])[1] || "";
      if (src && alt && alt.includes(first) && !/logo/i.test(src)) { out.photo = src; break; }
    }
  }
  if (out.photo && out.photo.startsWith("//")) out.photo = "https:" + out.photo;
  if (out.photo && !/^https:\/\//i.test(out.photo)) out.photo = "";

  // 5) Contact block near the name: "Realtor®", "maryam@compass.com", "M: 202-…", "O: 301-…"
  const text = segs.join(" | ");
  const nameIdx = segs.findIndex((s, i) => s === out.name && segs.slice(i + 1, i + 6).some((x) => EMAIL_RE.test(x) || /^[MO]:/.test(x)));
  const near = nameIdx >= 0 ? segs.slice(nameIdx, nameIdx + 14) : segs;
  if (!out.email) {
    const mail = (String(html).match(/href=["']mailto:([^"'?]+)/i) || [])[1];
    out.email = mail ? decodeURIComponent(mail) : ((near.join(" ").match(EMAIL_RE) || [])[0] || "");
  }
  const phoneAfter = (label) => {
    const re = new RegExp("(?:^|\\|)\\s*" + label + "\\s*:?\\s*\\|?\\s*(" + PHONE_RE.source + ")", "i");
    const m = text.match(re);
    return m ? fmtPhone(m[1]) : "";
  };
  out.mobile = phoneAfter("M") || phoneAfter("Mobile") || phoneAfter("Cell");
  out.office = phoneAfter("O") || phoneAfter("Office");
  if (!out.mobile && !out.office && person && person.telephone) out.mobile = fmtPhone(person.telephone);
  if (!out.title && nameIdx >= 0) {
    const cand = segs[nameIdx + 1] || "";
    if (cand && cand.length <= 60 && !EMAIL_RE.test(cand) && !/^[MO]:/.test(cand) && !PHONE_RE.test(cand)) out.title = cand;
  }

  // 6) Languages and Specialties sections
  if (!out.languages.length) {
    const lm = text.match(/Languages?\s*:?\s*\|?\s*([^|]+)/i);
    if (lm) out.languages = splitList(lm[1]);
  }
  const si = segs.findIndex((s) => /^specialt(y|ies)\s*:?\s*/i.test(s));
  if (si >= 0) {
    const inline = segs[si].replace(/^specialt(y|ies)\s*:?\s*/i, "");
    const items = inline ? [inline] : [];
    for (let i = si + 1; i < segs.length && i < si + 20; i++) {
      const s = segs[i];
      if (/^languages?\b/i.test(s) || STOP.test(s) || s.length > 48) break;
      items.push(s);
    }
    out.specialties = items.flatMap(splitList);
  }

  out.name = out.name.replace(/\s+-\s+Compass$/i, "").trim();
  out.city = out.city.replace(/\s+Real Estate.*$/i, "").trim();
  if (!STATES[out.state]) out.state = "";
  return out;
}

function splitList(s) {
  return String(s).split(/,|;|•|·|\band\b/i).map((x) => x.replace(/[.\s]+$/g, "").trim()).filter((x) => x && x.length <= 40);
}
