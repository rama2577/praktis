import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { listKnowledgeEntries } from "@/server/knowledge";
import { KnowledgeBrowser } from "@/components/knowledge/knowledge-browser";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  await requireRole(OPERATIONAL_ROLES);
  const entries = await listKnowledgeEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Knowledge Base</h1>
        <p className="mt-1 text-sm text-slate-400">
          Referensi akuntansi Indonesia yang menjadi sumber rule engine & prompt AI
          (salinan dari skill ledgerline): business events, template jurnal, COA, PPN/PPh, PSAK.
        </p>
      </div>

      <KnowledgeBrowser entries={entries} />
    </div>
  );
}
