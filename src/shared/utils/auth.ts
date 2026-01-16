/**
 * Utility functions for PKCE (Proof Key for Code Exchange)
 */

/**
 * Generate a random code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/**
 * Base64URL encode a buffer
 */
export function base64urlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate SHA-256 hash of a string
 */
export async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

/**
 * Generate a code challenge from a code verifier
 */
export async function generateCodeChallengeFromVerifier(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64urlEncode(new Uint8Array(hashed));
}

/**
 * Generate a code challenge
 * Follows the full process to generate a code challenge
 * 1. Generate a code verifier
 * 2. Generate a code challenge from the code verifier
 * 3. Return the code challenge
 */
export async function generateCodeChallenge(): Promise<string> {
  const codeVerifier = generateCodeVerifier();
  return generateCodeChallengeFromVerifier(codeVerifier);
}