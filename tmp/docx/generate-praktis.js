// Analisa Bisnis Praktis — DOCX generator
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  Table, TableRow, TableCell, TableOfContents, PageBreak,
  VerticalAlign, TableLayoutType, PageOrientation,
} = require("docx");

// ═══════════════════════════════════════════════
// PALETTE — IG-1 Ink Silver (finance report, R1 cover)
// ═══════════════════════════════════════════════
const PALETTE = {
  bg: "1C1C1E", primary: "FFFFFF", accent: "8C9098",
  titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "808890",
  headerBg: "5C6068", headerText: "FFFFFF", accentLine: "5C6068", innerLine: "D0D2D5", surface: "EEEFF1",
};
const headingColor = (PALETTE.headingColor || PALETTE.primary).replace("#", "");
const c = (hex) => hex.replace("#", "");

// Fonts — Formal Profile A
const FONT_CN = "Noto Sans SC";
const FONT_EN = "FreeSerif";

// ── Helpers ──
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, color: c("5C6068"), size: 32, font: { ascii: FONT_EN, eastAsia: FONT_CN } })],
  });
}
function h1p(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, color: c("5C6068"), size: 32, font: { ascii: FONT_EN, eastAsia: FONT_CN } })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color: c("5C6068"), size: 30, font: { ascii: FONT_EN, eastAsia: FONT_CN } })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text, bold: true, color: c("5C6068"), size: 28, font: { ascii: FONT_EN, eastAsia: FONT_CN } })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312 },
    children: [new TextRun({ text, size: 24, color: "000000", font: { ascii: FONT_EN, eastAsia: FONT_CN } })],
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    spacing: { line: 300 },
    indent: { left: 720 + level * 360, hanging: 240 },
    children: [
      new TextRun({ text: level === 0 ? "•" : "–", size: 24, color: c("5C6068") }),
      new TextRun({ text: "  " + text, size: 24, color: "000000", font: { ascii: FONT_EN, eastAsia: FONT_CN } }),
    ],
  });
}
function caption(text) {
  return new Paragraph({
    spacing: { before: 80, after: 200 },
    children: [new TextRun({ text, size: 20, italics: true, color: c("808890"), font: { ascii: FONT_EN, eastAsia: FONT_CN } })],
  });
}

// ── Table builder ──
function makeTable(headers, rows, opts = {}) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: c(PALETTE.innerLine) };
  const cellBorders = { top: border, bottom: border, left: border, right: border };
  const headerCells = headers.map((h) =>
    new TableCell({
      shading: { type: ShadingType.CLEAR, fill: c(PALETTE.headerBg) },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: h, bold: true, color: c(PALETTE.headerText), size: 21, font: { ascii: FONT_EN, eastAsia: FONT_CN } })],
      })],
    })
  );
  const bodyRows = rows.map((r, i) =>
    new TableRow({
      children: r.map((cellVal) =>
        new TableCell({
          borders: cellBorders,
          shading: i % 2 === 1 ? { type: ShadingType.CLEAR, fill: c(PALETTE.surface) } : undefined,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({
            alignment: typeof cellVal === "number" || /^Rp/.test(cellVal) ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: String(cellVal), size: 21, color: "000000", font: { ascii: FONT_EN, eastAsia: FONT_CN } })],
          })],
        })
      ),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [...(opts.noHeader ? [] : [new TableRow({ children: headerCells })]), ...bodyRows],
  });
}

// ── Cover R1 ──
function buildCoverR1(config) {
  const P = config.palette;
  const padL = 1200, padR = 1200;
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: 3200 } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: c(P.accent), space: 8 } },
      children: [new TextRun({ text: config.englishLabel, size: 18, color: c(P.accent), font: { ascii: FONT_EN, eastAsia: FONT_CN }, characterSpacing: 40 })],
    }));
  }
  for (const line of config.titleLines) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: 300, line: 480, lineRule: "atLeast" },
      children: [new TextRun({ text: line, size: 72, bold: true, color: c(P.titleColor), font: { ascii: "Liberation Sans", eastAsia: FONT_CN } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: c(P.subtitleColor), font: { ascii: "Liberation Sans", eastAsia: FONT_CN } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 100 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: c(P.metaColor), font: { ascii: "Liberation Sans", eastAsia: FONT_CN } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: 2200 } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent), space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: c(P.footerColor), font: { ascii: "Liberation Sans" } }),
      new TextRun({ text: "                                    " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: c(P.footerColor), font: { ascii: "Liberation Sans" } }),
    ],
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: c(P.bg) },
        borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
        children,
      })],
    })],
  });
}

// ═══════════════════════════════════════════════
// CONTENT
// ═══════════════════════════════════════════════
const children = [];

// ── Cover section ──
const coverChildren = [
  buildCoverR1({
    palette: PALETTE,
    englishLabel: "BUSINESS ANALYSIS",
    titleLines: ["Analisa Bisnis", "Praktis", "Direct-to-Market"],
    subtitle: "AI Bookkeeping: dari PDF, foto, spreadsheet, dan CSV langsung menjadi draft jurnal & laporan keuangan",
    metaLines: [
      "Penyusun: Rama Wijaya",
      "Tanggal: 14 Agustus 2026",
      "Status: Draf — untuk review internal",
    ],
    footerLeft: "Confidential",
    footerRight: "Praktis · Analisa Bisnis",
  }),
];

// ── Body section ──
const bodyChildren = [];

// TOC
bodyChildren.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Daftar Isi", size: 32, bold: true, color: c("5C6068"), font: { ascii: FONT_EN, eastAsia: FONT_CN } })] }));
bodyChildren.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }));

// 1. Ringkasan Eksekutif
bodyChildren.push(h1p("1. Ringkasan Eksekutif"));
bodyChildren.push(body("Praktis saat ini sudah beroperasi untuk firma akuntansi (KAP). Dokumen ini mengevaluasi jalur kedua: menjual langsung ke tim finance perusahaan — model seperti rekeningkoran.com, tetapi dengan rantai nilai yang lebih panjang, hingga jurnal dan laporan keuangan siap review."));
bodyChildren.push(body("Kesimpulan utama dari analisis ini adalah sebagai berikut. Modal awal yang dibutuhkan kecil (Rp 15–40 juta) karena produk sudah jadi; investasi dominan berada di pemasaran dan pengembangan fitur direct-market. Revenue potensial 12 bulan diperkirakan Rp 100 juta hingga Rp 1,0 miliar tergantung skenario. Break-even diperkirakan terjadi pada bulan ke-8 untuk skenario moderat, dan tidak tercapai dalam 12 bulan untuk skenario konservatif. Risiko terbesar bukan teknis, melainkan rasio biaya akuisisi terhadap pendapatan per pelanggan, serta positioning di antara rekeningkoran.com yang murah dan software akuntansi seperti Accurate, Jurnal, dan Kledo."));

// 2. Landasan Pasar
bodyChildren.push(h1("2. Landasan Pasar"));
bodyChildren.push(body("Data pasar yang dikumpulkan dari sumber publik menunjukkan peluang yang besar namun masih awal terdigitalisasi."));
bodyChildren.push(makeTable(
  ["Indikator", "Angka", "Sumber"],
  [
    ["Akuntan publik Indonesia", "7.226 (Mei 2025)", "IAPI via ddtc.co.id"],
    ["UMKM non-pertanian", "30,21 juta unit (2025)", "Kemenkop via kadin.id"],
    ["Total UMKM", "65,5 juta unit", "detikcom / Kemenkop 2025"],
    ["UMKM belum punya laporan keuangan", "84,8%", "BPS via techinasia"],
    ["Wajib pajak UMKM aktif (DJP)", "4,2 juta", "DJP via umkm.go.id"],
    ["Harga software akuntansi kompetitor", "Rp 140 ribu – 900 ribu/bulan", "jurnal.id, akuntansiterbaik.com"],
  ]
));
bodyChildren.push(caption("Tabel 1. Data pasar bookkeeping Indonesia (Agustus 2026)"));
bodyChildren.push(body("Segmen yang paling siap membayar adalah tim finance perusahaan menengah serta KAP dan jasa akuntansi — mereka memiliki volume transaksi dan tenggat closing bulanan. Software akuntansi menjual pencatatan; Praktis menjual otomasi input dokumen, sehingga bersifat melengkapi, bukan menggantikan."));

// 3. Analisis Kompetitor
bodyChildren.push(h1("3. Analisis Kompetitor"));
bodyChildren.push(makeTable(
  ["Produk", "Harga", "Value yang dijual"],
  [
    ["Rekeningkoran.com", "Rp 400/halaman (pay-as-you-go)", "Konversi rekening koran ke Excel saja"],
    ["REKONSIA", "Tidak publik", "Konversi rekening koran ke Excel"],
    ["Nexius AI (nexiusai.com)", "Tidak dipublikasikan", "Rekening koran → laporan keuangan (mirip Praktis)"],
    ["Mekari Jurnal", "Rp 359–449 ribu/bulan", "Software akuntansi lengkap"],
    ["Accurate Online", "Rp 277,5–333 ribu/bulan", "Software akuntansi lengkap"],
    ["Kledo", "Rp 140–159 ribu/bulan", "Software akuntansi lengkap"],
    ["Praktis (usulan direct)", "Rp 250–500/transaksi atau paket Rp 500 ribu–2 juta/bulan", "Dokumen → draft jurnal + laporan (review dulu)"],
  ]
));
bodyChildren.push(caption("Tabel 2. Perbandingan kompetitor dan benchmark harga"));
bodyChildren.push(h2("3.1 Temuan Nexius AI"));
bodyChildren.push(body("Riset lapangan 14 Agustus 2026 menemukan bahwa nexiusai.com sedang dalam pemeliharaan (perusahaan PT. Indonesia Kuat Sukses), sementara domain nexius.id masih parked di Hostinger. Channel utama mereka adalah Instagram @nexius.id. Value proposition-nya serupa dengan Praktis: upload rekening koran, laporan keuangan lengkap dalam waktu kurang dari lima menit, dengan output PDF dan Excel. Mereka juga memiliki kemitraan dengan ABDSI untuk menjangkau UMKM."));
bodyChildren.push(body("Implikasinya bagi Praktis: Nexius masih berada pada fase sangat awal, sehingga terdapat jendela peluang. Nexius menjual kecepatan; Praktis menjual kontrol (draft dan review). Perbedaan sudut ini dapat dieksploitasi dalam pesan pemasaran."));

// 4. Model Bisnis & Pricing
bodyChildren.push(h1("4. Model Bisnis & Pricing"));
bodyChildren.push(body("Dua jalur pricing yang saling melengkapi: pay-per-use untuk on-ramp, dan langganan bulanan sebagai inti pendapatan."));
bodyChildren.push(makeTable(
  ["Paket", "Kuota", "Harga"],
  [
    ["Starter", "1.000 transaksi/bulan", "Rp 500.000"],
    ["Growth", "3.000 transaksi/bulan", "Rp 1.200.000"],
    ["Enterprise", "10.000+ transaksi/bulan", "Rp 3.500.000 (custom)"],
  ]
));
bodyChildren.push(caption("Tabel 3. Paket langganan bulanan usulan"));
bodyChildren.push(body("Target ARPU tertimbang: Rp 700 ribu – 1 juta per pelanggan per bulan. Langganan lebih penting karena revenue predictable, penggunaan bersifat rutin setiap closing bulanan, dan jalur upgrade natural saat volume naik."));

// 5. Investasi Awal
bodyChildren.push(h1("5. Investasi Awal"));
bodyChildren.push(h2("5.1 Kondisi aktual Praktis (produk sudah LIVE)"));
bodyChildren.push(makeTable(
  ["Item", "Estimasi/bulan"],
  [
    ["Infrastruktur Railway (web + worker + Postgres + Redis)", "Rp 1–3 juta (skala: Rp 3–8 juta)"],
    ["AI cost (model routing ~Rp 70/transaksi)", "Variabel — sekitar 7–14% dari revenue"],
    ["Domain, email, tooling (analytics, CRM)", "Rp 0,5–1,5 juta"],
    ["Total opex infrastruktur", "Rp 2–5 juta (awal)"],
  ]
));
bodyChildren.push(caption("Tabel 4. Opex infrastruktur bulanan"));
bodyChildren.push(h2("5.2 Biaya pengembangan fitur direct-market (one-off)"));
bodyChildren.push(makeTable(
  ["Fitur", "Estimasi effort"],
  [
    ["Self-serve signup + payment (Midtrans/Xendit)", "2–4 minggu"],
    ["Onboarding flow + contoh dokumen", "1–2 minggu"],
    ["Export jurnal (CSV / format Accurate, Jurnal.id)", "1–2 minggu"],
    ["Landing page direct + kalkulator ROI", "1 minggu"],
    ["Total", "6–9 minggu"],
  ]
));
bodyChildren.push(caption("Tabel 5. Estimasi pengembangan fitur direct-market"));
bodyChildren.push(body("Investasi awal riil yang dibutuhkan: Rp 15–40 juta, mencakup pemasaran 3 bulan pertama, pengembangan fitur, dan dana cadangan. Sebagai perbandingan, memulai dari nol (pengembangan 6 bulan oleh 1–2 engineer) membutuhkan Rp 320–645 juta."));

// 6. Proyeksi Revenue
bodyChildren.push(h1("6. Proyeksi Revenue 12 Bulan"));
bodyChildren.push(body("Tiga skenario dengan asumsi churn bulanan (konservatif 6%, moderat 5%, optimis 4%) dan investasi awal Rp 40 juta yang dimasukkan ke arus kas. Angka di bawah adalah hasil model spreadsheet."));
bodyChildren.push(makeTable(
  ["Metrik (bulan ke-12)", "Konservatif", "Moderat", "Optimis"],
  [
    ["Pelanggan akhir", "26", "81", "179"],
    ["MRR bulan 12", "Rp 15,6 juta", "Rp 64,8 juta", "Rp 179 juta"],
    ["Revenue kumulatif 12 bulan", "Rp 113 juta", "Rp 372 juta", "Rp 1,0 miliar"],
    ["Net cash kumulatif", "−Rp 48 juta", "+Rp 112 juta", "+Rp 586 juta"],
    ["Break-even", "Tidak tercapai", "Bulan ke-8", "Bulan ke-4"],
  ]
));
bodyChildren.push(caption("Tabel 6. Ringkasan tiga skenario (12 bulan)"));
bodyChildren.push(body("Insight kunci: skenario konservatif rugi Rp 48 juta. Dengan pertumbuhan hanya 3 pelanggan/bulan pada ARPU Rp 600 ribu, bisnis tidak layak. Ini menandakan target minimum harus moderat, atau ARPU perlu dinaikkan."));

// 7. Unit Economics
bodyChildren.push(h1("7. Unit Economics"));
bodyChildren.push(makeTable(
  ["Metrik", "Target"],
  [
    ["CAC (biaya akuisisi per pelanggan)", "Rp 400–800 ribu"],
    ["ARPU", "Rp 700 ribu – 1 juta/bulan"],
    ["Gross margin (setelah AI cost + infra)", "75–85%"],
    ["LTV (ARPU × margin ÷ churn 5%)", "Rp 10,5–15 juta"],
    ["LTV : CAC", "13–30× (sehat, >3×)"],
    ["Payback CAC", "1–2 bulan"],
  ]
));
bodyChildren.push(caption("Tabel 7. Unit economics target"));

// 8. Rencana Pemasaran
bodyChildren.push(h1("8. Rencana Pemasaran & Biaya"));
bodyChildren.push(makeTable(
  ["Fase", "Bulan", "Aktivitas", "Budget", "Target"],
  [
    ["Foundation", "1–3", "Konten, SEO, komunitas, cold outreach", "Rp 6 juta", "10–15 pelanggan"],
    ["Accelerate", "4–6", "Google Ads, Meta, referral, webinar", "Rp 30 juta", "20 pelanggan baru"],
    ["Scale", "7–12", "Paid scale, partnership, 1 sales", "Rp 100 juta", "50+ pelanggan baru"],
  ]
));
bodyChildren.push(caption("Tabel 8. Rencana pemasaran 12 bulan (skenario moderat)"));
bodyChildren.push(body("Total biaya pemasaran 12 bulan sekitar Rp 135 juta pada skenario moderat, dengan CAC target Rp 400–800 ribu. Mulailah dengan budget kecil (Rp 6 juta untuk 3 bulan) sebelum product-market fit terbukti."));

// 9. Risiko
bodyChildren.push(h1("9. Risiko & Mitigasi"));
bodyChildren.push(makeTable(
  ["Risiko", "Level", "Mitigasi"],
  [
    ["Nexius AI sudah menjual value serupa", "Tinggi", "Riset mendalam; diferensiasi multi-dokumen & human-review; pantau peluncuran mereka"],
    ["Rekeningkoran.com lebih murah", "Sedang", "Jangan lawan di harga; jual kelengkapan (jurnal + laporan + SPT)"],
    ["Akurasi mapping jurnal", "Sedang", "Human-in-the-loop (draft + review) sebagai desain inti; garansi kualitas"],
    ["Churn pelanggan", "Sedang", "Paket tahunan diskon; data portability (export selalu tersedia)"],
    ["Kenaikan AI cost", "Rendah–sedang", "Model routing Rp 70/transaksi; monitoring margin bulanan"],
    ["Software akuntansi menambah fitur AI", "Rendah–sedang", "Fokus ke otomasi dokumen (input), bukan pencatatan"],
  ]
));
bodyChildren.push(caption("Tabel 9. Risiko dan mitigasi"));

// 10. Rekomendasi
bodyChildren.push(h1("10. Rekomendasi"));
bodyChildren.push(bullet("Jalankan dual-track: tetap jual ke KAP (ARPU tinggi, churn rendah) dan buka self-serve direct (volume), bukan memilih salah satu."));
bodyChildren.push(bullet("Fitur wajib sebelum launch direct: self-serve signup + payment, export CSV jurnal (format Accurate/Jurnal.id), landing page dengan kalkulator ROI."));
bodyChildren.push(bullet("Riset Nexius AI lebih dalam minggu ini — harga, akurasi, dan target pasar mereka. Ini kompetitor paling mirip."));
bodyChildren.push(bullet("Uji pricing 2 bulan pertama: 30 pelanggan pertama dengan dua harga (Rp 250/transaksi vs paket Rp 500 ribu) untuk melihat mana yang konversinya lebih baik."));
bodyChildren.push(bullet("Budget konservatif: mulai Rp 6 juta untuk 3 bulan pertama, jangan langsung besar sebelum product-market fit terbukti."));

// 11. Lampiran
bodyChildren.push(h1("11. Lampiran: Sumber Riset"));
for (const s of [
  "IAPI via ddtc.co.id — jumlah akuntan publik (Mei 2025)",
  "Kemenkop via kadin.id — UMKM non-pertanian 2025",
  "BPS via techinasia.com — 84,8% UMKM tanpa laporan keuangan",
  "DJP via umkm.go.id — wajib pajak UMKM aktif 4,2 juta",
  "jurnal.id / akuntansiterbaik.com — harga kompetitor",
  "scamadviser.com — penilaian traffic rekeningkoran.com",
  "Situs rekeningkoran.com, nexiusai.com, Instagram @nexius.id (dibuka langsung Agustus 2026)",
]) {
  bodyChildren.push(bullet(s));
}
bodyChildren.push(body("Keterbatasan data: jumlah pelanggan rekeningkoran.com tidak tersedia publik; estimasi pengguna (300–1.500/bulan) merupakan perkiraan kasar dari sinyal traffic dan klaim situs. Angka ARPU, CAC, dan proyeksi adalah asumsi model yang harus divalidasi dengan data aktual tiga bulan pertama."));

// ═══════════════════════════════════════════════
// ASSEMBLE
// ═══════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: FONT_EN, eastAsia: FONT_CN }, size: 24, color: "000000" },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: coverChildren,
    },
    {
      properties: {
        page: { size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT }, margin: { top: 1440, bottom: 1440, left: 1797, right: 1797 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Analisa Bisnis Praktis — Confidential", size: 16, color: c("808890"), font: { ascii: FONT_EN, eastAsia: FONT_CN } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: { ascii: FONT_EN } })],
          })],
        }),
      },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = "/Users/staff/.openclaw-autoclaw/workspace/output/praktis-bisnis/Analisa Bisnis Praktis.docx";
  fs.writeFileSync(out, buf);
  console.log("✅ Saved:", out);
});
