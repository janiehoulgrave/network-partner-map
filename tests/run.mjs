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

// Office records embedded as page data (plain JSON, and escaped JSON inside a script string)
const jsonPage = `<script id="__NEXT_DATA__" type="application/json">{"props":{"offices":[{"id":1,"name":"Chevy Chase","address":{"address1":"5471 Wisconsin Ave","address2":"Suite 300","city":"Chevy Chase","state":"MD","zipCode":"20815"},"phone":"301.298.1001"},{"id":2,"name":"Armonk","address":{"address1":"387 Main Street","city":"Armonk","state":"NY","zipCode":"10504"},"phone":"914.228.2656"}]}}</script>`;
const dj = parseOffices(jsonPage);
assert.equal(dj.length, 2);
assert.equal(dj[0].address, "5471 Wisconsin Ave, Suite 300, Chevy Chase, MD 20815");
assert.equal(dj[0].phone, "301-298-1001");
assert.equal(dj[1].name, "Compass Armonk");
const escPage = `<script>self.__next_f.push([1,"{\\"officeName\\":\\"Chevy Chase Office\\",\\"streetAddress\\":\\"5471 Wisconsin Ave, Suite 300\\",\\"city\\":\\"Chevy Chase\\",\\"state\\":\\"Maryland\\",\\"postalCode\\":\\"20815\\",\\"phoneNumber\\":\\"(301) 298-1001\\"}"])</script>`;
const de = parseOffices(escPage);
assert.equal(de.length, 1);
assert.equal(de[0].name, "Compass Chevy Chase Office");
assert.equal(de[0].address, "5471 Wisconsin Ave, Suite 300, Chevy Chase, MD 20815");
assert.equal(de[0].phone, "301-298-1001");

// Phone listed BEFORE the address in each record (the layout that mismatched Capitol Hill / Chevy Chase)
const phoneFirst = parseOffices(`<script>{"offices":[
{"name":"Capitol Hill Office","phone":"202.545.6900","address1":"660 Pennsylvania Ave SE, Suite 401","city":"Washington","state":"DC","zip":"20003"},
{"name":"Chevy Chase Office","phone":"301.298.1001","address1":"5471 Wisconsin Ave, Suite 300","city":"Chevy Chase","state":"MD","zip":"20815"},
{"name":"Ellicott City Office","phone":"410.220.5745","address1":"10050 Baltimore National Pike","city":"Ellicott City","state":"MD","zip":"21042"}]}</script>`);
assert.equal(phoneFirst.length, 3);
assert.equal(phoneFirst[0].phone, "202-545-6900");
assert.equal(phoneFirst[1].name, "Compass Chevy Chase Office");
assert.equal(phoneFirst[1].phone, "301-298-1001");
assert.equal(phoneFirst[1].address, "5471 Wisconsin Ave, Suite 300, Chevy Chase, MD 20815");
assert.equal(phoneFirst[2].phone, "410-220-5745");

// The real Compass format (copied from the live page): LocalBusiness records, phone before address
const real = '{"@type":"LocalBusiness","name":"Bethesda Office ","telephone":"301.304.8444","url":"https://www.compass.com/agents/offices/7200/","address":{"@type":"PostalAddress","streetAddress":"7200 Wisconsin Avenue Suite 100 ","addressLocality":"Bethesda","addressRegion":"MD","postalCode":"20814"}},{"@type":"LocalBusiness","name":"Capitol Hill Office","telephone":"202.545.6900","url":"https://www.compass.com/agents/offices/660/","address":{"@type":"PostalAddress","streetAddress":"660 Pennsylvania Ave SE, Suite 401","addressLocality":"Washington","addressRegion":"DC","postalCode":"20003"}},{"@type":"LocalBusiness","name":"Chevy Chase Office","telephone":"301.298.1001","url":"https://www.compass.com/agents/offices/5471/","address":{"@type":"PostalAddress","streetAddress":"5471 Wisconsin Ave, Suite 300","addressLocality":"Chevy Chase","addressRegion":"MD","postalCode":"20815"}},{"@type":"LocalBusiness","name":"Logan Circle Office","telephone":"202.386.6330"}';
const rec = parseOffices(`<script type="application/ld+json">[${real}]</script>`);
const byName = Object.fromEntries(rec.map((o) => [o.name, o]));
assert.equal(byName["Compass Capitol Hill Office"].phone, "202-545-6900");
assert.equal(byName["Compass Chevy Chase Office"].phone, "301-298-1001");
assert.equal(byName["Compass Chevy Chase Office"].address, "5471 Wisconsin Ave, Suite 300, Chevy Chase, MD 20815");
assert.equal(byName["Compass Bethesda Office"].address, "7200 Wisconsin Avenue Suite 100, Bethesda, MD 20814");
// same records escaped inside a script string
const recEsc = parseOffices(`<script>x="[${real.replace(/"/g, '\\"')}]"</script>`);
assert.equal(recEsc.find((o) => o.name === "Compass Chevy Chase Office").phone, "301-298-1001");

// Title without a city ("Whitney St. Clair, Real Estate Agent - Compass") and a "Compass Agents" breadcrumb
const w = parseAgent(`<html><head><title>Whitney St. Clair, Real Estate Agent - Compass</title></head><body>
<h1>Whitney St. Clair</h1><div>REALTOR® | DRE# 689821000</div><a href="mailto:whitney.stclair@compass.com">whitney.stclair@compass.com</a>
<div>M: 949-397-7070</div><h2>Specialties</h2><div>Buyer's Agent, Listing Agent, Staging</div><h2>Client Testimonials</h2>
<footer><a>Compass</a><a>Compass Agents</a><a>Arizona</a><a>Scottsdale</a><span>Whitney St. Clair</span></footer></body></html>`);
assert.equal(w.name, "Whitney St. Clair");
assert.equal(w.title, "REALTOR® | DRE# 689821000");
assert.equal(w.mobile, "949-397-7070");
assert.equal(w.office, "");
assert.equal(w.state, "AZ");
assert.equal(w.city, "Scottsdale");
assert.deepEqual(w.specialties, ["Buyer's Agent", "Listing Agent", "Staging"]);

console.log("All reader checks passed:", JSON.stringify(a));
