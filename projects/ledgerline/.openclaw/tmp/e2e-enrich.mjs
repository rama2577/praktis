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
const clients = (await (await req("/api/clients")).json()).data;
// pilih klien yang industry OTHER & taxId null utk uji enrich
const target = clients.find(c => c.taxId === null) ?? clients[0];
console.log("target:", target.name, "| taxId:", target.taxId, "| industry:", target.industry);
const r = await req(`/api/clients/${target.id}/enrich`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text: "PT Contoh Niaga Sejahtera, NPWP 01.234.567.8-901.234, bergerak di bidang jasa konsultasi, alamat Jl. Sudirman No. 12 Jakarta." })});
console.log("enrich:", r.status, await r.text());
