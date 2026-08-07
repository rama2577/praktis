# Accounting Skills Library — Versi 1.0

## SK-001: RETAIL_CASH_SALE
**Event:** EV-001 | **Complexity:** Low | **Industry:** Retail, F&B

### Processing
1. PKP: PPN = nominal × 11/111, Revenue = nominal - PPN
2. Non-PKP: Revenue = nominal, PPN = 0
3. Generate entry, cek invoice, cek customer history

### Journal
| Debit | Kredit |
|---|---|
| Kas/Bank | |
| | Pendapatan Penjualan |
| | PPN Keluaran (jika PKP) |

### Confidence: +15 invoice+kas, -15 tanpa invoice, -30 first time >Rp 50M

---

## SK-002: MARKETPLACE_SALE
**Event:** EV-015 | **Complexity:** Medium

### Komisi Default
| MP | Fee | PPh |
|---|---|---|
| Shopee | 6-8% | 0.5%/2% |
| Tokopedia | 8-10% | 0.5%/2% |
| Lazada | 2-5% | 2% |

### Processing
1. Ada settlement report → pakai data report
2. Tidak ada → estimasi, flag minta report
3. PKP: Revenue = Gross/1.11

### Journal
| Debit | Kredit |
|---|---|
| Kas/Bank | | (net) |
| Beban Komisi | | (fee) |
| PPh 23 Dibayar Dimuka | | |
| | Pendapatan | (gross/1.11) |
| | PPN Keluaran | |

### Confidence: +20 report resmi, -15 tanpa report

---

## SK-003: PAYROLL_PROCESSING
**Event:** EV-006 | **Complexity:** Medium | **Industry:** All

### Processing
1. Sum bruto + tunjangan
2. Sum PPh 21 + BPJS employee
3. Net = Bruto + Tunjangan - PPh 21 - BPJS employee

### Journal — Net Pay
| Debit | Kredit |
|---|---|
| Beban Gaji | | (bruto) |
| Beban Tunjangan | | |
| | Kas/Bank | (net) |
| | Utang PPh 21 | |
| | Utang BPJS | |

### Journal — Employer BPJS
| Debit | Kredit |
|---|---|
| Beban BPJS Kes | | (4% bruto) |
| Beban BPJS TK | | |
| | Utang BPJS | |

### Confidence: +10 slip lengkap, +10 konsisten ±5%

---

## SK-004: PURCHASE_WITH_VAT
**Event:** EV-004/EV-005 | **Complexity:** Low

### Processing
1. Incl PPN → DPP = total/1.11, excl PPN → DPP = total
2. Klasifikasi: Persediaan/Beban/Aset
3. Cek Faktur Pajak → tidak ada = PPN tidak dikredit

### PPN Dikredit: barang dijual, beban operasional
### PPN TIDAK Dikredit: entertainment, kendaraan tertentu, F&B karyawan

### Confidence: +15 Faktur Pajak, -20 tanpa Faktur Pajak

---

## SK-005: MONTHLY_DEPRECIATION
**Event:** EV-008 | **Complexity:** Low (deterministic)

### Useful Life Default
Bangunan 20-40, Kendaraan 5-8, Mesin 5-15, Peralatan Kantor 3-5, Komputer 3-4, Furniture 5, Software 3-5

### Processing
Monthly dep = (Cost - Salvage) / Useful life / 12
Skip if fully depreciated

### Confidence: 95

---

## SK-006: LOAN_INSTALLMENT
**Event:** EV-011 | **Complexity:** Medium

### Processing
1. Bunga = Outstanding × rate / 12
2. Pokok = Installment - Bunga
3. Update outstanding

| Debit | Kredit |
|---|---|
| Utang Bank | | (pokok) |
| Beban Bunga | | |
| | Kas/Bank | |

---

## SK-007: OWNER_TRANSACTION
**Event:** EV-013/EV-014 | ⚠️ SELALU KONFIRMASI

### Possible Treatments
| Debit | Kredit | Kondisi |
|---|---|---|
| Prive | Kas/Bank | Drawing |
| Kas/Bank | Modal Disetor | Setoran modal |
| Kas/Bank | Utang Lain-lain | Loan pemilik |

**Confidence:** ≤ 65

---

## SK-008: VAT_RECONCILIATION
**Complexity:** Medium | Industry: PKP only

### Output
| Item | Amount |
|---|---|
| PPN Keluaran | Rp X |
| PPN Masukan Dikredit | Rp Y |
| PPN KB/LB | Rp X-Y |

**Confidence:** 90