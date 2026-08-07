FILE 5: business-events.md
Business Events Registry
Versi: 1.0
Terakhir diupdate: 2025-01
Cara Menggunakan Registry Ini
Dari data mentah, identifikasi keyword dan konteks
Cocokkan dengan trigger keywords di bawah
Jika ambiguous, pilih yang confidence-nya paling tinggi
Jika tidak ada yang cocok, flag sebagai UNKNOWN_EVENT

EVENT 1: CASH_SALE (Penjualan Tunai)
Code: EV-001PSAK: PSAK 72Nature: Revenue
Trigger Keywords:
Kas masuk + invoice penjualan + tidak ada piutang
"TRF DARI CUSTOMER", "SETORAN TUNAI", "PENJUALAN TUNAI"
POS settlement, kas register
Journal Template:
Debit
Kredit
Kondisi
Kas/Bank

Selalu

Pendapatan Penjualan
Nominal / 1.11 jika PKP, nominal jika non-PKP

PPN Keluaran
Jika PKP: nominal × 11/111
Documents Required: Invoice, Bukti Kas Masuk, DO (jika ada)Confidence Base: 75 (naik +15 dengan invoice, +10 dengan DO)

EVENT 2: CREDIT_SALE (Penjualan Kredit)
Code: EV-002PSAK: PSAK 71/72Nature: Revenue + Receivable
Trigger Keywords:
Invoice penjualan tanpa kas masuk
"PIUTANG", "INV-", "FBL-" (SAP), "AR-"
Journal Template:
Debit
Kredit
Kondisi
Piutang Usaha

Full amount

Pendapatan Penjualan
Tanpa PPN

PPN Keluaran
Jika PKP
Documents Required: Invoice, DO, Terms of paymentConfidence Base: 70 (naik +15 dengan invoice, +10 dengan DO, +5 jika customer known)

EVENT 3: CASH_RECEIPT_FROM_AR (Penerimaan Piutang)
Code: EV-003PSAK: PSAK 71Nature: Settlement
Trigger Keywords:
Kas masuk + ada piutang outstanding
"PELUNASAN", "PEMBAYARAN CUSTOMER", "TRF DARI [customer name]"
Journal Template:
Debit
Kredit
Kondisi
Kas/Bank

Amount received

Piutang Usaha
Amount received
Beban Diskon Penjualan

Jika ada potongan
Documents Required: Bukti Kas Masuk, Remittance adviceConfidence Base: 80 (naik +10 jika cocok dengan invoice outstanding)

EVENT 4: PURCHASE_INVENTORY (Pembelian Persediaan)
Code: EV-004PSAK: PSAK 14Nature: Inventory acquisition
Trigger Keywords:
Kas keluar ke supplier barang + ada inventory
"TRF KE SUPPLIER", "PEMBELIAN BARANG", "PURCHASE", "PO-"
Journal Template:
Debit
Kredit
Kondisi
Persediaan

HPP (tanpa PPN)
PPN Masukan

Jika ada Faktur Pajak

Kas/Bank
Total payment

Utang Usaha
Jika kredit
Documents Required: Invoice supplier, PO, GRN (Goods Received Note), Faktur PajakConfidence Base: 80 (naik +10 dengan PO match, +5 dengan GRN)

EVENT 5: PURCHASE_EXPENSE (Pembelian Beban)
Code: EV-005PSAK: PSAK 1 (expense recognition)Nature: Expense
Trigger Keywords:
Kas keluar untuk beban operasional
"PLN", "PDAM", "INTERNET", "SEWA", "ASURANSI", "MAINTENANCE"
Journal Template:
Debit
Kredit
Kondisi
Beban [jenis]

Amount
PPN Masukan

Jika ada dan dapat dikredit

Kas/Bank
Total payment
Documents Required: Invoice, Bukti Kas Keluar, Faktur Pajak (jika PPN)Confidence Base: 85 (naik +10 jika vendor known, +5 jika recurring pattern)

EVENT 6: PAYROLL (Penggajian)
Code: EV-006PSAK: PSAK 68Nature: Compensation expense
Trigger Keywords:
"GAJI", "PAYROLL", "SALARY", "BPJS", "THR"
Journal Template (Net pay):
Debit
Kredit
Kondisi
Beban Gaji

Bruto
Beban Tunjangan

Jika ada

Kas/Bank
Net pay

Utang PPh 21
PPh 21 dipotong

Utang BPJS Kesehatan
Jika ada

Utang BPJS Ketenagakerjaan
Jika ada
Journal Template (Employer BPJS):
Debit
Kredit
Kondisi
Beban BPJS Kesehatan (employer)

4% × bruto
Beban BPJS Ketenagakerjaan (employer)

Sesuai skema

Utang BPJS Kesehatan


Utang BPJS Ketenagakerjaan

Documents Required: Slip gaji, Bukti transfer, Daftar gajiConfidence Base: 90 (naik +5 jika nominal konsisten bulan lalu)

EVENT 7: ASSET_PURCHASE (Pembelian Aset Tetap)
Code: EV-007PSAK: PSAK 16 / ISAK 35Nature: Capital expenditure
Trigger Keywords:
Pembelian > threshold materialitas + aset jangka panjang
"KENDARAAN", "MOBIL", "MESIN", "KOMPUTER", "LAPTOP", "PERALATAN"
Journal Template:
Debit
Kredit
Kondisi
Aset Tetap [kategori]

Cost
PPN Masukan

Jika dapat dikredit

Kas/Bank
Total payment

Utang Usaha
Jika kredit
Decision: Aset vs Beban:
Jika useful life > 1 tahun DAN cost > materialitas → Aset Tetap
Jika cost < materialitas → Beban langsung
Materialitas default: Rp 2.000.000 (sesuai materiality-rules.md)
Documents Required: Invoice, BAST, Faktur Pajak, ApprovalConfidence Base: 70 (naik +15 dengan approval, +10 jika kategori jelas)

EVENT 8: DEPRECIATION (Penyusutan)
Code: EV-008PSAK: PSAK 16Nature: Allocation
Trigger: End of month, aset tetap ada di registerMethod: Garis lurus (default) — (Cost - Salvage) / Useful Life / 12
Journal Template:
Debit
Kredit
Kondisi
Beban Penyusutan [kategori]

Monthly dep

Akum Penyusutan [kategori]
Monthly dep
Confidence Base: 95 (deterministic dari asset register)

EVENT 9: AMORTIZATION (Amortisasi)
Code: EV-009PSAK: ISAK 35Nature: Allocation
Trigger: End of month, aset tidak berwujud adaMethod: Garis lurus — Cost / Useful Life / 12
Journal Template:
Debit
Kredit
Kondisi
Beban Amortisasi [jenis]

Monthly amort

Akum Amortisasi [jenis]
Monthly amort
Confidence Base: 95 (deterministic)

EVENT 10: LOAN_PROCEEDS (Penerimaan Pinjaman)
Code: EV-010PSAK: PSAK 73 (jika lease) / PSAK 30Nature: Financing
Trigger Keywords:
Kas masuk dari bank/creditor besar, bukan dari customer
"CREDIT LOAN", "FACILITY", "PENCAIRAN KREDIT", "TRF DARI BANK [loan]"
Journal Template:
Debit
Kredit
Kondisi
Kas/Bank

Proceeds

Utang Bank
Principal
Beban Bunga (if prepaid)

Jika ada biaya provisi/admin
Documents Required: Loan agreement, Bukti pencairanConfidence Base: 65 (selalu konfirmasi — nominal besar)

EVENT 11: LOAN_PAYMENT (Angsuran Pinjaman)
Code: EV-011PSAK: PSAK 73Nature: Debt service
Trigger Keywords:
"ANGSURAN", "CICILAN", "LOAN PAYMENT", "TRF KE BANK [loan]"
Transfer ke creditor yang ada di loan schedule
Journal Template:
Debit
Kredit
Kondisi
Utang Bank (pokok)

Pokok
Beban Bunga

Bunga

Kas/Bank
Total installment
Processing:
Ambil outstanding balance dari loan schedule
Hitung bunga: Outstanding × rate × (days/365)
Pokok = Installment - Bunga
Validasi: Pokok + Bunga = Total payment
Documents Required: Bukti transfer, Loan statementConfidence Base: 85 (naik +10 jika cocok dengan loan schedule)

EVENT 12: TAX_PAYMENT (Setoran Pajak)
Code: EV-012Nature: Tax settlement
Trigger Keywords:
"SETOR PPh", "SETOR PPN", "SPT", "SSP", "MPN"
Journal Template (PPh 21):
Debit
Kredit
Utang PPh 21


Kas/Bank
Journal Template (PPh 23):
Debit
Kredit
Utang PPh 23


Kas/Bank
Journal Template (PPh 25):
Debit
Kredit
Utang PPh 25


Kas/Bank
Journal Template (PPN Kurang Bayar):
Debit
Kredit
PPN Keluaran
Total PPN Keluaran

PPN Masukan

Kas/Bank
Confidence Base: 85

EVENT 13: OWNER_DRAWING (Prive)
Code: EV-013Nature: Equity reduction
Trigger Keywords:
Transfer ke rekening pribadi pemilik/direktur
"PRIVE", "DRAWING", "TRF KE [nama pemilik]"
⚠️ SELALU FLAG untuk konfirmasi
Journal Template:
Debit
Kredit
Kondisi
Prive

Seluruh amount

Kas/Bank

Confidence Base: 55 — SELALU minta konfirmasi:
"Apakah ini prive/drawing atau ada tujuan bisnis?"
"Jika tujuan bisnis, mohon jelaskan untuk klasifikasi akun yang tepat"

EVENT 14: OWNER_CAPITAL (Setoran Modal)
Code: EV-014Nature: Equity increase
Trigger Keywords:
Kas masuk dari pemilik, bukan dari customer
"SETORAN MODAL", "INVESTASI", "TRF DARI [nama pemilik]"
Journal Template:
Debit
Kredit
Kas/Bank


Modal Disetor
Confidence Base: 60 — Konfirmasi: "Apakah ini setoran modal atau loan dari pemilik?"

EVENT 15: MARKETPLACE_SETTLEMENT (Pencairan Marketplace)
Code: EV-015PSAK: PSAK 72Nature: Revenue settlement
Trigger Keywords:
"SHOPEE", "TOKOPEDIA", "LAZADA", "BUKALAPAK", "BLIBLI"
Settlement report / saldo diterima
Journal Template (Detail per settlement):
Debit
Kredit
Kondisi
Kas/Bank

Net received
Beban Komisi Marketplace

Komisi/fee
PPh 23/26 Dibayar Dimuka

PPh dipotong MP

Pendapatan Penjualan
Gross / 1.11 jika PKP

PPN Keluaran
Jika PKP
Notes:
Shopee: Komisi ~6-8%, PPh 23 0.5% (badan) atau 0.5% (UMKM)
Tokopedia: Komisi ~8-10%, PPh mirip
Lazada: Komisi ~2-5%
WAJIB minta settlement report resmi untuk akurasi
Confidence Base: 75 (naik +15 dengan settlement report, -10 tanpa report)

EVENT 16: OJOL_FOOD_SETTLEMENT (Pencairan Ojol Food)
Code: EV-016PSAK: PSAK 72Nature: Revenue settlement (F&B specific)
Trigger Keywords:
"GOFOOD", "GRABFOOD", "SHOPEEFOOD"
Journal Template:
Debit
Kredit
Kondisi
Kas/Bank

Net received
Beban Komisi Gojek/Grab

Commission
PPh Dibayar Dimuka

PPh dipotong

Pendapatan Penjualan Delivery
Revenue

PPN Keluaran
Jika PKP
Confidence Base: 70 (naik +15 dengan settlement report)

EVENT 17: CREDIT_NOTE_SALES (Retur/Potongan Penjualan)
Code: EV-017PSAK: PSAK 72Nature: Revenue reduction
Trigger Keywords:
"RETUR", "CREDIT NOTE", "POTONGAN", "REFUND"
Journal Template:
Debit
Kredit
Kondisi
Pendapatan Penjualan

Reduction
PPN Keluaran

Jika ada

Kas/Bank / Piutang
Amount
Confidence Base: 70 (naik +15 dengan credit note doc, +10 jika cocok dengan original invoice)

EVENT 18: EXCHANGE_GAIN_LOSS (Selisih Kurs)
Code: EV-018PSAK: PSAK 10Nature: FX effect
Trigger:
Transaksi valas, kurs realisasi ≠ kurs record
Journal Template (Gain):
Debit
Kredit
Kas/Bank
Actual received

Piutang/Utang

Pendapatan Selisih Kurs
Journal Template (Loss):
Debit
Kredit
Kas/Bank
Actual received
Beban Selisih Kurs
Difference

Piutang/Utang
Confidence Base: 80

EVENT 19: LEASE_PAYMENT (Sewa/Bayar Sewa)
Code: EV-019PSAK: PSAK 73Nature: Lease
Trigger Keywords:
"SEWA", "RENT", "LEASE", "TRF KE [lessor name]"
Decision: Operating vs Finance Lease:
Jika ownership transfer / BPO / lease ≥ 75% useful life / PV ≥ 90% asset → Finance
Otherwise → Operating
Journal Template (Operating Lease - PSAK 73 simplified for SME):
Debit
Kredit
Kondisi
Beban Sewa

Monthly rent

Kas/Bank

Journal Template (Finance Lease - full PSAK 73):
Debit
Kredit
Kondisi
Beban Sewa

Interest component
Kewajiban Sewa

Principal component

Kas/Bank
Total payment
Confidence Base: 80 (naik +10 jika kontrak sewa available, -15 jika tanpa kontrak)

EVENT 20: BPJS_PAYMENT (Setoran BPJS)
Code: EV-020Nature: Social security
Trigger Keywords:
"BPJS", "KESEHATAN", "KETENAGAKERJAAN", "IURAN"
Journal Template:
Debit
Kredit
Kondisi
Utang BPJS Kesehatan

Jika employer + employee
Utang BPJS Ketenagakerjaan

Jika employer + employee

Kas/Bank
Total
Confidence Base: 90

EVENT 21: INSURANCE_PAYMENT (Bayar Asuransi)
Code: EV-021Nature: Insurance
Trigger Keywords:
"ASURANSI", "PREMI", "INSURANCE"
Journal Template:
Debit
Kredit
Kondisi
Asuransi Dibayar Dimuka

Jika multi-period
Beban Asuransi

Jika period benefit

Kas/Bank
Total
Confidence Base: 80

EVENT 22: TRANSFER_BETWEEN_BANK (Mutasi Antar Bank)
Code: EV-022Nature: Transfer
Trigger:
Kas keluar dari bank A + kas masuk di bank B, nominal sama, tanggal sama
Journal Template:
Debit
Kredit
Kas Bank [tujuan]


Kas Bank [asal]
Confidence Base: 95 (deterministic — harus match)

EVENT 23: UNKNOWN_EVENT
Code: EV-099Nature: Unclassified
Trigger:
Tidak ada keyword yang cocok
Tidak ada pattern yang dikenali
Journal Template:
Debit
Kredit
Suspense Account
???

Kas/Bank
⚠️ SELALU kirim ke human review. Confidence: 0Jangan pernah tebak akun. Berikan daftar kemungkinan + alasan masing-masing.


