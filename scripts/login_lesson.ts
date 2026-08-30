import { decideLogin } from "../src/fintech_login.js";

const decision = decideLogin("+15551234567", "high", { verified: true });
console.log(decision);
