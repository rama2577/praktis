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
const r = await req("/api/ai/command",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:"Berapa klien aktif dan transaksi hari ini?"})});
const b = await r.json();
console.log("command:", r.status, "intent:", b.data?.intent);
console.log("answer:", (b.data?.answer ?? JSON.stringify(b)).slice(0, 200));
