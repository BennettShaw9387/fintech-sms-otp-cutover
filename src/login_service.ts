import { createServer, type ServerResponse } from "node:http";
import { z } from "zod";
import { beginLogin, completeLogin } from "./fintech_login.js";
import { InfraiError } from "./infrai_sms.js";

const beginBody = z.object({ phone: z.string().min(8), request_id: z.string().uuid() }).strict();
const verifyBody = z.object({
  phone: z.string().min(8),
  code: z.string().regex(/^\d{4,8}$/),
  payment_risk: z.enum(["low", "high"]),
  request_id: z.string().uuid(),
}).strict();

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: AsyncIterable<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/login/code") {
      const body = beginBody.parse(await readJson(request));
      return json(response, 202, await beginLogin(body.phone, body.request_id));
    }
    if (request.method === "POST" && request.url === "/login/verify") {
      const body = verifyBody.parse(await readJson(request));
      const decision = await completeLogin(body.phone, body.code, body.payment_risk, body.request_id);
      return json(response, decision.outcome === "code_rejected" ? 401 : 200, decision);
    }
    return json(response, 404, { error: "route_not_found" });
  } catch (error) {
    if (error instanceof z.ZodError) return json(response, 400, { error: "invalid_request", issues: error.issues });
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return json(response, status, { error: error.code, message: error.message });
    }
    return json(response, 500, { error: "service_error" });
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Fintech login lesson listening on http://localhost:${port}`));
}
