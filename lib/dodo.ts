import DodoPayments from "dodopayments";

let client: DodoPayments | null = null;

export function getDodoClient(): DodoPayments {
  if (client) return client;
  client = new DodoPayments({
    bearerToken: process.env.DODO_API_KEY,
    environment: process.env.DODO_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  });
  return client;
}

export type PlanProduct = "pro_monthly" | "pro_annual" | "max_monthly" | "max_annual";

export const PRODUCT_MAP: Record<PlanProduct, string> = {
  pro_monthly: process.env.DODO_PRO_MONTHLY_ID ?? "",
  pro_annual: process.env.DODO_PRO_ANNUAL_ID ?? "",
  max_monthly: process.env.DODO_MAX_MONTHLY_ID ?? "",
  max_annual: process.env.DODO_MAX_ANNUAL_ID ?? "",
};

export function getProductId(plan: "pro" | "max", billing: "monthly" | "annual"): string {
  const key = `${plan}_${billing}` as PlanProduct;
  const id = PRODUCT_MAP[key];
  if (!id) throw new Error(`No product ID configured for ${key}. Set DODO_${key.toUpperCase()}_ID env var.`);
  return id;
}
