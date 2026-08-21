const { chromium } = require("playwright");
const EXE = "/Users/staff/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const OUT = "/Users/staff/.openclaw-autoclaw/workspace/projects/praktis-video/assets";

function slide(titleLines, subLines, tagline) {
  const t = titleLines.map(x => `<div class="t">${x}</div>`).join("");
  const s = subLines.map(x => `<div class="s">${x}</div>`).join("");
  const tag = tagline ? `<div class="tag">${tagline}</div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1920px;height:1080px;background:#0b1120;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#fff;overflow:hidden}
    .wrap{position:relative;width:1920px;height:1080px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 140px}
    .logo{position:absolute;top:64px;left:72px;font-size:40px;font-weight:800;letter-spacing:-0.5px}
    .logo .dot{color:#f5c518}
    .t{font-size:76px;font-weight:800;line-height:1.12;letter-spacing:-1px;margin:8px 0}
    .s{font-size:34px;font-weight:400;color:#94a3b8;line-height:1.4;margin:10px 0}
    .tag{position:absolute;bottom:80px;font-size:28px;color:#f5c518;font-weight:600;letter-spacing:0.3px}
    .rule{width:96px;height:5px;background:#f5c518;border-radius:3px;margin:34px 0}
    .ai{color:#7C4DFF;font-weight:700}
  </style></head><body>
  <div class="wrap">
    <div class="logo">Praktis<span class="dot">.</span></div>
    <div class="rule"></div>
    ${t}${s}
    ${tag}
  </div></body></html>`;
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const intro = slide(
    ["Berapa jam untuk mengetik transaksi?"],
    ["…sebelum satu analisis pun dimulai?"],
    ""
  );
  await page.setContent(intro, { waitUntil: "load" });
  await page.screenshot({ path: `${OUT}/intro.png` });

  const outro = slide(
    ["Silakan coba sendiri"],
    ["Kalau tertarik, tinggal hubungi kami"],
    "Kerja akuntansi lebih cepat, lebih ringan"
  );
  await page.setContent(outro, { waitUntil: "load" });
  await page.screenshot({ path: `${OUT}/outro.png` });

  await browser.close();
  console.log("SLIDES_DONE", OUT);
})().catch(e => { console.error("SLIDE_FAIL:", e.message); process.exit(1); });
