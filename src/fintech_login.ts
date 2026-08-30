import { infrai, type SmsVerifyResult } from "./infrai_sms.js";

export type PaymentRisk = "low" | "high";
export type LoginDecision =
  | { outcome: "session_allowed"; audit_event: "otp_verified"; phone: string }
  | { outcome: "manual_review"; audit_event: "high_risk_login_held"; phone: string }
  | { outcome: "code_rejected"; audit_event: "otp_rejected"; phone: string };

export function decideLogin(phone: string, risk: PaymentRisk, verification: SmsVerifyResult): LoginDecision {
  if (!verification.verified) return { outcome: "code_rejected", audit_event: "otp_rejected", phone };
  if (risk === "high") return { outcome: "manual_review", audit_event: "high_risk_login_held", phone };
  return { outcome: "session_allowed", audit_event: "otp_verified", phone };
}

export async function beginLogin(phone: string, requestId: string) {
  const sent = await infrai.sms.otp(phone, requestId);
  return { outcome: "code_sent" as const, message_id: sent.message_id, phone };
}

export async function completeLogin(phone: string, code: string, risk: PaymentRisk, requestId: string) {
  const verification = await infrai.sms.verify(phone, code, requestId);
  return decideLogin(phone, risk, verification);
}
