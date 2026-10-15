// GET /api/geocode?type=address|place&q=...
import { requireUser } from "./_lib/auth.js";
import { geocodeAddress, geocodePlace } from "./_lib/geocode.js";

export default async function handler(req, res) {
  const user = await requireUser(req, res); if (!user) return;
  const q = String(req.query.q || "").trim().slice(0, 200);
  if (q.length < 2) return res.status(400).json({ error: "Enter a place to look up." });
  const r = req.query.type === "address" ? await geocodeAddress(q) : await geocodePlace(q);
  res.setHeader("Cache-Control", "private, max-age=86400");
  if (!r) return res.status(404).json({ error: "We couldn't find that place." });
  res.status(200).json(r);
}
