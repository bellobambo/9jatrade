'use client';

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, SessionConnectedEvent, WalletInfo } from '@partylayer/sdk';
import { CANTON_CONFIG } from '@/lib/canton/config';
import { getCantonClient } from '@/lib/canton/client';
import { tradeStateStore } from '@/lib/services/tradeStore';

const DISCOVERY_CAPABILITIES = ['submitTransaction'] as const;
const TOKEN_HOLDING_INTERFACE_ID = '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding';

type CantonWalletContextValue = {
  activeParty: string | null;
  walletNetwork: string | null;
  walletBalance: string | null;
  walletBalanceLoading: boolean;
  detectingWallets: boolean;
  wallets: WalletInfo[];
  refreshWallets: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
};

export const CantonWalletContext = createContext<CantonWalletContextValue>({
  activeParty: null,
  walletNetwork: null,
  walletBalance: null,
  walletBalanceLoading: false,
  detectingWallets: true,
  wallets: [],
  refreshWallets: async () => {},
  disconnectWallet: async () => {},
});

export function CantonWalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [activeParty, setActiveParty] = useState<string | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);
  const [detectingWallets, setDetectingWallets] = useState(true);

  const refreshWalletBalance = useCallback(async (session: Session | null) => {
    setWalletNetwork(session?.network ?? null);
    setWalletBalance(null);
    if (!session) return;
    if (!String(session.walletId).toLowerCase().includes('loop')) return;

    setWalletBalanceLoading(true);
    try {
      const response = await getCantonClient().ledgerApi({
        requestMethod: 'POST',
        resource: '/v2/state/acs',
        body: JSON.stringify({ interfaceId: TOKEN_HOLDING_INTERFACE_ID }),
      });
      const body = typeof response.response === 'string' ? JSON.parse(response.response) : response.response;
      setWalletBalance(formatCcBalance(body));
    } catch {
      setWalletBalance('Balance unavailable');
    } finally {
      setWalletBalanceLoading(false);
    }
  }, []);

  const refreshWallets = useCallback(async () => {
    const client = getCantonClient();
    setDetectingWallets(true);
    try {
      const availableWallets = await client.listWallets({ requiredCapabilities: [...DISCOVERY_CAPABILITIES] });
      const compatibleWallets = availableWallets.filter((wallet) => (
        wallet.networks.includes(CANTON_CONFIG.network)
        && DISCOVERY_CAPABILITIES.every((capability) => wallet.capabilities.includes(capability))
        && Boolean(client.getAdapter(wallet.walletId))
      ));
      setWallets(Array.from(new Map(compatibleWallets.map((wallet) => [wallet.walletId, wallet])).values()));
    } finally {
      setDetectingWallets(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      await getCantonClient().disconnect();
    } finally {
      setActiveParty(null);
      setWalletNetwork(null);
      setWalletBalance(null);
      setWalletBalanceLoading(false);
      tradeStateStore.disconnectParty();
    }
  }, []);

  useEffect(() => {
    const client = getCantonClient();
    tradeStateStore.initialize();

    let active = true;
    const syncActiveSession = async (retries = 1) => {
      const session = await client.getActiveSession();
      if (!active) return;
      if (!session && retries > 0) {
        window.setTimeout(() => {
          void syncActiveSession(retries - 1);
        }, 750);
        return;
      }
      setActiveParty(session?.partyId ?? null);
      void refreshWalletBalance(session);
      if (session) {
        await tradeStateStore.connectParty(session.partyId).catch(() => {});
      }
      else tradeStateStore.disconnectParty();
    };

    const unsubscribeConnected = client.on<SessionConnectedEvent>('session:connected', (event) => {
      setActiveParty(event.session.partyId);
      void refreshWalletBalance(event.session);
      void tradeStateStore.connectParty(event.session.partyId).catch(() => {});
    });
    const clearSession = () => {
      setActiveParty(null);
      setWalletNetwork(null);
      setWalletBalance(null);
      setWalletBalanceLoading(false);
      tradeStateStore.disconnectParty();
    };
    const unsubscribeDisconnected = client.on('session:disconnected', clearSession);
    const unsubscribeExpired = client.on('session:expired', clearSession);
    const unsubscribeWalletsChanged = client.on('wallets:changed', () => {
      void refreshWallets();
    });

    const initialSync = window.setTimeout(() => {
      void refreshWallets();
      void syncActiveSession(2);
    }, 0);

    const handleFocus = () => {
      void syncActiveSession();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncActiveSession();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearTimeout(initialSync);
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeExpired();
      unsubscribeWalletsChanged();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshWalletBalance, refreshWallets]);

  const value = useMemo(() => ({
    activeParty,
    walletNetwork,
    walletBalance,
    walletBalanceLoading,
    detectingWallets,
    wallets,
    refreshWallets,
    disconnectWallet,
  }), [activeParty, detectingWallets, disconnectWallet, refreshWallets, walletBalance, walletBalanceLoading, walletNetwork, wallets]);

  return (
    <CantonWalletContext.Provider value={value}>
      {children}
    </CantonWalletContext.Provider>
  );
}

function formatCcBalance(value: unknown): string {
  const amounts = collectCcAmounts(value);
  if (amounts.length === 0) return 'Balance unavailable';
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  return `${total.toLocaleString(undefined, { maximumFractionDigits: 6 })} CC`;
}

function collectCcAmounts(value: unknown): number[] {
  if (Array.isArray(value)) return value.flatMap(collectCcAmounts);
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  const symbol = findString(record, ['symbol', 'instrumentId', 'instrument_id', 'id']);
  const amount = findNumber(record, ['total_unlocked_coin', 'unlocked', 'amount', 'quantity', 'value']);
  const nestedAmounts = Object.values(record).flatMap(collectCcAmounts);

  if (amount !== null && (!symbol || symbol === 'CC' || symbol === 'Amulet')) {
    return [amount, ...nestedAmounts];
  }

  return nestedAmounts;
}

function findString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const nested = findString(value as Record<string, unknown>, keys);
      if (nested) return nested;
    }
  }
  return null;
}

function findNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}
