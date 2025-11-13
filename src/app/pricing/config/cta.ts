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
    text: "Get started",
    style: "primary",
    destination: "/signup?plan=silver&utm_source=pricing&utm_medium=cta&utm_campaign=get_started",
    tooltip: "Start your Leora self-serve setup",
  },
  DEMO_NEEDED: {
    text: "Get a demo",
    style: "primary-gold",
    destination: "mailto:hello@joinleora.com?subject=Gold%20Plan%20Demo&body=We%27d%20like%20a%2020-minute%20Gold%20walkthrough.",
    tooltip: "Schedule a 20-minute walkthrough",
  },
  SALES_CALL: {
    text: "Contact sales",
    style: "secondary",
    destination: "mailto:hello@joinleora.com?subject=Platinum%20Enterprise%20Inquiry&body=We%27d%20like%20to%20chat%20about%20Platinum.",
    tooltip: "Speak with a specialist",
  },
};

export const TIER_CTA_INTENT: Record<"silver" | "gold" | "platinum", CTAIntent> = {
  silver: "SELF_SERVE",
  gold: "DEMO_NEEDED",
  platinum: "SALES_CALL",
};
