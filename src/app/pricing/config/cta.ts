export type CTAIntent = "SELF_SERVE" | "DEMO_NEEDED" | "SALES_CALL";

type CTAStyle = "primary" | "primary-gold" | "secondary";

type CTAConfig = {
  text: string;
  style: CTAStyle;
  destination: string;
  tooltip?: string;
};

export const CTA_CONFIG: Record<CTAIntent, CTAConfig> = {
  SELF_SERVE: {
    text: "Apply for launch pricing",
    style: "primary",
    destination:
      "mailto:hello@joinleora.com?subject=Founding%2020%20application&body=Hi%20Leora%20team%2C%0A%0AWe%27d%20like%20to%20join%20the%20launch%20cohort.%20Here%27s%20a%20quick%20overview%20of%20our%20team%3A",
    tooltip: "Reserve a Founding 20 slot",
  },
  DEMO_NEEDED: {
    text: "Book cohort interview",
    style: "primary-gold",
    destination:
      "mailto:hello@joinleora.com?subject=Launch%20pricing%20interview&body=Can%20we%20schedule%20a%2030-minute%20call%20to%20review%20launch%20pricing%20fit%3F",
    tooltip: "Schedule a 30-minute qualification call",
  },
  SALES_CALL: {
    text: "Talk through launch fit",
    style: "secondary",
    destination:
      "mailto:hello@joinleora.com?subject=Enterprise%20launch%20planning&body=We%27d%20like%20to%20discuss%20launch%20pricing%20and%20post-launch%20support.",
    tooltip: "Speak with the team about enterprise rollout",
  },
};

export const TIER_CTA_INTENT: Record<"silver" | "gold" | "platinum", CTAIntent> = {
  silver: "SELF_SERVE",
  gold: "DEMO_NEEDED",
  platinum: "SALES_CALL",
};
