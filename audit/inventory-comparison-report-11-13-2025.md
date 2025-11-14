# Inventory Data Comparison Report
**Date:** 11/13/2025  
**Source File:** Well Crafted Wine & Beverage Co. inventory as at 2025-11-13.csv

---

## Executive Summary

**✅ Data discrepancies detected.** 10 of 1079 SKUs (0.9%) differ by more than 10 bottles between Well Crafted and the CRM exports.

### Key Findings

| Metric | Value |
|--------|-------|
| **Total SKUs in Well Crafted Source** | 1,079 |
| **Total SKUs in Catalog (eligible)** | 1,290 |
| **Total SKUs in Inventory** | 1,067 |
| **SKUs with accurate translation** | 1,051 (97.4%) |
| **SKUs with large discrepancies (>10 bottles)** | 10 (0.9%) |
| **Catalog-Inventory consistency** | 99.7% |

---

## coverage gaps

- **Missing from catalog:** 4 SKUs with stock in Well Crafted do not appear in the catalog export.
- **Missing from inventory:** 0 SKUs have no inventory rows in the CRM export.
- **Extra catalog SKUs:** 1 SKUs appear in catalog but not in the Well Crafted source (legacy or mismatched codes).

---

## Critical Quantity Discrepancies

Top 15 SKUs with the largest delta between Well Crafted bottles and catalog availability:

| SKU | WC Bottles | Catalog Available | Difference | % Error | Product |
|-----|------------|-------------------|------------|---------|---------|
| **RIO1080** | 3,293.00 | 0.00 | **-3,293.00** | -100.0% | Naúm |
| **SPA1143** | 226.00 | 46.00 | **-180.00** | -79.6% | Pilgrim Mencia |
| **RIO1044** | 129.00 | 0.00 | **-129.00** | -100.0% | GAR |
| **SPA1358** | 173.00 | 53.00 | **-120.00** | -69.4% | Lolea Floral Spritz |
| **SPA1257** | 258.00 | 162.00 | **-96.00** | -37.2% | Rose Sparkling |
| **PL1001** | -44.00 | 0.00 | **44.00** | -100.0% | Private Label Installment |
| **SAF1101** | 83.00 | 47.00 | **-36.00** | -43.4% | Smuggled Vines Chardonnay |
| **SPA1070** | 697.00 | 661.00 | **-36.00** | -5.2% | Sameiras Blanco |
| **FRA1086** | -30.96 | 0.00 | **30.96** | -100.0% | Orange |
| **SPA1249** | 22.00 | 0.00 | **-22.00** | -100.0% | Rose |
| **FRA1071** | 22.00 | 0.00 | **-22.00** | -100.0% | iCI |
| **Shipping1001** | -15.00 | 0.00 | **15.00** | -100.0% | Shipping- Domestic |
| **SPA1359** | 268.00 | 256.00 | **-12.00** | -4.5% | Lolea Citrus Spritz |
| **FRA1108** | -9.00 | 0.00 | **9.00** | -100.0% | Pinot Noir Cuvee Reserve |
| **BOX1001** | 17.00 | 10.00 | **-7.00** | -41.2% | Wooden Gift Box Abadia de Acon 6 Bottle |
