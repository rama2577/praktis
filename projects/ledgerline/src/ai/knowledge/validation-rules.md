# Validation Rules — 22 Rules Deterministic

Versi: 1.0

## Hard Rules

**VR-001:** Debit = Kredit per entry
**VR-002:** Akun harus ada di COA
**VR-004:** Kas tidak boleh negative
**VR-008:** Period lock → reject
**VR-010:** Nature check: Aset=debit, Kewajiban=kredit, Ekuitas=kredit (kecuali Prive), Pendapatan=kredit, Beban=debit
**VR-015:** Persediaan tidak boleh negative

## Warning Rules

**VR-003:** Duplicate detection (tanggal+akun+nominal sama ±1%)
**VR-005:** No suspense tanpa approval
**VR-006:** PPN completeness (PK + PM check)
**VR-007:** PPh completeness (PPh 21/23 check)
**VR-009:** Materiality (>Rp 10jt → flag)
**VR-011:** Related party → disclosure
**VR-013:** Revenue before delivery → PSAK 72 review
**VR-014:** Lease classification (finance lease criteria)
**VR-016:** Fully depreciated → stop
**VR-017:** Bank reconciliation (±Rp 50rb tolerance)
**VR-018:** PPN reconciliation (end of period)
**VR-019:** Loan balance consistency
**VR-021:** GPM anomaly (±20% vs 3-month avg)
**VR-022:** Expense anomaly (±30% vs 3-month avg)

## Info Rules

**VR-020:** Sequential invoice check (gap detection)