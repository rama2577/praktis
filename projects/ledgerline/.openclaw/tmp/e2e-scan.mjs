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
const r1 = await req("/api/dashboard/brief");
const b1 = await r1.json();
console.log("brief deadlines:", b1.data?.deadlines?.length, "→", b1.data?.deadlines?.slice(0,2).map(d=>`${d.clientName}/${d.type}/${d.daysLeft}h`).join(", "));
const r2 = await req("/api/dashboard/scan",{method:"POST"});
const b2 = await r2.json();
console.log("scan:", r2.status, "needsAttention:", b2.data?.needsAttention);
console.log("headline:", b2.data?.headline);
