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
console.log("dashboard keys:", Object.keys(d.data ?? {}).join(","));
console.log("pipeline:", JSON.stringify(d.data?.pipeline).slice(0,160));
const c = await (await req("/api/clients")).json();
const arr = c.data ?? c.clients ?? c;
const nus = arr.find(x=>x.name==="PT Nusantara Logistik");
// financial statements utk lihat histori multi-tahun
const fs = await req(`/api/clients/${nus.id}/financial-statements`);
console.log("FS status:", fs.status);
const fb = await fs.json();
console.log("FS keys:", Object.keys(fb.data ?? fb).join(","), JSON.stringify(fb).slice(0,160));
