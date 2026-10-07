const TOKEN_ISSUER = 'https://keycloak.naas.noders.services/realms/noders-appsfactory';
const TOKEN_AUDIENCE = 'https://hackcanton-01.devnet.naas.noders.services';

export interface LedgerTokenClaims {
  sub: string;
  exp: number;
  iss: string;
  aud: string | string[];
  scope: string;
}

export function parseLedgerAccessToken(token: string): LedgerTokenClaims {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('Enter a valid Keycloak access token.');

  let claims: unknown;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
  } catch {
    throw new Error('The access token payload could not be decoded.');
  }

  if (!claims || typeof claims !== 'object') throw new Error('The access token payload is invalid.');
  const record = claims as Record<string, unknown>;
  const audiences = Array.isArray(record.aud) ? record.aud : [record.aud];
  const scopes = typeof record.scope === 'string' ? record.scope.split(/\s+/) : [];

  if (record.iss !== TOKEN_ISSUER) throw new Error('This token was not issued by the HackCanton Keycloak realm.');
  if (!audiences.includes(TOKEN_AUDIENCE)) throw new Error('This token is not intended for the HackCanton DevNet participant.');
  if (!scopes.includes('daml_ledger_api')) throw new Error('The token is missing the daml_ledger_api scope.');
  if (typeof record.sub !== 'string' || !record.sub) throw new Error('The token has no Ledger user ID (sub claim).');
  if (typeof record.exp !== 'number' || record.exp * 1000 <= Date.now()) throw new Error('This access token has expired. Request a fresh token.');

  return {
    sub: record.sub,
    exp: record.exp,
    iss: record.iss,
    aud: record.aud as string | string[],
    scope: record.scope as string,
  };
}

export function hasPartyRight(rights: unknown, rightName: 'CanActAs' | 'CanReadAs', party: string): boolean {
  if (Array.isArray(rights)) return rights.some((right) => hasPartyRight(right, rightName, party));
  if (!rights || typeof rights !== 'object') return false;

  const record = rights as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === rightName && containsParty(value, party)) return true;
    if (value && typeof value === 'object' && hasPartyRight(value, rightName, party)) return true;
  }

  return false;
}

function containsParty(value: unknown, party: string): boolean {
  if (Array.isArray(value)) return value.some((item) => containsParty(item, party));
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  if (record.party === party) return true;
  return Object.values(record).some((nestedValue) => containsParty(nestedValue, party));
}
