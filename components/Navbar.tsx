'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTradeStore } from '@/lib/services/tradeStore';
import { ConnectWalletModal } from './ConnectWalletModal';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const store = useTradeStore();
  const currentProfile = store.getCurrentProfile();
  const currentParty = store.getCurrentParty();

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

          {/* Connect / Active Company Button */}
          <button
            onClick={() => setIsWalletModalOpen(true)}
            className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-extrabold text-xs px-4 py-2 rounded-md shadow-xs transition-all flex items-center gap-2"
          >
            <span className={`w-2 h-2 rounded-full ${currentParty ? 'bg-[#092328]' : 'bg-amber-800 animate-ping'}`}></span>
            <span className="truncate max-w-[140px] sm:max-w-none">{displayIdentity}</span>
          </button>

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
