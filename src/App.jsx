import { useState } from "react";

const INIT_LISTINGS = [
  { id:1, addr:"47 Bedford Ave", hood:"Williamsburg", rent:3200, beds:2, status:"active", broker:"Marco Silva", photo:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600", desc:"Bright corner unit with exposed brick and skyline views. Steps from the L train and surrounded by Williamsburg's best coffee shops and galleries.", leads:[] },
  { id:2, addr:"210 Franklin St", hood:"Greenpoint", rent:2750, beds:1, status:"active", broker:"Priya Nair", photo:"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600", desc:"Top-floor unit in a restored warehouse building with original hardwood floors. Quiet block, great natural light.", leads:[] },
  { id:3, addr:"88 Nostrand Ave", hood:"Crown Heights", rent:2100, beds:1, status:"active", broker:"Marco Silva", photo:"https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600", desc:"Sunny garden-level in a limestone brownstone. Laundry in building, close to the 2/3/4/5 trains.", leads:[] },
  { id:4, addr:"330 W 42nd St", hood:"Hell's Kitchen", rent:4100, beds:3, status:"active", broker:"Jen Torres", photo:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600", desc:"Luxury three-bedroom with floor-to-ceiling windows and breathtaking Midtown views. Full-time doorman building.", leads:[] },
  { id:5, addr:"15 Myrtle Ave", hood:"Fort Greene", rent:2900, beds:2, status:"rented", broker:"Marco Silva", photo:"https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600", desc:"Renovated two-bedroom with chef kitchen and private backyard.", leads:[] },
];

const HOOD_PHOTOS = {
  "Williamsburg":"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600",
  "Greenpoint":"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600",
  "Crown Heights":"https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600",
  "Hell's Kitchen":"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600",
  "Fort Greene":"https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600",
  "Astoria":"https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600",
  "Park Slope":"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600",
  "Bushwick":"https://images.unsplash.com/photo-1536376072261-38c75246e2ba?w=600",
};

async function claude(prompt, max=300) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:max, messages:[{role:"user",content:prompt}] })
  });
  const d = await r.json();
  return d.content?.[0]?.text?.trim() || "";
}

export default function BrokerAI() {
  const [listings, setListings] = useState(INIT_LISTINGS);
  const [view, setView] = useState("home");
  const [homeTab, setHomeTab] = useState("rent");
  const [role, setRole] = useState(null);
  const [selected, setSelected] = useState(null);
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLoading, setCoverLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTask, setAiTask] = useState("");
  const [nlQuery, setNlQuery] = useState("");
  const [nlResults, setNlResults] = useState(null);
  const [fHood, setFHood] = useState("All");
  const [fBeds, setFBeds] = useState("Any");
  const [fRent, setFRent] = useState(5000);
  const [searchLocation, setSearchLocation] = useState("");
  const [searchMinPrice, setSearchMinPrice] = useState("");
  const [searchMaxPrice, setSearchMaxPrice] = useState("");
  const [newL, setNewL] = useState({ addr:"", hood:"Williamsburg", beds:"", rent:"", desc:"", photo:"" });
  const [priceHint, setPriceHint] = useState("");
  const [toast, setToast] = useState(null);
  const [hoodBio, setHoodBio] = useState("");
  const [bioLoading, setBioLoading] = useState(false);

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };
  const myListings = listings.filter(l=>l.broker==="Marco Silva");
  const myLeads = myListings.flatMap(l=>(l.leads||[]).map(ld=>({...ld,listing:l})));
  const filtered = listings.filter(l=>{
    if(l.status!=="active") return false;
    if(fHood!=="All" && l.hood!==fHood) return false;
    if(fBeds!=="Any" && l.beds!==parseInt(fBeds)) return false;
    if(l.rent>fRent) return false;
    return true;
  });

  async function genDesc() {
    if(!newL.addr||!newL.beds||!newL.rent){ showToast("Fill address, beds, and rent first","warn"); return; }
    setAiLoading(true); setAiTask("Writing your listing description...");
    try {
      const res = await claude(`Write a compelling NYC apartment listing description under 80 words for: ${newL.beds}BR in ${newL.hood}, $${newL.rent}/mo at ${newL.addr}. Be specific and appealing. No opener like "Welcome to".`);
      setNewL(p=>({...p,desc:res}));
      showToast("AI description written!");
    } catch { showToast("API error — try again","warn"); }
    setAiLoading(false); setAiTask("");
  }

  async function findPhotos() {
    setAiLoading(true); setAiTask("Finding apartment photos for " + newL.hood + "...");
    try {
      const photo = HOOD_PHOTOS[newL.hood] || HOOD_PHOTOS["Williamsburg"];
      setNewL(p=>({...p,photo}));
      showToast("Photos found for " + newL.hood + "!");
    } catch { showToast("Could not find photos","warn"); }
    setAiLoading(false); setAiTask("");
  }

  async function suggestPrice() {
    if(!newL.beds||!newL.hood){ showToast("Pick neighborhood and bedrooms first","warn"); return; }
    setAiLoading(true); setAiTask("Checking NYC market prices...");
    try {
      const res = await claude(`What is the typical monthly rent for a ${newL.beds}BR apartment in ${newL.hood}, NYC in 2025? Return ONLY a price range like "$2,800–$3,400". Nothing else.`, 25);
      setPriceHint(res);
      showToast("Price suggestion ready!");
    } catch { showToast("API error — try again","warn"); }
    setAiLoading(false); setAiTask("");
  }

  async function doNLSearch() {
    if(!nlQuery.trim()) return;
    setAiLoading(true); setAiTask("Finding your best matches...");
    try {
      const summary = listings.filter(l=>l.status==="active").map(l=>`ID:${l.id}|${l.addr},${l.hood}|${l.beds}BR|$${l.rent}/mo`).join("\n");
      const res = await claude(`Renter search query: "${nlQuery}"\nAvailable listings:\n${summary}\nReturn ONLY a JSON array of the best matching listing IDs in order, like [2,1]. Max 3 results. Return [] if nothing matches.`, 50);
      const match = res.match(/\[[\d,\s]*\]/);
      if(match) {
        const ids = JSON.parse(match[0]);
        setNlResults(ids.map(id=>listings.find(l=>l.id===id)).filter(Boolean));
      } else { setNlResults([]); }
    } catch { setNlResults([]); }
    setAiLoading(false); setAiTask("");
  }

  async function openListing(l) {
    setSelected(l); setContactSent(false); setContactMsg(""); setHoodBio(""); setCoverLetter("");
    setBioLoading(true);
    try {
      const bio = await claude(`Write 2 sentences about ${l.hood}, NYC. Cover: best subway lines, neighborhood vibe, and what kind of person would love living here. Be specific and honest.`, 130);
      setHoodBio(bio);
    } catch {}
    setBioLoading(false);
  }

  async function genCoverLetter() {
    if(!contactMsg.trim()){ showToast("Write your message to the broker first","warn"); return; }
    setCoverLoading(true);
    try {
      const res = await claude(`Write a short, professional cover letter (under 80 words) for a renter applying for this apartment: ${selected.addr}, ${selected.hood}, ${selected.beds}BR, $${selected.rent}/mo. The renter's note: "${contactMsg}". Make it warm, honest, and persuasive. No generic openers.`, 150);
      setCoverLetter(res);
      showToast("Cover letter written by AI!");
    } catch { showToast("API error — try again","warn"); }
    setCoverLoading(false);
  }

  async function sendMessage() {
    if(!contactMsg.trim()){ showToast("Type a message first","warn"); return; }
    setAiLoading(true); setAiTask("Sending your message...");
    const lead = { id:Date.now(), message:contactMsg, renter:"You", time:new Date().toLocaleTimeString() };
    setListings(prev=>prev.map(l=>l.id===selected.id?{...l,leads:[...(l.leads||[]),lead]}:l));
    setContactSent(true);
    showToast("Message sent to broker!");
    setAiLoading(false); setAiTask("");
  }

  function publishListing() {
    if(!newL.addr||!newL.beds||!newL.rent||!newL.desc){ showToast("Fill all fields first","warn"); return; }
    const l = {
      id:Date.now(), addr:newL.addr, hood:newL.hood,
      rent:parseInt(newL.rent), beds:parseInt(newL.beds),
      status:"active", broker:"Marco Silva",
      photo:newL.photo||HOOD_PHOTOS[newL.hood]||HOOD_PHOTOS["Williamsburg"],
      desc:newL.desc, leads:[]
    };
    setListings(prev=>[l,...prev]);
    setNewL({addr:"",hood:"Williamsburg",beds:"",rent:"",desc:"",photo:""});
    setPriceHint("");
    setView("broker");
    showToast("Listing published!");
  }

  function handleHomeSearch() {
    setView("search");
    if(searchLocation) setFHood(searchLocation);
    if(searchMaxPrice) setFRent(parseInt(searchMaxPrice));
  }

  const css = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1a1a1a;}

    /* TOP NAV */
    .topnav{background:#1a3a2a;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
    .topnav-logo{font-size:20px;font-weight:800;color:#fff;cursor:pointer;letter-spacing:-.5px;}
    .topnav-logo span{color:#7fe8a8;}
    .topnav-links{display:flex;gap:4px;align-items:center;}
    .topnav-link{font-size:13px;font-weight:500;color:rgba(255,255,255,.8);padding:8px 14px;border-radius:6px;cursor:pointer;border:none;background:transparent;}
    .topnav-link:hover{background:rgba(255,255,255,.1);color:#fff;}
    .topnav-link.active{color:#fff;background:rgba(255,255,255,.15);}
    .topnav-actions{display:flex;gap:8px;align-items:center;}
    .topnav-btn{font-size:13px;font-weight:600;padding:7px 16px;border-radius:6px;cursor:pointer;font-family:inherit;}
    .topnav-btn.ghost{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);}
    .topnav-btn.ghost:hover{border-color:#fff;}
    .topnav-btn.solid{background:#fff;color:#1a3a2a;border:1.5px solid #fff;}
    .topnav-btn.solid:hover{background:#e8f5e0;}

    /* HERO */
    .hero{background:#f0f7f2;padding:64px 24px 56px;text-align:center;border-bottom:1px solid #ddeee5;}
    .hero-eyebrow{font-size:13px;font-weight:600;color:#1a3a2a;letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px;}
    .hero-title{font-size:clamp(32px,5vw,52px);font-weight:800;color:#1a1a1a;line-height:1.1;margin-bottom:10px;letter-spacing:-.5px;}
    .hero-title span{color:#1a3a2a;}
    .hero-sub{font-size:16px;color:#5a6a62;margin-bottom:36px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.6;}

    /* SEARCH CARD */
    .search-card{background:#fff;border-radius:14px;box-shadow:0 4px 32px rgba(0,0,0,.1);max-width:740px;margin:0 auto;overflow:hidden;}
    .search-tabs{display:flex;border-bottom:1px solid #e8ede9;}
    .search-tab{flex:1;padding:14px;text-align:center;font-size:14px;font-weight:600;cursor:pointer;color:#6b6b6b;border:none;background:transparent;border-bottom:3px solid transparent;transition:all .15s;}
    .search-tab.active{color:#1a3a2a;border-bottom-color:#1a3a2a;background:#f9fcfa;}
    .search-body{padding:20px;}
    .search-row{display:flex;gap:10px;align-items:stretch;}
    .search-field{flex:1;display:flex;flex-direction:column;gap:4px;}
    .search-label{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;}
    .search-input{padding:10px 14px;border:1.5px solid #dde8e2;border-radius:8px;font-size:14px;color:#1a1a1a;background:#fff;font-family:inherit;height:46px;}
    .search-input:focus{outline:none;border-color:#1a3a2a;}
    .search-select{padding:10px 14px;border:1.5px solid #dde8e2;border-radius:8px;font-size:14px;color:#1a1a1a;background:#fff;font-family:inherit;height:46px;}
    .search-select:focus{outline:none;border-color:#1a3a2a;}
    .search-btn{background:#1a3a2a;color:#fff;border:none;border-radius:8px;padding:0 24px;font-size:15px;font-weight:700;cursor:pointer;height:46px;display:flex;align-items:center;gap:8px;white-space:nowrap;}
    .search-btn:hover{background:#0f2a1a;}
    .search-hint{font-size:12px;color:#888;margin-top:12px;text-align:center;}
    .search-hint a{color:#1a3a2a;font-weight:600;cursor:pointer;text-decoration:none;}

    /* FEATURES BAR */
    .feat-bar{background:#fff;border-bottom:1px solid #eee;padding:32px 24px;}
    .feat-bar-inner{max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px;}
    .feat-item{text-align:center;}
    .feat-item-ico{font-size:24px;margin-bottom:8px;}
    .feat-item-t{font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:3px;}
    .feat-item-d{font-size:12px;color:#888;line-height:1.4;}

    /* LISTINGS PREVIEW */
    .listings-preview{padding:40px 24px;background:#fafaf8;}
    .lp-inner{max-width:1100px;margin:0 auto;}
    .lp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
    .lp-title{font-size:20px;font-weight:800;color:#1a1a1a;}
    .lp-see-all{font-size:13px;font-weight:600;color:#1a3a2a;cursor:pointer;text-decoration:none;background:none;border:none;}
    .lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;}
    .lcard{background:#fff;border:1px solid #e8ede9;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .12s,box-shadow .12s;}
    .lcard:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.08);}
    .lcard-img{width:100%;height:150px;object-fit:cover;}
    .lcard-body{padding:14px;}
    .lcard-price{font-size:20px;font-weight:800;color:#1a1a1a;margin-bottom:3px;}
    .lcard-addr{font-size:12px;color:#888;margin-bottom:8px;}
    .tags{display:flex;gap:5px;flex-wrap:wrap;}
    .tag{font-size:11px;padding:3px 8px;border-radius:20px;border:1px solid #dde8e2;color:#5a6a62;background:#f0f7f2;}
    .lcard-desc{font-size:11px;color:#888;margin-top:8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

    /* ALL OTHER PAGES */
    .pg{display:none;padding:24px 20px;max-width:1100px;margin:0 auto;}
    .pg.show{display:block;}
    .ph{margin-bottom:20px;}
    .ph h2{font-size:22px;font-weight:800;margin-bottom:4px;}
    .ph p{font-size:13px;color:#6b6b6b;}
    .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:20px;}
    .stat{background:#fff;border:1px solid #e8ede9;border-radius:10px;padding:14px;text-align:center;}
    .stat-n{font-size:28px;font-weight:800;}
    .stat-l{font-size:11px;color:#6b6b6b;}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
    @media(max-width:640px){.two{grid-template-columns:1fr;}.stats{grid-template-columns:repeat(2,1fr);}.search-row{flex-wrap:wrap;}}
    .card{background:#fff;border:1px solid #e8ede9;border-radius:12px;padding:16px;}
    .card-t{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:14px;}
    .lrow{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f5f2;}
    .lrow:last-child{border-bottom:none;}
    .lthumb{width:36px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0;}
    .linfo{flex:1;min-width:0;}
    .laddr{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .lmeta{font-size:11px;color:#6b6b6b;}
    .badge-a{font-size:10px;padding:2px 7px;border-radius:20px;background:#e8f5e0;color:#1a3a2a;font-weight:600;}
    .badge-r{font-size:10px;padding:2px 7px;border-radius:20px;background:#fee2e2;color:#7f1d1d;font-weight:600;}
    .lead-row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid #f0f5f2;}
    .lead-row:last-child{border-bottom:none;}
    .lead-ico{width:30px;height:30px;border-radius:50%;background:#e8f5e0;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
    .lead-addr{font-size:12px;font-weight:700;}
    .lead-msg{font-size:11px;color:#6b6b6b;line-height:1.4;}
    .lead-time{font-size:10px;color:#aaa;}
    .empty{text-align:center;padding:24px;font-size:13px;color:#888;}
    .aibox{background:#fff;border:1px solid #dde8e2;border-radius:12px;padding:14px 16px;margin-bottom:16px;}
    .ailabel{font-size:11px;font-weight:700;color:#1a3a2a;margin-bottom:8px;}
    .arow{display:flex;gap:8px;}
    .ainp{flex:1;padding:9px 12px;border:1.5px solid #dde8e2;border-radius:8px;font-size:13px;color:#1a1a1a;background:#fff;font-family:inherit;}
    .ainp:focus{outline:none;border-color:#1a3a2a;}
    .filters{background:#fff;border:1px solid #dde8e2;border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;}
    .fg{display:flex;flex-direction:column;gap:4px;}
    .fl{font-size:11px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.04em;}
    select{padding:7px 10px;border:1.5px solid #dde8e2;border-radius:8px;font-size:13px;color:#1a1a1a;background:#fff;min-width:120px;font-family:inherit;}
    .cnt{font-size:13px;color:#6b6b6b;margin-bottom:14px;}
    .fgroup{margin-bottom:14px;}
    .flabel{font-size:12px;font-weight:700;color:#888;margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em;display:block;}
    .finput,.fsel,.farea{width:100%;padding:10px 12px;border:1.5px solid #dde8e2;border-radius:8px;font-size:13px;color:#1a1a1a;background:#fff;font-family:inherit;}
    .finput:focus,.fsel:focus,.farea:focus{outline:none;border-color:#1a3a2a;}
    .farea{min-height:90px;resize:vertical;}
    .two-inp{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .btn{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid;font-family:inherit;}
    .btn-p{background:#1a3a2a;color:#fff;border-color:#1a3a2a;}
    .btn-p:hover{background:#0f2a1a;}
    .btn-s{background:#fff;color:#1a1a1a;border-color:#dde8e2;}
    .btn-s:hover{background:#f0f7f2;}
    .btn-ai{background:#1a3a2a;color:#c8f0d0;border-color:#1a3a2a;font-size:12px;padding:7px 14px;}
    .btn-ai:hover{opacity:.85;}
    .btn-ai:disabled{opacity:.5;cursor:not-allowed;}
    .btn-row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;}
    .price-hint{font-size:12px;color:#1a3a2a;background:#e8f5e0;padding:5px 10px;border-radius:6px;margin-top:6px;display:inline-block;border:1px solid #c8f0d0;font-weight:600;}
    .photo-preview{width:100%;height:160px;object-fit:cover;border-radius:8px;margin-top:8px;}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
    .modal{background:#fff;border-radius:14px;padding:24px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;}
    .modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;}
    .modal-title{font-size:20px;font-weight:800;}
    .modal-sub{font-size:12px;color:#888;margin-top:3px;}
    .modal-x{background:none;border:none;font-size:22px;cursor:pointer;color:#888;padding:0;line-height:1;}
    .modal-img{width:100%;height:200px;object-fit:cover;border-radius:10px;margin-bottom:14px;}
    .modal-price{font-size:30px;font-weight:800;margin-bottom:8px;}
    .modal-desc{font-size:13px;color:#6b6b6b;line-height:1.7;margin-bottom:14px;}
    .hood-bio{background:#e8f5e0;border-radius:8px;padding:12px 14px;font-size:12px;color:#1a3a2a;line-height:1.6;margin-bottom:14px;}
    .hood-bio-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;opacity:.65;}
    .cover-box{background:#f0faf4;border:1px solid #c8f0d0;border-radius:8px;padding:12px 14px;font-size:12px;color:#1a3a2a;line-height:1.7;margin-top:10px;}
    .cover-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;opacity:.65;}
    .success{background:#e8f5e0;border-radius:10px;padding:18px;text-align:center;}
    .success strong{font-size:16px;color:#1a3a2a;}
    .success p{font-size:13px;color:#1a3a2a;margin-top:6px;}
    .divider{height:1px;background:#e8ede9;margin:14px 0;}
    .spin{display:inline-block;width:13px;height:13px;border:2px solid #c8f0d0;border-top-color:#1a3a2a;border-radius:50%;animation:sp .6s linear infinite;vertical-align:middle;margin-right:5px;}
    .big-spin{width:28px;height:28px;border:3px solid #c8f0d0;border-top-color:#1a3a2a;border-radius:50%;animation:sp .6s linear infinite;margin:0 auto;}
    @keyframes sp{to{transform:rotate(360deg)}}
    .ai-overlay{position:fixed;inset:0;background:rgba(0,0,0,.48);z-index:300;display:flex;align-items:center;justify-content:center;}
    .ai-box{background:#fff;border-radius:12px;padding:32px 44px;text-align:center;min-width:220px;}
    .ai-box p{font-size:14px;color:#6b6b6b;margin-top:14px;}
    .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:11px 22px;border-radius:8px;font-size:13px;z-index:999;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.2);}
    .toast.warn{background:#92400e;}
  `;

  return (
    <>
      <style>{css}</style>

      {toast && <div className={`toast${toast.type==="warn"?" warn":""}`}>{toast.msg}</div>}

      {aiLoading && (
        <div className="ai-overlay">
          <div className="ai-box">
            <div className="big-spin"></div>
            <p>{aiTask}</p>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={()=>{setSelected(null);setHoodBio("");setCoverLetter("");}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">{selected.addr}</div>
                <div className="modal-sub">{selected.hood} · {selected.beds} BR · Listed by {selected.broker}</div>
              </div>
              <button className="modal-x" onClick={()=>{setSelected(null);setHoodBio("");setCoverLetter("");}}>✕</button>
            </div>
            <img className="modal-img" src={selected.photo} alt={selected.addr} onError={e=>e.target.src=HOOD_PHOTOS["Williamsburg"]} />
            <div className="modal-price">${selected.rent.toLocaleString()}<span style={{fontSize:14,fontWeight:400,color:"#888"}}>/mo</span></div>
            <div className="modal-desc">{selected.desc}</div>
            {bioLoading ? (
              <div className="hood-bio"><div className="hood-bio-lbl">✦ AI neighborhood guide</div><span className="spin"></span>Loading...</div>
            ) : hoodBio ? (
              <div className="hood-bio"><div className="hood-bio-lbl">✦ AI neighborhood guide — {selected.hood}</div>{hoodBio}</div>
            ) : null}
            <div className="divider"></div>
            {!contactSent ? (
              <>
                <div className="fgroup">
                  <label className="flabel">Message to broker</label>
                  <textarea className="farea" placeholder="Hi, I'm interested in this apartment. I'm looking to move next month..." value={contactMsg} onChange={e=>setContactMsg(e.target.value)} style={{minHeight:80}} />
                </div>
                <div className="btn-row" style={{marginBottom:10}}>
                  <button className="btn btn-ai" onClick={genCoverLetter} disabled={coverLoading}>
                    {coverLoading ? <><span className="spin"></span>Writing...</> : "📋 AI application helper"}
                  </button>
                </div>
                {coverLetter && (
                  <div className="cover-box">
                    <div className="cover-lbl">✦ AI-written cover letter</div>
                    {coverLetter}
                  </div>
                )}
                <button className="btn btn-p" style={{width:"100%",marginTop:12}} onClick={sendMessage}>Send message to broker</button>
              </>
            ) : (
              <div className="success">
                <strong>Message sent!</strong>
                <p>The broker will get back to you soon.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOP NAV */}
      <div className="topnav">
        <div className="topnav-logo" onClick={()=>setView("home")}>Broker<span>AI</span></div>
        <div className="topnav-links">
          <button className={`topnav-link${view==="home"?" active":""}`} onClick={()=>setView("home")}>Home</button>
          <button className={`topnav-link${view==="search"?" active":""}`} onClick={()=>setView("search")}>Search</button>
          {role==="broker" && <button className={`topnav-link${view==="broker"?" active":""}`} onClick={()=>setView("broker")}>Dashboard</button>}
        </div>
        <div className="topnav-actions">
          {role ? (
            <button className="topnav-btn ghost" onClick={()=>{setRole(null);setView("home");}}>Sign out</button>
          ) : (
            <>
              <button className="topnav-btn ghost" onClick={()=>{setRole("renter");setView("search");}}>Log in</button>
              <button className="topnav-btn solid" onClick={()=>{setRole("broker");setView("broker");}}>List your property</button>
            </>
          )}
          {role==="broker" && <button className="topnav-btn solid" onClick={()=>setView("new-listing")}>+ New listing</button>}
        </div>
      </div>

      {/* HOME PAGE */}
      {view==="home" && (
        <>
          <div className="hero">
            <div className="hero-eyebrow">✦ AI-powered real estate</div>
            <h1 className="hero-title">Find your home in<br/><span>New York City</span></h1>
            <p className="hero-sub">The smarter way to rent, buy, and list — with AI built into every step.</p>

            <div className="search-card">
              <div className="search-tabs">
                {["rent","buy","sell"].map(t=>(
                  <button key={t} className={`search-tab${homeTab===t?" active":""}`} onClick={()=>setHomeTab(t)}>
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
              <div className="search-body">
                <div className="search-row">
                  <div className="search-field" style={{flex:2}}>
                    <span className="search-label">Location</span>
                    <select className="search-select" value={searchLocation} onChange={e=>setSearchLocation(e.target.value)}>
                      <option value="">Choose neighborhoods or boroughs</option>
                      {["Williamsburg","Greenpoint","Crown Heights","Hell's Kitchen","Fort Greene","Astoria","Park Slope","Bushwick"].map(n=><option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="search-field">
                    <span className="search-label">Min Price</span>
                    <select className="search-select" value={searchMinPrice} onChange={e=>setSearchMinPrice(e.target.value)}>
                      <option value="">Min</option>
                      {["1500","2000","2500","3000","3500","4000"].map(p=><option key={p} value={p}>${parseInt(p).toLocaleString()}</option>)}
                    </select>
                  </div>
                  <div className="search-field">
                    <span className="search-label">Max Price</span>
                    <select className="search-select" value={searchMaxPrice} onChange={e=>setSearchMaxPrice(e.target.value)}>
                      <option value="">Max</option>
                      {["2000","2500","3000","3500","4000","5000","6000"].map(p=><option key={p} value={p}>${parseInt(p).toLocaleString()}</option>)}
                    </select>
                  </div>
                  <button className="search-btn" onClick={handleHomeSearch}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    Search
                  </button>
                </div>
                <div className="search-hint">Find the right home faster: <a onClick={()=>{setRole("renter");setView("search");}}>sign up</a> or <a onClick={()=>{setRole("renter");setView("search");}}>log in</a></div>
              </div>
            </div>
          </div>

          <div className="feat-bar">
            <div className="feat-bar-inner">
              {[
                {i:"✦",t:"AI listing writer",d:"Descriptions written in seconds"},
                {i:"🖼",t:"AI photo finder",d:"Find photos automatically"},
                {i:"◎",t:"Natural language search",d:"Search the way you talk"},
                {i:"🗺",t:"Neighborhood guide",d:"AI insights for every area"},
                {i:"📋",t:"Application helper",d:"AI cover letters for renters"},
                {i:"⬡",t:"Smart pricing",d:"Market-based rent suggestions"},
              ].map(f=>(
                <div className="feat-item" key={f.t}>
                  <div className="feat-item-ico">{f.i}</div>
                  <div className="feat-item-t">{f.t}</div>
                  <div className="feat-item-d">{f.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="listings-preview">
            <div class="lp-inner">
              <div className="lp-header">
                <div className="lp-title">Featured listings</div>
                <button className="lp-see-all" onClick={()=>setView("search")}>See all →</button>
              </div>
              <div className="lgrid">
                {listings.filter(l=>l.status==="active").slice(0,4).map(l=>(
                  <div className="lcard" key={l.id} onClick={()=>openListing(l)}>
                    <img className="lcard-img" src={l.photo} alt={l.addr} onError={e=>e.target.src=HOOD_PHOTOS["Williamsburg"]} />
                    <div className="lcard-body">
                      <div className="lcard-price">${l.rent.toLocaleString()}/mo</div>
                      <div className="lcard-addr">{l.addr}, {l.hood}</div>
                      <div className="tags">
                        <span className="tag">{l.beds} BR</span>
                        <span className="tag">{l.hood}</span>
                      </div>
                      <div className="lcard-desc">{l.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* SEARCH PAGE */}
      <div className={`pg${view==="search"?" show":""}`}>
        <div className="ph"><h2>Find your apartment</h2><p>Search with filters or describe what you want in plain English</p></div>
        <div className="aibox">
          <div className="ailabel">✦ AI search — describe what you want</div>
          <div className="arow">
            <input className="ainp" placeholder='Try: "sunny 2BR in Williamsburg under $3,500 near L train no fee"' value={nlQuery} onChange={e=>{setNlQuery(e.target.value);setNlResults(null);}} onKeyDown={e=>e.key==="Enter"&&doNLSearch()} />
            <button className="btn btn-ai" onClick={doNLSearch}>Search</button>
          </div>
          {nlResults && nlResults.length===0 && <p style={{fontSize:12,color:"#888",marginTop:10}}>No matches found. Try different words.</p>}
          {nlResults && nlResults.length>0 && <p style={{fontSize:12,color:"#1a3a2a",marginTop:10}}>✦ {nlResults.length} AI match{nlResults.length!==1?"es":""} for "{nlQuery}"</p>}
        </div>
        <div className="filters">
          <div className="fg">
            <span className="fl">Neighborhood</span>
            <select value={fHood} onChange={e=>setFHood(e.target.value)}>
              <option>All</option>
              {["Williamsburg","Greenpoint","Crown Heights","Hell's Kitchen","Fort Greene","Astoria","Park Slope","Bushwick"].map(n=><option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="fg">
            <span className="fl">Bedrooms</span>
            <select value={fBeds} onChange={e=>setFBeds(e.target.value)}>
              <option>Any</option><option>1</option><option>2</option><option>3</option>
            </select>
          </div>
          <div className="fg">
            <span className="fl">Max rent: ${fRent.toLocaleString()}</span>
            <input type="range" min="1500" max="6000" step="100" value={fRent} onChange={e=>setFRent(parseInt(e.target.value))} style={{width:140}} />
          </div>
          <button className="btn btn-s" style={{fontSize:12,padding:"7px 12px"}} onClick={()=>{setFHood("All");setFBeds("Any");setFRent(5000);setNlResults(null);}}>Clear</button>
        </div>
        <div className="cnt">{(nlResults||filtered).length} listing{(nlResults||filtered).length!==1?"s":""} found</div>
        <div className="lgrid">
          {(nlResults||filtered).length===0
            ? <div className="empty" style={{gridColumn:"1/-1"}}>No listings match. Try adjusting your filters.</div>
            : (nlResults||filtered).map(l=>(
              <div className="lcard" key={l.id} onClick={()=>openListing(l)}>
                <img className="lcard-img" src={l.photo} alt={l.addr} onError={e=>e.target.src=HOOD_PHOTOS["Williamsburg"]} />
                <div className="lcard-body">
                  <div className="lcard-price">${l.rent.toLocaleString()}/mo</div>
                  <div className="lcard-addr">{l.addr}, {l.hood}</div>
                  <div className="tags">
                    <span className="tag">{l.beds} BR</span>
                    <span className="tag">{l.hood}</span>
                    <span className="tag">by {l.broker}</span>
                  </div>
                  <div className="lcard-desc">{l.desc}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* BROKER DASHBOARD */}
      <div className={`pg${view==="broker"?" show":""}`}>
        <div className="ph"><h2>Broker dashboard</h2><p>Welcome back, Marco.</p></div>
        <div className="stats">
          <div className="stat"><div className="stat-n">{myListings.length}</div><div className="stat-l">Total listings</div></div>
          <div className="stat"><div className="stat-n">{myListings.filter(l=>l.status==="active").length}</div><div className="stat-l">Active</div></div>
          <div className="stat"><div className="stat-n">{myLeads.length}</div><div className="stat-l">Inquiries</div></div>
          <div className="stat"><div className="stat-n">{myListings.reduce((a,l)=>a+(l.leads||[]).length,0)}</div><div className="stat-l">Messages</div></div>
        </div>
        <div className="two">
          <div className="card">
            <div className="card-t">My listings</div>
            {myListings.length===0
              ? <div className="empty">No listings yet.</div>
              : myListings.map(l=>(
                <div className="lrow" key={l.id}>
                  <img className="lthumb" src={l.photo} alt="" onError={e=>e.target.src=HOOD_PHOTOS["Williamsburg"]} />
                  <div className="linfo">
                    <div className="laddr">{l.addr}</div>
                    <div className="lmeta">{l.hood} · ${l.rent.toLocaleString()}/mo · {l.beds} BR</div>
                  </div>
                  <span className={l.status==="active"?"badge-a":"badge-r"}>{l.status}</span>
                </div>
              ))
            }
            <button className="btn btn-p" style={{width:"100%",marginTop:14,fontSize:12}} onClick={()=>setView("new-listing")}>+ Add new listing</button>
          </div>
          <div className="card">
            <div className="card-t">Renter inquiries</div>
            {myLeads.length===0
              ? <div className="empty">No inquiries yet. They'll appear here when renters message you.</div>
              : myLeads.map((ld,i)=>(
                <div className="lead-row" key={i}>
                  <div className="lead-ico">✉</div>
                  <div>
                    <div className="lead-addr">{ld.listing.addr}</div>
                    <div className="lead-msg">"{ld.message}"</div>
                    <div className="lead-time">{ld.time}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* NEW LISTING */}
      <div className={`pg${view==="new-listing"?" show":""}`}>
        <div className="ph"><h2>New listing</h2><p>Let AI do the hard work for you</p></div>
        <div style={{maxWidth:540}}>
          <div className="fgroup">
            <label className="flabel">Street address</label>
            <input className="finput" placeholder="e.g. 47 Bedford Ave" value={newL.addr} onChange={e=>setNewL(p=>({...p,addr:e.target.value}))} />
          </div>
          <div className="two-inp">
            <div className="fgroup">
              <label className="flabel">Neighborhood</label>
              <select className="fsel" value={newL.hood} onChange={e=>setNewL(p=>({...p,hood:e.target.value,photo:""}))}>
                {["Williamsburg","Greenpoint","Crown Heights","Hell's Kitchen","Fort Greene","Astoria","Park Slope","Bushwick"].map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="fgroup">
              <label className="flabel">Bedrooms</label>
              <select className="fsel" value={newL.beds} onChange={e=>setNewL(p=>({...p,beds:e.target.value}))}>
                <option value="">Select</option>
                <option>1</option><option>2</option><option>3</option><option>4</option>
              </select>
            </div>
          </div>
          <div className="fgroup">
            <label className="flabel">Monthly rent ($)</label>
            <input className="finput" type="number" placeholder="e.g. 3200" value={newL.rent} onChange={e=>setNewL(p=>({...p,rent:e.target.value}))} />
            <div className="btn-row">
              <button className="btn btn-ai" onClick={suggestPrice}>⬡ AI price suggestion</button>
            </div>
            {priceHint && <div className="price-hint">✦ AI suggests: {priceHint}</div>}
          </div>
          <div className="fgroup">
            <label className="flabel">Apartment photos</label>
            {newL.photo && <img className="photo-preview" src={newL.photo} alt="preview" />}
            <div className="btn-row" style={{marginTop:8}}>
              <button className="btn btn-ai" onClick={findPhotos}>🖼 Find photos with AI</button>
            </div>
          </div>
          <div className="fgroup">
            <label className="flabel">Description</label>
            <textarea className="farea" placeholder="Describe the apartment, or let AI write it for you..." value={newL.desc} onChange={e=>setNewL(p=>({...p,desc:e.target.value}))} />
            <div className="btn-row">
              <button className="btn btn-ai" onClick={genDesc}>✦ Write description with AI</button>
            </div>
          </div>
          <div className="btn-row" style={{marginTop:16}}>
            <button className="btn btn-s" onClick={()=>setView("broker")}>Cancel</button>
            <button className="btn btn-p" onClick={publishListing}>Publish listing</button>
          </div>
        </div>
      </div>
    </>
  );
}
