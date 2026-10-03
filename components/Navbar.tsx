'use client';

import { useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CantonWalletContext } from '@/components/CantonWalletProvider';
import { IconCopy } from '@/components/Icons';
import { useTradeStore } from '@/lib/services/tradeStore';
import { ConnectWalletModal } from './ConnectWalletModal';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const store = useTradeStore();
  const currentProfile = store.getCurrentProfile();
  const currentParty = store.getCurrentParty();
  const { disconnectWallet, walletBalance, walletBalanceLoading, walletNetwork } = useContext(CantonWalletContext);

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const shortAddress = currentParty
    ? (currentParty.includes('::')
      ? currentParty.split('::')[1].slice(0, 6) + '...' + currentParty.split('::')[1].slice(-4)
      : currentParty.slice(0, 6) + '...' + currentParty.slice(-4))
    : '';

  const displayIdentity = currentParty
    ? (currentProfile?.isVerified
      ? `${currentProfile.companyName} (${shortAddress})`
      : shortAddress)
    : 'Connect Wallet';

  const handleWalletButtonClick = async () => {
    if (!currentParty) {
      setIsWalletModalOpen(true);
      return;
    }

    try {
      await disconnectWallet();
      setIsWalletModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to disconnect wallet.');
    }
  };

  const handleCopyWallet = async () => {
    if (!currentParty) return;
    try {
      await navigator.clipboard.writeText(currentParty);
      toast.success('Wallet address copied.');
    } catch {
      toast.error('Unable to copy wallet address.');
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

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 text-sm font-medium">

            {/* Hidden by default until wallet is connected */}
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

          {currentParty && (
            <div className="hidden items-center gap-2 text-[11px] font-bold text-gray-200 sm:flex">
              <span className="rounded-md border border-[#1f5763] bg-[#0f3942] px-2 py-1 uppercase text-[#76C457]">
                {walletNetwork ?? 'unknown'}
              </span>
              <span className="max-w-[130px] truncate rounded-md border border-[#1f5763] bg-[#0f3942] px-2 py-1">
                {walletBalanceLoading ? 'Balance...' : walletBalance ?? 'Balance unavailable'}
              </span>
            </div>
          )}

          {/* Connect / Active Company Button */}
          <button
            onClick={() => { void handleWalletButtonClick(); }}
            className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-extrabold text-xs px-4 py-2 rounded-md shadow-xs transition-all flex items-center gap-2"
          >
            <span className={`w-2 h-2 rounded-full ${currentParty ? 'bg-[#092328]' : 'bg-amber-800 animate-ping'}`}></span>
            <span className="truncate max-w-[140px] sm:max-w-none">{displayIdentity}</span>
          </button>

          {currentParty && (
            <button
              type="button"
              onClick={() => { void handleCopyWallet(); }}
              title="Copy wallet address"
              aria-label="Copy wallet address"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#1f5763] bg-[#0f3942] text-[#76C457] transition-colors hover:bg-[#174b55]"
            >
              <IconCopy className="h-3.5 w-3.5" />
            </button>
          )}

        </div>

      </div>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        currentParty={currentParty || 'Not Connected'}
        onSelectParty={(partyId) => store.connectParty(partyId)}
      />
    </header>
  );
}
