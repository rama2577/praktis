const BASE = "https://web-production-7a593.up.railway.app";
const jar = new Map();
const ch = () => [...jar.entries()].map(([k,v])=>`${k}=${v}`).join("; ");
async function req(p, init={}) {
  const r = await fetch(BASE+p, {...init, redirect:"manual", headers:{...(init.headers??{}), cookie:ch()}});
  for (const c of r.headers.getSetCookie()){const [pair]=c.split(";");const i=pair.indexOf("=");if(i>0)jar.set(pair.slice(0,i),pair.slice(i+1));}
  return r;
}
const csrf = (await (await req("/api/auth/csrf")).json()).csrfToken;
await req("/api/auth/callback/credentials",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({csrfToken:csrf,email:"admin@ledgerline.dev",password:"password123"}).toString()});
const d = await (await req("/api/dashboard")).json();
console.log("dashboard kpi:", JSON.stringify(d.data?.kpi));
const c = await (await req("/api/clients")).json();
const arr = c.data ?? c.clients ?? c;
console.log("clients:", (Array.isArray(arr)?arr.length:"?"), "→", Array.isArray(arr)?arr.map(x=>x.name).join(" | "):JSON.stringify(c).slice(0,200));
const nus = Array.isArray(arr)?arr.find(x=>x.name==="PT Nusantara Logistik"):null;
if (nus) {
  const lr = await req(`/api/clients/${nus.id}/ledger?period=2026-01`);
  const lb = await lr.json();
  console.log("Nusantara ledger 2026-01:", lr.status, JSON.stringify(lb).slice(0,200));
}
