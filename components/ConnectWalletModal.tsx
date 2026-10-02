'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { WalletInfo } from '@partylayer/sdk';
import { IconLock } from '@/components/Icons';
import { CANTON_CONFIG } from '@/lib/canton/config';
import { getCantonClient } from '@/lib/canton/client';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParty: string;
  onSelectParty: (partyId: string) => Promise<void> | void;
}

export function ConnectWalletModal({
  isOpen,
  onClose,
  currentParty,
  onSelectParty,
}: ConnectWalletModalProps) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    getCantonClient().listWallets()
      .then((availableWallets) => {
        if (active) setWallets(availableWallets.filter((wallet) => wallet.networks.includes(CANTON_CONFIG.network)));
      })
      .catch((error: unknown) => {
        if (active) setStatusMsg(error instanceof Error ? error.message : 'Unable to discover Canton wallets.');
      })
      .finally(() => {
        if (active) setLoadingWallets(false);
      });
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (walletId: WalletInfo['walletId']) => {
    setConnecting(true);
    try {
      setStatusMsg('Approve the connection request in your wallet.');
      const session = await getCantonClient().connect({
        walletId,
        requiredCapabilities: ['submitTransaction', 'ledgerApi'],
      });
      await onSelectParty(session.partyId);
      setStatusMsg('');
      onClose();
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'Unable to connect the Canton wallet.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#092328]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-[#FDF4D2] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#ebdca4] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#ebdca4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#092328] text-[#76C457] flex items-center justify-center">
              <IconLock className="w-5 h-5 text-[#76C457]" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#092328]">Connect Canton Party</h3>
              <p className="text-xs text-[#092328]/70">Connect an allocated Canton account on DevNet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#092328]/60 hover:text-[#092328] w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#ebdca4]/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Register New Company Callout */}
        <div className="mt-5 p-4 rounded-xl bg-[#f0e3b9] border border-[#ebdca4] flex items-center justify-between gap-3">
          <div>
            <span className="font-extrabold text-sm text-[#092328] block">New to 9jaTrade?</span>
            <span className="text-xs text-[#092328]/70 block mt-0.5">
              Submit your company application to become an authorized Supplier, Buyer, or Financier.
            </span>
          </div>
          <Link
            href="/register"
            onClick={onClose}
            className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black text-xs px-4 py-2.5 rounded-xl shadow-xs shrink-0 transition-colors"
          >
            Register →
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-sm font-bold text-[#092328]">
            {currentParty !== 'Not Connected' ? `Connected party: ${currentParty}` : 'Choose a Canton wallet'}
          </p>
          {loadingWallets ? (
            <p className="py-6 text-center text-xs text-[#092328]/70">Searching for DevNet wallets...</p>
          ) : wallets.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {wallets.map((wallet) => (
                <button
                  key={wallet.walletId}
                  type="button"
                  onClick={() => handleConnect(wallet.walletId)}
                  disabled={connecting}
                  className="flex w-full items-center gap-3 border border-[#ebdca4] bg-[#fffdf5] p-3 text-left transition-colors hover:border-[#76C457] disabled:opacity-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#092328] text-sm font-black text-[#76C457]">
                    {wallet.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#092328]">{wallet.name}</span>
                    <span className="block text-xs text-[#092328]/65">DevNet · signed commands and ledger reads required</span>
                  </span>
                  <span className="text-xs font-bold text-[#2b6819]">{connecting ? 'Connecting...' : 'Connect'}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="border border-[#ebdca4] bg-[#fffdf5] p-4 text-xs text-[#092328]/70">
              No compatible DevNet wallet was found. Install a wallet that supports Canton DevNet, Ledger API reads, and transaction submission.
            </p>
          )}
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className="mt-3 p-2.5 bg-[#f0e3b9] rounded-xl text-xs text-[#092328] font-mono text-center border border-[#ebdca4]">
            {statusMsg}
          </div>
        )}

      </div>
    </div>
  );
}
