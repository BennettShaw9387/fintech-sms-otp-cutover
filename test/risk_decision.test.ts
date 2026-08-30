import assert from "node:assert/strict";
import test from "node:test";
import { decideLogin } from "../src/fintech_login.js";

test("a verified code still holds a high-risk payment login for review", () => {
  assert.deepEqual(decideLogin("+15551234567", "high", { verified: true }), {
    outcome: "manual_review",
    audit_event: "high_risk_login_held",
    phone: "+15551234567",
  });
});

test("a verified low-risk login may create a session", () => {
  assert.equal(decideLogin("+15551234567", "low", { verified: true }).outcome, "session_allowed");
});
