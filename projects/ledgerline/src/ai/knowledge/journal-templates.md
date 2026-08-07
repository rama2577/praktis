# Journal Entry Templates — Versi 1.0

## T-001: Penjualan Tunai (PKP)
| Debit | Kredit | Amount |
|---|---|---|
| {bank} | | {amount} |
| | {revenue} | {amount}×100/111 |
| | PPN Keluaran | {amount}×11/111 |

## T-002: Penjualan Tunai (Non-PKP)
| Debit | Kredit |
|---|---|
| {bank} | |
| | {revenue} |

## T-003: Penjualan Kredit (PKP)
| Debit | Kredit |
|---|---|
| Piutang Usaha | |
| | Pendapatan |
| | PPN Keluaran |

## T-004: Penerimaan Piutang
| Debit | Kredit |
|---|---|
| {bank} | |
| Beban Diskon | |
| | Piutang Usaha |

## T-005: Pembelian Persediaan (PPN dikredit)
| Debit | Kredit |
|---|---|
| Persediaan | | (DPP) |
| PPN Masukan | | |
| | {bank}/Utang |

## T-006: Pembelian Beban (PPN dikredit)
| Debit | Kredit |
|---|---|
| Beban {jenis} | | (DPP) |
| PPN Masukan | | |
| | {bank} |

## T-007: Pembelian Beban (PPN tidak dikredit)
| Debit | Kredit |
|---|---|
| Beban {jenis} | | (total) |
| | {bank} |

## T-008: Payroll Net Disbursement
| Debit | Kredit |
|---|---|
| Beban Gaji | | (bruto) |
| Beban Tunjangan | | |
| | Kas/Bank | (net) |
| | Utang PPh 21 | |
| | Utang BPJS | |

## T-009: Setoran PPh 21
| Debit | Kredit |
|---|---|
| Utang PPh 21 | |
| | Kas/Bank |

## T-010: Setoran BPJS
| Debit | Kredit |
|---|---|
| Utang BPJS Kes | |
| Utang BPJS TK | |
| | Kas/Bank |

## T-011: Marketplace Settlement (PKP)
| Debit | Kredit |
|---|---|
| Kas/Bank | | (net) |
| Beban Komisi | | (fee) |
| PPh 23 Dibayar Dimuka | | (pph) |
| | Pendapatan | (gross×100/111) |
| | PPN Keluaran | (gross×11/111) |

## T-012: Penyusutan Bulanan
| Debit | Kredit |
|---|---|
| Beban Penyusutan {kat} | |
| | Akum Penyusutan {kat} |

## T-013: Angsuran Loan
| Debit | Kredit |
|---|---|
| Utang Bank | | (pokok) |
| Beban Bunga | | |
| | Kas/Bank |

## T-014: Prive
| Debit | Kredit |
|---|---|
| Prive | |
| | Kas/Bank |

## T-015: Setoran Modal
| Debit | Kredit |
|---|---|
| Kas/Bank | |
| | Modal Disetor |

## T-016: Sewa Operating Lease
| Debit | Kredit |
|---|---|
| Beban Sewa | |
| | Kas/Bank |

## T-017: Pembelian Aset Tetap
| Debit | Kredit |
|---|---|
| Aset Tetap {kat} | | (cost) |
| PPN Masukan | | (jika dikredit) |
| | Kas/Bank |

## T-018: Penjualan Aset Tetap
| Debit | Kredit |
|---|---|
| Kas/Bank | | (proceeds) |
| Akum Penyusutan | | |
| | Aset Tetap | (cost) |
| | Laba/Rugi | |

## T-019: PPN Setoran KB
| Debit | Kredit |
|---|---|
| PPN Keluaran | |
| | PPN Masukan |
| | Kas/Bank |

## T-020: Mutasi Antar Bank
| Debit | Kredit |
|---|---|
| Kas Bank {tujuan} | |
| | Kas Bank {asal} |