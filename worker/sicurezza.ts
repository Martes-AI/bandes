/**
 * Header di sicurezza di ogni risposta.
 * I file statici li prendono da public/_headers, le risposte del Worker da qui:
 * test/sicurezza.test.ts controlla che le due liste restino uguali.
 */
export const HEADER_SICUREZZA: Record<string, string> = {
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self'",
    // 'unsafe-inline' serve agli attributi style di React (posizione delle etichette sulla mappa).
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

/** La stessa risposta, con gli header di sicurezza aggiunti. */
export function conSicurezza(risposta: Response): Response {
  const copia = new Response(risposta.body, risposta);
  for (const [nome, valore] of Object.entries(HEADER_SICUREZZA)) copia.headers.set(nome, valore);
  return copia;
}
