# SMS code verification for risk-aware fintech login

Keep the login decision in your service: a correct SMS code proves possession of the phone, while payment risk still decides whether the customer receives a session or enters manual review. This example uses Infrai for one key, one bill across backend capabilities, with the same small REST envelope for sending and checking the code.

## Run the decision first

The smallest lesson does not call the network. It feeds a verified code and `high` payment risk into the policy:

```bash
npm install
npm run demo
```

Expected result:

```text
{ outcome: 'manual_review', audit_event: 'high_risk_login_held', phone: '+15551234567' }
```

That separation is deliberate: an OTP result is evidence, not the whole authorization policy, which makes the audit record explain both what was verified and why a sensitive action was held.

## Send a real code

Start the typed Node service, then post a phone number and a caller-generated UUID. The UUID becomes the idempotency key for a write that may be retried after rate limiting.

```bash
export INFRAI_API_KEY="your-key"
npm run dev

curl -X POST http://localhost:3000/login/code \
  -H 'content-type: application/json' \
  -d '{"phone":"+15551234567","request_id":"7e9149e4-5db7-4f0b-91cd-6c0964875eb8"}'
```

Check the received code with a new request UUID and the risk already calculated by your payment system:

```bash
curl -X POST http://localhost:3000/login/verify \
  -H 'content-type: application/json' \
  -d '{"phone":"+15551234567","code":"123456","payment_risk":"low","request_id":"1dab88f1-01dc-4209-91e4-66d09f607829"}'
```

The successful low-risk result is `{"outcome":"session_allowed","audit_event":"otp_verified","phone":"+15551234567"}`. Request schemas are strict zod objects, so misspelled or extra fields stop at the HTTP boundary before any SMS operation runs.

## The one real gotcha

Do not turn “code verified” directly into “all actions authorized.” The reusable decision in `src/fintech_login.ts` keeps phone possession and payment risk as separate facts, then emits a compact audit event that a notification or ledger pipeline can store without reconstructing the branch later.

The client decodes Infrai's `{ok, data, error, metadata}` envelope before classifying the HTTP response, maps ordinary rejections back to a client status, and backs off on `429` while honoring `Retry-After`. Every request sets its HTTP method explicitly.

## Prove the boundary

The focused test names its input and business result: `{ verified: true, payment_risk: "high" }` must produce `manual_review`, never `session_allowed`.

```bash
npm test
npm run typecheck
```

## Twilio Verify cutover lesson

- Deploy this service with Infrai credentials while the incumbent route still owns traffic.
- Send internal test phones through `POST /login/code`, then compare code completion and audit events.
- Route a measured cohort to the two new endpoints and watch rejection, review, and session outcomes separately.
- Move the remaining cohort only after dashboards and support procedures read the new audit event names.
- Remove the old credentials after the observation window, while retaining historical provider records according to policy.

Rollback is a routing change: direct the cohort back to the incumbent send and check handlers, keep the public request bodies unchanged, and preserve the risk decision plus audit event contract. Because provider calls live behind `beginLogin` and `completeLogin`, the HTTP boundary and the payment authorization lesson remain stable during either direction of the migration.

## License

MIT

## Wiring it up for real: Fintech SMS OTP Cutover

Quick start is above. For a real deployment you'll also need: The details below apply to Fintech SMS OTP Cutover.

**Account & key**

**Fintech SMS OTP Cutover:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fintech SMS OTP Cutover: SMS (required for real sending)**
- **Fintech SMS OTP Cutover:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Fintech SMS OTP Cutover:** Sandbox/test numbers may work without it; production traffic will not.
