import { JwtVerifier } from "aws-jwt-verify";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Automatically initialize firebase app if there isn't one.
// For Vercel, the credentials should be provided via FIREBASE_SERVICE_ACCOUNT env var
if (!getApps().length) {
    let credentialOptions;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccountBody = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            credentialOptions = cert(serviceAccountBody);
        } catch(e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT var", e);
        }
    }
    initializeApp(credentialOptions ? { credential: credentialOptions } : undefined);
}

// Ensure you provide this in your Vercel Environment Variables!
const FIREBASE_PROJECT_NUMBER = process.env.FIREBASE_PROJECT_NUMBER || "123456789";

const issuer = `https://fpnv.googleapis.com/projects/${FIREBASE_PROJECT_NUMBER}`;
const audience = `https://fpnv.googleapis.com/projects/${FIREBASE_PROJECT_NUMBER}`;
const jwksUri = "https://fpnv.googleapis.com/v1beta/jwks";

const fpnvVerifier = JwtVerifier.create({ issuer, audience, jwksUri });

export default async function handler(req, res) {
  // --- Basic CORS & Security Headers ---
  res.setHeader('Access-Control-Allow-Credentials', true)
  const origin = req.headers.origin || '*'
  // You can replace '*' with your specific custom domain for better security
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token } = req.body || {};
  const fpnvToken = token;
  
  if (!fpnvToken || typeof fpnvToken !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid token' });
  }

  let verifiedPhoneNumber;
  try {
    const verifiedPayload = await fpnvVerifier.verify(fpnvToken);
    verifiedPhoneNumber = verifiedPayload.sub;
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }

  const authAdmin = getAuth();
  let user;
  
  try {
    user = await authAdmin.getUserByPhoneNumber(verifiedPhoneNumber);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      try {
        user = await authAdmin.createUser({ phoneNumber: verifiedPhoneNumber });
      } catch (createErr) {
        console.error("Error creating user:", createErr);
        return res.status(500).json({ error: 'Failed to create user' });
      }
    } else {
      console.error("Error getting user by phone number:", err);
      return res.status(500).json({ error: 'Internal server error while resolving user' });
    }
  }

  try {
    const authToken = await authAdmin.createCustomToken(user.uid);
    return res.status(200).json({ authToken });
  } catch (tokenErr) {
    console.error("Error generation auth token:", tokenErr);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
}
