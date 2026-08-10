/**
 * TD-14 — Email notification service.
 *
 * Dibangun di atas outbox EN-05. Saat SLA breach terdeteksi, notifikasi
 * dikirim via provider email yang dikonfigurasi. Fallback: log ke console.
 *
 * Provider didukung: Resend (fetch API), dan noop (dev).
 * Konfigurasi via env:
 *   EMAIL_PROVIDER=noop|resend
 *   EMAIL_FROM=noreply@praktis.id
 *   RESEND_API_KEY
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

type EmailProvider = (opts: EmailOptions) => Promise<void>;

const noopProvider: EmailProvider = async (opts) => {
  console.log("[email:noop] To:", opts.to, "| Subject:", opts.subject);
};

function createResendProvider(): EmailProvider {
  return async (opts) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[email:resend] RESEND_API_KEY not set, fallback to noop");
      return noopProvider(opts);
    }
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "noreply@praktis.id",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
  };
}

let cachedProvider: EmailProvider | null = null;

function getProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;
  const provider = process.env.EMAIL_PROVIDER ?? "noop";
  if (provider === "resend") cachedProvider = createResendProvider();
  else cachedProvider = noopProvider;
  return cachedProvider;
}

/**
 * Kirim email. No-op di dev (EMAIL_PROVIDER=noop).
 */
export async function sendEmail(opts: EmailOptions): Promise<void> {
  try {
    await getProvider()(opts);
  } catch (err) {
    console.error("[email] Failed to send:", err);
    throw err;
  }
}

/**
 * Template email SLA breach — Bahasa Indonesia.
 */
export function slaBreachEmailTemplate(params: {
  firmName: string;
  stage: string;
  journalId: string;
  actualMinutes: number;
  targetMinutes: number;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const stageLabel: Record<string, string> = {
    JUNIOR: "Review Junior",
    SENIOR: "Review Senior",
    TAX: "Review Pajak",
    PARTNER: "Persetujuan Partner",
  };

  return {
    subject: `⚠️ SLA Breach — ${stageLabel[params.stage] ?? params.stage} (${params.actualMinutes} menit)`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0b1120;color:#e5e9f2;border-radius:8px;border:1px solid #1e2a45;">
        <h2 style="color:#f5c518;margin:0 0 16px;">⚠️ SLA Breach Terdeteksi</h2>
        <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6;">
          Tahap <strong style="color:#e5e9f2;">${stageLabel[params.stage] ?? params.stage}</strong>
          pada jurnal <code style="background:#101a30;padding:2px 6px;border-radius:4px;font-size:13px;">${params.journalId}</code>
          telah melewati batas waktu SLA.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:8px 12px;border-bottom:1px solid #1e2a45;color:#94a3b8;">Aktual</td><td style="padding:8px 12px;border-bottom:1px solid #1e2a45;color:#ef4444;font-weight:600;">${params.actualMinutes} menit</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #1e2a45;color:#94a3b8;">Target</td><td style="padding:8px 12px;border-bottom:1px solid #1e2a45;color:#e5e9f2;">≤ ${params.targetMinutes} menit</td></tr>
          <tr><td style="padding:8px 12px;color:#94a3b8;">Firma</td><td style="padding:8px 12px;color:#e5e9f2;">${params.firmName}</td></tr>
        </table>
        <a href="${params.dashboardUrl}" style="display:inline-block;padding:10px 24px;background:#f5c518;color:#0b1120;text-decoration:none;border-radius:6px;font-weight:600;">
          Buka Dashboard
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#64748b;">
          Email otomatis dari <strong>Praktis</strong> — AI Bookkeeping Platform.
        </p>
      </div>
    `,
  };
}
