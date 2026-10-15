// GET /api/agent?url=https://www.compass.com/agents/first-last/
// Reads a Compass agent page and returns the partner's details. Signed-in @compass.com users only.
import { requireUser } from "./_lib/auth.js";
import { fetchPage } from "./_lib/html.js";
import { parseAgent } from "./_lib/parse-agent.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const user = await requireUser(req, res); if (!user) return;

  let slug = null;
  try {
    const u = new URL(String(req.query.url || ""));
    const m = u.pathname.match(/^\/agents\/([a-z0-9.\-]+)\/?$/i);
    if (/(^|\.)compass\.com$/i.test(u.hostname) && m && !/^(offices|locations)$/i.test(m[1])) slug = m[1];   // keep case: Compass links are case-sensitive
  } catch (e) { /* fall through */ }
  if (!slug) return res.status(400).json({ error: "That doesn't look like a Compass agent page. It should look like compass.com/agents/first-last/" });

  // Try the link exactly as pasted, then a lowercase version. Compass sends its generic
  // "Find an agent" search page (not an error) when a profile link doesn't exist.
  const isSearchPage = (html) => /<title[^>]*>\s*Real Estate Agents, Profiles/i.test(html) || /Find an agent who knows your market best/i.test(html.slice(0, 200000)) && !/Real Estate Agent - Compass<\/title>/i.test(html);
  let page = null, url = "", lastStatus = 0;
  for (const s of [...new Set([slug, slug.toLowerCase()])]) {
    url = `https://www.compass.com/agents/${s}/`;
    let p;
    try { p = await fetchPage(url); } catch (e) { p = { ok: false, status: 0 }; }
    lastStatus = p.status;
    if (p.ok && !isSearchPage(p.html)) { page = p; break; }
    if (p.ok) lastStatus = 404;
  }
  if (!page) {
    const msg = lastStatus === 404 ? "We couldn't find that agent's profile. Open it on compass.com and copy the link straight from the address bar." : "Compass didn't respond in time. Try again in a moment, or fill in their details yourself.";
    return res.status(lastStatus === 404 ? 404 : 502).json({ error: msg });
  }
  const data = parseAgent(page.html);
  if (!data.name) return res.status(422).json({ error: "We opened the page but couldn't read the agent's details. You can fill them in yourself." });
  return res.status(200).json({ ...data, url });
}
