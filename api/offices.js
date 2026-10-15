// GET /api/offices — the Compass office directory (name, address, main phone).
// Cached at Vercel's edge for a week, so compass.com is read about once a week.
import { getOffices } from "./_lib/offices.js";

export default async function handler(req, res) {
  try {
    const offices = await getOffices();
    if (offices.length) res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");
    else res.setHeader("Cache-Control", "public, s-maxage=600");
    res.status(200).json({ count: offices.length, offices });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ count: 0, offices: [] });
  }
}
