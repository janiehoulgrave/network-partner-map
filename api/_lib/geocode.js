// Turns an address or place into map coordinates.
// Street addresses: U.S. Census geocoder (free, no key). Cities and ZIPs: OpenStreetMap Nominatim (free, low volume).
import { stateAbbr } from "./html.js";

const UA = "NetworkPartnerMap/1.0 (+https://network.janienation.com)";

async function getJSON(url, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": UA, Accept: "application/json" } });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}

export async function geocodeAddress(address) {
  const u = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=" + encodeURIComponent(address);
  const j = await getJSON(u);
  const m = j && j.result && j.result.addressMatches && j.result.addressMatches[0];
  if (m && m.coordinates) {
    return { lat: +m.coordinates.y, lon: +m.coordinates.x, label: m.matchedAddress || address, state: (m.addressComponents && m.addressComponents.state) || "" };
  }
  return geocodePlace(address);
}

export async function geocodePlace(q) {
  const zip = /^\d{5}$/.test(q.trim());
  const u = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=us&" +
    (zip ? "postalcode=" + encodeURIComponent(q.trim()) : "q=" + encodeURIComponent(q));
  const j = await getJSON(u);
  const h = Array.isArray(j) && j[0];
  if (!h) return null;
  const a = h.address || {};
  const iso = a["ISO3166-2-lvl4"] || "";
  const state = iso.startsWith("US-") ? iso.slice(3) : stateAbbr(a.state || "");
  const place = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || "";
  const label = zip ? `ZIP ${q.trim()}` : (place && state ? `${place}, ${state}` : h.display_name.split(",").slice(0, 2).join(","));
  return { lat: +h.lat, lon: +h.lon, label, state };
}
