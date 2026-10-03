'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import type { WalletInfo } from '@partylayer/sdk';
import toast from 'react-hot-toast';
import { IconLock } from '@/components/Icons';
import { CantonWalletContext } from '@/components/CantonWalletProvider';
import { getCantonClient } from '@/lib/canton/client';

const REQUIRED_CAPABILITIES = ['submitTransaction', 'ledgerApi'] as const;

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
  const { wallets, detectingWallets, refreshWallets } = useContext(CantonWalletContext);
  const [connecting, setConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showOtherWallets, setShowOtherWallets] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    refreshWallets()
      .then(() => { if (active) setStatusMsg(''); })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unable to discover Canton wallets.';
        if (active) {
          setStatusMsg(message);
          toast.error(message);
        }
      });
    return () => { active = false; };
  }, [isOpen, refreshWallets]);

  const { primaryWallets, otherWallets } = useMemo(() => {
    const priority = (wallet: WalletInfo) => {
      const name = wallet.name.toLowerCase();
      if (name.includes('console')) return 0;
      if (name.includes('loop')) return 1;
      return 2;
    };
    const orderedWallets = [...wallets].sort((first, second) => {
      const priorityDiff = priority(first) - priority(second);
      return priorityDiff || first.name.localeCompare(second.name);
    });
    const preferred = orderedWallets.filter((wallet) => priority(wallet) < 2);
    const fallback = orderedWallets.filter((wallet) => priority(wallet) === 2);
    return {
      primaryWallets: preferred.length > 0 ? preferred : orderedWallets.slice(0, 2),
      otherWallets: preferred.length > 0 ? fallback : orderedWallets.slice(2),
    };
  }, [wallets]);

  if (!isOpen) return null;

  const handleConnect = async (walletId: WalletInfo['walletId']) => {
    setConnecting(true);
    try {
      setStatusMsg('Approve the connection request in your wallet.');
      const session = await getCantonClient().connect({
        walletId,
        requiredCapabilities: [...REQUIRED_CAPABILITIES],
      });
      await onSelectParty(session.partyId);
      setStatusMsg('');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect the Canton wallet.';
      setStatusMsg(message);
      toast.error(message);
    } finally {
      setConnecting(false);
    }
  };

  const getWalletIcon = (wallet: WalletInfo) => {
    const announcedIcon = (wallet as WalletInfo & { icon?: string }).icon;
    return wallet.icons.md || wallet.icons.sm || wallet.icons.lg || announcedIcon || '';
  };

  const renderWalletButton = (wallet: WalletInfo, compact = false) => (
    <button
      key={wallet.walletId}
      type="button"
      onClick={() => handleConnect(wallet.walletId)}
      disabled={connecting}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#ebdca4] bg-[#fffdf5] text-left transition-colors hover:border-[#76C457] disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'p-2.5' : 'p-3.5'}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebdca4] bg-white">
        {getWalletIcon(wallet) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getWalletIcon(wallet)}
            alt={`${wallet.name} icon`}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <span className="text-sm font-black text-[#092328]">{wallet.name.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[#092328]">{wallet.name}</span>
        {!compact && (
          <span className="block text-xs text-[#092328]/65">Signs as the active Canton party in this wallet</span>
        )}
      </span>
      <span className="text-xs font-bold text-[#2b6819]">{connecting ? 'Connecting...' : 'Connect'}</span>
    </button>
  );

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
              <p className="text-xs text-[#092328]/70">Use the wallet that can act as your demo party</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#092328]/60 hover:text-[#092328] w-8 h-8 rounded-lg flex cursor-pointer items-center justify-center hover:bg-[#ebdca4]/50 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {currentParty !== 'Not Connected' && (
            <div className="rounded-xl border border-[#ebdca4] bg-[#f0e3b9] p-3 text-xs text-[#092328]/75">
              <span className="font-bold text-[#092328]">Current party:</span>{' '}
              <span className="break-all font-mono font-bold text-[#092328]">{currentParty}</span>
            </div>
          )}

          {detectingWallets ? (
            <p className="py-6 text-center text-xs text-[#092328]/70">Searching for DevNet wallets...</p>
          ) : wallets.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-2">
                {primaryWallets.map((wallet) => renderWalletButton(wallet))}
              </div>

              {otherWallets.length > 0 && (
                <div className="border-t border-[#ebdca4] pt-3">
                  <button
                    type="button"
                    onClick={() => setShowOtherWallets((value) => !value)}
                    className="flex w-full cursor-pointer items-center justify-between text-xs font-bold text-[#092328]/70 hover:text-[#092328]"
                  >
                    <span>{showOtherWallets ? 'Hide other wallets' : `Show other wallets (${otherWallets.length})`}</span>
                    <span>{showOtherWallets ? '−' : '+'}</span>
                  </button>
                  {showOtherWallets && (
                    <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-xl">
                      {otherWallets.map((wallet) => renderWalletButton(wallet, true))}
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <p className="border border-[#ebdca4] bg-[#fffdf5] p-4 text-xs text-[#092328]/70">
              No DevNet signing wallet was found. Unlock Nightly, set it to Canton DevNet, then refresh this page.
            </p>
          )}
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className="mt-3 max-h-28 overflow-y-auto break-words rounded-xl border border-[#ebdca4] bg-[#f0e3b9] p-2.5 text-center font-mono text-xs text-[#092328]">
            {statusMsg}
          </div>
        )}

      </div>
    </div>
  );
}
