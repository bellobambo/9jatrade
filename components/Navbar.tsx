'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { IconCoins, IconCopy } from '@/components/Icons';
import { useTradeStore } from '@/lib/services/tradeStore';
import { ConnectCantonModal } from './ConnectCantonModal';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const store = useTradeStore();
  const currentProfile = store.getCurrentProfile();
  const currentParty = store.getCurrentParty();
  const restoringConnection = store.isRestoringConnection();
  const tokenBalance = store.getTokenBalance();
  const tokenBalanceError = store.getTokenBalanceError();
  const tokenBalanceLoading = store.isTokenBalanceLoading();

  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);

  useEffect(() => {
    if (!currentParty) return;
    const refreshInterval = window.setInterval(() => {
      void store.refreshTokenBalance();
    }, 60_000);
    return () => window.clearInterval(refreshInterval);
  }, [currentParty, store]);

  const shortAddress = currentParty
    ? (currentParty.includes('::')
      ? currentParty.split('::')[1].slice(0, 6) + '...' + currentParty.split('::')[1].slice(-4)
      : currentParty.slice(0, 6) + '...' + currentParty.slice(-4))
    : '';

  const displayIdentity = currentParty
    ? (currentProfile?.isVerified
      ? `${currentProfile.companyName} (${shortAddress})`
      : shortAddress)
    : restoringConnection ? 'Restoring Ledger...' : 'Connect to Ledger';

  const handleConnectionButtonClick = async () => {
    if (!currentParty) {
      setIsConnectionModalOpen(true);
      return;
    }

    try {
      store.disconnectParty();
      setIsConnectionModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to disconnect from the Ledger.');
    }
  };

  const handleCopyParty = async () => {
    if (!currentParty) return;
    try {
      await navigator.clipboard.writeText(currentParty);
      toast.success('Party ID copied.');
    } catch {
      toast.error('Unable to copy party ID.');
    }
  };

  return (
    <header className="bg-[#092328] text-white sticky top-0 z-40 border-b border-[#0f3942] shadow-md font-sans">
      <div className="w-full px-6 sm:px-10 lg:px-12 h-18 flex items-center justify-between gap-4">

        {/* Brand Logo (Left Side) */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center group">
            <span className="font-extrabold text-2xl tracking-tight text-white leading-none">
              9ja<span className="text-[#76C457]">Trade</span>
            </span>
          </Link>
        </div>

        {/* Right Section: Navigation Links & Connection Button */}
        <div className="flex items-center gap-4 sm:gap-6">

          {currentParty && (
            <div
              className="flex items-center gap-1.5 rounded-md border border-[#1f5763] bg-[#0f3942] px-2.5 py-1.5 text-xs font-bold text-[#76C457]"
              title={tokenBalanceError ?? 'Canton Coin balance for the connected party'}
              aria-live="polite"
            >
              <IconCoins className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">
                {tokenBalanceLoading ? 'Loading CC...' : tokenBalance ?? 'CC unavailable'}
              </span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 text-sm font-medium">

            {/* Hidden by default until the Ledger account is connected */}
            {currentProfile && (
              <>
                {currentProfile.isVerified && (
                  <Link
                    href="/dashboard"
                    className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${pathname === '/dashboard'
                      ? 'bg-[#76C457] text-[#092328] font-bold shadow-xs'
                      : 'text-gray-300 hover:text-white hover:bg-[#0f3942]'
                      }`}
                  >
                    Trade Dashboard
                  </Link>
                )}

                {!currentProfile.isVerified && (
                  <button
                    onClick={() => {
                      store.setPendingRegistrationType('commercial');
                      router.push('/register');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${pathname === '/register' && store.getPendingRegistrationType() === 'commercial'
                      ? 'bg-[#76C457] text-[#092328] font-bold shadow-xs'
                      : 'text-[#76C457] hover:bg-[#0f3942]'
                      }`}
                  >
                    Register
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Connect / Active Company Button */}
          <button
            onClick={() => { void handleConnectionButtonClick(); }}
            disabled={restoringConnection}
            title={store.getError() ?? undefined}
            className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-extrabold text-xs px-4 py-2 rounded-md shadow-xs transition-all flex items-center gap-2 disabled:cursor-wait disabled:opacity-75"
          >
            <span className={`w-2 h-2 rounded-full ${currentParty ? 'bg-[#092328]' : 'bg-amber-800 animate-ping'}`}></span>
            <span className="truncate max-w-[140px] sm:max-w-none">{displayIdentity}</span>
          </button>

          {currentParty && (
            <button
              type="button"
              onClick={() => { void handleCopyParty(); }}
              title="Copy party ID"
              aria-label="Copy party ID"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#1f5763] bg-[#0f3942] text-[#76C457] transition-colors hover:bg-[#174b55]"
            >
              <IconCopy className="h-3.5 w-3.5" />
            </button>
          )}

        </div>

      </div>

      {/* Connect to the HackCanton Ledger API */}
      <ConnectCantonModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        currentParty={currentParty}
        onConnect={(partyId, accessToken) => store.connectParty(partyId, accessToken)}
      />
    </header>
  );
}
