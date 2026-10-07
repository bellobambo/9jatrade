import { NextResponse } from 'next/server';

const DEFAULT_LEDGER_API = 'https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services';

type RequestBody =
  | { operation: 'userRights' }
  | { operation: 'ledgerEnd' }
  | { operation: 'activeContracts'; request: Record<string, unknown> }
  | { operation: 'tokenHoldings'; party: string; activeAtOffset: number }
  | { operation: 'submitCommand'; request: Record<string, unknown> }
  | { operation: 'packageStatus'; packageId: string };

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ') || authorization.length <= 'Bearer '.length) {
    return NextResponse.json({ error: 'Provide a Ledger API access token.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json() as unknown;
  } catch {
    return NextResponse.json({ error: 'The Ledger API request body must be valid JSON.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('operation' in body)) {
    return NextResponse.json({ error: 'Specify a supported Ledger API operation.' }, { status: 400 });
  }

  const typedBody = body as RequestBody;
  const endpoint = resolveEndpoint(typedBody, authorization.slice('Bearer '.length));
  if (!endpoint) return NextResponse.json({ error: 'Unsupported Ledger API operation.' }, { status: 400 });

  const baseUrl = (
    process.env.CANTON_LEDGER_JSON_API
    || process.env.NEXT_PUBLIC_CANTON_LEDGER_JSON_API
    || DEFAULT_LEDGER_API
  ).replace(/\/+$/, '');

  try {
    const upstream = await fetch(`${baseUrl}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        Authorization: authorization,
        ...(endpoint.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(endpoint.body ? { body: JSON.stringify(endpoint.body) } : {}),
      cache: 'no-store',
    });
    const responseBody = await upstream.text();
    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach the HackCanton Ledger API.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function resolveEndpoint(body: RequestBody, token: string): { path: string; method: 'GET' | 'POST'; body?: unknown } | null {
  switch (body.operation) {
    case 'userRights':
      {
        const userId = tokenSubject(token);
        return userId ? { path: `/v2/users/${encodeURIComponent(userId)}/rights`, method: 'GET' } : null;
      }
    case 'ledgerEnd':
      return { path: '/v2/state/ledger-end', method: 'GET' };
    case 'activeContracts':
      if (!isRecord(body.request)) return null;
      return { path: '/v2/state/active-contracts', method: 'POST', body: body.request };
    case 'tokenHoldings':
      if (!body.party || body.party.length > 512 || !Number.isSafeInteger(body.activeAtOffset) || body.activeAtOffset < 0) return null;
      return {
        path: '/v2/state/active-contracts',
        method: 'POST',
        body: {
          activeAtOffset: body.activeAtOffset,
          eventFormat: {
            filtersByParty: {
              [body.party]: {
                cumulative: [{
                  identifierFilter: {
                    InterfaceFilter: {
                      value: {
                        interfaceId: '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding',
                        includeInterfaceView: true,
                        includeCreatedEventBlob: false,
                      },
                    },
                  },
                }],
              },
            },
            verbose: true,
          },
        },
      };
    case 'submitCommand':
      if (!isRecord(body.request) || !isRecord(body.request.commands)) return null;
      {
        const userId = tokenSubject(token);
        if (!userId) return null;
        return {
          path: '/v2/commands/submit-and-wait-for-transaction',
          method: 'POST',
          body: {
            ...body.request,
            commands: { ...body.request.commands, userId },
          },
        };
      }
    case 'packageStatus':
      if (!/^[a-f0-9]{64}$/i.test(body.packageId)) return null;
      return { path: `/v2/packages/${encodeURIComponent(body.packageId)}/status`, method: 'GET' };
    default:
      return null;
  }
}

function tokenSubject(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as unknown;
    if (!claims || typeof claims !== 'object' || !('sub' in claims)) return null;
    return typeof claims.sub === 'string' && claims.sub ? claims.sub : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
