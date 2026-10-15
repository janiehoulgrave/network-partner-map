// GET /api/offices — the Compass office directory (name, address, main phone).
// Cached at Vercel's edge for a week, so compass.com is read about once a week.
// The "check" section shows what happened on the last read, for troubleshooting.
import { getOffices, lastRun, peek } from "./_lib/offices.js";

export default async function handler(req, res) {
  let offices = [];
  const term = String(req.query.peek || "").slice(0, 60);
  try { offices = await getOffices(); } catch (e) { offices = []; }
  if (term) { res.setHeader("Cache-Control", "no-store"); res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.status(200).send(peek(term)); }
  res.setHeader("Cache-Control", offices.length ? "public, s-maxage=604800, stale-while-revalidate=86400" : "no-store");
  res.status(200).json({
    count: offices.length,
    check: { compassStatus: lastRun.status, pageSize: lastRun.bytes, foundByHeadings: lastRun.byHeading, foundByText: lastRun.byText, foundByData: lastRun.byData, readAt: lastRun.at },
    offices,
  });
}
