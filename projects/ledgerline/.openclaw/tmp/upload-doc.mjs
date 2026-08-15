import { readFileSync } from "node:fs";
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
const clientId = clients[0].id;
console.log("klien:", clients[0].name);
const buffer = readFileSync("tests/fixtures/invoice-penjualan.pdf");
const form = new FormData();
form.append("clientId", clientId);
form.append("docType","INVOICE");
form.append("file", new Blob([buffer],{type:"application/pdf"}), "invoice-penjualan.pdf");
const up = await req("/api/documents",{method:"POST",body:form});
const b = await up.json();
console.log("upload:", up.status, b.data?.id ?? JSON.stringify(b));
