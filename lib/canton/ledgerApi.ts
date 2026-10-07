export type LedgerRequest =
  | { operation: 'userRights' }
  | { operation: 'ledgerEnd' }
  | { operation: 'activeContracts'; request: Record<string, unknown> }
  | { operation: 'tokenHoldings'; party: string; activeAtOffset: number }
  | { operation: 'submitCommand'; request: Record<string, unknown> }
  | { operation: 'packageStatus'; packageId: string };

export async function callLedgerApi(token: string, request: LedgerRequest): Promise<unknown> {
  const response = await fetch('/api/canton/ledger', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    cache: 'no-store',
  });

  const responseText = await response.text();
  let responseBody: unknown = responseText;
  try {
    responseBody = responseText ? JSON.parse(responseText) as unknown : null;
  } catch {
    responseBody = responseText;
  }

  if (!response.ok) {
    throw new Error(readErrorMessage(responseBody, response.status));
  }
  return responseBody;
}

function readErrorMessage(value: unknown, status: number): string {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail', 'cause']) {
      if (typeof record[key] === 'string' && record[key]) return `${record[key]} (HTTP ${status})`;
    }
  }
  if (typeof value === 'string' && value) return `${value} (HTTP ${status})`;
  return `Ledger API request failed (HTTP ${status}).`;
}
