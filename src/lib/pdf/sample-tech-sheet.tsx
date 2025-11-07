import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export type TechSheetLayout = "multi" | "single";

export type TechSheetPriceTier = {
  minQuantity: number;
  maxQuantity: number | null;
  pricePerBottle: number;
  pricePerCase: number | null;
};

export type TechSheetItemPriceTable = {
  priceListId: string;
  priceListName: string;
  currency: string;
  tiers: TechSheetPriceTier[];
};

export type TechSheetItem = {
  id: string;
  name: string;
  brand: string | null;
  skuCode: string;
  size: string | null;
  unitOfMeasure: string | null;
  type: string | null;
  category: string | null;
  supplierName: string | null;
  description: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  qrCode?: string | null;
  tastingNotes?: string[];
  foodPairings?: string[];
  region?: string | null;
  grape?: string | null;
  vintage?: number | null;
  abv?: number | null;
  priceTables: TechSheetItemPriceTable[];
};

export type SampleTechSheetDocumentProps = {
  company: {
    name: string;
    website?: string | null;
    phone?: string | null;
  };
  salesperson: {
    name: string;
    email: string;
    phone?: string | null;
  };
  listName: string;
  generatedAt: Date;
  priceLists: Array<{
    id: string;
    name: string;
    currency: string;
  }>;
  items: TechSheetItem[];
  layout: TechSheetLayout;
  hideAboveQuantity?: number | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  companyBlock: {
    flexDirection: "column",
    gap: 2,
  },
  brandName: {
    fontSize: 14,
    fontWeight: 700,
  },
  subText: {
    fontSize: 9,
    color: "#4b5563",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 6,
    color: "#111827",
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    marginVertical: 12,
  },
  productCard: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  mediaColumn: {
    width: 100,
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
  },
  qrImage: {
    width: 90,
    height: 90,
  },
  placeholderImage: {
    width: 90,
    height: 90,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  productImage: {
    width: 90,
    height: 90,
    objectFit: "cover",
    borderRadius: 4,
  },
  productContent: {
    flex: 1,
    flexDirection: "column",
    gap: 6,
  },
  productName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    gap: 4,
    fontSize: 9,
    color: "#4b5563",
  },
  notesBlock: {
    marginTop: 4,
    padding: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  notesHeading: {
    fontSize: 9,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 2,
  },
  notesText: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.3,
  },
  priceTableSection: {
    marginTop: 6,
  },
  priceTableTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 2,
  },
  priceTable: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  priceRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  priceCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
  },
  priceHeader: {
    backgroundColor: "#f3f4f6",
    fontWeight: 700,
  },
  noteText: {
    marginTop: 4,
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.4,
  },
});

function formatQuantityLabel(tier: TechSheetPriceTier) {
  const min = tier.minQuantity ?? 1;
  const max = tier.maxQuantity;
  if (!max) return `${min}+ units`;
  if (min === max) return `${min} units`;
  return `${min}-${max} units`;
}

function formatMoney(currency: string, value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function SampleTechSheetDocument(props: SampleTechSheetDocumentProps) {
  const { company, salesperson, listName, generatedAt, priceLists, items, layout, hideAboveQuantity } = props;
  const generatedDate = generatedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            <Text style={styles.brandName}>{company.name}</Text>
            {company.website && <Text style={styles.subText}>{company.website}</Text>}
            {company.phone && <Text style={styles.subText}>{company.phone}</Text>}
          </View>
          <View style={styles.companyBlock}>
            <Text style={styles.brandName}>Your salesperson</Text>
            <Text style={styles.subText}>{salesperson.name}</Text>
            <Text style={styles.subText}>{salesperson.email}</Text>
            {salesperson.phone && <Text style={styles.subText}>{salesperson.phone}</Text>}
          </View>
        </View>

        <Text style={styles.title}>{generatedDate}</Text>
        <View style={styles.sectionDivider}></View>

        {items.map((item, index) => {
          const shouldBreak = layout === "single" && index > 0;
          return (
            <View key={item.id} style={styles.productCard} wrap={false} break={shouldBreak}>
              <View style={styles.mediaColumn}>
                {item.qrCode ? (
                  <Image style={styles.qrImage} src={item.qrCode} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text>QR</Text>
                  </View>
                )}
                {item.imageUrl ? (
                  <Image style={styles.productImage} src={item.imageUrl} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text>No image</Text>
                  </View>
                )}
              </View>

              <View style={styles.productContent}>
                <Text style={styles.productName}>{item.name}</Text>
                {item.brand && (
                  <Text style={{ fontSize: 11, color: "#1f2937" }}>{item.brand}</Text>
                )}
                <View style={styles.metaRow}>
                  {item.type && (
                    <View style={styles.metaItem}>
                      <Text>Type:</Text>
                      <Text>{item.type}</Text>
                    </View>
                  )}
                  {item.size && (
                    <View style={styles.metaItem}>
                      <Text>Size:</Text>
                      <Text>{item.size}</Text>
                    </View>
                  )}
                  {item.vintage && (
                    <View style={styles.metaItem}>
                      <Text>Vintage:</Text>
                      <Text>{item.vintage}</Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Text>SKU:</Text>
                    <Text>{item.skuCode}</Text>
                  </View>
                  {item.grape && (
                    <View style={styles.metaItem}>
                      <Text>Grape:</Text>
                      <Text>{item.grape}</Text>
                    </View>
                  )}
                  {item.region && (
                    <View style={styles.metaItem}>
                      <Text>Region:</Text>
                      <Text>{item.region}</Text>
                    </View>
                  )}
                  {item.abv && (
                    <View style={styles.metaItem}>
                      <Text>ABV:</Text>
                      <Text>{item.abv}%</Text>
                    </View>
                  )}
                  {item.category && (
                    <View style={styles.metaItem}>
                      <Text>Category:</Text>
                      <Text>{item.category}</Text>
                    </View>
                  )}
                  {item.supplierName && (
                    <View style={styles.metaItem}>
                      <Text>Supplier:</Text>
                      <Text>{item.supplierName}</Text>
                    </View>
                  )}
                </View>

                {item.description && (
                  <Text style={{ fontSize: 10, lineHeight: 1.4, color: "#111827" }}>
                    {item.description}
                  </Text>
                )}

                {item.tastingNotes && item.tastingNotes.length > 0 && (
                  <View style={styles.notesBlock}>
                    <Text style={styles.notesHeading}>Tasting Notes</Text>
                    {item.tastingNotes.map((note, noteIndex) => (
                      <Text key={`${item.id}-note-${noteIndex}`} style={styles.notesText}>
                        • {note}
                      </Text>
                    ))}
                  </View>
                )}

                {item.foodPairings && item.foodPairings.length > 0 && (
                  <View style={styles.notesBlock}>
                    <Text style={styles.notesHeading}>Pairings</Text>
                    <Text style={styles.notesText}>{item.foodPairings.join(", ")}</Text>
                  </View>
                )}

                {item.priceTables.map((table) => (
                  <View key={`${item.id}-${table.priceListId}`} style={styles.priceTableSection}>
                    <Text style={styles.priceTableTitle}>{table.priceListName}</Text>
                    {table.tiers.length > 0 ? (
                      <View style={styles.priceTable}>
                        <View style={[styles.priceRow, styles.priceHeader]}>
                          <Text style={[styles.priceCell, { flex: 0.6 }]}>Quantity</Text>
                          <Text style={[styles.priceCell, { flex: 0.7 }]}>$/bottle</Text>
                          <Text style={[styles.priceCell, { flex: 0.7 }]}>$/case</Text>
                        </View>
                        {table.tiers.map((tier) => (
                          <View
                            key={`${item.id}-${table.priceListId}-${tier.minQuantity}`}
                            style={styles.priceRow}
                          >
                            <Text style={[styles.priceCell, { flex: 0.6 }]}>{formatQuantityLabel(tier)}</Text>
                            <Text style={[styles.priceCell, { flex: 0.7 }]}>
                              {formatMoney(table.currency, tier.pricePerBottle)}
                            </Text>
                            <Text style={[styles.priceCell, { flex: 0.7 }]}>
                              {formatMoney(table.currency, tier.pricePerCase)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.notesText}>No pricing tiers configured for this price list.</Text>
                    )}
                  </View>
                ))}

                {item.notes && <Text style={styles.noteText}>{item.notes}</Text>}
              </View>
            </View>
          );
        })}

        <View style={[styles.sectionDivider, { marginTop: 18 }]}></View>
        <Text style={styles.subText}>
          Prices shown from{" "}
          {priceLists.length > 0
            ? priceLists.map((list) => list.name).join(", ")
            : "the selected price lists"}
          .{" "}
          {hideAboveQuantity
            ? `Quantity discounts above ${hideAboveQuantity} units are hidden for this export.`
            : "Ask your sales representative for higher volume programs."}
        </Text>
        <Text style={styles.subText}>Generated for list "{listName}".</Text>
      </Page>
    </Document>
  );
}
