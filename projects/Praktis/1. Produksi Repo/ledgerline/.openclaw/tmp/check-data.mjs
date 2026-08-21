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
const id = "cmsrgat91000emn47e5w97mb2"; // Maju Jaya
for (const ep of ["custom-reports","assets","recon","tax","subledgers","exceptions"]) {
  try {
    const r = await req(`/api/clients/${id}/${ep}`);
    const b = await r.json().catch(()=>({}));
    const d = b.data ?? b;
    const n = Array.isArray(d) ? d.length : (typeof d === "object" ? Object.keys(d).length : "?");
    console.log(ep, "→ status", r.status, "| items/keys:", n);
  } catch(e){ console.log(ep, "ERR", e.message); }
}
