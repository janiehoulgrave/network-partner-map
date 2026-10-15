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
    const m = u.pathname.match(/^\/agents\/([a-z0-9-]+)\/?$/i);
    if (/(^|\.)compass\.com$/i.test(u.hostname) && m) slug = m[1].toLowerCase();
  } catch (e) { /* fall through */ }
  if (!slug) return res.status(400).json({ error: "That doesn't look like a Compass agent page. It should look like compass.com/agents/first-last/" });

  const url = `https://www.compass.com/agents/${slug}/`;
  let page;
  try { page = await fetchPage(url); } catch (e) { page = { ok: false, status: 0 }; }
  if (!page.ok) {
    const msg = page.status === 404 ? "We couldn't find that agent page. Check the link and try again." : "Compass didn't respond in time. Try again in a moment, or fill in their details yourself.";
    return res.status(502).json({ error: msg });
  }
  const data = parseAgent(page.html);
  if (!data.name) return res.status(422).json({ error: "We opened the page but couldn't read the agent's details. You can fill them in yourself." });
  return res.status(200).json({ ...data, url });
}
