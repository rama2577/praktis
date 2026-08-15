const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, PageNumber,
  BorderStyle, ShadingType, WidthType, TableLayoutType, SectionType,
  NumberFormat, TableOfContents, PageBreak,
} = require("docx");
const fs = require("fs");

// ─────────────────────────────────────────────────────────────
// Palette (DM-1 Deep Cyan — AI/tech)
// ─────────────────────────────────────────────────────────────
const PAL = {
  bg: "162235", primary: "FFFFFF", accent: "37DCF2",
  headingColor: "1B6B7A",
  titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "889098",
  headerBg: "1B6B7A", headerText: "FFFFFF", accentLine: "1B6B7A", innerLine: "C8DDE2", surface: "EDF3F5",
};
const BODY_COLOR = "000000";
const FONT = { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "Calibri", cs: "Calibri" };

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };

// ─────────────────────────────────────────────────────────────
// Cover helpers (Latin-aware title layout)
// ─────────────────────────────────────────────────────────────
function wrapTitle(title, maxChars) {
  const words = title.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (candidate.length <= maxChars || cur === "") {
      cur = candidate;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function calcTitleLayout(title, availableWidthTwips, preferredPt, minPt) {
  let pt = preferredPt;
  let lines;
  while (pt >= minPt) {
    const charWidth = pt * 10; // Latin avg char ~ half CJK width
    const maxChars = Math.max(10, Math.floor(availableWidthTwips / charWidth));
    lines = wrapTitle(title, maxChars);
    if (lines.length <= 3) break;
    pt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = wrapTitle(title, Math.floor(availableWidthTwips / (minPt * 10)));
    pt = minPt;
  }
  return { titlePt: pt, titleLines: lines };
}

function buildCoverR1(config) {
  const P = config.palette;
  const padL = 1200, padR = 1200;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 36, 24);
  const titleSize = titlePt * 2;
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];

  // 1. top whitespace
  children.push(new Paragraph({ spacing: { before: 2600 } }));

  // 2. english label
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({
        text: config.englishLabel.split("").join("  "),
        size: 16, color: P.accent, font: FONT, characterSpacing: 40,
      })],
    }));
  }

  // 3. title
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: {
        after: i < titleLines.length - 1 ? 80 : 280,
        line: Math.ceil(titlePt * 23), lineRule: "atLeast",
      },
      children: [new TextRun({
        text: titleLines[i], size: titleSize, bold: true,
        color: P.titleColor, font: FONT,
      })],
    }));
  }

  // 4. subtitle
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 900 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: P.subtitleColor, font: FONT })],
    }));
  }

  // 5. meta lines
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 22, color: P.metaColor, font: FONT })],
    }));
  }

  // 6. bottom whitespace
  children.push(new Paragraph({ spacing: { before: 1600 } }));

  // 7. footer
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.footerColor, font: FONT }),
      new TextRun({ text: "                    " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.footerColor, font: FONT }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg },
        borders: noBorders,
        children,
      })],
    })],
  })];
}

// ─────────────────────────────────────────────────────────────
// Body helpers
// ─────────────────────────────────────────────────────────────
function heading(text, level) {
  const size = level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 30 : 28;
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 260, after: 140 },
    children: [new TextRun({ text, bold: true, color: PAL.headingColor, font: FONT, size })],
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 360 },
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 24, color: BODY_COLOR, font: FONT })],
  });
}

function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 200 },
    children: [new TextRun({ text, size: 21, color: "506070", italics: true, font: FONT })],
  });
}

// Horizontal-only business table
function makeTable(headers, rows, colWidthsPct) {
  const headerRow = new TableRow({
    tableHeader: true, cantSplit: true,
    children: headers.map((h) => new TableCell({
      width: { size: colWidthsPct ? colWidthsPct[headers.indexOf(h)] : undefined, type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, size: 21, color: PAL.headerText, font: FONT })],
      })],
      shading: { type: ShadingType.CLEAR, fill: PAL.headerBg },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    })),
  });
  const dataRows = rows.map((cells, ri) => new TableRow({
    cantSplit: true,
    children: cells.map((cell, ci) => new TableCell({
      width: { size: colWidthsPct ? colWidthsPct[ci] : undefined, type: WidthType.PERCENTAGE },
      children: (Array.isArray(cell) ? cell : [cell]).map((line) => new Paragraph({
        spacing: { after: 40, line: 276 },
        children: [new TextRun({ text: line, size: 20, color: BODY_COLOR, font: FONT })],
      })),
      shading: ri % 2 === 0
        ? { type: ShadingType.CLEAR, fill: PAL.surface }
        : { type: ShadingType.CLEAR, fill: "FFFFFF" },
      margins: { top: 50, bottom: 50, left: 100, right: 100 },
    })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: PAL.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: PAL.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: PAL.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [headerRow, ...dataRows],
  });
}

// Pro / Kontra table
function prosConsTable(pros, cons) {
  return makeTable(["Kelebihan (Pro)", "Kekurangan (Kontra)"], [
    [pros, cons],
  ], [50, 50]);
}

function pageFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: FONT })],
    })],
  });
}

// ─────────────────────────────────────────────────────────────
// Content data
// ─────────────────────────────────────────────────────────────
const TITLE = "Perbandingan Model & Asisten AI Terkemuka 2026";
const SUBTITLE = "Pro & Kontra Fitur ChatGPT, Claude, Gemini, Grok, DeepSeek, dan Pesaing Lainnya";

const ais = [
  {
    name: "OpenAI ChatGPT",
    paragraphs: [
      "ChatGPT adalah asisten AI tertua dan paling luas adopsinya di pasaran, dikembangkan oleh OpenAI. Hingga pertengahan Agustus 2026, jajaran model utamanya terdiri atas GPT-5.5, GPT-5.6 Sol, dan varian flagship GPT-5.6 Sol Ultra, plus model ringan GPT-5.4 mini. Posisi ChatGPT tetap sebagai asisten serba-guna (general-purpose) dengan ekosistem fitur paling lengkap, sehingga menjadi pilihan default bagi banyak pengguna individu maupun perusahaan yang menginginkan satu alat untuk banyak kebutuhan.",
      "Keunggulan fitur yang paling menonjol adalah Voice Mode, yang secara konsisten dinilai sebagai pengalaman suara paling natural dibandingkan pesaing. Selain itu ChatGPT menyediakan Canvas untuk kolaborasi dokumen dan kode secara real-time, Codex sebagai lingkungan coding agen (agentic coding), Memory yang kini terintegrasi dengan pencarian web, image generation tanpa batas di tier Pro, serta Sora untuk pembuatan video. Ekosistem Custom GPTs dan GPT Store juga memungkinkan pengguna membangun asisten khusus tanpa coding.",
      "Dari sisi harga, ChatGPT menawarkan tier Free, Go (sekitar 8 dolar AS), Plus sebesar 20 dolar AS per bulan, serta Pro mulai 100 hingga 200 dolar AS per bulan untuk akses GPT-5.6 Sol dan beban kerja berat. Harga API untuk GPT-5.5 sekitar 5 dolar AS per 1 juta token input, sementara GPT-5.6 Sol dipatok sekitar 5 dolar AS input dan 30 dolar AS output. Kekurangannya, tier Plus kerap dikritik terasa dibatasi (rate-limit) sehingga terkesan seperti iklan untuk naik ke Pro, dan tingkat halusinasi pada tugas tertentu masih lebih tinggi dibanding Claude.",
    ],
    pros: [
      "Ekosistem dan integrasi terluas (Canvas, Codex, Custom GPTs, Store)",
      "Voice Mode terbaik di kelasnya — paling natural",
      "Paling serba-guna untuk beragam kebutuhan (umum, riset, coding, visual)",
      "Image generation tanpa batas di tier Pro + Sora untuk video",
      "Memory terintegrasi dengan pencarian web",
    ],
    cons: [
      "Tier Plus ($20) terasa dibatasi rate-limit; fitur terbaik terkunci di Pro ($100-200)",
      "Tingkat halusinasi relatif lebih tinggi dibanding Claude",
      "Biaya API kelas atas tergolong mahal",
      "GPT-5.6 Sol Ultra sempat dikritik karena batas sesi yang singkat",
    ],
  },
  {
    name: "Anthropic Claude",
    paragraphs: [
      "Claude, dikembangkan oleh Anthropic, dikenal sebagai asisten dengan kualitas tulisan paling natural dan kemampuan coding agen terbaik di pasaran. Model andalannya saat ini adalah Claude Opus 4.8, yang diklaim sebagai model computer-use dan browser-agent terkuat dengan skor 84% pada benchmark Online-Mind2Web, disusul Opus 4.6 serta Sonnet 5 untuk tier menengah. Claude memposisikan diri kuat pada reasoning, penulisan, dan pekerjaan agen yang membutuhkan kehati-hatian.",
      "Fitur unggulan Claude mencakup Artifacts (ruang kerja interaktif untuk menampilkan kode, dokumen, dan diagram), Claude Code (agen coding repositori penuh yang memimpin benchmark coding), Computer Use (kemampuan mengoperasikan komputer/browser), serta AI Teammates untuk kolaborasi agen. Claude juga menawarkan jendela konteks panjang hingga 200 ribu token dan kemampuan analisis gambar yang sangat baik. Penekanan Anthropic pada safety dan alignment menjadikan Claude pilihan favorit untuk pekerjaan profesional yang menuntut akurasi.",
      "Dari sisi harga, Claude Pro dibanderol 20 dolar AS per bulan (atau 17 dolar AS dengan pembayaran tahunan), Claude Max 5x sebesar 100 dolar AS, dan Max 20x sebesar 200 dolar AS per bulan. Harga API model Opus sekitar 5 dolar AS per 1 juta token input. Keterbatasannya, Claude tidak memiliki image generation native maupun pembuatan video, cenderung lebih konservatif dalam menjawab, dan batas penggunaan pada tier rendah relatif ketat untuk sesi coding panjang.",
    ],
    pros: [
      "Coding agen terbaik — Claude Code memimpin benchmark, unggul di tugas repositori penuh",
      "Kualitas tulisan paling natural dan reasoning yang kuat",
      "Computer Use / browser-agent terkuat (Opus 4.8, skor 84% Online-Mind2Web)",
      "Konteks panjang (200K token) + analisis gambar sangat baik",
      "Reputasi safety & alignment terbaik di industri",
    ],
    cons: [
      "Tidak ada image generation native maupun pembuatan video",
      "Cenderung lebih konservatif/berhati-hati dalam menjawab",
      "Batas pesan (rate-limit) relatif ketat di tier bawah",
      "Harga tier atas (Max) mahal dibanding pesaing",
    ],
  },
  {
    name: "Google Gemini",
    paragraphs: [
      "Gemini, produk Google DeepMind, unggul pada multimodal dan akses data real-time. Model andalannya adalah Gemini 3.1 Pro yang disebut sebagai model paling cerdas Google dan memimpin benchmark reasoning, didukung Gemini 3 Pro serta Gemini 3 Flash untuk kebutuhan ringan. Integrasi mendalam dengan ekosistem Google (Workspace, Drive, Search, Maps, YouTube) menjadi pembeda utama yang sulit ditandingi pesaing.",
      "Fitur unggulan Gemini meliputi Deep Research untuk riset mendalam dengan sitasi, pembuatan video via Veo 3.1, pembuatan gambar via Imagen, NotebookLM untuk mengolah dokumen menjadi audio overview, serta jendela konteks hingga 2 juta token yang mampu menampung dokumen sangat besar. Kemampuan multimodal Gemini mencakup teks, gambar, video, dan audio sekaligus, menjadikannya paling lengkap untuk konten non-teks.",
      "Dari sisi harga, Google menawarkan tier Free, AI Plus sebesar 7,99 dolar AS, AI Pro 19,99 dolar AS, hingga AI Ultra mulai 99,99 dolar AS per bulan (termasuk penyimpanan 20 TB). Harga API Gemini berkisar 2 hingga 12 dolar AS per 1 juta token tergantung model, dengan output gambar sekitar 30 dolar AS per 1 juta token. Kelemahannya, pengalaman produk (UX) sering dikritik berantakan, mode suara terasa kaku (robotic), dan fokus pada alur kerja pengembang (developer workflow) masih kalah dari Claude dan ChatGPT.",
    ],
    pros: [
      "Harga paling kompetitif (AI Plus $7.99, AI Pro $19.99) + tier gratis murah hati",
      "Multimodal terlengkap: teks, gambar, video (Veo 3.1), audio",
      "Jendela konteks sangat besar hingga 2 juta token",
      "Akses data real-time dan integrasi penuh ekosistem Google (Workspace, Drive, Search)",
      "NotebookLM dan Deep Research sangat kuat untuk riset dokumen",
    ],
    cons: [
      "UX produk sering dinilai berantakan/kurang fokus",
      "Mode suara terasa robotic dibanding ChatGPT",
      "Kurang fokus pada developer/coding workflow",
      "Fitur terbaik (Veo, Deep Research penuh) terkunci di tier Ultra yang mahal",
    ],
  },
  {
    name: "xAI Grok",
    paragraphs: [
      "Grok, dikembangkan oleh xAI, adalah pemain yang tumbuh paling agresif dengan pembeda utama berupa akses real-time ke data platform X (Twitter). Model terbarunya, Grok 4.6, merupakan refresh pasca-pelatihan dari Grok 4.5 yang melonjak lima poin dan menyejajarkan diri dengan GPT-5.6 Sol pada benchmark. Grok juga menyiapkan Grok Code sebagai model coding khusus yang diharapkan bersaing dengan Claude Code dan DeepSeek Coder.",
      "Fitur unggulan Grok mencakup DeepSearch untuk riset mendalam, Think Mode untuk reasoning transparan, Companions (agen dengan persona), image generation via Aurora, live search API untuk data terkini, serta kemampuan suara (speech-to-text dan text-to-speech). Persona Grok yang lebih bebas dan tidak terlalu tersaring menjadi daya tarik bagi sebagian pengguna, meski juga menimbulkan kontroversi.",
      "Dari sisi harga, Grok gratis untuk tier dasar, SuperGrok seharga 10 dolar AS per bulan (memberi akses DeepSearch dan Aurora), X Premium+ sebesar 40 dolar AS per bulan (350 dolar AS per tahun) untuk akses Grok 4 dan bebas iklan di X, serta SuperGrok Heavy sebesar 300 dolar AS per bulan untuk beban kerja berat. Kelemahannya, ekosistemnya masih terikat kuat pada X, polish level enterprise belum setara pesaing besar, dan image generation-nya relatif terbatas.",
    ],
    pros: [
      "Akses real-time ke data X/web — paling cepat untuk informasi terkini",
      "Coding benchmark terdepan (bersama Claude) — Grok 4.6 tie GPT-5.6 Sol",
      "Harga murah di tier SuperGrok ($10) untuk DeepSearch + Aurora",
      "Persona bebas/tidak tersaring + rilis model sangat cepat",
      "DeepSearch dan Think Mode kuat untuk riset",
    ],
    cons: [
      "Ekosistem terikat kuat pada platform X — kurang relevan di luar X",
      "Polish level enterprise masih di bawah ChatGPT/Claude",
      "Image generation relatif terbatas",
      "Kontroversi seputar persona dan moderasi konten",
    ],
  },
  {
    name: "DeepSeek",
    paragraphs: [
      "DeepSeek adalah laboratorium AI asal Tiongkok yang mengguncang pasar dengan model open-source berbiaya sangat rendah namun kompetitif. Model unggulannya adalah DeepSeek V4 Pro, V4 Flash, dan V4 Preview, dengan V4 Preview dikabarkan sekitar 85% lebih murah dari GPT-5.5. Pada benchmark coding, DeepSeek V4 Pro dilaporkan mengalahkan Claude Opus 4.6 dan GPT-5.4 dengan harga sekitar sepersepuluhnya.",
      "Keunggulan utama DeepSeek adalah efisiensi biaya ekstrem dan keterbukaan (open-source, lisensi MIT), sehingga banyak perusahaan menggunakannya untuk inferensi skala besar atau self-hosting. Harga API-nya sekitar 0,35 hingga 0,4 dolar AS per 1 juta token input, dengan V4 Flash dilaporkan 18x lebih murah pada input dan 28x lebih murah pada output dibanding Claude Opus 4.8 — perbedaan hingga puluhan kali lipat untuk beban kerja yang sama.",
      "Keterbatasan DeepSeek terletak pada ekosistem konsumen yang belum matang: tidak ada produk sekomprehensif ChatGPT atau Gemini, kemampuan multimodal (gambar/video) masih terbatas, dan terdapat kekhawatiran privasi serta kepatuhan data karena server dan regulasi di Tiongkok. Meski demikian, untuk organisasi yang sensitif terhadap biaya atau ingin kontrol penuh atas model, DeepSeek adalah opsi yang sangat menarik.",
    ],
    pros: [
      "Biaya ekstrem murah — hingga 48x lebih murah dari GPT-5.5 untuk beban kerja sama",
      "Open-source (MIT) — bisa self-host, transparan, tanpa vendor lock-in",
      "Coding benchmark unggul (kalahkan Opus 4.6 & GPT-5.4) di harga sepersepuluh",
      "Cocok untuk inferensi skala besar dan kontrol penuh",
    ],
    cons: [
      "Ekosistem konsumen belum matang (fitur terbatas)",
      "Multimodal (gambar/video) masih terbatas",
      "Kekhawatiran privasi & kepatuhan data (server di Tiongkok)",
      "Dukungan dan integrasi pihak ketiga lebih sedikit",
    ],
  },
];

const others = [
  {
    name: "Perplexity",
    paragraphs: [
      "Perplexity adalah mesin jawaban (answer engine) yang berfokus pada riset dengan sitasi. Keunggulan utamanya adalah transparansi sumber: setiap fakta ditautkan langsung ke sumber aslinya, sehingga risiko halusinasi terasa lebih rendah. Perplexity kurang cocok untuk menulis kreatif panjang atau coding berat, tetapi sangat kuat untuk riset cepat dan penelusuran fakta. Harga tier Pro sekitar 20 dolar AS per bulan.",
    ],
  },
  {
    name: "Meta AI (Llama)",
    paragraphs: [
      "Meta AI dibangun di atas model open-source Llama dan terintegrasi langsung ke WhatsApp, Instagram, dan Facebook. Keunggulan utamanya adalah distribusi masif dan gratis, menjadikannya AI yang paling mudah diakses miliaran pengguna. Model Llama juga banyak diadopsi perusahaan untuk self-hosting karena sifatnya yang terbuka. Namun kemampuan puncaknya masih di bawah model closed-source flagship dari OpenAI, Anthropic, dan Google.",
    ],
  },
  {
    name: "Mistral (Le Chat)",
    paragraphs: [
      "Mistral AI adalah pemain Eropa dengan model open-weight dan asisten Le Chat. Posisinya menarik bagi organisasi yang menekankan kedaulatan data (data sovereignty) dan privasi ala Eropa. Namun secara kemampuan, Le Chat sering dinilai masih di bawah para pemimpin pasar, meski beberapa pengguna melaporkan peningkatan signifikan pada rilis terbaru.",
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Build document
// ─────────────────────────────────────────────────────────────
function buildTOCSection() {
  return {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, bottom: 1440, left: 1797, right: 1797 },
        pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
      },
    },
    footers: { default: pageFooter() },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({ text: "Daftar Isi", bold: true, size: 32, color: PAL.headingColor, font: FONT })],
      }),
      new TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-3" }),
      new Paragraph({
        children: [new TextRun({ children: [new PageBreak()] })],
      }),
    ],
  };
}

function buildBodySection() {
  const children = [];

  children.push(heading("1. Ringkasan Eksekutif", HeadingLevel.HEADING_1));
  children.push(body(
    "Laporan ini membandingkan model dan asisten AI terkemuka di pasaran per pertengahan Agustus 2026: OpenAI ChatGPT, Anthropic Claude, Google Gemini, xAI Grok, dan DeepSeek, ditambah tiga pemain sekunder yaitu Perplexity, Meta AI (Llama), dan Mistral. Perbandingan dilakukan pada dimensi model terbaru, fitur unggulan, harga langganan dan API, serta kelebihan dan kekurangan masing-masing. Data disarikan dari berbagai sumber daring yang diterbitkan pada kurun Juni hingga Agustus 2026."
  ));
  children.push(body(
    "Temuan utamanya adalah pasar telah terbelah ke dalam spesialisasi yang cukup jelas. OpenAI unggul pada ekosistem dan otomasi serba-guna, Anthropic memimpin pada coding agen dan kualitas tulisan, Google unggul pada multimodal dan harga, xAI unggul pada akses data real-time, sementara DeepSeek menawarkan biaya terendah dengan model open-source. Tidak ada satu model pun yang terbaik di semua dimensi; pilihan yang tepat bergantung pada kebutuhan spesifik pengguna."
  ));
  children.push(body(
    "Untuk pengguna yang mengutamakan satu alat serba-guna dengan suara dan integrasi terlengkap, ChatGPT adalah pilihan paling aman. Untuk pekerjaan coding profesional dan penulisan yang presisi, Claude adalah unggulan. Untuk kebutuhan multimodal dan harga hemat, Gemini adalah pilihan terbaik. Untuk informasi real-time dan biaya rendah di tier menengah, Grok layak dipertimbangkan. Untuk organisasi yang sensitif terhadap biaya atau ingin kontrol penuh, DeepSeek menawarkan nilai yang sulit dilampaui. Rekomendasi rinci per kasus penggunaan disajikan pada bab terakhir."
  ));

  children.push(heading("2. Latar Belakang & Tujuan", HeadingLevel.HEADING_1));
  children.push(body(
    "Dalam dua tahun terakhir, lanskap asisten AI berubah dari dominasi satu pemain menjadi persaingan multipolar. Setiap penyedia kini menawarkan model flagship dengan kemampuan yang saling mengejar, namun dengan penekanan yang berbeda pada multimodal, agen otonom, coding, dan harga. Akibatnya, pengguna individu maupun perusahaan menghadapi kebingungan dalam memilih alat yang tepat, terutama karena fitur dan harga berubah cepat setiap kuartal."
  ));
  children.push(body(
    "Tujuan laporan ini adalah memberikan gambaran perbandingan yang ringkas, objektif, dan dapat ditindaklanjuti mengenai kelebihan dan kekurangan (pro dan kontra) masing-masing asisten AI, sehingga pembaca dapat memilih kombinasi alat yang paling sesuai dengan kebutuhan dan anggaran. Laporan ini tidak dimaksudkan sebagai evaluasi teknis mendalam terhadap benchmark internal, melainkan sintesis informasi publik yang relevan untuk pengambilan keputusan."
  ));
  children.push(body(
    "Ruang lingkup laporan dibatasi pada produk asisten AI berbasis percakapan yang tersedia untuk umum. Model open-source lain yang tidak memiliki produk asisten konsumen (seperti banyak model di Hugging Face) tidak dibahas secara rinci. Angka harga dan versi model yang dicantumkan merefleksikan informasi publik per pertengahan Agustus 2026 dan dapat berubah sewaktu-waktu."
  ));

  children.push(heading("3. Cakupan, Sumber Data & Metodologi", HeadingLevel.HEADING_1));
  children.push(body(
    "Cakupan analisis meliputi enam asisten AI utama dan tiga pemain sekunder. Dimensi perbandingan terdiri atas: model flagship terbaru, fitur pembeda, struktur harga langganan konsumen, harga API (per 1 juta token), serta daftar kelebihan dan kekurangan yang dihimpun dari berbagai ulasan. Waktu pengumpulan data adalah pertengahan Agustus 2026."
  ));
  children.push(body(
    "Sumber data berupa publikasi daring yang diterbitkan pada kurun Juni hingga Agustus 2026, meliputi dokumentasi resmi penyedia (OpenAI, Anthropic, Google, xAI), situs perbandingan independen, serta ulasan komunitas. Daftar lengkap sumber tercantum pada bagian Lampiran. Karena karakteristik pasar yang bergerak cepat, beberapa angka seperti harga API dan versi model dapat berbeda antar sumber; laporan ini menggunakan angka yang paling banyak dikonfirmasi oleh beberapa sumber."
  ));
  children.push(body(
    "Metodologi yang digunakan adalah analisis komparatif kualitatif: setiap asisten dinilai berdasarkan fitur, harga, dan reputasi yang terdokumentasi, kemudian disintesis menjadi matriks perbandingan dan rekomendasi per kasus penggunaan. Pendekatan ini menekankan kegunaan praktis dibanding presisi benchmark, sesuai tujuan laporan untuk mendukung keputusan pemilihan alat."
  ));

  children.push(heading("4. Temuan Inti", HeadingLevel.HEADING_1));

  ais.forEach((ai, idx) => {
    children.push(heading(`4.${idx + 1} ${ai.name}`, HeadingLevel.HEADING_2));
    ai.paragraphs.forEach((p) => children.push(body(p)));
    children.push(caption(`Tabel 4.${idx + 1} — Pro dan Kontra ${ai.name}`));
    children.push(prosConsTable(ai.pros, ai.cons));
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  });

  children.push(heading("4.7 Pesaing Sekunder", HeadingLevel.HEADING_2));
  others.forEach((o) => {
    children.push(heading(o.name, HeadingLevel.HEADING_3));
    o.paragraphs.forEach((p) => children.push(body(p)));
  });

  children.push(heading("5. Matriks Perbandingan", HeadingLevel.HEADING_1));
  children.push(body(
    "Tabel berikut merangkum posisi keenam pemain utama pada dimensi kunci. Angka harga dalam dolar AS dan dapat berubah. Kolom harga API mengacu pada harga input per 1 juta token untuk model flagship masing-masing penyedia."
  ));
  children.push(caption("Tabel 5.1 — Ringkasan Perbandingan Model AI Utama (per Agustus 2026)"));
  children.push(makeTable(
    ["Asisten", "Perusahaan", "Model Terbaru", "Harga Konsumen", "Harga API (input/1M)", "Kekuatan Utama", "Kelemahan Utama"],
    [
      ["ChatGPT", "OpenAI", "GPT-5.5 / GPT-5.6 Sol / Sol Ultra", "Free; Go ~$8; Plus $20; Pro $100-200", "~$5 (GPT-5.5 / 5.6 Sol)", "Ekosistem terlengkap, Voice Mode terbaik", "Plus dibatasi rate-limit; halusinasi relatif tinggi"],
      ["Claude", "Anthropic", "Opus 4.8 / 4.6, Sonnet 5", "Free; Pro $20 ($17/thn); Max 5x $100; Max 20x $200", "~$5 (Opus)", "Coding agen & tulisan terbaik, computer use", "Tanpa image/video gen; batas pesan ketat"],
      ["Gemini", "Google", "Gemini 3.1 Pro / 3 Pro / 3 Flash", "Free; AI Plus $7.99; AI Pro $19.99; Ultra $99.99+", "$2-12 (tiap model)", "Multimodal terlengkap, harga murah, konteks 2M", "UX berantakan; voice robotic"],
      ["Grok", "xAI", "Grok 4.6 / 4 (Grok Code segera)", "Free; SuperGrok $10; X Premium+ $40; Heavy $300", "n/a (paket)", "Data real-time X, coding terdepan", "Terikat ekosistem X; polish enterprise kurang"],
      ["DeepSeek", "DeepSeek", "V4 Pro / V4 Flash / V4 Preview", "Gratis (web/app)", "~$0.35-0.4", "Biaya terendah, open-source, coding unggul", "Ekosistem konsumen minim; concern privasi"],
      ["Perplexity", "Perplexity AI", "Beragam (routing model)", "Free; Pro $20", "n/a (paket)", "Riset dengan sitasi sumber", "Bukan untuk coding/kreasi berat"],
    ],
    [12, 12, 20, 18, 14, 15, 15],
  ));
  children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));

  children.push(heading("6. Diagnosis & Sintesis", HeadingLevel.HEADING_1));
  children.push(body(
    "Pola utama yang terlihat dari perbandingan ini adalah konvergensi kemampuan dasar dan divergensi spesialisasi. Semua pemain besar kini menawarkan multimodal (teks dan gambar), pencarian web, dan kemampuan agen dalam berbagai tingkat kematangan. Perbedaan kompetitif justru muncul pada titik penekanan masing-masing: OpenAI pada ekosistem dan suara, Anthropic pada coding dan keamanan, Google pada multimodal dan harga, xAI pada kecepatan akses data, dan DeepSeek pada efisiensi biaya."
  ));
  children.push(body(
    "Dari sisi strategi harga, terjadi persaingan yang sangat tajam. Google menekan harga konsumen hingga 7,99 dolar AS per bulan, sementara DeepSeek menekan harga API hingga di bawah 0,5 dolar AS per 1 juta token — jauh di bawah para pemain Amerika. Tekanan ini memaksa penyedia lain untuk membedakan diri lewat fitur premium dan kualitas, bukan sekadar harga, sebagaimana terlihat pada positioning Pro/Max milik OpenAI dan Anthropic yang justru menaikkan harga tier atas."
  ));
  children.push(body(
    "Implikasi bagi pengguna adalah tidak ada alasan untuk berkomitmen pada satu penyedia saja. Strategi yang umum berkembang adalah kombinasi: menggunakan satu alat utama untuk pekerjaan sehari-hari, ditambah alat khusus untuk coding, riset, atau multimodal. Hal ini juga menegaskan pentingnya mengevaluasi ulang pilihan secara berkala, mengingat rilis model dan perubahan harga terjadi setiap beberapa bulan."
  ));

  children.push(heading("7. Kesimpulan & Rekomendasi", HeadingLevel.HEADING_1));
  children.push(body(
    "Kesimpulan utama laporan ini adalah bahwa setiap asisten AI unggul pada ceruknya masing-masing, dan pilihan terbaik bergantung pada prioritas pengguna. ChatGPT adalah alat serba-guna paling lengkap dengan Voice Mode dan ekosistem terbaik; Claude adalah pilihan terkuat untuk coding profesional dan penulisan yang presisi; Gemini menawarkan nilai terbaik untuk multimodal dan harga; Grok unggul untuk informasi real-time; dan DeepSeek adalah pemenang mutlak dalam efisiensi biaya serta keterbukaan."
  ));
  children.push(body(
    "Rekomendasi per kasus penggunaan: (1) untuk pengguna umum yang menginginkan satu alat dengan fitur lengkap, pilih ChatGPT Plus; (2) untuk developer dan engineer, kombinasikan Claude (Claude Code) untuk coding utama dengan DeepSeek untuk inferensi berbiaya rendah; (3) untuk kebutuhan konten multimodal, video, dan riset dokumen, pilih Gemini AI Pro; (4) untuk tim yang memantau berita dan data real-time, pertimbangkan Grok SuperGrok; (5) untuk organisasi yang sensitif terhadap biaya atau menuntut kontrol penuh dan self-hosting, DeepSeek adalah pilihan paling rasional."
  ));
  children.push(body(
    "Langkah selanjutnya yang disarankan: identifikasi dua hingga tiga kasus penggunaan paling sering, uji coba gratis pada masing-masing kandidat selama satu hingga dua minggu, lalu bandingkan hasil pada kualitas dan total biaya. Karena pasar ini sangat dinamis, evaluasi sebaiknya diulang setidaknya setiap kuartal untuk menangkap perubahan model, fitur, dan harga."
  ));

  children.push(heading("Lampiran — Sumber Data", HeadingLevel.HEADING_1));
  children.push(body(
    "Sumber-sumber berikut digunakan dalam penyusunan laporan ini (diakses pertengahan Agustus 2026):"
  ));
  const sources = [
    "OpenAI — ChatGPT Pricing: openai.com/chatgpt/pricing",
    "Anthropic — Claude Opus 4.8 & Opus 4.6: anthropic.com/news/claude-opus-4-8",
    "Google — Gemini 3.1 Pro: blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro",
    "Google — Gemini API Pricing: ai.google.dev/gemini-api/docs/pricing",
    "Google — AI Plans: one.google.com/intl/en_us/about/google-ai-plans",
    "xAI — Grok 4: x.ai/news/grok-4",
    "Mashable — DeepSeek V4 Preview comparison: mashable.com",
    "Flowtivity — DeepSeek V4 vs GPT-5.5 vs Claude Opus: flowtivity.ai",
    "Improvado — Claude vs ChatGPT vs Gemini vs DeepSeek (API pricing 2026): improvado.io",
    "FelloAI — Best AI Models August 2026: felloai.com",
    "Morph — ChatGPT vs Claude vs Gemini plans: morphllm.com",
    "Kanerika — ChatGPT vs Gemini vs Claude: kanerika.com",
    "DigitalApplied — Google AI Plans 2026: digitalapplied.com",
    "Metronome — xAI Grok pricing: metronome.com",
  ];
  sources.forEach((s, i) => {
    children.push(new Paragraph({
      indent: { left: 360 },
      spacing: { after: 60, line: 276 },
      children: [new TextRun({ text: `${i + 1}. ${s}`, size: 21, color: BODY_COLOR, font: FONT })],
    }));
  });

  return {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, bottom: 1440, left: 1797, right: 1797 },
        pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: TITLE, size: 18, color: "808080", font: FONT })],
        })],
      }),
    },
    footers: { default: pageFooter() },
    children,
  };
}

// ─────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 24, color: BODY_COLOR },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1({
        palette: PAL,
        title: TITLE,
        subtitle: SUBTITLE,
        englishLabel: "AI LANDSCAPE REPORT 2026",
        metaLines: [
          "Disusun oleh: Claw (AutoClaw) — Asisten AI",
          "Tanggal: 15 Agustus 2026",
          "Klasifikasi: Riset Internal / Publik",
        ],
        footerLeft: "AutoClaw Research",
        footerRight: "2026",
      }),
    },
    buildTOCSection(),
    buildBodySection(),
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("Perbandingan-AI-Terkemuka-2026.docx", buf);
  console.log("OK: Perbandingan-AI-Terkemuka-2026.docx");
});
