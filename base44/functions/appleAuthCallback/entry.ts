import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet } from 'npm:jose@5.2.4';

function getCookie(req, name) {
  const cookie = req.headers.get('cookie') || '';
  const map = Object.fromEntries(cookie.split(';').map(v => v.trim().split('=').map(decodeURIComponent)).filter(x => x[0]));
  return map[name] || null;
}
function delCookie(headers, name) {
  headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`);
}
async function sha256Base64Url(str) {
  const enc = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(hash);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function buildClientSecret() {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const clientId = Deno.env.get('APPLE_CLIENT_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKey = (Deno.env.get('APPLE_PRIVATE_KEY') || '').replace(/\\n/g, '\n');
  if (!teamId || !clientId || !keyId || !privateKey) throw new Error('CONFIG_MISSING');

  const alg = 'ES256';
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 6;
  const pk = await importPKCS8(privateKey, alg);
  const jwt = await new SignJWT({
    iss: teamId,
    aud: 'https://appleid.apple.com',
    sub: clientId
  })
    .setProtectedHeader({ alg, kid: keyId })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(pk);
  return jwt;
}

Deno.serve(async (req) => {
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null); // optional

    const clientId = Deno.env.get('APPLE_CLIENT_ID');
    const redirectUri = Deno.env.get('APPLE_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      return new Response('Config missing', { status: 503, headers });
    }

    const stateCookie = getCookie(req, 'apple_state');
    const noncePlain = getCookie(req, 'apple_nonce');
    const codeVerifier = getCookie(req, 'apple_codev');
    const returnTo = getCookie(req, 'apple_return') || '/Dashboard';

    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers });
    }
    const form = await req.formData();
    const state = form.get('state');
    const code = form.get('code');

    if (!state || !code || !stateCookie || !noncePlain || !codeVerifier) {
      return new Response('Invalid request', { status: 400, headers });
    }
    if (state !== stateCookie) {
      return new Response('State mismatch', { status: 400, headers });
    }

    // Exchange code for tokens
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: await buildClientSecret(),
      code_verifier: codeVerifier
    });
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return new Response('Token exchange failed: ' + txt, { status: 400, headers });
    }
    const tokens = await tokenRes.json();
    const idToken = tokens.id_token;
    if (!idToken) {
      return new Response('Missing id_token', { status: 400, headers });
    }

    // Verify id_token against Apple JWKS
    const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: clientId
    });

    // Validate nonce (Apple returns the value we sent)
    const expectedNonce = await sha256Base64Url(noncePlain);
    if (payload.nonce !== expectedNonce) {
      return new Response('Nonce mismatch', { status: 400, headers });
    }

    const appleSub = String(payload.sub);
    const email = payload.email ? String(payload.email) : '';
    const emailVerified = String(payload.email_verified || '') === 'true' || payload.email_verified === true;
    const isPrivate = email ? /privaterelay\.appleid\.com$/i.test(email) : false;

    // Make profile cookie (readable by frontend to finalize linking after any login)
    const profile = {
      sub: appleSub,
      email: email || '',
      email_private: !!isPrivate,
      email_verified: !!emailVerified,
      at: new Date().toISOString()
    };
    // Short-lived non-HttpOnly cookie so frontend can consume once
    headers.append('Set-Cookie', `apple_profile=${encodeURIComponent(btoa(JSON.stringify(profile)))}; Path=/; Max-Age=300; SameSite=Lax; Secure`);

    // Clear transient cookies
    ['apple_state', 'apple_nonce', 'apple_codev', 'apple_return'].forEach(n => delCookie(headers, n));

    // Redirect back
    headers.set('Location', returnTo);
    return new Response('<html><head><meta http-equiv="refresh" content="0;url=' + String(returnTo) + '"></head></html>', { status: 302, headers });
  } catch (error) {
    return new Response('Error: ' + String(error), { status: 500, headers });
  }
});