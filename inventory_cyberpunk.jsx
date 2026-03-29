import { useState, useEffect, useRef, useCallback } from "react";

// ── Seed Data ──────────────────────────────────────────────────────────────────
const SEED_PRODUCTS = [
  { id:"P001", name:"Neural Processor X9",   category:"Hardware",    price:4299, stock:12,  minStock:5,  supplier:"CyberCore Inc",    sku:"NCX9-2077" },
  { id:"P002", name:"Holo-Display Panel 4K", category:"Displays",    price:1899, stock:3,   minStock:5,  supplier:"NeonVision Ltd",   sku:"HDP4K-001" },
  { id:"P003", name:"Quantum RAM 64GB",      category:"Hardware",    price:799,  stock:28,  minStock:10, supplier:"MemTech Corp",     sku:"QR64-V2"   },
  { id:"P004", name:"Stealth Network Card",  category:"Networking",  price:349,  stock:0,   minStock:3,  supplier:"DarkNet Systems",  sku:"SNC-X1"    },
  { id:"P005", name:"Bio-Sync Keyboard",     category:"Peripherals", price:599,  stock:17,  minStock:5,  supplier:"InputLab",         sku:"BSK-MK3"   },
  { id:"P006", name:"Plasma Cooling Unit",   category:"Hardware",    price:1249, stock:2,   minStock:4,  supplier:"CryoTech",         sku:"PCU-900"   },
  { id:"P007", name:"AR Optics Module",      category:"Augments",    price:3499, stock:6,   minStock:3,  supplier:"RetinalTech",      sku:"AOM-V5"    },
  { id:"P008", name:"Echo Sound Array",      category:"Peripherals", price:449,  stock:21,  minStock:8,  supplier:"SoundMatrix",      sku:"ESA-DX"    },
  { id:"P009", name:"Ghost VPN Chip",        category:"Security",    price:899,  stock:9,   minStock:5,  supplier:"ShadowNet",        sku:"GVC-11"    },
  { id:"P010", name:"Nano SSD 2TB",          category:"Storage",     price:1099, stock:14,  minStock:6,  supplier:"DataFlux",         sku:"NSSD-2T"   },
];

const SEED_ORDERS = [
  { id:"ORD-7741", customer:"Arasaka Corp",    items:[{pid:"P001",qty:2},{pid:"P003",qty:5}], status:"SHIPPED",   date:"2077-03-21", total:11995 },
  { id:"ORD-7742", customer:"MiliTech",        items:[{pid:"P009",qty:3},{pid:"P005",qty:2}], status:"PENDING",   date:"2077-03-24", total:3895  },
  { id:"ORD-7743", customer:"Kang Tao",        items:[{pid:"P007",qty:1}],                   status:"PROCESSING",date:"2077-03-25", total:3499  },
  { id:"ORD-7744", customer:"Biotechnica",     items:[{pid:"P002",qty:2},{pid:"P006",qty:1}], status:"DELIVERED", date:"2077-03-19", total:5047  },
  { id:"ORD-7745", customer:"Night Corp",      items:[{pid:"P004",qty:4},{pid:"P008",qty:2}], status:"CANCELLED", date:"2077-03-22", total:2294  },
  { id:"ORD-7746", customer:"Trauma Team",     items:[{pid:"P010",qty:3}],                   status:"PENDING",   date:"2077-03-26", total:3297  },
];

const CATEGORIES = ["All","Hardware","Displays","Networking","Peripherals","Augments","Security","Storage"];
const STATUS_COLORS = { PENDING:"#FFD600", PROCESSING:"#00F5FF", SHIPPED:"#39FF14", DELIVERED:"#7B61FF", CANCELLED:"#FF003C" };

const neon = (color, strength=1) => `0 0 ${8*strength}px ${color}, 0 0 ${20*strength}px ${color}40`;

// ── Main App ───────────────────────────────────────────────────────────────────
export default function CyberInventory() {
  const [products, setProducts]   = useState(SEED_PRODUCTS);
  const [orders, setOrders]       = useState(SEED_ORDERS);
  const [view, setView]           = useState("dashboard"); // dashboard|inventory|orders|new-order|ai
  const [catFilter, setCatFilter] = useState("All");
  const [search, setSearch]       = useState("");
  const [selectedP, setSelectedP] = useState(null);  // product detail/edit
  const [editMode, setEditMode]   = useState(false);
  const [editData, setEditData]   = useState({});
  const [newOrder, setNewOrder]   = useState({ customer:"", items:[], status:"PENDING" });
  const [addItem, setAddItem]     = useState({ pid:"", qty:1 });
  const [aiMsgs, setAiMsgs]       = useState([{role:"assistant",text:"NEXUS-AI ONLINE. I can analyze inventory levels, suggest reorders, forecast demand, or help create orders. What do you need, operator?"}]);
  const [aiInput, setAiInput]     = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast]         = useState(null);
  const [tick, setTick]           = useState(0);
  const aiEndRef = useRef(null);

  useEffect(()=>{ const t=setInterval(()=>setTick(x=>x+1),1000); return()=>clearInterval(t); },[]);
  useEffect(()=>{ if(aiEndRef.current) aiEndRef.current.scrollIntoView({behavior:"smooth"}); },[aiMsgs]);

  const showToast = (msg, type="ok") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),2800);
  };

  const lowStock   = products.filter(p=>p.stock<=p.minStock);
  const outOfStock = products.filter(p=>p.stock===0);
  const totalValue = products.reduce((s,p)=>s+p.price*p.stock,0);
  const pendingOrders = orders.filter(o=>o.status==="PENDING").length;

  const filteredProducts = products.filter(p=>{
    const matchCat = catFilter==="All" || p.category===catFilter;
    const matchS   = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchS;
  });

  const saveEdit = () => {
    setProducts(ps=>ps.map(p=>p.id===editData.id?{...editData,price:Number(editData.price),stock:Number(editData.stock),minStock:Number(editData.minStock)}:p));
    setSelectedP({...editData,price:Number(editData.price),stock:Number(editData.stock),minStock:Number(editData.minStock)});
    setEditMode(false);
    showToast("PRODUCT UPDATED");
  };

  const deleteProduct = (id) => {
    setProducts(ps=>ps.filter(p=>p.id!==id));
    setSelectedP(null);
    showToast("PRODUCT DELETED","warn");
  };

  const submitOrder = () => {
    if(!newOrder.customer||!newOrder.items.length){ showToast("INCOMPLETE ORDER","err"); return; }
    const total = newOrder.items.reduce((s,it)=>{ const p=products.find(x=>x.id===it.pid); return s+(p?p.price*it.qty:0); },0);
    const id = "ORD-"+(7747+orders.length);
    const date = new Date().toISOString().slice(0,10);
    setOrders(os=>[...os,{...newOrder,id,total,date}]);
    // deduct stock
    setProducts(ps=>ps.map(p=>{
      const it=newOrder.items.find(x=>x.pid===p.id);
      return it?{...p,stock:Math.max(0,p.stock-it.qty)}:p;
    }));
    setNewOrder({customer:"",items:[],status:"PENDING"});
    setView("orders");
    showToast(`ORDER ${id} CREATED`);
  };

  const sendAI = async () => {
    if(!aiInput.trim()||aiLoading) return;
    const msg = aiInput.trim(); setAiInput(""); setAiLoading(true);
    setAiMsgs(m=>[...m,{role:"user",text:msg}]);
    const inv = products.map(p=>`${p.name}(stock:${p.stock},min:${p.minStock},price:₹${p.price})`).join("; ");
    const ords = orders.map(o=>`${o.id}:${o.customer}[${o.status}]₹${o.total}`).join("; ");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:800,
          system:`You are NEXUS-AI, a terse cyberpunk inventory intelligence system. Inventory: ${inv}. Orders: ${ords}. Answer sharply in 2-4 sentences max. Use cyberpunk lingo sparingly. Flag critical stock issues first.`,
          messages:[...aiMsgs.slice(1).map(m=>({role:m.role,content:m.text})),{role:"user",content:msg}]
        })
      });
      const data=await res.json();
      const text=data.content?.map(c=>c.text||"").join("")||"SIGNAL LOST.";
      setAiMsgs(m=>[...m,{role:"assistant",text}]);
    } catch { setAiMsgs(m=>[...m,{role:"assistant",text:"NEXUS-AI SIGNAL LOST. RETRY."}]); }
    setAiLoading(false);
  };

  const stockBar = (stock,min,max=30) => {
    const pct = Math.min(100,(stock/max)*100);
    const color = stock===0?"#FF003C":stock<=min?"#FFD600":"#39FF14";
    return { pct, color };
  };

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;

  return (
    <div style={{
      fontFamily:"'Share Tech Mono','Courier New',monospace",
      background:"#060A12",
      color:"#A0B4C8",
      minHeight:"100vh",
      display:"flex",
      flexDirection:"column",
      fontSize:"12px",
      position:"relative",
      overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#060A12;}
        ::-webkit-scrollbar-thumb{background:#00F5FF44;border-radius:2px;}
        ::-webkit-scrollbar-thumb:hover{background:#00F5FF;}
        .cy-btn{cursor:pointer;border:1px solid #00F5FF44;background:transparent;color:#00F5FF;font-family:'Share Tech Mono',monospace;font-size:11px;padding:7px 14px;letter-spacing:0.08em;text-transform:uppercase;transition:all 0.15s;clip-path:polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px);}
        .cy-btn:hover{background:#00F5FF18;border-color:#00F5FF;box-shadow:${neon("#00F5FF",0.5)};color:#fff;}
        .cy-btn.active{background:#00F5FF22;border-color:#00F5FF;box-shadow:${neon("#00F5FF",0.6)};color:#00F5FF;}
        .cy-btn.mag{border-color:#FF006E44;color:#FF006E;}
        .cy-btn.mag:hover{background:#FF006E18;border-color:#FF006E;box-shadow:${neon("#FF006E",0.5)};}
        .cy-btn.grn{border-color:#39FF1444;color:#39FF14;}
        .cy-btn.grn:hover{background:#39FF1418;border-color:#39FF14;box-shadow:${neon("#39FF14",0.5)};}
        .cy-btn.red{border-color:#FF003C44;color:#FF003C;}
        .cy-btn.red:hover{background:#FF003C18;border-color:#FF003C;box-shadow:${neon("#FF003C",0.5)};}
        .nav-btn{cursor:pointer;background:none;border:none;color:#4A6070;font-family:'Share Tech Mono',monospace;font-size:11px;padding:10px 16px;letter-spacing:0.1em;text-transform:uppercase;transition:all 0.15s;border-bottom:2px solid transparent;display:flex;align-items:center;gap:7px;}
        .nav-btn:hover{color:#00F5FF;border-bottom-color:#00F5FF44;}
        .nav-btn.on{color:#00F5FF;border-bottom-color:#00F5FF;text-shadow:${neon("#00F5FF",0.4)};}
        .card{background:#090E1A;border:1px solid #1A2535;clip-path:polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px);transition:border-color 0.2s;}
        .card:hover{border-color:#00F5FF44;}
        .prod-row{border-bottom:1px solid #111A28;padding:8px 12px;cursor:pointer;transition:background 0.1s;display:grid;align-items:center;}
        .prod-row:hover{background:#0C1220;}
        .prod-row.sel{background:#0A1528;border-left:2px solid #00F5FF;}
        input,textarea,select{background:#070C16;border:1px solid #1A2535;color:#A0B4C8;font-family:'Share Tech Mono',monospace;font-size:11px;padding:8px 10px;outline:none;transition:border-color 0.15s;width:100%;}
        input:focus,textarea:focus,select:focus{border-color:#00F5FF;box-shadow:0 0 8px #00F5FF22;}
        select option{background:#070C16;}
        .scanlines{pointer-events:none;position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,#00000018 2px,#00000018 4px);z-index:100;}
        .grid-bg{position:fixed;inset:0;background-image:linear-gradient(#0A2A3A0A 1px,transparent 1px),linear-gradient(90deg,#0A2A3A0A 1px,transparent 1px);background-size:40px 40px;z-index:0;}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
        @keyframes scanline{0%{transform:translateY(-100%);}100%{transform:translateY(100vh);}}
        @keyframes flicker{0%,19%,21%,23%,25%,54%,56%,100%{opacity:1;}20%,24%,55%{opacity:0.6;}}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        .slide-up{animation:slideUp 0.25s ease;}
        .pulse{animation:pulse 2s infinite;}
        .flicker{animation:flicker 3s infinite;}
        .corner-tl{position:absolute;top:0;left:0;width:12px;height:12px;border-top:2px solid #00F5FF;border-left:2px solid #00F5FF;}
        .corner-br{position:absolute;bottom:0;right:0;width:12px;height:12px;border-bottom:2px solid #00F5FF;border-right:2px solid #00F5FF;}
        .neon-text-c{color:#00F5FF;text-shadow:${neon("#00F5FF",0.6)};}
        .neon-text-m{color:#FF006E;text-shadow:${neon("#FF006E",0.6)};}
        .neon-text-g{color:#39FF14;text-shadow:${neon("#39FF14",0.6)};}
        .neon-text-y{color:#FFD600;text-shadow:${neon("#FFD600",0.4)};}
        .toast{position:fixed;top:70px;right:20px;z-index:999;border:1px solid #00F5FF;background:#060A12EE;padding:10px 18px;clip-path:polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px);animation:slideUp 0.2s ease;}
      `}</style>

      {/* Grid BG + scanlines */}
      <div className="grid-bg"/>
      <div className="scanlines"/>

      {/* Moving scanline */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,transparent,#00F5FF22,transparent)",animation:"scanline 6s linear infinite",zIndex:101,pointerEvents:"none"}}/>

      {/* Toast */}
      {toast&&(
        <div className="toast" style={{borderColor:toast.type==="err"?"#FF003C":toast.type==="warn"?"#FFD600":"#39FF14"}}>
          <span className={toast.type==="err"?"neon-text-m":toast.type==="warn"?"neon-text-y":"neon-text-g"} style={{fontSize:"11px",letterSpacing:"0.1em"}}>
            {toast.type==="err"?"⚠ ":toast.type==="warn"?"⚡ ":"✓ "}{toast.msg}
          </span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        position:"relative",zIndex:10,
        borderBottom:"1px solid #1A2535",
        background:"#07090FEE",
        backdropFilter:"blur(8px)",
        flexShrink:0,
      }}>
        {/* Top strip */}
        <div style={{display:"flex",alignItems:"center",padding:"6px 20px",borderBottom:"1px solid #0F1A28",gap:"16px"}}>
          <span style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,fontSize:"18px",letterSpacing:"0.15em"}} className="neon-text-c flicker">
            NEXUS<span style={{color:"#FF006E",textShadow:neon("#FF006E",0.8)}}>_</span>OPS
          </span>
          <span style={{color:"#1A3040",fontSize:"10px"}}>//</span>
          <span style={{fontSize:"10px",color:"#2A4060",letterSpacing:"0.1em"}}>INVENTORY & ORDER MANAGEMENT SYSTEM v2.077</span>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"20px"}}>
            {/* live alerts */}
            {outOfStock.length>0&&(
              <span className="neon-text-m pulse" style={{fontSize:"10px",letterSpacing:"0.1em"}}>
                ⚠ {outOfStock.length} OUT OF STOCK
              </span>
            )}
            {lowStock.filter(p=>p.stock>0).length>0&&(
              <span className="neon-text-y pulse" style={{fontSize:"10px",letterSpacing:"0.1em"}}>
                ⚡ {lowStock.filter(p=>p.stock>0).length} LOW STOCK
              </span>
            )}
            <span style={{color:"#2A4060",fontSize:"10px",letterSpacing:"0.1em"}} className="neon-text-c">{timeStr}</span>
          </div>
        </div>
        {/* Nav */}
        <div style={{display:"flex",padding:"0 12px"}}>
          {[
            {id:"dashboard",label:"⬡ DASHBOARD"},
            {id:"inventory",label:"◈ INVENTORY"},
            {id:"orders",label:"◎ ORDERS"},
            {id:"new-order",label:"+ NEW ORDER"},
            {id:"ai",label:"◆ NEXUS-AI"},
          ].map(({id,label})=>(
            <button key={id} className={`nav-btn${view===id?" on":""}`} onClick={()=>setView(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{flex:1,overflow:"auto",position:"relative",zIndex:5,padding:"16px 20px"}}>

        {/* ═══ DASHBOARD ═══ */}
        {view==="dashboard"&&(
          <div className="slide-up">
            {/* Stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px"}}>
              {[
                {label:"TOTAL PRODUCTS",val:products.length,color:"#00F5FF",icon:"◈"},
                {label:"INVENTORY VALUE",val:`₹${(totalValue/1000).toFixed(1)}K`,color:"#7B61FF",icon:"◆"},
                {label:"PENDING ORDERS",val:pendingOrders,color:"#FFD600",icon:"◎"},
                {label:"CRITICAL ALERTS",val:lowStock.length,color:"#FF003C",icon:"⚠"},
              ].map(({label,val,color,icon})=>(
                <div key={label} className="card" style={{padding:"16px 18px",position:"relative"}}>
                  <div className="corner-tl" style={{borderColor:color}}/>
                  <div className="corner-br" style={{borderColor:color}}/>
                  <div style={{fontSize:"9px",color:"#4A6070",letterSpacing:"0.15em",marginBottom:"8px"}}>{label}</div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"28px",fontWeight:700,color,textShadow:neon(color,0.5),lineHeight:1}}>
                    {val}
                  </div>
                  <div style={{position:"absolute",top:"14px",right:"16px",fontSize:"18px",color:color+"44"}}>{icon}</div>
                </div>
              ))}
            </div>

            {/* Two column: alerts + orders */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px"}}>
              {/* Critical Stock */}
              <div className="card" style={{padding:"14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px",borderBottom:"1px solid #1A2535",paddingBottom:"10px"}}>
                  <span className="neon-text-m" style={{fontFamily:"'Orbitron',sans-serif",fontSize:"12px",letterSpacing:"0.1em"}}>STOCK ALERTS</span>
                  <span style={{marginLeft:"auto",background:"#FF003C22",border:"1px solid #FF003C44",color:"#FF003C",fontSize:"9px",padding:"2px 8px"}}>{lowStock.length}</span>
                </div>
                {lowStock.length===0?(
                  <div style={{color:"#2A4060",fontSize:"11px",padding:"12px 0",textAlign:"center"}}>ALL SYSTEMS NOMINAL</div>
                ):lowStock.map(p=>{
                  const {pct,color}=stockBar(p.stock,p.minStock);
                  return(
                    <div key={p.id} style={{marginBottom:"10px",cursor:"pointer"}} onClick={()=>{setSelectedP(p);setView("inventory");}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                        <span style={{fontSize:"11px",color:"#7A9AB4"}}>{p.name}</span>
                        <span style={{fontSize:"11px",color,fontWeight:700}}>{p.stock===0?"OUT":"LOW"} [{p.stock}/{p.minStock}]</span>
                      </div>
                      <div style={{height:"3px",background:"#1A2535",borderRadius:"1px"}}>
                        <div style={{width:`${pct}%`,height:"100%",background:color,boxShadow:`0 0 6px ${color}`,transition:"width 0.4s"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent orders */}
              <div className="card" style={{padding:"14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px",borderBottom:"1px solid #1A2535",paddingBottom:"10px"}}>
                  <span className="neon-text-c" style={{fontFamily:"'Orbitron',sans-serif",fontSize:"12px",letterSpacing:"0.1em"}}>RECENT ORDERS</span>
                  <button className="cy-btn" style={{marginLeft:"auto",fontSize:"9px",padding:"3px 8px"}} onClick={()=>setView("orders")}>VIEW ALL</button>
                </div>
                {orders.slice(-5).reverse().map(o=>(
                  <div key={o.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"6px 0",borderBottom:"1px solid #0F1820"}}>
                    <span style={{color:"#00F5FF",fontSize:"10px"}}>{o.id}</span>
                    <span style={{flex:1,color:"#5A7A90",fontSize:"10px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.customer}</span>
                    <span style={{fontSize:"9px",padding:"2px 7px",border:`1px solid ${STATUS_COLORS[o.status]}44`,color:STATUS_COLORS[o.status]}}>{o.status}</span>
                    <span style={{color:"#7B61FF",fontSize:"10px"}}>₹{o.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="card" style={{padding:"14px"}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"12px",letterSpacing:"0.1em",marginBottom:"14px",color:"#7B61FF",textShadow:neon("#7B61FF",0.4)}}>
                CATEGORY BREAKDOWN
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
                {CATEGORIES.filter(c=>c!=="All").map((cat,ci)=>{
                  const ps=products.filter(p=>p.category===cat);
                  const val=ps.reduce((s,p)=>s+p.price*p.stock,0);
                  const colors=["#00F5FF","#FF006E","#39FF14","#FFD600","#7B61FF","#FF6B00","#00FFD1"];
                  const c=colors[ci%colors.length];
                  return(
                    <div key={cat} style={{background:"#070C16",border:`1px solid ${c}22`,padding:"10px 12px",cursor:"pointer",transition:"border-color 0.15s"}}
                      onClick={()=>{setCatFilter(cat);setView("inventory");}}>
                      <div style={{fontSize:"9px",color:"#4A6070",marginBottom:"4px",letterSpacing:"0.1em"}}>{cat.toUpperCase()}</div>
                      <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"18px",fontWeight:700,color:c,textShadow:neon(c,0.3)}}>{ps.length}</div>
                      <div style={{fontSize:"9px",color:"#3A5060",marginTop:"2px"}}>₹{(val/1000).toFixed(1)}K value</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ INVENTORY ═══ */}
        {view==="inventory"&&(
          <div className="slide-up" style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:"14px",height:"calc(100vh - 140px)"}}>

            {/* Product list */}
            <div className="card" style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {/* Filters */}
              <div style={{padding:"12px",borderBottom:"1px solid #1A2535",display:"flex",gap:"8px",flexWrap:"wrap",flexShrink:0}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="SEARCH PRODUCTS / SKU..." style={{flex:1,minWidth:"160px"}}/>
                <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                  {CATEGORIES.map(c=>(
                    <button key={c} className={`cy-btn${catFilter===c?" active":""}`} style={{padding:"4px 8px",fontSize:"9px"}} onClick={()=>setCatFilter(c)}>{c.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              {/* Header */}
              <div className="prod-row" style={{
                gridTemplateColumns:"70px 1fr 90px 80px 110px 80px",
                borderBottom:"1px solid #1A2535",background:"#070C16",cursor:"default",
              }}>
                {["SKU","PRODUCT","CATEGORY","PRICE","STOCK","STATUS"].map(h=>(
                  <span key={h} style={{fontSize:"9px",color:"#2A4060",letterSpacing:"0.12em"}}>{h}</span>
                ))}
              </div>
              {/* Rows */}
              <div style={{flex:1,overflow:"auto"}}>
                {filteredProducts.map(p=>{
                  const {pct,color}=stockBar(p.stock,p.minStock);
                  return(
                    <div key={p.id} className={`prod-row${selectedP?.id===p.id?" sel":""}`}
                      style={{gridTemplateColumns:"70px 1fr 90px 80px 110px 80px"}}
                      onClick={()=>{setSelectedP(p);setEditMode(false);}}>
                      <span style={{color:"#2A5060",fontSize:"10px"}}>{p.sku}</span>
                      <span style={{color:"#8AABB8",fontSize:"11px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                      <span style={{color:"#3A5570",fontSize:"10px"}}>{p.category}</span>
                      <span style={{color:"#7B61FF",fontSize:"11px",fontWeight:700}}>₹{p.price.toLocaleString()}</span>
                      <div>
                        <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"3px"}}>
                          <span style={{color,fontSize:"11px",fontWeight:700}}>{p.stock}</span>
                          <span style={{color:"#2A4060",fontSize:"9px"}}>/{p.minStock} min</span>
                        </div>
                        <div style={{height:"2px",background:"#1A2535"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:color,transition:"width 0.3s"}}/>
                        </div>
                      </div>
                      <span style={{
                        fontSize:"9px",padding:"2px 6px",
                        background:p.stock===0?"#FF003C18":p.stock<=p.minStock?"#FFD60018":"#39FF1418",
                        border:`1px solid ${p.stock===0?"#FF003C44":p.stock<=p.minStock?"#FFD60044":"#39FF1444"}`,
                        color:p.stock===0?"#FF003C":p.stock<=p.minStock?"#FFD600":"#39FF14",
                      }}>
                        {p.stock===0?"OUT":p.stock<=p.minStock?"LOW":"OK"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product Detail / Edit Panel */}
            <div className="card" style={{display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
              {!selectedP?(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:"10px",color:"#2A4060"}}>
                  <span style={{fontSize:"32px"}}>◈</span>
                  <span style={{fontSize:"11px",letterSpacing:"0.1em"}}>SELECT A PRODUCT</span>
                </div>
              ):(
                <>
                  <div style={{padding:"14px",borderBottom:"1px solid #1A2535",flexShrink:0}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"13px",color:"#00F5FF",textShadow:neon("#00F5FF",0.4),marginBottom:"4px"}}>{selectedP.name}</div>
                    <div style={{fontSize:"10px",color:"#3A5570"}}>{selectedP.sku} · {selectedP.category}</div>
                    <div style={{display:"flex",gap:"6px",marginTop:"10px"}}>
                      <button className="cy-btn" style={{flex:1,fontSize:"9px"}} onClick={()=>{setEditMode(!editMode);setEditData({...selectedP});}}>
                        {editMode?"CANCEL":"EDIT"}
                      </button>
                      {editMode&&<button className="cy-btn grn" style={{flex:1,fontSize:"9px"}} onClick={saveEdit}>SAVE</button>}
                      <button className="cy-btn red" style={{fontSize:"9px",padding:"6px 10px"}} onClick={()=>deleteProduct(selectedP.id)}>DEL</button>
                    </div>
                  </div>
                  <div style={{flex:1,overflow:"auto",padding:"14px"}}>
                    {editMode?(
                      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                        {[
                          {key:"name",label:"PRODUCT NAME"},
                          {key:"sku",label:"SKU"},
                          {key:"category",label:"CATEGORY"},
                          {key:"price",label:"PRICE (₹)"},
                          {key:"stock",label:"CURRENT STOCK"},
                          {key:"minStock",label:"MIN STOCK"},
                          {key:"supplier",label:"SUPPLIER"},
                        ].map(({key,label})=>(
                          <div key={key}>
                            <div style={{fontSize:"9px",color:"#2A4060",letterSpacing:"0.1em",marginBottom:"3px"}}>{label}</div>
                            <input value={editData[key]||""} onChange={e=>setEditData({...editData,[key]:e.target.value})}/>
                          </div>
                        ))}
                      </div>
                    ):(
                      <div>
                        {/* Stock visual */}
                        <div style={{marginBottom:"16px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                            <span style={{fontSize:"9px",color:"#2A4060",letterSpacing:"0.1em"}}>STOCK LEVEL</span>
                            <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"20px",color:stockBar(selectedP.stock,selectedP.minStock).color,textShadow:neon(stockBar(selectedP.stock,selectedP.minStock).color,0.6)}}>
                              {selectedP.stock}
                            </span>
                          </div>
                          <div style={{height:"6px",background:"#1A2535",borderRadius:"2px",overflow:"hidden"}}>
                            <div style={{
                              width:`${stockBar(selectedP.stock,selectedP.minStock).pct}%`,height:"100%",
                              background:stockBar(selectedP.stock,selectedP.minStock).color,
                              boxShadow:`0 0 8px ${stockBar(selectedP.stock,selectedP.minStock).color}`,
                              transition:"width 0.4s",
                            }}/>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px",fontSize:"9px",color:"#2A4060"}}>
                            <span>0</span><span>MIN: {selectedP.minStock}</span>
                          </div>
                        </div>
                        {/* Details */}
                        {[
                          {label:"PRICE",val:`₹${selectedP.price.toLocaleString()}`,c:"#7B61FF"},
                          {label:"SUPPLIER",val:selectedP.supplier,c:"#A0B4C8"},
                          {label:"CATEGORY",val:selectedP.category,c:"#00F5FF"},
                          {label:"TOTAL VALUE",val:`₹${(selectedP.price*selectedP.stock).toLocaleString()}`,c:"#39FF14"},
                        ].map(({label,val,c})=>(
                          <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #0F1820"}}>
                            <span style={{fontSize:"10px",color:"#2A4060",letterSpacing:"0.08em"}}>{label}</span>
                            <span style={{fontSize:"11px",color:c,fontWeight:700}}>{val}</span>
                          </div>
                        ))}
                        {/* Orders using this product */}
                        <div style={{marginTop:"14px"}}>
                          <div style={{fontSize:"9px",color:"#2A4060",letterSpacing:"0.1em",marginBottom:"8px"}}>RECENT ORDER ACTIVITY</div>
                          {orders.filter(o=>o.items.some(i=>i.pid===selectedP.id)).slice(0,3).map(o=>(
                            <div key={o.id} style={{display:"flex",gap:"8px",padding:"5px 0",borderBottom:"1px solid #0F1820",fontSize:"10px"}}>
                              <span style={{color:"#00F5FF"}}>{o.id}</span>
                              <span style={{color:"#3A5570",flex:1}}>{o.customer}</span>
                              <span style={{color:STATUS_COLORS[o.status],fontSize:"9px"}}>{o.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ ORDERS ═══ */}
        {view==="orders"&&(
          <div className="slide-up">
            {/* Status filter chips */}
            <div style={{display:"flex",gap:"8px",marginBottom:"12px",flexWrap:"wrap"}}>
              {["ALL",...Object.keys(STATUS_COLORS)].map(s=>(
                <button key={s} className="cy-btn" style={{
                  fontSize:"9px",padding:"4px 10px",
                  borderColor:s==="ALL"?"#00F5FF44":STATUS_COLORS[s]+"44",
                  color:s==="ALL"?"#00F5FF":STATUS_COLORS[s],
                }}>{s}</button>
              ))}
              <button className="cy-btn grn" style={{marginLeft:"auto",fontSize:"10px"}} onClick={()=>setView("new-order")}>+ NEW ORDER</button>
            </div>
            {/* Order table */}
            <div className="card" style={{overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"110px 1fr 80px 100px 1fr 90px",padding:"8px 14px",borderBottom:"1px solid #1A2535",background:"#070C16"}}>
                {["ORDER ID","CUSTOMER","ITEMS","TOTAL","DATE","STATUS"].map(h=>(
                  <span key={h} style={{fontSize:"9px",color:"#2A4060",letterSpacing:"0.12em"}}>{h}</span>
                ))}
              </div>
              {orders.map((o,i)=>(
                <div key={o.id} style={{
                  display:"grid",gridTemplateColumns:"110px 1fr 80px 100px 1fr 90px",
                  padding:"10px 14px",borderBottom:"1px solid #0F1820",
                  background:i%2===0?"#060A12":"#07090F",
                  transition:"background 0.1s",cursor:"default",
                }}
                onMouseEnter={e=>e.currentTarget.style.background="#0A1020"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#060A12":"#07090F"}>
                  <span style={{color:"#00F5FF",fontSize:"11px"}}>{o.id}</span>
                  <span style={{color:"#8AABB8",fontSize:"11px"}}>{o.customer}</span>
                  <span style={{color:"#5A7A90",fontSize:"11px"}}>{o.items.length} item{o.items.length!==1?"s":""}</span>
                  <span style={{color:"#7B61FF",fontWeight:700,fontSize:"11px"}}>₹{o.total.toLocaleString()}</span>
                  <span style={{color:"#3A5570",fontSize:"10px"}}>{o.date}</span>
                  <div>
                    <select value={o.status} onChange={e=>{
                      setOrders(os=>os.map(x=>x.id===o.id?{...x,status:e.target.value}:x));
                      showToast(`${o.id} → ${e.target.value}`);
                    }} style={{
                      background:`${STATUS_COLORS[o.status]}18`,
                      border:`1px solid ${STATUS_COLORS[o.status]}44`,
                      color:STATUS_COLORS[o.status],
                      fontSize:"9px",padding:"3px 6px",width:"auto",
                    }}>
                      {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ NEW ORDER ═══ */}
        {view==="new-order"&&(
          <div className="slide-up" style={{maxWidth:"640px"}}>
            <div className="card" style={{padding:"20px"}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"14px",color:"#00F5FF",textShadow:neon("#00F5FF",0.5),marginBottom:"20px",letterSpacing:"0.1em"}}>
                CREATE NEW ORDER
              </div>
              <div style={{marginBottom:"14px"}}>
                <div style={{fontSize:"9px",color:"#2A4060",letterSpacing:"0.1em",marginBottom:"4px"}}>CUSTOMER / CORP</div>
                <input value={newOrder.customer} onChange={e=>setNewOrder({...newOrder,customer:e.target.value})} placeholder="CUSTOMER NAME"/>
              </div>
              <div style={{marginBottom:"14px"}}>
                <div style={{fontSize:"9px",color:"#2A4060",letterSpacing:"0.1em",marginBottom:"4px"}}>STATUS</div>
                <select value={newOrder.status} onChange={e=>setNewOrder({...newOrder,status:e.target.value})} style={{width:"auto"}}>
                  {Object.keys(STATUS_COLORS).map(s=><option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Add items */}
              <div style={{borderTop:"1px solid #1A2535",paddingTop:"14px",marginBottom:"14px"}}>
                <div style={{fontSize:"9px",color:"#2A4060",letterSpacing:"0.1em",marginBottom:"8px"}}>ADD ITEMS</div>
                <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
                  <select value={addItem.pid} onChange={e=>setAddItem({...addItem,pid:e.target.value})} style={{flex:1}}>
                    <option value="">SELECT PRODUCT</option>
                    {products.filter(p=>p.stock>0).map(p=>(
                      <option key={p.id} value={p.id}>{p.name} [Stock: {p.stock}]</option>
                    ))}
                  </select>
                  <input type="number" value={addItem.qty} onChange={e=>setAddItem({...addItem,qty:Number(e.target.value)})} min="1" style={{width:"70px"}}/>
                  <button className="cy-btn grn" onClick={()=>{
                    if(!addItem.pid) return;
                    const prod=products.find(p=>p.id===addItem.pid);
                    if(addItem.qty>prod.stock){showToast("INSUFFICIENT STOCK","err");return;}
                    setNewOrder(o=>({...o,items:[...o.items.filter(i=>i.pid!==addItem.pid),{pid:addItem.pid,qty:addItem.qty}]}));
                    setAddItem({pid:"",qty:1});
                  }}>ADD</button>
                </div>

                {/* Item list */}
                {newOrder.items.length===0?(
                  <div style={{color:"#2A4060",fontSize:"11px",padding:"10px",textAlign:"center",border:"1px dashed #1A2535"}}>NO ITEMS ADDED</div>
                ):(
                  <div style={{border:"1px solid #1A2535"}}>
                    {newOrder.items.map(it=>{
                      const p=products.find(x=>x.id===it.pid);
                      return p&&(
                        <div key={it.pid} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",borderBottom:"1px solid #0F1820"}}>
                          <span style={{flex:1,color:"#8AABB8",fontSize:"11px"}}>{p.name}</span>
                          <span style={{color:"#5A7A90",fontSize:"10px"}}>×{it.qty}</span>
                          <span style={{color:"#7B61FF",fontSize:"11px"}}>₹{(p.price*it.qty).toLocaleString()}</span>
                          <button className="cy-btn red" style={{fontSize:"9px",padding:"2px 7px"}} onClick={()=>setNewOrder(o=>({...o,items:o.items.filter(i=>i.pid!==it.pid)}))}>✕</button>
                        </div>
                      );
                    })}
                    <div style={{padding:"8px 12px",background:"#070C16",display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:"10px",color:"#2A4060",letterSpacing:"0.1em"}}>ORDER TOTAL</span>
                      <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"16px",color:"#39FF14",textShadow:neon("#39FF14",0.5)}}>
                        ₹{newOrder.items.reduce((s,it)=>{const p=products.find(x=>x.id===it.pid);return s+(p?p.price*it.qty:0);},0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <button className="cy-btn grn" style={{width:"100%",padding:"12px",fontSize:"12px",letterSpacing:"0.12em"}} onClick={submitOrder}>
                ▶ SUBMIT ORDER
              </button>
            </div>
          </div>
        )}

        {/* ═══ AI ═══ */}
        {view==="ai"&&(
          <div className="slide-up" style={{display:"flex",flexDirection:"column",height:"calc(100vh - 140px)"}}>
            <div className="card" style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {/* Header */}
              <div style={{padding:"12px 16px",borderBottom:"1px solid #1A2535",flexShrink:0,display:"flex",alignItems:"center",gap:"10px"}}>
                <div className="pulse" style={{width:"8px",height:"8px",borderRadius:"50%",background:"#39FF14",boxShadow:neon("#39FF14",0.8)}}/>
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"13px",color:"#39FF14",textShadow:neon("#39FF14",0.5),letterSpacing:"0.12em"}}>NEXUS-AI INTELLIGENCE</span>
                <div style={{marginLeft:"auto",display:"flex",gap:"6px"}}>
                  {["ANALYZE STOCK","REORDER LIST","SALES FORECAST"].map(q=>(
                    <button key={q} className="cy-btn" style={{fontSize:"9px",padding:"3px 8px"}} onClick={()=>{setAiInput(q.toLowerCase());}}>{q}</button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div style={{flex:1,overflow:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
                {aiMsgs.map((m,i)=>(
                  <div key={i} style={{display:"flex",gap:"10px",flexDirection:m.role==="user"?"row-reverse":"row",alignItems:"flex-start"}}>
                    <div style={{
                      width:"28px",height:"28px",flexShrink:0,
                      border:`1px solid ${m.role==="user"?"#FF006E":"#39FF14"}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      color:m.role==="user"?"#FF006E":"#39FF14",
                      fontSize:"9px",fontWeight:700,letterSpacing:"0.05em",
                      background:m.role==="user"?"#FF006E11":"#39FF1411",
                      boxShadow:m.role==="user"?neon("#FF006E",0.3):neon("#39FF14",0.3),
                    }}>
                      {m.role==="user"?"OPR":"AI"}
                    </div>
                    <div style={{
                      maxWidth:"80%",
                      background:m.role==="user"?"#0F0616":"#060F10",
                      border:`1px solid ${m.role==="user"?"#FF006E22":"#39FF1422"}`,
                      padding:"10px 14px",
                      clipPath:"polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)",
                    }}>
                      <div style={{fontSize:"11px",lineHeight:1.8,color:m.role==="user"?"#CC88AA":"#88BBAA",whiteSpace:"pre-wrap"}}>{m.text}</div>
                    </div>
                  </div>
                ))}
                {aiLoading&&(
                  <div style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
                    <div style={{width:"28px",height:"28px",border:"1px solid #39FF14",background:"#39FF1411",display:"flex",alignItems:"center",justifyContent:"center",color:"#39FF14",fontSize:"9px"}}>AI</div>
                    <div style={{border:"1px solid #39FF1422",background:"#060F10",padding:"12px 16px"}}>
                      <div style={{display:"flex",gap:"4px"}}>
                        {[0,1,2].map(i=>(
                          <div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#39FF14",animation:`pulse 1s ${i*0.2}s infinite`,boxShadow:neon("#39FF14",0.5)}}/>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={aiEndRef}/>
              </div>

              {/* Input */}
              <div style={{padding:"12px 16px",borderTop:"1px solid #1A2535",display:"flex",gap:"8px",flexShrink:0,background:"#07090FEE"}}>
                <input
                  value={aiInput}
                  onChange={e=>setAiInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&sendAI()}
                  placeholder="QUERY NEXUS-AI... (what items need reordering? / analyze orders / ...)"
                  style={{flex:1}}
                />
                <button className="cy-btn grn" onClick={sendAI} disabled={aiLoading} style={{letterSpacing:"0.1em"}}>
                  SEND ▶
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
