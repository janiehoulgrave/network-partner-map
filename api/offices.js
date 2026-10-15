// GET /api/offices — the Compass office directory (name, address, main phone).
// Cached at Vercel's edge for a week, so compass.com is read about once a week.
// The "check" section shows what happened on the last read, for troubleshooting.
import { getOffices, lastRun } from "./_lib/offices.js";

export default async function handler(req, res) {
  let offices = [];
  try { offices = await getOffices(); } catch (e) { offices = []; }
  res.setHeader("Cache-Control", offices.length ? "public, s-maxage=604800, stale-while-revalidate=86400" : "no-store");
  res.status(200).json({
    count: offices.length,
    check: { compassStatus: lastRun.status, pageSize: lastRun.bytes, foundByHeadings: lastRun.byHeading, foundByText: lastRun.byText, readAt: lastRun.at },
    offices,
  });
}
