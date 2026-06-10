import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const AUD = process.env.CF_ACCESS_AUD;
const CERTS_URL = process.env.CF_ACCESS_CERTS_URL;

// En dev (pas de variables CF), on laisse passer sans vérification.
const devMode = !AUD || !CERTS_URL;

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!JWKS && CERTS_URL) {
    JWKS = createRemoteJWKSet(new URL(CERTS_URL));
  }
  return JWKS;
}

export async function cfAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  if (devMode) return next();

  const token = req.headers['cf-access-jwt-assertion'] as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Missing CF Access token' });
    return;
  }

  try {
    await jwtVerify(token, getJWKS()!, { audience: AUD });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid CF Access token' });
  }
}
