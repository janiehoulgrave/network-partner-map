import * as d3 from "d3";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import GEO from "./us-states.json";
import { firebaseConfig, COLLECTION, ALLOWED_DOMAIN, CRM_TAG } from "./config.js";
import "./style.css";

const STATES = [["AL","01","Alabama",32.8,-86.8],["AK","02","Alaska",64,-150],["AZ","04","Arizona",34.3,-111.7],["AR","05","Arkansas",34.9,-92.4],["CA","06","California",37.2,-119.5],["CO","08","Colorado",39,-105.5],["CT","09","Connecticut",41.6,-72.7],["DE","10","Delaware",39,-75.5],["DC","11","District of Columbia",38.905,-77.03],["FL","12","Florida",28.6,-82.4],["GA","13","Georgia",32.7,-83.4],["HI","15","Hawaii",20.8,-156.3],["ID","16","Idaho",44.4,-114.6],["IL","17","Illinois",40,-89.2],["IN","18","Indiana",39.9,-86.3],["IA","19","Iowa",42.1,-93.5],["KS","20","Kansas",38.5,-98.4],["KY","21","Kentucky",37.5,-85.3],["LA","22","Louisiana",31.1,-92],["ME","23","Maine",45.4,-69.2],["MD","24","Maryland",39.05,-76.8],["MA","25","Massachusetts",42.3,-71.8],["MI","26","Michigan",44.3,-85.4],["MN","27","Minnesota",46.3,-94.3],["MS","28","Mississippi",32.7,-89.7],["MO","29","Missouri",38.4,-92.5],["MT","30","Montana",47,-109.6],["NE","31","Nebraska",41.5,-99.8],["NV","32","Nevada",39.3,-116.6],["NH","33","New Hampshire",43.7,-71.6],["NJ","34","New Jersey",40.2,-74.7],["NM","35","New Mexico",34.4,-106.1],["NY","36","New York",42.9,-75.5],["NC","37","North Carolina",35.5,-79.4],["ND","38","North Dakota",47.5,-100.5],["OH","39","Ohio",40.3,-82.8],["OK","40","Oklahoma",35.6,-97.5],["OR","41","Oregon",43.9,-120.6],["PA","42","Pennsylvania",40.9,-77.8],["RI","44","Rhode Island",41.7,-71.5],["SC","45","South Carolina",33.9,-80.9],["SD","46","South Dakota",44.4,-100.2],["TN","47","Tennessee",35.9,-86.4],["TX","48","Texas",31.5,-99.3],["UT","49","Utah",39.3,-111.7],["VT","50","Vermont",44.1,-72.7],["VA","51","Virginia",37.5,-78.8],["WA","53","Washington",47.4,-120.5],["WV","54","West Virginia",38.6,-80.6],["WI","55","Wisconsin",44.6,-89.9],["WY","56","Wyoming",43,-107.6]];
const ST = {}; const FIPS2AB = {}; const NAME2AB = {};
STATES.forEach(([ab,f,n,lat,lon])=>{ST[ab]={ab,f,n,lat,lon};FIPS2AB[f]=ab;NAME2AB[n.toLowerCase()]=ab;});

const CITIES = `Washington,DC,38.907,-77.037|Chevy Chase,MD,38.981,-77.083|Bethesda,MD,38.984,-77.094|Silver Spring,MD,38.991,-77.026|Rockville,MD,39.084,-77.153|Potomac,MD,39.018,-77.209|Gaithersburg,MD,39.143,-77.201|Baltimore,MD,39.290,-76.612|Annapolis,MD,38.978,-76.492|Columbia,MD,39.204,-76.861|Frederick,MD,39.414,-77.411|Arlington,VA,38.880,-77.107|Alexandria,VA,38.805,-77.047|McLean,VA,38.934,-77.177|Falls Church,VA,38.882,-77.171|Fairfax,VA,38.846,-77.306|Reston,VA,38.959,-77.357|Great Falls,VA,39.000,-77.288|Leesburg,VA,39.116,-77.564|Ashburn,VA,39.044,-77.488|Vienna,VA,38.901,-77.265|Richmond,VA,37.541,-77.436|Henrico,VA,37.590,-77.470|Midlothian,VA,37.506,-77.649|Glen Allen,VA,37.666,-77.506|Charlottesville,VA,38.029,-78.477|Virginia Beach,VA,36.853,-75.978|Norfolk,VA,36.851,-76.286|Williamsburg,VA,37.271,-76.708|Fredericksburg,VA,38.303,-77.461|Roanoke,VA,37.271,-79.941|New York,NY,40.713,-74.006|Brooklyn,NY,40.678,-73.944|Manhattan,NY,40.783,-73.971|Long Island,NY,40.789,-73.135|The Hamptons,NY,40.963,-72.185|Buffalo,NY,42.886,-78.878|Albany,NY,42.653,-73.757|Hoboken,NJ,40.744,-74.032|Princeton,NJ,40.357,-74.667|Montclair,NJ,40.826,-74.209|Philadelphia,PA,39.953,-75.165|Pittsburgh,PA,40.441,-79.996|Wilmington,DE,39.740,-75.540|Rehoboth Beach,DE,38.721,-75.076|Boston,MA,42.360,-71.059|Cambridge,MA,42.374,-71.110|Newton,MA,42.337,-71.209|Providence,RI,41.824,-71.413|Greenwich,CT,41.026,-73.628|Hartford,CT,41.764,-72.685|New Haven,CT,41.308,-72.928|Portland,ME,43.659,-70.257|Burlington,VT,44.476,-73.212|Portsmouth,NH,43.072,-70.763|Charlotte,NC,35.227,-80.843|Raleigh,NC,35.780,-78.638|Durham,NC,35.994,-78.899|Asheville,NC,35.595,-82.551|Wilmington,NC,34.226,-77.945|Charleston,SC,32.777,-79.931|Greenville,SC,34.853,-82.394|Hilton Head Island,SC,32.216,-80.753|Atlanta,GA,33.749,-84.388|Savannah,GA,32.081,-81.091|Alpharetta,GA,34.075,-84.294|Miami,FL,25.762,-80.192|Miami Beach,FL,25.791,-80.130|Fort Lauderdale,FL,26.122,-80.137|Palm Beach,FL,26.705,-80.036|West Palm Beach,FL,26.715,-80.053|Boca Raton,FL,26.368,-80.128|Naples,FL,26.142,-81.795|Tampa,FL,27.951,-82.457|St. Petersburg,FL,27.768,-82.640|Sarasota,FL,27.336,-82.531|Orlando,FL,28.538,-81.379|Jacksonville,FL,30.332,-81.656|Tallahassee,FL,30.438,-84.281|Destin,FL,30.393,-86.496|Nashville,TN,36.163,-86.781|Memphis,TN,35.150,-90.049|Knoxville,TN,35.961,-83.921|Franklin,TN,35.925,-86.869|Birmingham,AL,33.519,-86.810|Huntsville,AL,34.730,-86.586|New Orleans,LA,29.951,-90.072|Baton Rouge,LA,30.452,-91.187|Jackson,MS,32.299,-90.185|Louisville,KY,38.253,-85.759|Lexington,KY,38.041,-84.504|Columbus,OH,39.961,-82.999|Cleveland,OH,41.499,-81.694|Cincinnati,OH,39.103,-84.512|Detroit,MI,42.331,-83.046|Ann Arbor,MI,42.281,-83.743|Grand Rapids,MI,42.963,-85.668|Indianapolis,IN,39.768,-86.158|Chicago,IL,41.878,-87.630|Evanston,IL,42.045,-87.688|Naperville,IL,41.750,-88.153|Milwaukee,WI,43.039,-87.906|Madison,WI,43.073,-89.401|Minneapolis,MN,44.978,-93.265|St. Paul,MN,44.954,-93.090|Des Moines,IA,41.587,-93.625|St. Louis,MO,38.627,-90.199|Kansas City,MO,39.100,-94.579|Omaha,NE,41.257,-95.935|Wichita,KS,37.687,-97.330|Oklahoma City,OK,35.468,-97.516|Tulsa,OK,36.154,-95.993|Little Rock,AR,34.746,-92.290|Bentonville,AR,36.372,-94.209|Fargo,ND,46.877,-96.790|Sioux Falls,SD,43.545,-96.731|Austin,TX,30.267,-97.743|Dallas,TX,32.777,-96.797|Houston,TX,29.760,-95.370|San Antonio,TX,29.424,-98.494|Fort Worth,TX,32.755,-97.331|Plano,TX,33.020,-96.699|The Woodlands,TX,30.166,-95.461|El Paso,TX,31.762,-106.485|Denver,CO,39.739,-104.990|Boulder,CO,40.015,-105.271|Aspen,CO,39.191,-106.818|Colorado Springs,CO,38.834,-104.821|Vail,CO,39.640,-106.374|Salt Lake City,UT,40.761,-111.891|Park City,UT,40.646,-111.498|Phoenix,AZ,33.448,-112.074|Scottsdale,AZ,33.494,-111.926|Tucson,AZ,32.222,-110.975|Sedona,AZ,34.870,-111.761|Albuquerque,NM,35.084,-106.650|Santa Fe,NM,35.687,-105.938|Las Vegas,NV,36.170,-115.140|Reno,NV,39.530,-119.814|Lake Tahoe,CA,39.097,-120.032|Boise,ID,43.615,-116.202|Sun Valley,ID,43.697,-114.351|Jackson,WY,43.480,-110.762|Bozeman,MT,45.677,-111.043|Missoula,MT,46.872,-113.994|Seattle,WA,47.606,-122.332|Bellevue,WA,47.610,-122.201|Spokane,WA,47.659,-117.426|Tacoma,WA,47.253,-122.444|Portland,OR,45.515,-122.679|Bend,OR,44.058,-121.315|Los Angeles,CA,34.052,-118.244|Beverly Hills,CA,34.074,-118.400|Santa Monica,CA,34.019,-118.491|Malibu,CA,34.026,-118.780|Pasadena,CA,34.148,-118.144|Newport Beach,CA,33.619,-117.929|Irvine,CA,33.684,-117.827|San Diego,CA,32.716,-117.161|La Jolla,CA,32.833,-117.271|Palm Springs,CA,33.830,-116.545|Santa Barbara,CA,34.420,-119.698|San Francisco,CA,37.775,-122.419|Oakland,CA,37.804,-122.271|Palo Alto,CA,37.442,-122.143|San Jose,CA,37.338,-121.886|Napa,CA,38.297,-122.287|Sacramento,CA,38.582,-121.494|Honolulu,HI,21.307,-157.858|Maui,HI,20.798,-156.332|Anchorage,AK,61.218,-149.900`.split("|").map(s=>{const [n,st,la,lo]=s.split(",");return {n,st,lat:+la,lon:+lo};});

const ZIP3 = [[5,5,"NY"],[10,27,"MA"],[28,29,"RI"],[30,38,"NH"],[39,49,"ME"],[50,54,"VT"],[55,55,"MA"],[56,59,"VT"],[60,69,"CT"],[70,89,"NJ"],[100,149,"NY"],[150,196,"PA"],[197,199,"DE"],[200,205,"DC"],[206,219,"MD"],[220,246,"VA"],[247,268,"WV"],[270,289,"NC"],[290,299,"SC"],[300,319,"GA"],[320,349,"FL"],[350,369,"AL"],[370,385,"TN"],[386,397,"MS"],[398,399,"GA"],[400,427,"KY"],[430,458,"OH"],[460,479,"IN"],[480,499,"MI"],[500,528,"IA"],[530,549,"WI"],[550,567,"MN"],[569,569,"DC"],[570,577,"SD"],[580,588,"ND"],[590,599,"MT"],[600,629,"IL"],[630,658,"MO"],[660,679,"KS"],[680,693,"NE"],[700,714,"LA"],[716,729,"AR"],[730,749,"OK"],[750,799,"TX"],[800,816,"CO"],[820,831,"WY"],[832,838,"ID"],[840,847,"UT"],[850,865,"AZ"],[870,884,"NM"],[885,885,"TX"],[889,898,"NV"],[900,961,"CA"],[967,968,"HI"],[970,979,"OR"],[980,994,"WA"],[995,999,"AK"]];

/* ---------- Firebase ---------- */
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
let me = null;            // signed-in user
let unsub = null;         // Firestore listener

async function api(path){
  const token = me ? await me.getIdToken() : "";
  const r = await fetch(path, { headers: { Authorization: "Bearer " + token } });
  let body = null; try { body = await r.json(); } catch(e){}
  if (!r.ok) { const err = new Error((body && body.error) || "Something went wrong. Try again."); err.status = r.status; throw err; }
  return body;
}

/* ---------- Compass office directory (matched by office phone) ---------- */
const digits = s => String(s||"").replace(/\D/g,"").slice(-10);
let OFFICES = new Map();       // phone digits -> [offices]
let OFFICES_BY_CITY = new Map(); // "city|ST" -> [offices]
let officesLoaded = null, officesCount = -1;
function loadOffices(){
  if (!officesLoaded) officesLoaded = fetch("/api/offices").then(r=>r.ok?r.json():{offices:[]}).then(j=>{
    OFFICES = new Map(); OFFICES_BY_CITY = new Map();
    const list = j.offices||[]; officesCount = list.length;
    list.forEach(o=>{
      const k=digits(o.phone); if(k.length===10){ if(!OFFICES.has(k)) OFFICES.set(k,[]); OFFICES.get(k).push(o); }
      const c=(o.city||"").toLowerCase()+"|"+(o.state||""); if(!OFFICES_BY_CITY.has(c)) OFFICES_BY_CITY.set(c,[]); OFFICES_BY_CITY.get(c).push(o);
    });
    if (!list.length) officesLoaded = null;   // try again next time
  }).catch(()=>{ officesLoaded=null; officesCount=0; });
  return officesLoaded;
}
const officesFor = phone => OFFICES.get(digits(phone)) || [];
const officesIn = (city, st) => OFFICES_BY_CITY.get(String(city||"").trim().toLowerCase()+"|"+st) || [];

/* ---------- state ---------- */
let contacts = [];
const partnersCol = () => collection(db, COLLECTION, me.uid, "partners");
function prep(c){
  return {photo:null,office:"",mobile:"",email:"",url:"",notes:"",specialties:[],groups:[],languages:[],title:"",officeAddress:"",officeName:"",brokerage:"Compass",nonCompass:false,placement:"city",...c,
    approx: c.placement==="state"};
}
/* local, instant city lookup; falls back to the server geocoder */
function localCity(city, state){
  const cn = (city||"").trim().toLowerCase();
  const hit = CITIES.find(x=>x.st===state && x.n.toLowerCase()===cn);
  return hit ? {lat:hit.lat, lon:hit.lon} : null;
}
async function locate(rec){
  // 1) office or typed street address
  if (rec.officeAddress){
    try { const g = await api("/api/geocode?type=address&q="+encodeURIComponent(rec.officeAddress)); if (g && g.lat) return {lat:g.lat, lon:g.lon, placement:"address"}; } catch(e){}
  }
  // 2) city + state
  const l = localCity(rec.city, rec.state); if (l) return {...l, placement:"city"};
  try { const g = await api("/api/geocode?type=place&q="+encodeURIComponent(rec.city+", "+rec.state)); if (g && g.lat) return {lat:g.lat, lon:g.lon, placement:"city"}; } catch(e){}
  // 3) state center
  const s = ST[rec.state] || ST.DC; return {lat:s.lat, lon:s.lon, placement:"state"};
}
/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials = n => (n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
const photoHTML = (c,cls="photo") => `<div class="${cls}" aria-hidden="true">${c.photo?`<img src="${esc(c.photo)}" alt="" referrerpolicy="no-referrer">`:esc(initials(c.name))}</div>`;
const fmtDate = iso => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
function miles(a,b,c,d){const R=3958.8,r=Math.PI/180;const x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
const fmtMi = m => m<10?m.toFixed(1)+" mi":Math.round(m).toLocaleString()+" mi";
const isCompass = c => !c.nonCompass;
const allTags = c => [...(c.specialties||[]),...(c.groups||[]),...(c.languages||[])];

/* ---------- map ---------- */
const svg = d3.select("#map"), zl = d3.select("#zoomLayer");
const proj = d3.geoAlbersUsa().scale(1300).translate([487.5,305]);
const W=975,H=610, PX=80, PY=60, VW=W+2*PX, VH=H+2*PY;  /* map size plus breathing room around it */
let T = d3.zoomIdentity;
const statesSel = d3.select("#statesLayer").selectAll("path").data(Object.entries(GEO.states)).join("path")
  .attr("class","state").attr("d",d=>d[1].d).attr("data-ab",d=>FIPS2AB[d[0]]);
d3.select("#borders").attr("d",GEO.borders);

const tip = $("#tip");
statesSel.on("pointermove",(ev,d)=>{
  const ab = FIPS2AB[d[0]], n = contacts.filter(c=>c.state===ab).length;
  tip.textContent = n ? `${n} partner${n>1?"s":""} in ${d[1].n}` : `No partners in ${d[1].n} yet`;
  const r = $("#mapwrap").getBoundingClientRect();
  tip.style.left=(ev.clientX-r.left)+"px"; tip.style.top=(ev.clientY-r.top)+"px"; tip.hidden=false;
}).on("pointerleave",()=>tip.hidden=true)
  .on("click",(ev,d)=>{ if(ev.defaultPrevented) return; closeCard(); });

const zoom = d3.zoom().scaleExtent([1,14]).translateExtent([[-PX-W*0.6,-PY-H*0.8],[W+PX+W*0.6,H+PY+H*0.8]])
  .on("zoom",ev=>{T=ev.transform; zl.attr("transform",T); tip.hidden=true; drawPins(); placeCard();});
svg.call(zoom).on("dblclick.zoom",null);
$("#zin").onclick=()=>svg.transition().duration(300).call(zoom.scaleBy,1.8);
$("#zout").onclick=()=>svg.transition().duration(300).call(zoom.scaleBy,1/1.8);
$("#zreset").onclick=()=>svg.transition().duration(450).call(zoom.transform,d3.zoomIdentity);

function xy(c){ const p = proj([c.lon,c.lat]); return p||[W/2,H/2]; }
function zoomTo(x,y,k,dur=550){
  k=Math.max(1,Math.min(14,k));
  svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity.translate(W/2-x*k,H/2-y*k).scale(k));
}
function zoomToBox(x0,y0,x1,y1,pad=1.35,maxK=14){
  const k = Math.min(maxK||14, 0.9/Math.max((x1-x0)*pad/VW,(y1-y0)*pad/VH, 1/14));
  zoomTo((x0+x1)/2,(y0+y1)/2,Math.max(1,k));
}

function tintStates(){
  const counts = {}; contacts.forEach(c=>counts[c.state]=(counts[c.state]||0)+1);
  statesSel.attr("class",d=>{const n=counts[FIPS2AB[d[0]]]||0;return "state"+(n>=4?" t3":n>=2?" t2":n===1?" t1":"");});
  const states = Object.keys(counts).length;
  const ext = contacts.filter(c=>!isCompass(c)).length;
  $("#stat").innerHTML = `<b>${contacts.length}</b> partner${contacts.length===1?"":"s"} · <b>${states}</b> state${states===1?"":"s"}${ext?` · <b>${ext}</b> non-Compass`:""}`;
}

let selectedId = null, highlightIds = null, searchMark = null;
function drawPins(){
  const k = T.k, R = 22;
  const pts = contacts.map(c=>{const [x,y]=xy(c);return {c,x,y};});
  const clusters = [];
  pts.forEach(p=>{
    if (p.c.id===selectedId){ clusters.push({x:p.x,y:p.y,m:[p]}); return; }
    let hit = clusters.find(cl=>cl.m[0].c.id!==selectedId && Math.hypot((cl.x-p.x)*k,(cl.y-p.y)*k)<R);
    if (hit){ hit.m.push(p); hit.x=d3.mean(hit.m,q=>q.x); hit.y=d3.mean(hit.m,q=>q.y); }
    else clusters.push({x:p.x,y:p.y,m:[p]});
  });
  const g = d3.select("#pinLayer").selectAll("g.pin").data(clusters, d=>d.m.map(q=>q.c.id).sort().join(","))
    .join(enter=>{ const e=enter.append("g").attr("tabindex",0).attr("role","button");
      e.append("circle").attr("class","halo"); e.append("circle").attr("class","dot"); e.append("text"); return e; });
  g.attr("class",d=>{
      const single=d.m.length===1, sel=single&&d.m[0].c.id===selectedId;
      const dim = highlightIds && !d.m.some(q=>highlightIds.has(q.c.id));
      const ext = single && !isCompass(d.m[0].c);
      return "pin"+(single?"":" cluster")+(ext?" ext":"")+(sel?" sel":"")+(dim?" dim":"");})
    .attr("transform",d=>`translate(${d.x},${d.y})`)
    .attr("aria-label",d=>d.m.length===1?d.m[0].c.name:`${d.m.length} partners, zoom in`);
  g.select("circle.halo").attr("r",d=>d.m.length===1&&d.m[0].c.id===selectedId?16/k:0);
  g.select("circle.dot").attr("r",d=>(d.m.length===1?(d.m[0].c.id===selectedId?8:6.5):12)/k).attr("stroke-width",2/k);
  g.select("text").text(d=>d.m.length>1?d.m.length:"").attr("font-size",11/k);
  g.on("click",(ev,d)=>{ev.stopPropagation(); onPin(d);})
   .on("keydown",(ev,d)=>{ if(ev.key==="Enter"||ev.key===" "){ev.preventDefault(); onPin(d);} });
  d3.select("#markLayer").selectAll("circle").data(searchMark?[searchMark]:[]).join("circle")
    .attr("class","search-mark").attr("cx",d=>d.x).attr("cy",d=>d.y).attr("r",14/k).attr("stroke-width",2/k);
}
function onPin(d){
  if (d.m.length===1){ openCard(d.m[0].c.id); return; }
  const cs = d.m.map(q=>q.c);
  // How far apart are they really? Same office or same city => list them instead of zooming.
  let spread = 0;
  for (const a of cs) for (const b of cs) spread = Math.max(spread, miles(a.lat,a.lon,b.lat,b.lon));
  if (spread < 2 || T.k >= 8) { showGroup(cs); return; }
  const xs=d.m.map(q=>q.x), ys=d.m.map(q=>q.y);
  zoomToBox(d3.min(xs),d3.min(ys),d3.max(xs),d3.max(ys),2.2);
}
/* Partners that share a spot (same office or city): show them in the sidebar */
function showGroup(cs){
  closeCard();
  const cities = [...new Set(cs.map(c=>`${c.city}, ${c.state}`))];
  const title = cities.length===1 ? `${cs.length} partners in ${cities[0]}` : `${cs.length} partners here`;
  const sorted = [...cs].sort((a,b)=>a.name.localeCompare(b.name));
  openSide("group", title, "Same location on the map · pick one to see their card", sorted.map(c=>itemHTML(c,null)).join(""));
  $("#modeSwitch").hidden = true;
  highlightIds = new Set(cs.map(c=>c.id)); drawPins();
}

/* ---------- card ---------- */
const card = $("#card");
function openCard(id, fly=false){
  const c = contacts.find(x=>x.id===id); if(!c) return;
  selectedId = id; drawPins();
  const st = ST[c.state]?.n || c.state;
  const line = (k,v)=> v?`<div class="line"><span class="k">${k}</span><span class="v">${esc(v)}</span><button class="copy" data-copy="${esc(v)}">Copy</button></div>`:"";
  const chips = (arr,cls)=> arr&&arr.length?`<div class="chips">${arr.map(t=>`<span class="chip ${cls}">${esc(t)}</span>`).join("")}</div>`:"";
  card.innerHTML = `
    <div class="card-top">${photoHTML(c)}
      <div style="min-width:0"><h3>${esc(c.name)}</h3>
        <div class="meta">${esc(c.title||"Agent")}${c.brokerage&&c.brokerage!=="Compass"?" · "+esc(c.brokerage):""}</div>
        <div class="meta">${esc(c.city)}, ${esc(st)}</div>
        ${c.approx?`<div class="approx">Pin at state center. Edit to add a city or address.</div>`:""}
        ${!isCompass(c)?`<span class="badge ext">Non-Compass</span>`:""}
      </div>
      <button class="x" data-act="close" aria-label="Close">✕</button></div>
    <div class="card-body">
      ${line("Mobile",c.mobile)}${line("Office",c.office)}${line("Address",c.officeAddress)}${line("Email",c.email)}
      ${chips(c.specialties,"")}${chips(c.groups,"g")}${chips(c.languages,"l")}
      ${c.notes?`<div class="notes">${esc(c.notes)}</div>`:""}
    </div>
    <div class="card-foot">
      ${c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">${/compass\.com\/agents\//i.test(c.url)?"View Compass profile":"View profile"} ↗</a>`:`<span class="hint">No profile link</span>`}
      <button class="btn sm" data-act="edit">Edit</button>
    </div>`;
  card.hidden = false;
  card.querySelector('[data-act="close"]').onclick = closeCard;
  card.querySelector('[data-act="edit"]').onclick = ()=>openEditor(c);
  card.querySelectorAll(".copy").forEach(b=>b.onclick=()=>copyText(b));
  placeCard();
  if (fly){ const [x,y]=xy(c); zoomTo(x,y,Math.max(T.k,4)); setTimeout(()=>placeCard(true), 600); } else placeCard(true);
  document.querySelectorAll(".item").forEach(el=>el.classList.toggle("sel",el.dataset.id===id));
}
function placeCard(pan=false){
  if (card.hidden || !selectedId) return;
  const c = contacts.find(x=>x.id===selectedId); if(!c){closeCard();return;}
  const [x,y]=xy(c); const r=$("#map").getBoundingClientRect();
  const s=Math.min(r.width/VW,r.height/VH), ox=(r.width-VW*s)/2, oy=(r.height-VH*s)/2;
  const sx = ox+(x*T.k+T.x+PX)*s, sy = oy+(y*T.k+T.y+PY)*s;
  const GAP=18, M=12;
  if (innerWidth<=720){                       /* phone: card is a bottom sheet; keep the pin visible above it */
    card.style.maxHeight="";
    if (pan){ const top = card.getBoundingClientRect().top - r.top; if (sy > top - 30) panBy(0, (top - 30) - sy - 20, s); }
    return;
  }
  card.style.maxHeight = Math.max(160, r.height - 2*M - GAP) + "px";
  const h = card.offsetHeight, w = card.offsetWidth, half = w/2;
  const spaceAbove = sy - M - GAP, spaceBelow = r.height - sy - M - GAP;
  const below = h <= spaceAbove ? false : h <= spaceBelow ? true : spaceBelow > spaceAbove;
  const sideW = side.classList.contains("open") ? side.offsetWidth : 0;
  const minX = half + M + sideW, maxX = Math.max(minX, r.width - half - M);
  if (pan){                                   /* move the map so the whole card and its pin are on screen */
    let dx = 0, dy = 0;
    if (!below && h > spaceAbove) dy = h - spaceAbove;
    if (below && h > spaceBelow) dy = -(h - spaceBelow);
    const leftLimit = sideW + M + 30, rightLimit = r.width - M - 30;
    if (sx < leftLimit) dx = leftLimit - sx; else if (sx > rightLimit) dx = rightLimit - sx;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1){ panBy(dx, dy, s); return; }
  }
  card.classList.toggle("below", below);
  const cx = Math.min(Math.max(sx, minX), maxX);
  card.style.left = cx+"px"; card.style.top = sy+"px";
  card.style.setProperty("--ax", Math.min(Math.max(sx - cx + half, 22), w - 22) + "px");
}
function panBy(dx, dy, s){ svg.transition().duration(380).call(zoom.translateBy, dx/s/T.k, dy/s/T.k); }
function closeCard(){ card.hidden=true; selectedId=null; drawPins(); document.querySelectorAll(".item.sel").forEach(e=>e.classList.remove("sel")); }
function copyText(btn){
  const v = btn.dataset.copy;
  const done=()=>{btn.textContent="Copied";btn.classList.add("done");setTimeout(()=>{btn.textContent="Copy";btn.classList.remove("done");},1400);};
  const fallback=()=>{const sp=btn.previousElementSibling;const rg=document.createRange();rg.selectNodeContents(sp);const s=getSelection();s.removeAllRanges();s.addRange(rg);btn.textContent="Selected";setTimeout(()=>btn.textContent="Copy",1400);};
  try { navigator.clipboard.writeText(v).then(done,fallback); } catch(e){ fallback(); }
}

/* ---------- search ---------- */
const side=$("#side"), list=$("#list"), qEl=$("#q");
let forceMode = null, lastQ = "";
const remoteLocs = new Map();   // query -> place found by the server geocoder (or null)
function parseLocation(raw){
  const q = raw.trim().replace(/\s+/g," "); if(!q) return null;
  const cached = remoteLocs.get(q.toLowerCase()); if (cached) return cached;
  if (/^\d{5}$/.test(q)){
    const p=+q.slice(0,3), z=ZIP3.find(([a,b])=>p>=a&&p<=b);
    if (z){ const s=ST[z[2]]; return {kind:"zip",label:`ZIP ${q}`,sub:`${s.n} (approximate area)`,lat:s.lat,lon:s.lon,state:s.ab}; }
    return null;
  }
  const lower=q.toLowerCase();
  const stHit = STATES.find(s=>s[2].toLowerCase()===lower || s[0].toLowerCase()===lower);
  if (stHit){ const s=ST[stHit[0]]; return {kind:"state",label:s.n,lat:s.lat,lon:s.lon,state:s.ab}; }
  let m = q.match(/^(.+?)[,\s]+([A-Za-z]{2}|[A-Za-z ]{4,})$/), cityPart=q, stPart=null;
  if (m){ const cand=m[2].trim().toLowerCase(); const s=STATES.find(x=>x[0].toLowerCase()===cand||x[2].toLowerCase()===cand); if(s){cityPart=m[1].trim();stPart=s[0];} }
  const cl = cityPart.toLowerCase();
  let hits = CITIES.filter(c=>c.n.toLowerCase()===cl && (!stPart||c.st===stPart));
  if (!hits.length){
    const own = contacts.filter(c=>c.city.toLowerCase()===cl && (!stPart||c.state===stPart) && !c.approx);
    if (own.length) hits=[{n:own[0].city,st:own[0].state,lat:own[0].lat,lon:own[0].lon}];
  }
  if (!hits.length && stPart){ const s=ST[stPart]; return {kind:"state",label:s.n,lat:s.lat,lon:s.lon,state:s.ab}; }
  if (!hits.length) return null;
  const h = hits[0];
  return {kind:"city",label:`${h.n}, ${h.st}`,lat:h.lat,lon:h.lon,state:h.st,others:hits.length>1?hits.slice(1).map(x=>`${x.n}, ${x.st}`):null};
}
function textMatches(q){
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
  return contacts.filter(c=>{
    const hay = [c.name,c.title,c.brokerage,c.city,c.state,ST[c.state]?.n,c.notes,c.email,...allTags(c)].join(" ").toLowerCase();
    return toks.every(t=>hay.includes(t));
  }).sort((a,b)=>b.added.localeCompare(a.added));
}
function runSearch(){
  const q = qEl.value.trim();
  $("#searchBox").classList.toggle("has-q",!!q);
  if (q!==lastQ){ forceMode=null; lastQ=q; }
  if (!q){ highlightIds=null; searchMark=null; drawPins(); if(side.dataset.mode!=="all") closeSide(); return; }
  const loc = parseLocation(q), tm = textMatches(q);
  const key = q.toLowerCase();
  const isZip = /^\d{5}$/.test(q);
  if (!remoteLocs.has(key) && q.length>=3 && (isZip || (!loc && (tm.length===0 || /,/.test(q))))){
    remoteLocs.set(key, null);
    api("/api/geocode?type=place&q="+encodeURIComponent(q)).then(g=>{
      if (!g || !g.lat) return;
      remoteLocs.set(key, {kind:isZip?"zip":"city", label:isZip?`ZIP ${q}`:(g.label||q), lat:g.lat, lon:g.lon, state:g.state||null});
      if (qEl.value.trim().toLowerCase()===key) runSearch();
    }).catch(()=>{});
  }
  let mode = forceMode || (loc ? "place" : "text");
  if (mode==="place" && !loc) mode="text";
  const sw = $("#modeSwitch");
  if (mode==="place"){
    const rows = contacts.map(c=>({c,d:miles(loc.lat,loc.lon,c.lat,c.lon)}));
    let html="", inside=[], outside=[];
    if (loc.kind==="state" || (loc.kind==="zip" && loc.sub)){ inside=rows.filter(r=>r.c.state===loc.state).sort((a,b)=>a.d-b.d); outside=rows.filter(r=>r.c.state!==loc.state).sort((a,b)=>a.d-b.d); }
    else { rows.sort((a,b)=>a.d-b.d); inside=rows.filter(r=>r.d<=100); outside=rows.filter(r=>r.d>100); }
    if (inside.length) html += inside.map(r=>itemHTML(r.c,r.d)).join("");
    else html += `<div class="empty">No partners ${loc.kind==="state"?"in "+esc(loc.label):"within 100 miles"} yet.<br>Nearest are listed below.</div>`;
    if (outside.length) html += `<div class="divider">${loc.kind==="state"?"Outside "+esc(loc.label):"Farther away"}</div>` + outside.map(r=>itemHTML(r.c,r.d)).join("");
    openSide("place", `Nearest to ${loc.label}`, `${inside.length} ${loc.kind==="state"?"in state":"within 100 mi"} · sorted by distance${loc.sub?" · "+loc.sub:""}`, html);
    sw.hidden=false;
    sw.innerHTML = `Searching places.${tm.length?` <button id="toText">Search names, tags and notes instead (${tm.length})</button>`:""}${loc.others?` <span>Also: ${esc(loc.others.slice(0,2).join(", "))}. Add the state to pick one.</span>`:""}`;
    const tt=$("#toText"); if(tt) tt.onclick=()=>{forceMode="text";runSearch();};
    highlightIds = new Set(inside.map(r=>r.c.id));
    const [x,y] = proj([loc.lon,loc.lat])||[W/2,H/2]; searchMark={x,y};
    if (loc.kind==="state"){ const el=document.querySelector(`.state[data-ab="${loc.state}"]`); if(el){const b=el.getBBox(); zoomToBox(b.x,b.y,b.x+b.width,b.y+b.height,1.6);} }
    else zoomTo(x,y,5);
  } else {
    const html = tm.length ? tm.map(c=>itemHTML(c,null)).join("") : `<div class="empty">Nothing in your network matches “${esc(q)}”.</div>`;
    openSide("text", `Matches for “${q}”`, `${tm.length} partner${tm.length===1?"":"s"} · newest first`, html);
    sw.hidden = !loc;
    if (loc){ sw.innerHTML = `Searching names, tags and notes. <button id="toPlace">Search near ${esc(loc.label)} instead</button>`; $("#toPlace").onclick=()=>{forceMode="place";runSearch();}; }
    highlightIds = new Set(tm.map(c=>c.id)); searchMark=null;
    if (tm.length){ const ps=tm.map(xy); zoomToBox(d3.min(ps,p=>p[0]),d3.min(ps,p=>p[1]),d3.max(ps,p=>p[0]),d3.max(ps,p=>p[1]),1.6,5); }
  }
  drawPins();
}
function itemHTML(c,d){
  const tags = allTags(c).slice(0,2).join(" · ");
  return `<button class="item${c.id===selectedId?" sel":""}" data-id="${c.id}">${photoHTML(c)}<span class="who"><span class="nm">${esc(c.name)}</span><span class="wh">${esc(c.city)}, ${esc(c.state)}${!isCompass(c)?" · "+esc(c.brokerage):""}${tags?" · "+esc(tags):""}</span></span>`+
    (d!=null?`<span class="dist">${fmtMi(d)}</span>`:`<span class="dist"><small>Added</small>${esc(fmtDate(c.added).replace(/, \d{4}$/,""))}</span>`)+`</button>`;
}
function openSide(mode,title,sub,html){
  side.dataset.mode=mode; $("#sideTitle").textContent=title; $("#sideSub").textContent=sub; list.innerHTML=html; side.classList.add("open");
  list.querySelectorAll(".item").forEach(el=>el.onclick=()=>openCard(el.dataset.id,true));
  if (mode==="all") $("#modeSwitch").hidden=true;
}
function closeSide(){ side.classList.remove("open"); side.dataset.mode=""; }
function showAll(){
  qEl.value=""; lastQ=""; $("#searchBox").classList.remove("has-q"); highlightIds=null; searchMark=null; drawPins();
  const s=[...contacts].sort((a,b)=>b.added.localeCompare(a.added));
  openSide("all","All partners",`${s.length} partner${s.length===1?"":"s"} · newest first`, s.length?s.map(c=>itemHTML(c,null)).join(""):`<div class="empty">No partners yet. Use Add partner to paste a Compass agent link.</div>`);
}
let deb; qEl.addEventListener("input",()=>{clearTimeout(deb);deb=setTimeout(runSearch,250);});
qEl.addEventListener("keydown",e=>{ if(e.key==="Enter"){clearTimeout(deb);runSearch();} if(e.key==="Escape"){qEl.value="";runSearch();} });
$("#clearQ").onclick=()=>{qEl.value="";runSearch();qEl.focus();};
$("#sideClose").onclick=()=>{closeSide();highlightIds=null;searchMark=null;drawPins();};
$("#allBtn").onclick=showAll;

/* ---------- add / edit ---------- */
const scrim=$("#scrim"), modal=$("#modal");
function closeModal(){ scrim.hidden=true; modal.innerHTML=""; modal.classList.remove("welcome"); }
scrim.addEventListener("click",e=>{ if(e.target===scrim) closeModal(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!scrim.hidden) closeModal(); });
$("#addBtn").onclick=()=>openAdd();

/* Compass agent links are case-sensitive (e.g. /agents/Whitney-st-clair/), so keep the slug exactly as pasted */
function slugFrom(url){ const m=String(url).match(/compass\.com\/agents\/([a-z0-9.\-]+)/i); return m && m[1].toLowerCase()!=="offices" && m[1].toLowerCase()!=="locations" ? m[1] : null; }
const nameFromSlug = slug => slug.split("-").filter(w=>w && !/^\d+$/.test(w)).map(w=>w[0].toUpperCase()+w.slice(1).toLowerCase()).join(" ");
function openAdd(){
  modal.innerHTML = `
   <div class="modal-head"><div><h2>Add a partner</h2><p>Paste their Compass agent page and we'll fill in the rest.</p></div><button class="x" aria-label="Close" id="mx">✕</button></div>
   <div class="modal-body">
     <label class="f" for="link">Compass agent page
       <div class="linkrow"><input id="link" type="url" placeholder="https://www.compass.com/agents/first-last/" autocomplete="off"><button class="btn primary" id="readBtn">Read page</button></div>
       <span class="hint">Open their profile on compass.com and copy the address from your browser bar.</span>
     </label>
     <div id="readStatus"></div>
   </div>
   <div class="modal-foot"><button class="btn ghost" id="manualBtn" style="color:var(--accent);padding-left:0">No Compass page? Add manually</button><span class="spacer"></span><button class="btn" id="mcancel">Cancel</button></div>`;
  scrim.hidden=false;
  $("#mx").onclick=$("#mcancel").onclick=closeModal;
  $("#manualBtn").onclick=()=>openEditor({_manual:true},true);
  let busy=false;
  const go=async()=>{
    if (busy) return;
    const url=$("#link").value.trim(), slug=slugFrom(url), st=$("#readStatus");
    if(!slug){ st.innerHTML=`<span class="err">That doesn't look like a Compass agent page. It should look like compass.com/agents/first-last/</span>`; return; }
    const dup = contacts.find(c=>(slugFrom(c.url)||"").toLowerCase()===slug.toLowerCase());
    if (dup){ st.innerHTML=`<span class="err">${esc(dup.name)} is already in your network.</span> <button class="btn sm" id="openDup">Show on map</button>`; $("#openDup").onclick=()=>{closeModal();openCard(dup.id,true);}; return; }
    busy=true; $("#readBtn").disabled=true;
    st.innerHTML=`<div class="loading"><span class="spin"></span>Reading the agent page…</div>`;
    let canonical = `https://www.compass.com/agents/${slug}/`;
    try {
      const r = await api("/api/agent?url="+encodeURIComponent(canonical));
      if (r.url) canonical = r.url;
      const draft = {name:r.name||nameFromSlug(slug), title:r.title||"", photo:r.photo||null, email:r.email||"", mobile:r.mobile||"", office:r.office||"",
        city:r.city||"", state:r.state||"", specialties:r.specialties||[], languages:r.languages||[], url:canonical,
        _found:true, _pulled:{specialties:r.specialties||[], languages:r.languages||[]}};
      if (!$("#readStatus")) return;
      openEditor(draft,true);
    } catch(e){
      if (!$("#readStatus")) return;
      busy=false; $("#readBtn").disabled=false;
      st.innerHTML=`<span class="err">${esc(e.message)}</span> <button class="btn sm" id="manualFromLink">Fill it in myself</button>`;
      $("#manualFromLink").onclick=()=>openEditor({name:nameFromSlug(slug), url:canonical, _readFailed:true},true);
    }
  };
  $("#readBtn").onclick=go; $("#link").addEventListener("keydown",e=>{if(e.key==="Enter")go();});
  setTimeout(()=>$("#link").focus(),30);
}

function chipField(id,label,values,pool,hint,pulled){
  pulled = pulled||[];
  const pulledHint = pulled.length?`<span class="hint">Highlighted ${id==="languages"?"languages":"specialties"} came from their Compass page. Remove any you don't want.</span>`:"";
  return `<div class="f-wrap"><label class="f" for="${id}-in">${label}
    <div class="chipbox" data-field="${id}">${values.map(v=>chipTag(v,pulled.includes(v))).join("")}<input id="${id}-in" list="${id}-dl" placeholder="Type and press Enter"></div>
    <datalist id="${id}-dl">${pool.filter(p=>!values.includes(p)).map(p=>`<option value="${esc(p)}">`).join("")}</datalist>
    ${pulledHint||(hint?`<span class="hint">${hint}</span>`:"")}</label></div>`;
}
const chipTag = (v,pulled) => `<span class="chip${pulled?" pulled":""}" data-v="${esc(v)}"${pulled?' title="From their Compass page"':""}>${esc(v)}<button type="button" aria-label="Remove ${esc(v)}">✕</button></span>`;
function wireChips(box){
  const inp=box.querySelector("input");
  const add=()=>{ inp.value.split(",").map(s=>s.trim()).filter(Boolean).forEach(v=>{
      if(![...box.querySelectorAll(".chip")].some(c=>c.dataset.v.toLowerCase()===v.toLowerCase())) inp.insertAdjacentHTML("beforebegin",chipTag(v)); });
    inp.value=""; };
  inp.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===","){e.preventDefault();add();}
    if(e.key==="Backspace"&&!inp.value){const cs=box.querySelectorAll(".chip");if(cs.length)cs[cs.length-1].remove();} });
  inp.addEventListener("change",()=>{ if(inp.value&&[...box.nextElementSibling.options].some(o=>o.value===inp.value)) add(); });
  inp.addEventListener("blur",add);
  box.addEventListener("click",e=>{ if(e.target.tagName==="BUTTON") e.target.parentElement.remove(); else inp.focus(); });
}
const chipVals = f => [...modal.querySelectorAll(`.chipbox[data-field="${f}"] .chip`)].map(c=>c.dataset.v);
const pool = key => [...new Set(contacts.flatMap(c=>c[key]||[]))].sort();

function openEditor(c,isNew=false){
  const d = {photo:null,name:"",title:"",city:"",state:"",mobile:"",office:"",email:"",url:"",notes:"",specialties:[],groups:[],languages:[],officeAddress:"",officeName:"",...c};
  let photo = d.photo;
  const showToggle = (isNew && d._manual) || (!isNew && !/compass\.com\/agents\//i.test(d.url||""));
  let nonC = !!d.nonCompass;
  const intro = isNew
    ? (d._manual ? "For partners at other brokerages or without a Compass page. Only name, city and state are required."
      : d._readFailed ? "We couldn't read that page, so fill in what you can from it. Only name, city and state are required."
      : "We read these from their Compass page. Fix anything that's off, then add your notes and tags.")
    : "Changes are saved to your network only.";
  const stateOpts = `<option value="">Choose…</option>`+STATES.map(s=>`<option value="${s[0]}"${s[0]===d.state?" selected":""}>${s[2]}</option>`).join("");
  modal.innerHTML = `
   <div class="modal-head"><div><h2>${isNew?(d._found?"Check the details":"Add a partner"):"Edit partner"}</h2><p>${intro}</p></div><button class="x" aria-label="Close" id="mx">✕</button></div>
   <div class="modal-body">
     ${showToggle?`<div class="f" style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:var(--muted)">Agent type
       <div class="seg" role="radiogroup" aria-label="Agent type">
         <button type="button" role="radio" data-v="compass" aria-checked="${!nonC}"><i style="background:var(--accent)"></i>Compass agent</button>
         <button type="button" role="radio" data-v="other" aria-checked="${nonC}"><i style="background:var(--other)"></i>Non-Compass agent</button>
       </div><span class="hint">Non-Compass partners get a dark grey pin.</span></div>`:""}
     <div class="photo-edit"><div class="photo" id="pv">${photo?`<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer">`:esc(initials(d.name))}</div>
       <div class="acts"><label class="btn sm" for="pfile" style="cursor:pointer">${photo?"Replace photo":"Upload photo"}</label><input id="pfile" type="file" accept="image/*" hidden>
       <button class="btn ghost sm" id="prm" ${photo?"":"hidden"}>Remove photo</button>
       <span class="hint">${isNew&&d._found&&photo?"Headshot from their Compass page.":"Shows over their pin."}</span></div></div>
     <div class="grid2">
       <label class="f" for="e-name">Name<input id="e-name" value="${esc(d.name)}"></label>
       <label class="f" for="e-title">Title<input id="e-title" value="${esc(d.title)}"></label>
     </div>
     <div class="grid3">
       <label class="f" for="e-city">City<input id="e-city" value="${esc(d.city)}" list="citydl"></label>
       <label class="f" for="e-state">State<select id="e-state">${stateOpts}</select></label>
     </div>
     <datalist id="citydl">${[...new Set(CITIES.map(c=>c.n))].map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
     <div class="grid2">
       <label class="f" for="e-mobile">Mobile<input id="e-mobile" value="${esc(d.mobile)}" inputmode="tel"></label>
       <label class="f" for="e-office">Office<input id="e-office" value="${esc(d.office)}" inputmode="tel"></label>
     </div>
     <label class="f" for="e-email">Email<input id="e-email" type="email" value="${esc(d.email)}"></label>
     <label class="f" for="e-oaddr">Office address<input id="e-oaddr" value="${esc(d.officeAddress||"")}" placeholder="Optional. Street, city, state and ZIP"><span id="officeNote" class="hint"></span></label>
     <div id="geoNote" class="hint"></div>
     <div class="grid2">
       <label class="f" for="e-brok" id="brokWrap" ${nonC?"":"hidden"}>Brokerage<input id="e-brok" value="${esc(nonC&&d.brokerage&&!/compass/i.test(d.brokerage)?d.brokerage:"")}" placeholder="Their brokerage name"></label>
       <label class="f" for="e-url"><span id="urlLab">${nonC?"Profile or website":"Compass profile"}</span><input id="e-url" type="url" value="${esc(d.url)}" placeholder="Optional"></label>
     </div>
     <label class="f" for="e-notes"><span class="lab-row">Notes <span class="counter" id="ncount"></span></span>
       <textarea id="e-notes" maxlength="300" placeholder="How you met, what they're great at, how they like to be reached">${esc(d.notes)}</textarea></label>
     ${chipField("specialties","Specialties",d.specialties,pool("specialties"),isNew&&d._found?"Nothing listed under Specialties on their page. Add your own.":"Relocation, Luxury, Military/VA, Investors…",d._pulled&&d._pulled.specialties)}
     ${chipField("groups","Networking groups",d.groups,pool("groups"),"BNI chapters, councils, masterminds you share")}
     ${chipField("languages","Languages",d.languages,pool("languages"),"",d._pulled&&d._pulled.languages)}
     <div id="formErr" class="err"></div>
   </div>
   <div class="modal-foot">
     ${!isNew?`<span class="confirm" id="delWrap"><button class="btn danger sm" id="delBtn">Remove from network</button></span>`:""}
     <span class="spacer"></span>
     <button class="btn" id="mcancel">Cancel</button>
     <button class="btn primary" id="saveBtn">${isNew?"Add to map":"Save changes"}</button>
   </div>`;
  scrim.hidden=false;
  $("#mx").onclick=$("#mcancel").onclick=closeModal;
  modal.querySelectorAll(".chipbox").forEach(wireChips);
  const nEl=$("#e-notes"), nc=()=>$("#ncount").textContent=`${nEl.value.length}/300`; nEl.oninput=nc; nc();

  let autoAddr = null, officeName = d.officeName || "";
  modal.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{
    nonC = b.dataset.v==="other";
    modal.querySelectorAll(".seg button").forEach(x=>x.setAttribute("aria-checked", String(x===b)));
    $("#brokWrap").hidden = !nonC; $("#urlLab").textContent = nonC?"Profile or website":"Compass profile";
    if (nonC) $("#e-brok").focus();
    officeNote();
  });
  const useOffice = o => { const a=$("#e-oaddr"); if(!a.value.trim() || a.value===autoAddr) a.value=o.address; autoAddr=o.address; officeName=o.name; geoNote(); };
  const officeNote=()=>{
    const n=$("#officeNote"), a=$("#e-oaddr"); if(!n) return;
    const list = nonC ? [] : officesFor($("#e-office").value);
    if (list.length===1){
      useOffice(list[0]);
      n.innerHTML=`<span class="okmsg">Matched to ${esc(list[0].name)} by office phone. The pin goes on this office.</span>`;
    } else if (list.length>1){
      const cur = list.find(o=>o.address===a.value.trim());
      n.innerHTML=`<span class="okmsg">This phone is shared by ${list.length} Compass offices. Pick theirs:</span>
        <select id="officePick" style="margin-top:6px">${cur?"":`<option value="">Choose an office…</option>`}${list.map((o,i)=>`<option value="${i}"${o===cur?" selected":""}>${esc(o.name)}: ${esc(o.address)}</option>`).join("")}</select>`;
      $("#officePick").onchange=e=>{ const o=list[+e.target.value]; if(o){ useOffice(o); } };
    } else {
      if (a.value===autoAddr) a.value=""; autoAddr=null; officeName="";
      const near = nonC ? [] : officesIn($("#e-city").value, $("#e-state").value);
      if (!nonC && !a.value.trim() && near.length){
        const why = $("#e-office").value.trim() ? "Their office phone doesn't match a Compass office." : "No office phone to match.";
        n.innerHTML = `<div class="suggest"><div class="suggest-head"><b>Not matched.</b> ${why} Is ${near.length===1?"this":"one of these"} their office?</div>
          ${near.map((o,i)=>`<div class="suggest-row"><span><b>${esc(o.name)}</b><br>${esc(o.address)}</span><button type="button" class="btn sm" data-near="${i}">Yes, use this</button></div>`).join("")}
          <div class="suggest-foot">Not sure? Skip it and the pin goes in ${esc($("#e-city").value.trim())}.</div></div>`;
        n.querySelectorAll("[data-near]").forEach(b=>b.onclick=()=>{ const o=near[+b.dataset.near]; autoAddr=null; a.value=o.address; officeName=o.name; n.innerHTML=`<span class="okmsg">Using ${esc(o.name)}, chosen by you. The pin goes on this office.</span>`; geoNote(); });
      } else if (!nonC && $("#e-office").value.trim() && !a.value.trim()){
        n.textContent = officesCount===0 ? "The Compass office list didn't load, so type the office address yourself if you'd like the pin on it." : "No Compass office matches this phone number. You can type the address yourself.";
      } else n.textContent = "";
    }
    geoNote();
  };
  const geoNote=()=>{
    const g=$("#geoNote"); if(!g) return;
    const city=$("#e-city").value.trim(), st=$("#e-state").value, addr=$("#e-oaddr").value.trim();
    g.innerHTML = addr ? `<span class="okmsg">The pin goes on the office address.</span>`
      : (city&&st) ? `<span class="okmsg">The pin goes in ${esc(city)}, ${esc(st)}.</span>` : "";
  };
  $("#e-city").oninput=()=>{ officeNote(); }; $("#e-state").onchange=()=>{ officeNote(); }; $("#e-oaddr").oninput=geoNote; $("#e-office").oninput=officeNote;
  officeNote(); loadOffices().then(()=>{ if($("#officeNote")) officeNote(); });

  $("#e-name").oninput=()=>{ if(!photo) $("#pv").textContent=initials($("#e-name").value); };
  $("#pfile").onchange=e=>{ const f=e.target.files[0]; if(!f) return;
    const img=new Image(), rd=new FileReader();
    rd.onload=()=>{ img.onload=()=>{ const cv=document.createElement("canvas"), s=Math.min(1,320/Math.max(img.width,img.height)); cv.width=Math.round(img.width*s); cv.height=Math.round(img.height*s); cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height); photo=cv.toDataURL("image/jpeg",.85); $("#pv").innerHTML=`<img src="${photo}" alt="">`; $("#prm").hidden=false; }; img.src=rd.result; };
    rd.readAsDataURL(f); };
  $("#prm").onclick=()=>{ photo=null; $("#pv").textContent=initials($("#e-name").value); $("#prm").hidden=true; };
  if (!isNew){ $("#delBtn").onclick=()=>{ $("#delWrap").innerHTML=`Remove ${esc(d.name)}? <button class="btn danger sm" id="delYes">Remove</button><button class="btn sm" id="delNo">Keep</button>`;
      $("#delNo").onclick=()=>openEditor(c); $("#delYes").onclick=()=>{
        deleteDoc(doc(partnersCol(), c.id)).catch(()=>toast("Couldn't remove that partner. Check your connection and try again."));
        contacts=contacts.filter(x=>x.id!==c.id); closeModal(); closeCard(); refresh(); }; }; }

  $("#saveBtn").onclick=async()=>{
    modal.querySelectorAll(".chipbox input").forEach(i=>i.dispatchEvent(new Event("blur")));
    const v = id=>$("#"+id).value.trim();
    const rec = {name:v("e-name"),title:v("e-title"),city:v("e-city"),state:v("e-state"),mobile:v("e-mobile"),office:v("e-office"),email:v("e-email"),
      officeAddress:v("e-oaddr"),officeName:v("e-oaddr")&&v("e-oaddr")===autoAddr?officeName:"",url:v("e-url"),nonCompass:nonC,brokerage:nonC?(v("e-brok")||"Other brokerage"):"Compass",
      notes:$("#e-notes").value.trim(),specialties:chipVals("specialties"),groups:chipVals("groups"),languages:chipVals("languages"),photo:photo||null};
    const miss=[!rec.name&&"name",!rec.city&&"city",!rec.state&&"state"].filter(Boolean);
    if (miss.length){ $("#formErr").textContent=`Add a ${miss.join(" and ")} so we can place the pin.`; return; }
    const btn=$("#saveBtn"); btn.disabled=true; btn.textContent="Placing pin…";
    const moved = isNew || rec.city!==d.city || rec.state!==d.state || rec.officeAddress!==(d.officeAddress||"") || d.lat==null;
    const where = moved ? await locate(rec) : {lat:d.lat, lon:d.lon, placement:d.placement||"city"};
    if (!$("#saveBtn")) return;
    const now = new Date().toISOString();
    const ref = isNew ? doc(partnersCol()) : doc(partnersCol(), c.id);
    const data = {...rec, ...where, added: isNew ? now : (d.added||now), updated: now};
    setDoc(ref, data).catch(()=>toast("Couldn't save to your network. Check your connection and try again."));
    const saved = prep({...data, id: ref.id});
    const i = contacts.findIndex(x=>x.id===ref.id);
    if (i>=0) contacts[i]=saved; else contacts.push(saved);
    closeModal(); refresh(); openCard(saved.id,true);
    if (where.placement==="state") toast(`We couldn't find ${rec.city}, ${rec.state} on the map, so the pin is at the center of the state. Edit the partner to fix the city.`);
  };
  setTimeout(()=>$("#e-name").focus(),30);
}

/* ---------- CRM export ---------- */
const CRM_HEADERS = ["First Name","Last Name","Work Email","Personal Email","Work Phone","Personal Phone","Title","Company","Work Website","Work Address Line 1","Work Address Line 2","Work City","Work State","Work Zip","Work Country","Home Address Line 1","Home Address Line 2","Home City","Home State","Home Zip","Home Country","Tags","Groups","Birthdate","Home Anniversary","Wedding Anniversary","Lease Anniversary","Notes","Key Background Info","Status","LinkedIn"];
const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;
function splitName(n){
  const p = String(n||"").trim().split(/\s+/).filter(Boolean);
  if (p.length<2) return [p[0]||"",""];
  let last = p.pop();
  if (SUFFIX.test(last) && p.length>1) last = p.pop()+" "+last;
  return [p.join(" "), last];
}
function fmtPhone(s){
  let d = String(s||"").replace(/\D/g,"");
  if (d.length===11 && d[0]==="1") d = d.slice(1);
  return d.length===10 ? `(${d.slice(0,3)})-${d.slice(3,6)}-${d.slice(6)}` : String(s||"").trim();
}
function splitAddr(c){
  const out = {l1:"",l2:"",city:c.city||"",state:c.state||"",zip:""};
  const a = String(c.officeAddress||"").trim(); if (!a) return out;
  const parts = a.split(",").map(s=>s.trim()).filter(Boolean);
  const m = parts.length>=3 && parts[parts.length-1].match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (m){ out.state=m[1].toUpperCase(); out.zip=m[2]; out.city=parts[parts.length-2]; out.l1=parts[0]; out.l2=parts.slice(1,-2).join(", "); }
  else out.l1 = a;
  return out;
}
function crmTags(c){
  const raw = [...(c.specialties||[]),...(c.groups||[]),...(c.languages||[]),CRM_TAG,...(isCompass(c)?[]:["Non-Compass"])];
  const seen = new Set(), out = [];
  raw.forEach(x=>{ const v=String(x).replace(/,/g," ").replace(/\s+/g," ").trim(); const k=v.toLowerCase(); if(v&&!seen.has(k)){seen.add(k);out.push(v);} });
  return out.join(",");
}
function crmRow(c){
  const [first,last] = splitName(c.name), a = splitAddr(c);
  const mobile = fmtPhone(c.mobile), office = fmtPhone(c.office);
  const bg = [mobile&&office?`Office phone: ${office}`:"", `Added from Network Partner Map${c.added?" on "+fmtDate(c.added):""}`].filter(Boolean).join(". ");
  const row = {"First Name":first,"Last Name":last,"Work Email":c.email||"","Work Phone":mobile||office,"Title":c.title||"",
    "Company":isCompass(c)?"Compass":(c.brokerage||""),"Work Website":c.url||"",
    "Work Address Line 1":a.l1,"Work Address Line 2":a.l2,"Work City":a.city,"Work State":a.state,"Work Zip":a.zip,"Work Country":"USA",
    "Tags":crmTags(c),"Notes":c.notes||"","Key Background Info":bg};
  return CRM_HEADERS.map(h=>row[h]??"");
}
const csvCell = v => /[",\r\n]/.test(v) ? `"${String(v).replace(/"/g,'""')}"` : String(v);
const toCSV = list => [CRM_HEADERS,...list.map(crmRow)].map(r=>r.map(csvCell).join(",")).join("\r\n")+"\r\n";

function listedIds(){ return side.classList.contains("open") ? [...list.querySelectorAll(".item")].map(el=>el.dataset.id) : []; }
function openExport(prefer){
  const listed = listedIds(), hasList = listed.length>0 && listed.length<contacts.length;
  let scope = (prefer==="list" && hasList) ? "list" : "all";
  const pick = () => scope==="list" ? listed.map(id=>contacts.find(c=>c.id===id)).filter(Boolean) : [...contacts].sort((a,b)=>b.added.localeCompare(a.added));
  const render = () => {
    const rows = pick(), prev = rows.slice(0,5);
    modal.innerHTML = `
     <div class="modal-head"><div><h2>Export to Compass CRM</h2><p>Creates a CSV that matches the CRM contact import template.</p></div><button class="x" aria-label="Close" id="mx">✕</button></div>
     <div class="modal-body">
       <div class="scope" role="radiogroup" aria-label="Which partners">
         <label for="sc-all"><input type="radio" name="sc" id="sc-all" value="all" ${scope==="all"?"checked":""}><span>All partners<small>${contacts.length} contact${contacts.length===1?"":"s"}</small></span></label>
         ${hasList?`<label for="sc-list"><input type="radio" name="sc" id="sc-list" value="list" ${scope==="list"?"checked":""}><span>Only the partners in your list<small>${listed.length} from “${esc($("#sideTitle").textContent)}”</small></span></label>`:""}
       </div>
       <div class="tbl-wrap"><table class="tbl"><thead><tr><th>First</th><th>Last</th><th>Company</th><th>Work phone</th><th>City</th><th>Tags</th></tr></thead><tbody>
         ${prev.map(c=>{const r=crmRow(c);return `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[7])}</td><td>${esc(r[4])}</td><td>${esc(r[11])}${r[12]?", "+esc(r[12]):""}</td><td class="tags">${esc(r[21])}</td></tr>`;}).join("")}
       </tbody></table></div>
       ${rows.length>5?`<div class="hint">Showing 5 of ${rows.length}.</div>`:""}
       <div class="mapnote"><b>How fields map:</b> mobile goes to Work Phone (office phone if there's no mobile, otherwise office goes in Key Background Info). Specialties, networking groups and languages go in Tags, separated by commas, plus a <b>${esc(CRM_TAG)}</b> tag on everyone and <b>Non-Compass</b> on partners at other brokerages. Office address fills the Work Address columns. Notes go to Notes. Home address, personal contact, dates, Groups and Status are left blank.</div>
       <div id="exStatus"></div>
     </div>
     <div class="modal-foot"><button class="btn" id="copyCsv">Copy CSV</button><span class="spacer"></span><button class="btn" id="mcancel">Cancel</button><button class="btn primary" id="dlCsv">Download CSV</button></div>`;
    scrim.hidden = false;
    $("#mx").onclick = $("#mcancel").onclick = closeModal;
    modal.querySelectorAll('input[name="sc"]').forEach(r=>r.onchange=()=>{scope=r.value;render();});
    const csv = toCSV(rows), fname = `network-partners-${new Date().toISOString().slice(0,10)}.csv`, st=$("#exStatus");
    if (!rows.length){ $("#dlCsv").disabled=true; $("#copyCsv").disabled=true; st.innerHTML=`<span class="hint">Add a partner first, then export.</span>`; }
    $("#dlCsv").onclick = () => {
      const blob = new Blob(["\ufeff"+csv], {type:"text/csv;charset=utf-8"});
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
      st.innerHTML=`<span class="okmsg">Downloaded ${esc(fname)} with ${rows.length} contact${rows.length===1?"":"s"}. Upload it in the CRM's contact import.</span>`;
    };
    $("#copyCsv").onclick = () => {
      const ok=()=>{st.innerHTML=`<span class="okmsg">Copied ${rows.length} contact${rows.length===1?"":"s"} as CSV.</span>`;};
      try { navigator.clipboard.writeText(csv).then(ok,()=>showRaw(csv)); } catch(e){ showRaw(csv); }
    };
  };
  const showRaw = csv => { $("#exStatus").innerHTML = `<label class="f" for="rawCsv">Select all and copy<textarea id="rawCsv" rows="6" readonly></textarea></label>`; const ta=$("#rawCsv"); ta.value=csv; ta.focus(); ta.select(); };
  render();
}
$("#exportBtn").onclick = () => openExport("list");
$("#sideExport").onclick = () => openExport("list");

/* ---------- welcome walkthrough ---------- */
const ICON = {
  map:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12l12-5 12 5 12-5v29l-12 5-12-5-12 5z"/><path d="M18 7v29M30 12v29"/><circle cx="36" cy="20" r="3.2" fill="currentColor" stroke="none"/></svg>',
  link:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 28l8-8"/><path d="M22 14l3-3a8 8 0 0 1 12 12l-3 3"/><path d="M26 34l-3 3a8 8 0 0 1-12-12l3-3"/></svg>',
  tag:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h16l18 18-16 16L7 23z"/><circle cx="16" cy="16" r="3"/></svg>',
  search:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="21" cy="21" r="12"/><path d="M30 30l11 11"/><path d="M21 15v6l4 3"/></svg>',
  export:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6v24M15 21l9 9 9-9"/><path d="M8 32v8h32v-8"/></svg>',
};
const WELCOME_STEPS = [
  {icon:"map", eyebrow:"Welcome", title:"Your referral network, on a map",
   body:"When a client is moving out of your market, see in seconds who you know there, how to reach them and why you trust them. No more digging through your phone, old emails or business cards."},
  {icon:"link", eyebrow:"Step 1", title:"Add partners in one paste",
   body:"Paste a Compass agent's profile link and their photo, phone, email, office, specialties and languages fill in for you. Check the details, then add them to your map.",
   note:"Partners at other brokerages? Add them by hand. They show as dark grey pins."},
  {icon:"tag", eyebrow:"Step 2", title:"Make it yours",
   body:"Add notes on how you met and what they're great at, plus tags for specialties and the networking groups you share.",
   note:"Your network, notes and tags are private to your account."},
  {icon:"search", eyebrow:"Step 3", title:"Find the right person fast",
   body:"Search a city, state or ZIP to see your partners sorted by distance. Search a name, tag or note, like “relocation” or “BNI”, to see matches newest first.",
   note:"Shaded states show where you have coverage, so gaps are easy to spot."},
  {icon:"export", eyebrow:"Step 4", title:"Take it to your CRM",
   body:"Export your whole network, or just a search, as a CSV that's ready to import into the Compass CRM, tags included."},
];
function openWelcome(onDone){
  let i = 0;
  const render = () => {
    const s = WELCOME_STEPS[i], last = i===WELCOME_STEPS.length-1;
    modal.classList.add("welcome");
    modal.innerHTML = `
      <div class="wl-body">
        <button class="x wl-skip" id="wlSkip" aria-label="Close">${last?"✕":"Skip"}</button>
        <div class="wl-icon" aria-hidden="true">${ICON[s.icon]}</div>
        <div class="wl-eyebrow">${s.eyebrow}</div>
        <h2>${s.title}</h2>
        <p>${s.body}</p>
        ${s.note?`<p class="wl-note">${s.note}</p>`:""}
      </div>
      <div class="modal-foot wl-foot">
        <div class="wl-dots" role="tablist" aria-label="Walkthrough steps">${WELCOME_STEPS.map((_,j)=>`<button class="wl-dot${j===i?" on":""}" data-j="${j}" aria-label="Step ${j+1}" aria-current="${j===i}"></button>`).join("")}</div>
        <span class="spacer"></span>
        ${i>0?`<button class="btn" id="wlBack">Back</button>`:""}
        <button class="btn primary" id="wlNext">${last?(contacts.length?"Start exploring":"Add your first partner"):"Next"}</button>
      </div>`;
    scrim.hidden = false;
    const done = (openAddAfter) => { modal.classList.remove("welcome"); closeModal(); if (onDone) onDone(); if (openAddAfter) openAdd(); };
    $("#wlSkip").onclick = () => done(false);
    $("#wlNext").onclick = () => { if (last) done(!contacts.length); else { i++; render(); } };
    const b = $("#wlBack"); if (b) b.onclick = () => { i--; render(); };
    modal.querySelectorAll(".wl-dot").forEach(d => d.onclick = () => { i = +d.dataset.j; render(); });
    $("#wlNext").focus();
  };
  render();
}

/* ---------- toast ---------- */
let toastT;
function toast(msg){
  let el=$("#toast"); if(!el){ el=document.createElement("div"); el.id="toast"; el.className="toast"; el.setAttribute("role","status"); document.body.appendChild(el); }
  el.textContent=msg; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true, 6000);
}

/* ---------- boot ---------- */
function refresh(){
  tintStates();
  $("#emptyState").hidden = contacts.length>0;
  if (side.classList.contains("open") && side.dataset.mode!=="group"){ side.dataset.mode==="all"?showAll():runSearch(); }
  drawPins();
  if (selectedId && !contacts.some(c=>c.id===selectedId)) closeCard();
}
$("#emptyAdd").onclick=()=>openAdd();
$("#helpBtn").onclick=()=>openWelcome();
$("#howBtn").onclick=()=>{ $("#userMenu").hidden=true; openWelcome(); };
svg.on("click.bg",ev=>{ if(ev.target===svg.node()) closeCard(); });
addEventListener("resize",()=>placeCard(true));

/* first sign-in: show the walkthrough once per account (remembered in Firestore, so it follows them across devices) */
async function maybeWelcome(user){
  const key = "npm-welcomed-"+user.uid;
  try { if (localStorage.getItem(key)) return; } catch(e){}
  const ref = doc(db, COLLECTION, user.uid);
  try { const s = await getDoc(ref); if (s.exists() && s.data().welcomedAt){ try{localStorage.setItem(key,"1");}catch(e){} return; } } catch(e){}
  if (me !== user || !scrim.hidden) return;
  openWelcome(()=>{
    try{ localStorage.setItem(key,"1"); }catch(e){}
    setDoc(ref, { welcomedAt: new Date().toISOString() }, { merge:true }).catch(()=>{});
  });
}

/* sign-in gate */
const gate=$("#gate"), gateMsg=$("#gateMsg");
$("#signInBtn").onclick=async()=>{
  gateMsg.textContent="";
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({hd:ALLOWED_DOMAIN, prompt:"select_account"});
  try { await signInWithPopup(auth, provider); }
  catch(e){
    const code = (e && e.code) || "unknown";
    if (code==="auth/popup-closed-by-user" || code==="auth/cancelled-popup-request") return;
    const why = {
      "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
      "auth/unauthorized-domain": "This web address isn't approved for sign-in yet. Add it under Firebase › Authentication › Settings › Authorized domains.",
      "auth/invalid-api-key": "The Firebase settings in src/config.js are missing or incorrect.",
      "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "The Firebase settings in src/config.js are missing or incorrect.",
      "auth/operation-not-allowed": "Google sign-in is turned off in Firebase › Authentication › Sign-in method.",
      "auth/network-request-failed": "Couldn't reach Google. Check your connection and try again.",
    }[code] || "Sign-in didn't go through. Try again.";
    gateMsg.textContent = `${why} (${code})`;
    console.error(e);
  }
};
$("#signOutBtn").onclick=()=>signOut(auth);
$("#userChip").onclick=()=>{ const m=$("#userMenu"); m.hidden=!m.hidden; };
document.addEventListener("click",e=>{ if(!e.target.closest("#userChip,#userMenu")) $("#userMenu").hidden=true; });

onAuthStateChanged(auth, user=>{
  if (unsub){ unsub(); unsub=null; }
  contacts=[]; closeCard(); closeSide(); closeModal();
  if (user && !new RegExp("@"+ALLOWED_DOMAIN.replace(/\./g,"\\.")+"$","i").test(user.email||"")){
    gateMsg.textContent=`Network Partner Map is for Compass agents. Sign in with your @${ALLOWED_DOMAIN} account.`;
    signOut(auth); return;
  }
  me = user || null;
  gate.hidden = !!user;
  $("#app").hidden = !user;
  if (!user){ refresh(); return; }
  $("#uName").textContent = user.displayName || user.email;
  $("#uEmail").textContent = user.email;
  $("#uAv").textContent = initials(user.displayName || user.email);
  $("#loadingMap").hidden=false;
  let first = true;
  unsub = onSnapshot(partnersCol(), snap=>{
    contacts = snap.docs.map(d=>prep({...d.data(), id:d.id}));
    $("#loadingMap").hidden=true;
    refresh();
    if (first){ first=false; maybeWelcome(user); }
  }, err=>{
    $("#loadingMap").hidden=true;
    toast("Couldn't load your network. Refresh the page to try again.");
    console.error(err);
  });
  loadOffices();
});
