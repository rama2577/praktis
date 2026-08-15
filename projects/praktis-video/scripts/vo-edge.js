// Neural Indonesian VO via Microsoft Edge TTS.
// English loanwords synthesized with en-US-AriaNeural (English pronunciation),
// Indonesian text with id-ID-GadisNeural — per-chunk synthesis + byte concat
// (avoids unsupported multi-<voice> SSML on this endpoint).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const GW = "/Users/staff/Library/Application Support/autoclaw/embedded-gateway-runtime/9fb0bd1f36acfc25/gateway/openclaw/node_modules";
const drm = require(path.join(GW, "node-edge-tts/dist/drm.js"));
const WebSocket = require(path.join(GW, "ws"));

const OUTDIR = "/Users/staff/.openclaw-autoclaw/workspace/projects/praktis-video/assets/vo-edge";
fs.mkdirSync(OUTDIR, { recursive: true });

const ID_VOICE = "id-ID-GadisNeural";
const EN_VOICE = "en-US-AriaNeural";
const OUTPUT_FORMAT = "audio-24khz-96kbitrate-mono-mp3";

function esc(s) {
  return s.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
}
function oneSSML(voice, text) {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="id-ID"><voice name="${voice}"><prosody rate="+8%" pitch="default" volume="default">${esc(text)}</prosody></voice></speak>`;
}

function synthBuf(voice, text) {
  const ssml = oneSSML(voice, text);
  const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${drm.TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${drm.generateSecMsGecToken()}&Sec-MS-GEC-Version=1-${drm.CHROMIUM_FULL_VERSION}`;
  const ws = new WebSocket(url, {
    host: "speech.platform.bing.com",
    origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    headers: {
      "Pragma": "no-cache",
      "Cache-Control": "no-cache",
      "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${drm.CHROMIUM_FULL_VERSION.split(".")[0]}.0.0.0 Safari/537.36 Edg/${drm.CHROMIUM_FULL_VERSION.split(".")[0]}.0.0.0`,
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => reject(new Error("timeout")), 20000);
    ws.on("open", () => {
      ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"${OUTPUT_FORMAT}"}}}}`);
      const rid = crypto.randomBytes(16).toString("hex");
      ws.send(`X-RequestId:${rid}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
    });
    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        const sep = "Path:audio\r\n";
        const idx = data.indexOf(sep);
        if (idx >= 0) chunks.push(data.subarray(idx + sep.length));
      } else {
        if (data.toString().includes("Path:turn.end")) {
          clearTimeout(timer);
          ws.close();
          resolve(Buffer.concat(chunks));
        }
      }
    });
    ws.on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

const SEGMENTS = {
  seg1: [["id", "Berapa lama waktu Anda habis untuk mengetik transaksi, alih-alih menganalisisnya? Kalau jawabannya terlalu lama — video ini untuk Anda."]],
  seg2: [
    ["id", "Perkenalkan Praktis — sistem akuntansi dengan "], ["en", "AI"],
    ["id", ". Semua pekerjaan terlihat dalam satu "], ["en", "dashboard"],
    ["id", ": dokumen masuk, "], ["en", "pipeline"],
    ["id", ", dan "], ["en", "deadline"], ["id", "."],
  ],
  seg3: [
    ["id", "Lihat cara kerjanya: setiap dokumen yang masuk langsung dibaca "], ["en", "AI"],
    ["id", ", transaksinya dikenali, lalu disusun menjadi "], ["en", "draft"],
    ["id", " jurnal — lengkap dengan referensi PSAK dan PPN."],
  ],
  seg4: [
    ["id", "Anda tinggal mereview. "], ["en", "AI"],
    ["id", " menyusun, manusia yang memutuskan — cukup satu klik untuk menyetujui."],
  ],
  seg5: [
    ["id", "Bahkan laporan bisa diminta dengan bahasa sehari-hari, dan "], ["en", "AI"],
    ["id", " menyusunnya otomatis."],
  ],
  seg6: [
    ["id", "Satu "], ["en", "platform"],
    ["id", ", lima praktisi. Silakan coba sendiri, dan rasakan bedanya. Kalau tertarik, tinggal hubungi kami."],
  ],
};

(async () => {
  for (const [name, chunks] of Object.entries(SEGMENTS)) {
    const bufs = [];
    for (const [lang, text] of chunks) {
      const voice = lang === "en" ? EN_VOICE : ID_VOICE;
      let ok = false;
      for (let a = 1; a <= 3 && !ok; a++) {
        try {
          bufs.push(await synthBuf(voice, text));
          ok = true;
        } catch (e) {
          console.log("retry", name, JSON.stringify(text.slice(0, 20)), a, e.message);
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      if (!ok) { console.error("GAVE_UP", name, text); process.exit(1); }
      await new Promise(r => setTimeout(r, 400));
    }
    const out = path.join(OUTDIR, name + ".mp3");
    fs.writeFileSync(out, Buffer.concat(bufs));
    console.log("done", name, out);
  }
  console.log("ALL_DONE");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
