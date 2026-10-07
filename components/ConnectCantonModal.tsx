'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IconLock } from '@/components/Icons';
import { parseLedgerAccessToken } from '@/lib/canton/auth';

interface ConnectCantonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParty: string | null;
  onConnect: (partyId: string, accessToken: string) => Promise<void>;
}

export function ConnectCantonModal({ isOpen, onClose, currentParty, onConnect }: ConnectCantonModalProps) {
  const [partyId, setPartyId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const ledgerUserId = useMemo(() => {
    if (!accessToken.trim()) return null;
    try {
      return parseLedgerAccessToken(accessToken).sub;
    } catch {
      return null;
    }
  }, [accessToken]);

  if (!isOpen) return null;

  const handleClose = () => {
    setPartyId('');
    setAccessToken('');
    setStatusMessage('');
    onClose();
  };

  const handleConnect = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConnecting(true);
    setStatusMessage('');
    try {
      await onConnect(partyId.trim(), accessToken.trim());
      setPartyId('');
      setAccessToken('');
      handleClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect to the Canton Ledger API.';
      setStatusMessage(message);
      toast.error(message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#092328]/70 p-4 backdrop-blur-xs">
      <section
        aria-labelledby="connect-canton-title"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-[#ebdca4] bg-[#FDF4D2] p-6 shadow-2xl sm:p-8"
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-[#ebdca4] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#092328] text-[#76C457]">
              <IconLock className="h-5 w-5" />
            </span>
            <div>
              <h2 id="connect-canton-title" className="text-xl font-extrabold text-[#092328]">Connect to Canton DevNet</h2>
              <p className="text-xs text-[#092328]/70">Authenticate with your Ledger API access token and allocated party.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={connecting}
            aria-label="Close connection dialog"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#092328]/60 hover:bg-[#ebdca4]/50 hover:text-[#092328] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✕
          </button>
        </header>

        <div className="hidden mt-4 rounded-xl border border-[#ebdca4] bg-[#fffdf5] p-3 text-xs leading-relaxed text-[#092328]/80">
          First onboard at the{' '}
          <a
            href="https://wallet.validator.hackcanton-01.devnet.naas.noders.services"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[#2b6819] underline"
          >
            NODERS DevNet Wallet
          </a>
          {' '}and copy your full Party ID. Follow the{' '}
          <a
            href="https://hackmd.io/@IzUWaelHTRa_fG1NRW376w/HkBpCR5YGx"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[#2b6819] underline"
          >
            HackCanton Quickstart
          </a>
          {' '}to get an access token. Paste only the short-lived
          <span className="font-bold"> access_token</span> here, never your password or refresh token.
        </div>

        {currentParty && <p className="mt-3 break-all rounded-lg bg-[#f0e3b9] p-3 font-mono text-xs text-[#092328]">Current party: {currentParty}</p>}

        <form onSubmit={handleConnect} className="mt-5 space-y-4">
          <div>
            <label htmlFor="canton-party-id" className="mb-1 block text-xs font-bold text-[#092328]">Allocated Canton Party ID</label>
            <input
              id="canton-party-id"
              autoComplete="off"
              required
              value={partyId}
              onChange={(event) => setPartyId(event.target.value)}
              placeholder="Copy the full party ID from the NODERS Wallet"
              className="w-full rounded-xl border border-[#ebdca4] bg-[#fffdf5] p-3 font-mono text-xs text-[#092328] outline-none focus:border-[#76C457]"
            />
          </div>

          <div>
            <label htmlFor="canton-access-token" className="mb-1 block text-xs font-bold text-[#092328]">Ledger API access token</label>
            <input
              id="canton-access-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder="Paste access_token (JWT)"
              className="w-full rounded-xl border border-[#ebdca4] bg-[#fffdf5] p-3 font-mono text-xs text-[#092328] outline-none focus:border-[#76C457]"
            />
            <p className="mt-1 break-all text-[11px] text-[#092328]/60">
              {ledgerUserId
                ? `Ledger user ID from token: ${ledgerUserId}`
                : 'Your party ID and token are saved in browser local storage and restored on page refresh. They are cleared when you disconnect.'}
            </p>
          </div>

          {statusMessage && (
            <p role="alert" className="max-h-28 overflow-y-auto break-words rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
              {statusMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={connecting || !ledgerUserId}
            className="w-full rounded-xl bg-[#76C457] px-4 py-3 text-sm font-black text-[#092328] hover:bg-[#67b049] disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center min-h-[44px]"
          >
            {connecting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-[#092328]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking rights and connecting...
              </span>
            ) : (
              'Connect to Ledger'
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
