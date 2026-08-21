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
const c = await (await req("/api/clients")).json();
const arr = c.data ?? c.clients ?? c;
const nus = arr.find(x=>x.name==="PT Nusantara Logistik") ?? arr[0];
console.log("client:", nus.name, nus.id);
// 1) buku besar seluruh akun (period 2026-01)
const led = await req(`/api/clients/${nus.id}/ledger?period=2026-01`);
const lb = await led.json();
console.log("ledger ALL status:", led.status, "accounts:", lb.data?.accounts?.length, "→", lb.data?.accounts?.slice(0,3).map(a=>`${a.accountCode}:${a.closingBalance}`).join(" | "));
// 2) COA klien
const coa = await req(`/api/clients/${nus.id}/coa`);
const cb = await coa.json();
console.log("coa status:", coa.status, "accounts:", cb.data?.accounts?.length);
