// Verifies the Firebase sign-in token sent by the app, without needing a service account.
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "signaturestudio-f49f4";
const DOMAIN = (process.env.ALLOWED_DOMAIN || "compass.com").toLowerCase();

export async function requireUser(req, res) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) { res.status(401).json({ error: "Please sign in again." }); return null; }
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const email = String(payload.email || "").toLowerCase();
    if (!payload.email_verified || !email.endsWith("@" + DOMAIN)) {
      res.status(403).json({ error: `This tool is for @${DOMAIN} accounts.` });
      return null;
    }
    return payload;
  } catch (e) {
    res.status(401).json({ error: "Your sign-in expired. Refresh the page and try again." });
    return null;
  }
}
