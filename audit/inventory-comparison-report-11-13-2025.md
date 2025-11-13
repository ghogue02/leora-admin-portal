# Inventory Data Comparison Report
**Date:** 11/13/2025  
**Source File:** Well Crafted Wine & Beverage Co. inventory as at 2025-11-13.csv

---

## Executive Summary

**🚨 Data discrepancies detected.** 62 of 1079 SKUs (5.7%) differ by more than 10 bottles between Well Crafted and the CRM exports.

### Key Findings

| Metric | Value |
|--------|-------|
| **Total SKUs in Well Crafted Source** | 1,079 |
| **Total SKUs in Catalog (eligible)** | 1,283 |
| **Total SKUs in Inventory** | 1,127 |
| **SKUs with accurate translation** | 992 (91.9%) |
| **SKUs with large discrepancies (>10 bottles)** | 62 (5.7%) |
| **Catalog-Inventory consistency** | 99.7% |

---

## coverage gaps

- **Missing from catalog:** 11 SKUs with stock in Well Crafted do not appear in the catalog export.
- **Missing from inventory:** 7 SKUs have no inventory rows in the CRM export.
- **Extra catalog SKUs:** 69 SKUs appear in catalog but not in the Well Crafted source (legacy or mismatched codes).

---

## Critical Quantity Discrepancies

Top 15 SKUs with the largest delta between Well Crafted bottles and catalog availability:

| SKU | WC Bottles | Catalog Available | Difference | % Error | Product |
|-----|------------|-------------------|------------|---------|---------|
| **RIO1080** | 3,293.00 | 0.00 | **-3,293.00** | -100.0% | Naúm |
| **CAL1396** | 479.00 | 0.00 | **-479.00** | -100.0% | Grand Cuvee (WINE CLUB ONLY) |
| **ORO1059** | 418.00 | 0.00 | **-418.00** | -100.0% | Le Petit Pinot Noir |
| **FRA1103** | 0.00 | 322.00 | **322.00** | n/a | Antoine Simoneau Les Georges Sauvignon Blanc de Loire |
| **AUS1007** | 0.00 | 280.00 | **280.00** | n/a | Dominique Portet "Fontaine" Cabernet Sauvignon |
| **AUS1015** | 0.00 | 280.00 | **280.00** | n/a | R&R Pinot Gris |
| **CAL1398** | 276.00 | 0.00 | **-276.00** | -100.0% | Grenach (WINE CLUB ONLY) |
| **CAL1397** | 276.00 | 0.00 | **-276.00** | -100.0% | Sauvginon Blanc (WINE CLUB ONLY) |
| **AUS1018** | 0.00 | 270.00 | **270.00** | n/a | Murdoch Hill Chardonnay |
| **AUS1017** | 0.00 | 270.00 | **270.00** | n/a | Murdoch Hill Red Blend |
| **AUS1016** | 0.00 | 270.00 | **270.00** | n/a | Murdoch Hill Rose |
| **SAF1040** | 0.00 | 199.00 | **199.00** | n/a | Sutherland Sauvignon Blanc |
| **SPA1328** | 0.00 | 199.00 | **199.00** | n/a | Broken Slates |
| **SAF1085** | 0.00 | 198.00 | **198.00** | n/a | BEV Rose Rebel |
| **FRA1050** | 0.00 | 190.00 | **190.00** | n/a | Bauget-Jouette Carte Blanche 375 |
