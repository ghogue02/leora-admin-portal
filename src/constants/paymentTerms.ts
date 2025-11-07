import { VALID_PAYMENT_TERMS } from "@/lib/sage/payment-terms";

export const PAYMENT_TERM_OPTIONS = [...VALID_PAYMENT_TERMS] as const;
