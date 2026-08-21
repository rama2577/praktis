# Business Events Registry

Versi: 1.0

## Cara Menggunakan
1. Dari data mentah, identifikasi keyword dan konteks
2. Cocokkan dengan trigger keywords
3. Jika ambiguous, pilih confidence tertinggi
4. Tidak cocok → UNKNOWN_EVENT

---

## EVENT 1: CASH_SALE (Penjualan Tunai)
**Code:** EV-001 | **PSAK:** PSAK 72 | **Nature:** Revenue

### Trigger Keywords
- Kas masuk + invoice + tidak ada piutang
- "TRF DARI CUSTOMER", "SETORAN TUNAI", "PENJUALAN TUNAI"

### Journal Template
| Debit | Kredit | Kondisi |
|---|---|---|
| Kas/Bank | | Selalu |
| | Pendapatan Penjualan | Nominal / 1.11 (PKP) atau nominal (non-PKP) |
| | PPN Keluaran | Jika PKP: nominal × 11/111 |

**Confidence Base:** 75 (+15 invoice, +10 DO)

---

## EVENT 2: CREDIT_SALE (Penjualan Kredit)
**Code:** EV-002 | **PSAK:** PSAK 72

### Trigger Keywords
- Invoice tanpa kas masuk, "PIUTANG", "TERM 30"

### Journal Template
| Debit | Kredit |
|---|---|
| Piutang Usaha | |
| | Pendapatan Penjualan (DPP) |
| | PPN Keluaran (jika PKP) |

**Confidence Base:** 70 (+20 PO+DO)

---

## EVENT 3: AR_COLLECTION (Penerimaan Piutang)
**Code:** EV-003 | **PSAK:** PSAK 71

### Trigger Keywords
- Kas masuk + referensi invoice sebelumnya, "PELUNASAN"

### Journal Template
| Debit | Kredit |
|---|---|
| Kas/Bank | |
| Beban Diskon | | (jika ada) |
| | Piutang Usaha |

**Confidence Base:** 80 (+15 dengan ref invoice)

---

## EVENT 4: PURCHASE_INVENTORY (Pembelian Persediaan)
**Code:** EV-004 | **PSAK:** PSAK 14

### Trigger Keywords
- Kas keluar + pembelian barang, "BELI", "SUPPLIER"

### Journal Template
| Debit | Kredit |
|---|---|
| Persediaan Barang Dagangan | | (DPP) |
| PPN Masukan | | (jika PKP + Faktur Pajak) |
| | Kas/Bank / Utang Usaha |

**Confidence Base:** 70 (+15 Faktur Pajak)

---

## EVENT 5: PURCHASE_EXPENSE (Pembelian Beban)
**Code:** EV-005 | **PSAK:** PSAK 1

### Trigger Keywords
- Kas keluar + beban, "BAYAR LISTRIK", "BEBAN"

### Journal Template
| Debit | Kredit |
|---|---|
| Beban [jenis] | | (DPP) |
| PPN Masukan | | (jika deductible) |
| | Kas/Bank |

**Confidence Base:** 65 (+20 invoice lengkap)

---

## EVENT 6: PAYROLL (Penggajian)
**Code:** EV-006 | **PSAK:** PSAK 68

### Trigger Keywords
- Kas keluar + gaji, "GAJI", "PAYROLL"

### Journal Template (Net Pay)
| Debit | Kredit |
|---|---|
| Beban Gaji | | (bruto) |
| Beban Tunjangan | | |
| | Kas/Bank | (net) |
| | Utang PPh 21 | |
| | Utang BPJS (employee) | |

**Confidence Base:** 75 (+15 slip gaji)

---

## EVENT 7: TAX_PAYMENT_PPH21 (Setoran PPh 21)
**Code:** EV-007

| Debit | Kredit |
|---|---|
| Utang PPh 21 | |
| | Kas/Bank |

**Confidence:** 90 (deterministic)

---

## EVENT 8: MONTHLY_DEPRECIATION (Penyusutan Bulanan)
**Code:** EV-008 | **PSAK:** PSAK 16

| Debit | Kredit |
|---|---|
| Beban Penyusutan [kategori] | |
| | Akum Penyusutan [kategori] |

**Confidence:** 95 (deterministic)

---

## EVENT 9: PREPAID_ALLOCATION (Alokasi Biaya Dibayar Dimuka)
**Code:** EV-009

| Debit | Kredit |
|---|---|
| Beban [jenis] | |
| | Biaya Dibayar Dimuka |

**Confidence:** 90

---

## EVENT 10: ACCRUAL (Akrual Beban)
**Code:** EV-010

| Debit | Kredit |
|---|---|
| Beban [jenis] | |
| | Utang [jenis] |

**Confidence:** 70 (+15 data pendukung)

---

## EVENT 11: LOAN_INSTALLMENT (Angsuran Loan)
**Code:** EV-011 | **PSAK:** PSAK 30

### Trigger Keywords
- Kas keluar + "ANGSURAN", "CICILAN"

| Debit | Kredit |
|---|---|
| Utang Bank | | (pokok) |
| Beban Bunga | | |
| | Kas/Bank |

**Confidence:** 75 (+15 loan schedule)

---

## EVENT 12: TAX_PAYMENT_PPN (Setoran PPN)
**Code:** EV-012

| Debit | Kredit |
|---|---|
| PPN Keluaran | |
| | PPN Masukan |
| | Kas/Bank |

**Confidence:** 90

---

## EVENT 13: OWNER_DRAWING (Prive)
**Code:** EV-013 | ⚠️ SELALU KONFIRMASI

| Debit | Kredit |
|---|---|
| Prive | |
| | Kas/Bank |

**Confidence:** 60

---

## EVENT 14: OWNER_CONTRIBUTION (Setoran Modal)
**Code:** EV-014

| Debit | Kredit |
|---|---|
| Kas/Bank | |
| | Modal Disetor |

**Confidence:** 65

---

## EVENT 15: MARKETPLACE_SETTLEMENT
**Code:** EV-015 | **PSAK:** PSAK 72

### Trigger Keywords
- Kas masuk + "SHOPEE", "TOKOPEDIA", "LAZADA"

| Debit | Kredit |
|---|---|
| Kas/Bank | | (net) |
| Beban Komisi Marketplace | | (fee) |
| PPh 23/26 Dibayar Dimuka | | (pph) |
| | Pendapatan Penjualan | (gross/1.11 PKP) |
| | PPN Keluaran | (jika PKP) |

**Confidence:** 65 (+20 settlement report)

---

## EVENT 16: OJOL_SETTLEMENT (Gojek/GrabFood)
**Code:** EV-016

### Trigger Keywords
- Kas masuk + "GOJEK", "GRABFOOD"

| Debit | Kredit |
|---|---|
| Kas/Bank | | (net) |
| Beban Komisi Ojol | | (fee) |
| PPh 23 Dibayar Dimuka | | |
| | Pendapatan Penjualan | |
| | PPN Keluaran | |

**Confidence:** 65 (+20 settlement report)

---

## EVENT 17: CASH_EXPENSE (Pengeluaran Kas Kecil)
**Code:** EV-017

| Debit | Kredit |
|---|---|
| Beban [jenis] | |
| | Kas Kecil |

---

## EVENT 18: BANK_TRANSFER (Mutasi Antar Bank)
**Code:** EV-018

| Debit | Kredit |
|---|---|
| Kas Bank [tujuan] | |
| | Kas Bank [asal] |

**Confidence:** 95

---

## EVENT 19: REIMBURSEMENT (Reimbursement Karyawan)
**Code:** EV-019

| Debit | Kredit |
|---|---|
| Beban [jenis] | |
| | Kas/Bank |

**Confidence:** 70 (+15 nota lengkap)

---

## EVENT 20: RETURN_REFUND (Return ke Customer)
**Code:** EV-020 | **PSAK:** PSAK 72

| Debit | Kredit |
|---|---|
| Pendapatan Penjualan | | (reversal) |
| PPN Keluaran | | (reverse PPN) |
| | Kas/Bank |

**Confidence:** 75 (+15 bukti return)

---

## EVENT 21: INVENTORY_ADJUSTMENT
**Code:** EV-021 | **PSAK:** PSAK 14

Kekurangan: HPP (D) / Persediaan (K)
Kelebihan: Persediaan (D) / HPP (K)

**Confidence:** 70 (+20 berita acara stock opname)

---

## EVENT 22: FIXED_ASSET_ACQUISITION
**Code:** EV-022 | **PSAK:** PSAK 16

| Debit | Kredit |
|---|---|
| Aset Tetap [kategori] | | (cost) |
| PPN Masukan | | (jika dikredit) |
| | Kas/Bank / Utang |

**Confidence:** 75 (+15 Faktur Pajak)

---

## EVENT 23: FIXED_ASSET_DISPOSAL
**Code:** EV-023 | **PSAK:** PSAK 16

| Debit | Kredit |
|---|---|
| Kas/Bank | | (proceeds) |
| Akum Penyusutan | | |
| | Aset Tetap | (cost) |
| | Laba / Rugi | (gain/loss) |

**Confidence:** 70 (+15 bukti jual)