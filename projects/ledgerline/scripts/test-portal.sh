#!/bin/bash
# Test portal export — baca token dari DB (hindari masking).
cd "$(dirname "$0")/.."
TOKEN=*** -e "
import { prisma } from './src/lib/db';
(async () => {
  const t = await prisma.clientPortalToken.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!t) { console.log('No token found'); return; }
  console.log(t.token);
  await prisma.\$disconnect();
})();" 2>/dev/null)
echo "Token: ${TOKEN:0:12}..."
echo "--- Portal Page ---"
curl -s "http://localhost:3000/portal/$TOKEN" | grep -o "PT Maju Jaya\|Ekspor Laporan\|📄\|📊\|📈" | sort -u
echo ""
echo "--- PDF ---"
curl -sI "http://localhost:3000/api/portal/$TOKEN/reports?format=pdf" | grep -E "HTTP|Content-Type|Content-Disposition"
echo ""
echo "--- CSV (5 lines) ---"
curl -s "http://localhost:3000/api/portal/$TOKEN/reports?format=csv" | head -5
