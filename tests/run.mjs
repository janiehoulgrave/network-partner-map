// Quick checks for the page readers. Run with: npm test
import assert from "node:assert/strict";
import { parseAgent } from "../api/_lib/parse-agent.js";
import { parseOffices } from "../api/_lib/offices.js";

// A page shaped like a Compass agent profile (nav, contact block, specialties, breadcrumb)
const agentHtml = `<!doctype html><html><head>
<title>Maryam Redjaee, Chevy Chase Real Estate Agent - Compass</title>
<meta property="og:image" content="https://www.compass.com/m/abc123/photo_600x600.jpg">
<script>var x = "<div>noise</div>";</script></head><body>
<nav><a>Buy</a><a>Rent</a><a>Agents</a><a>Find an Agent</a></nav>
<h1>Maryam Redjaee</h1><div>Realtor&reg;</div>
<a href="mailto:maryam@compass.com">maryam@compass.com</a>
<div><span>M: </span><a href="tel:2024233331">202-423-3331</a></div>
<div><span>O: </span><a href="tel:3012981001">301-298-1001</a></div>
<h2>Specialties</h2><ul><li>Luxury Homes</li><li>First-Time Buyers, Relocation</li></ul>
<div>Languages: Farsi, English.</div>
<h2>Client Testimonials</h2><p>Great agent.</p>
<footer><a>Compass</a><a>Agents</a><a>Maryland</a><a>Chevy Chase</a><span>Maryam Redjaee</span></footer>
</body></html>`;
const a = parseAgent(agentHtml);
assert.equal(a.name, "Maryam Redjaee");
assert.equal(a.title, "Realtor®");
assert.equal(a.email, "maryam@compass.com");
assert.equal(a.mobile, "202-423-3331");
assert.equal(a.office, "301-298-1001");
assert.equal(a.city, "Chevy Chase");
assert.equal(a.state, "MD");
assert.equal(a.photo, "https://www.compass.com/m/abc123/photo_600x600.jpg");
assert.deepEqual(a.languages, ["Farsi", "English"]);
assert.deepEqual(a.specialties, ["Luxury Homes", "First-Time Buyers", "Relocation"]);

// Same agent with no specialties listed (like the real page today)
const b = parseAgent(agentHtml.replace(/<ul>[\s\S]*?<\/ul>/, ""));
assert.deepEqual(b.specialties, []);
assert.deepEqual(b.languages, ["Farsi", "English"]);

// Structured data wins when present
const c = parseAgent(`<html><head><title>X</title><script type="application/ld+json">{"@context":"https://schema.org","@type":"RealEstateAgent","name":"Dana Whitfield","image":"https://img.example.com/d.jpg","email":"dana@compass.com","telephone":"(512) 555-0142","address":{"addressLocality":"Austin","addressRegion":"TX"}}</script></head><body></body></html>`);
assert.equal(c.name, "Dana Whitfield"); assert.equal(c.city, "Austin"); assert.equal(c.state, "TX"); assert.equal(c.mobile, "512-555-0142");

// Office directory
const offHtml = `<h2>DC Metro</h2>
<h3><a href="/agents/offices/x/1/">Chevy Chase Office</a></h3><p>5471 Wisconsin Ave, Suite 300</p><p>Chevy Chase MD 20815</p><p>301.298.1001</p>
<h3>Bethany Beach Office</h3><div>33 Atlantic Ave</div><div>Bethany Beach, DE 19930</div><div>302.555.0100</div>
<h2>New York</h2><h3>Armonk Office</h3><p>387 Main Street</p><p>Armonk NY 10504</p><p>914.228.2656</p>
<h3>Broken entry</h3><p>no address here</p>`;
const offices = parseOffices(offHtml);
assert.equal(offices.length, 3);
assert.deepEqual(offices[0], { name: "Compass Chevy Chase Office", address: "5471 Wisconsin Ave, Suite 300, Chevy Chase, MD 20815", phone: "301-298-1001", city: "Chevy Chase", state: "MD", zip: "20815" });
assert.equal(offices[1].address, "33 Atlantic Ave, Bethany Beach, DE 19930");
assert.equal(offices[2].phone, "914-228-2656");

// Office directory with no headings at all (plain divs), and with one-line addresses
const divs = parseOffices(`<div class="office"><div>Chevy Chase Office</div><div>5471 Wisconsin Ave</div><div>Suite 300</div><div>Chevy Chase, MD 20815</div><div>301.298.1001</div></div>
<div class="office"><span>Richmond Office</span><span>1801 Libbie Ave, Suite 102, Richmond, VA 23226</span><span>(804) 555-0101</span></div>`);
assert.equal(divs.length, 2);
assert.equal(divs[0].address, "5471 Wisconsin Ave, Suite 300, Chevy Chase, MD 20815");
assert.equal(divs[0].phone, "301-298-1001");
assert.equal(divs[1].name, "Compass Richmond Office");
assert.equal(divs[1].address, "1801 Libbie Ave, Suite 102, Richmond, VA 23226");
assert.equal(divs[1].phone, "804-555-0101");

console.log("All reader checks passed:", JSON.stringify(a));
