const BASE = "https://web-production-7a593.up.railway.app";
const EMAIL = "admin@ledgerline.dev", PASSWORD = "password123";
const jar = new Map();
const ch = () => [...jar.entries()].map(([k,v])=>`${k}=${v}`).join("; ");
async function req(p, init={}) {
  const r = await fetch(BASE+p, {...init, redirect:"manual", headers:{...(init.headers??{}), cookie:ch()}});
  for (const c of r.headers.getSetCookie()){const [pair]=c.split(";");const i=pair.indexOf("=");if(i>0)jar.set(pair.slice(0,i),pair.slice(i+1));}
  return r;
}
const csrf = (await (await req("/api/auth/csrf")).json()).csrfToken;
await req("/api/auth/callback/credentials",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({csrfToken:csrf,email:EMAIL,password:PASSWORD}).toString()});
const docs = (await (await req("/api/documents")).json());
const d = docs.data.find(x=>x.id==="e68ad3e7-5576-43d0-982c-fc8477029d00");
console.log("dokumen:", d ? JSON.stringify({status:d.status, type:d.type, fileName:d.fileName, exceptionFlag:d.exceptionFlag??null}) : "tidak ditemukan");
// jurnal klien terbaru
const j = (await (await req("/api/journals")).json());
const arr = Array.isArray(j) ? j : (j.data ?? []);
console.log("jurnal count (klien):", arr.length);
if (arr.length) console.log("jurnal terbaru:", JSON.stringify(arr[0]).slice(0,300));
