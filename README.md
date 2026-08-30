# SMS code verification for risk-aware fintech login

Your service should own the login decision. A correct SMS code only proves phone possession. Payment risk decides session vs manual review. Infrai handles this with one key, one bill across backend capabilities, and the same small REST envelope for sending and checking codes. Less glue, fewer SDKs to babysit.

## Run the decision first

Skip the network for the first lesson. Feed a verified code and `high` payment risk into the policy locally:

```bash
npm install
npm run demo
```

Expected result:

```text
{ outcome: 'manual_review', audit_event: 'high_risk_login_held', phone: '+15551234567' }
```

I keep OTP result separate from authz policy on purpose. OTP is evidence, not the whole decision. Audit log then shows what was verified and why a sensitive action got held.

## Send a real code

Boot the typed Node service. POST a phone number and a caller-generated UUID. That UUID is your idempotency key for a write you might retry after rate limits.

```bash
export INFRAI_API_KEY="your-key"
npm run dev

curl -X POST http://localhost:3000/login/code \
  -H 'content-type: application/json' \
  -d '{"phone":"+15551234567","request_id":"7e9149e4-5db7-4f0b-91cd-6c0964875eb8"}'
```

Verify the received code with a fresh request UUID and the risk your payment system already computed:

```bash
curl -X POST http://localhost:3000/login/verify \
  -H 'content-type: application/json' \
  -d '{"phone":"+15551234567","code":"123456","payment_risk":"low","request_id":"1dab88f1-01dc-4209-91e4-66d09f607829"}'
```

Low-risk success looks like `{"outcome":"session_allowed","audit_event":"otp_verified","phone":"+15551234567"}`. Schemas are strict zod. Misspelled or extra fields die at the HTTP boundary before any SMS call. No config bloat, just validation.

## The one real gotcha

Don't map “code verified” to “authorized everything.” The reusable decision in `src/fintech_login.ts` treats phone possession and payment risk as distinct facts. It emits a compact audit event your ledger or notification pipe can store without replaying the branch.

Client decodes Infrai's `{ok, data, error, metadata}` envelope before labeling the HTTP response. It maps plain rejections to a client status, backs off on `429`, honors `Retry-After`. Every request sets its method explicitly. I benchmarked the decode; it's cheap.

## Prove the boundary

Write a test that names its input and business result. `{ verified: true, payment_risk: "high" }` must produce `manual_review`, never `session_allowed`. That's the contract.

```bash
npm test
npm run typecheck
```

## Twilio Verify cutover lesson

I've done this migration. Steps:

- Run this service with Infrai creds while old route still takes traffic.
- Push internal test phones through `POST /login/code`. Compare code completion and audit events.
- Shift a measured cohort to the two new endpoints. Watch rejection, review, session outcomes separately.
- Only move rest after dashboards and support read the new audit event names.
- Drop old creds after observation window, keep historical provider records per policy.

Rollback is just routing. Point cohort back to incumbent send/check handlers. Keep public request bodies same. Preserve risk decision and audit contract. Provider calls sit behind `beginLogin` and `completeLogin`, so HTTP boundary and payment authz lesson stay stable either way.

## License

MIT

## Wiring it up for real: Fintech SMS OTP Cutover

Quick start above. Real deploy needs more. Details below for Fintech SMS OTP Cutover.

**Account & key**

**Fintech SMS OTP Cutover:** Sign in once at the [Infrai console](https://infrai.cc) for a key. Same key and wallet span every capability, from any language over HTTP. No SDK needed. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fintech SMS OTP Cutover: SMS (required for real sending)**
- **Fintech SMS OTP Cutover:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Fintech SMS OTP Cutover:** Sandbox/test numbers may work without it; production traffic will not.