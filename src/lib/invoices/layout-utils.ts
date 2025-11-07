import type {
  InvoiceBodyBlockId,
  InvoiceSectionArea,
  InvoiceSectionKey,
  InvoiceTemplateLayout,
} from './template-settings';

export const SECTION_VISIBILITY_FIELDS: Record<
  InvoiceSectionKey,
  keyof InvoiceTemplateLayout['sections']
> = {
  billTo: 'showBillTo',
  shipTo: 'showShipTo',
  customerInfo: 'showCustomerInfo',
};

export function getSectionBuckets(layout: InvoiceTemplateLayout) {
  const buckets: Record<InvoiceSectionArea, InvoiceSectionKey[]> = {
    headerLeft: [],
    headerRight: [],
    fullWidth: [],
  };

  const placements = layout.sectionPlacements ?? [];
  placements
    .slice()
    .sort((a, b) => a.order - b.order || a.section.localeCompare(b.section))
    .forEach((placement) => {
      if (!buckets[placement.area]) {
        return;
      }
      buckets[placement.area].push(placement.section);
    });

  return buckets;
}

export function getVisibleSectionBuckets(layout: InvoiceTemplateLayout) {
  const buckets = getSectionBuckets(layout);
  const visible: Record<InvoiceSectionArea, InvoiceSectionKey[]> = {
    headerLeft: [],
    headerRight: [],
    fullWidth: [],
  };

  (Object.keys(buckets) as InvoiceSectionArea[]).forEach((area) => {
    visible[area] = buckets[area].filter((sectionKey) => {
      const visibilityField = SECTION_VISIBILITY_FIELDS[sectionKey];
      return layout.sections[visibilityField];
    });
  });

  return visible;
}

export function getBodyBlockOrder(layout: InvoiceTemplateLayout): InvoiceBodyBlockId[] {
  const blocks = layout.bodyBlocks ?? [];
  return blocks
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((block) => block.id as InvoiceBodyBlockId);
}
