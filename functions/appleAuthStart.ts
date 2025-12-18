import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

function rand(len = 32) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/[^a-zA-Z0-9]/g, '').slice(0, Math.max(43, Math.min(128, len)));
}
async function sha256Base64Url(str) {
  const enc = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(hash);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function setCookie(headers, name, value, maxAgeSec = 300) {
  headers.append('Set-Cookie', `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=Lax; Secure`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null); // optional

    const url = new URL(req.url);
    const payload = (await req.json().catch(() => ({}))) || {};
    const returnTo = payload.returnTo || url.searchParams.get('returnTo') || '/Dashboard';

    const clientId = Deno.env.get('APPLE_CLIENT_ID');
    const redirectUri = Deno.env.get('APPLE_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      return Response.json({ error: 'CONFIG_MISSING' }, { status: 503 });
    }

    const state = rand(48);
    const nonce = rand(48);
    const codeVerifier = rand(64);
    const codeChallenge = await sha256Base64Url(codeVerifier);
    const nonceHash = await sha256Base64Url(nonce);

    const params = new URLSearchParams({
      response_type: 'code',
      response_mode: 'form_post',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'name email',
      state,
      nonce: nonceHash,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    const authorizeUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;

    const headers = new Headers({ 'Content-Type': 'application/json' });
    setCookie(headers, 'apple_state', state, 300);
    setCookie(headers, 'apple_nonce', nonce, 300);
    setCookie(headers, 'apple_codev', codeVerifier, 300);
    setCookie(headers, 'apple_return', returnTo, 300);

    return new Response(JSON.stringify({ url: authorizeUrl }), { status: 200, headers });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
});