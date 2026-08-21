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
const login = await req("/api/auth/callback/credentials",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({csrfToken:csrf,email:EMAIL,password:PASSWORD}).toString()});
console.log("login:", login.status, "->", login.headers.get("location"));
const clients = await req("/api/clients");
console.log("clients:", clients.status);
const r = await req("/api/journals/describe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lines:[{accountName:"Kas dan Setara Kas",debit:27750000,credit:0},{accountName:"Penjualan",debit:0,credit:27750000}]})});
console.log("describe:", r.status, await r.text());
