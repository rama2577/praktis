import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { listKnowledgeEntries } from "@/server/knowledge";
import { KnowledgeBrowser } from "@/components/knowledge/knowledge-browser";
import { KnowledgeAdmin } from "@/components/knowledge/knowledge-admin";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const KB_EDITORS: Role[] = [Role.ADMIN, Role.PARTNER, Role.SENIOR];

export default async function KnowledgePage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const entries = await listKnowledgeEntries();
  const canEdit = KB_EDITORS.includes(session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Knowledge Base</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aturan akuntansi Indonesia (COA, PPN/PPh, PSAK, template jurnal) — versi terkelola dengan
          tanggal efektif & persetujuan Senior/Partner.
        </p>
      </div>

      <KnowledgeAdmin canEdit={canEdit} />

      <div className="pt-2">
        <h2 className="text-sm font-semibold">Isi Referensi</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Konten lengkap aturan yang dipakai rule engine & prompt AI.
        </p>
        <div className="mt-3">
          <KnowledgeBrowser entries={entries} />
        </div>
      </div>
    </div>
  );
}
