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
  deliveryInfo: 'showDeliveryInfo',
  distributorInfo: 'showDistributorInfo',
};

export function getSectionBuckets(layout: InvoiceTemplateLayout) {
  const buckets: Record<InvoiceSectionArea, InvoiceSectionKey[]> = {
    headerLeft: [],
    headerRight: [],
    fullWidth: [],
  };

  const placements = layout.sectionPlacements ?? [];
  const seen = new Set<InvoiceSectionKey>();

  placements
    .slice()
    .sort((a, b) => a.order - b.order || a.section.localeCompare(b.section))
    .forEach((placement) => {
      if (seen.has(placement.section)) {
        return;
      }
      const areaName = placement.area;
      const targetArea: InvoiceSectionArea =
        areaName === 'headerLeft' || areaName === 'headerRight' || areaName === 'fullWidth'
          ? (areaName as InvoiceSectionArea)
          : 'headerLeft';
      buckets[targetArea].push(placement.section);
      seen.add(placement.section);
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

  const pushToBalancedColumn = (sectionKey: InvoiceSectionKey) => {
    const target =
      visible.headerLeft.length <= visible.headerRight.length ? 'headerLeft' : 'headerRight';
    visible[target].push(sectionKey);
  };

  (Object.keys(buckets) as InvoiceSectionArea[]).forEach((area) => {
    if (area === 'fullWidth') {
      buckets[area].forEach((sectionKey) => {
        const visibilityField = SECTION_VISIBILITY_FIELDS[sectionKey];
        if (!layout.sections[visibilityField]) {
          return;
        }
        pushToBalancedColumn(sectionKey);
      });
      return;
    }

    buckets[area].forEach((sectionKey) => {
      const visibilityField = SECTION_VISIBILITY_FIELDS[sectionKey];
      if (!layout.sections[visibilityField]) {
        return;
      }
      visible[area].push(sectionKey);
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
