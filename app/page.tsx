'use client';

import { useContext, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CantonWalletContext } from '@/components/CantonWalletProvider';
import { useTradeStore, TrustPassportData } from '@/lib/services/tradeStore';
import { TrustPassportModal } from '@/components/TrustPassportModal';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';
import {
    IconFileText,
    IconBuilding,
    IconBank,
    IconArrowRight,
    IconCopy,
} from '@/components/Icons';

export default function Home() {
    const router = useRouter();
    const store = useTradeStore();
    const invoices = store.getInvoices();
    const currentProfile = store.getCurrentProfile();
    const currentParty = store.getCurrentParty();
    const { disconnectWallet, walletBalance, walletBalanceLoading, walletNetwork } = useContext(CantonWalletContext);

    const [selectedPassport, setSelectedPassport] = useState<TrustPassportData | null>(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

    const demoInvoice = invoices[0]?.payload;
    const demoPassport = demoInvoice ? store.getTrustPassport(demoInvoice.invoiceId) : null;

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

    const handleLandingConnect = async (partyId: string) => {
        await store.connectParty(partyId);
        store.setPendingRegistrationType('commercial');
        router.push('/register');
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
        <div className="flex flex-col min-h-screen bg-[#FDF4D2] text-[#092328] font-sans selection:bg-[#76C457] selection:text-[#092328] overflow-x-hidden">

            {/* 1. Floating Top Navigation Dock (matching image.png) */}
            <div className="fixed top-5 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
                <header className="pointer-events-auto bg-[#092328]/95 backdrop-blur-md text-white border border-[#144852] rounded-xl shadow-2xl px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-4 transition-all hover:border-[#76C457]/50">

                    {/* Logo */}
                    <Link href="/" className="flex items-center px-1.5 group">
                        <span className="font-extrabold text-base tracking-tight text-white">
                            9ja<span className="text-[#76C457]">Trade</span>
                        </span>
                    </Link>

                    {/* Navigation Pill Links */}
                    <nav className="flex items-center gap-1 text-xs font-semibold text-gray-300">
                        <Link
                            href="/about"
                            className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-[#133e46] transition-colors flex items-center gap-1.5"
                        >
                            <span>How It Works</span>
                            <IconArrowRight className="w-3 h-3 text-[#76C457]" />
                        </Link>

                        {/* If wallet connected but NOT verified -> show Register */}
                        {currentProfile && !currentProfile.isVerified && (
                            <Link
                                href="/register"
                                className="px-3 py-1.5 rounded-lg text-[#76C457] hover:bg-[#133e46] transition-colors font-bold"
                            >
                                Register
                            </Link>
                        )}

                        {/* If fully verified -> show Trade App */}
                        {currentProfile && currentProfile.isVerified && (
                            <Link
                                href="/dashboard"
                                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-[#133e46] transition-colors font-semibold"
                            >
                                Trade App
                            </Link>
                        )}
                    </nav>

                    {currentParty && (
                        <div className="hidden items-center gap-1.5 text-[10px] font-bold text-gray-200 sm:flex">
                            <span className="rounded-md border border-[#1f5763] bg-[#0f3942] px-2 py-1 uppercase text-[#76C457]">
                                {walletNetwork ?? 'unknown'}
                            </span>
                            <span className="max-w-[110px] truncate rounded-md border border-[#1f5763] bg-[#0f3942] px-2 py-1">
                                {walletBalanceLoading ? 'Balance...' : walletBalance ?? 'Balance unavailable'}
                            </span>
                        </div>
                    )}

                    {/* Party Connection / Profile Button */}
                    <button
                        onClick={() => { void handleWalletButtonClick(); }}
                        className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black text-xs px-3.5 py-1.5 rounded-md shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <span className={`w-2 h-2 rounded-full ${currentParty ? 'bg-[#092328]' : 'bg-[#092328] animate-pulse'}`}></span>
                        <span className="truncate max-w-[100px] sm:max-w-[130px]">
                            {currentProfile ? (currentProfile.isVerified ? currentProfile.companyName : 'Wallet Connected') : currentParty ? 'Wallet Connected' : 'Connect Wallet'}
                        </span>
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
                </header>
            </div>

            {/* 2. Hero Section (matching the exact layout, typography, and charm of image.png) */}
            <section className="relative pt-32 sm:pt-40 lg:pt-48 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center flex flex-col items-center justify-center">

                {/* Live indicator tag */}
                <div className="inline-flex items-center gap-2 bg-[#f4e6b1] border border-[#ebdca4] px-4 py-1.5 rounded-full text-xs font-bold text-[#092328] mb-8 shadow-xs animate-fade-in">
                    <span className="w-2 h-2 rounded-full bg-[#76C457]"></span>
                    Buyer-Confirmed Invoices &middot; Canton Contract Records
                </div>

                {/* Grand Headline (Mixed editorial serif italic + bold modern sans-serif like image.png) */}
                <div className="relative select-none">

                    {/* Line 1: Verified B2B */}
                    <div className="leading-[1.08] tracking-tight">
                        <span className="font-editorial-italic text-5xl sm:text-7xl lg:text-[98px] text-[#092328] font-normal mr-3 sm:mr-4">
                            Verified
                        </span>
                        <span className="font-extrabold text-5xl sm:text-7xl lg:text-[98px] text-[#092328] tracking-tight">
                            B2B trade
                        </span>
                    </div>

                    {/* Line 2: invoice financing */}
                    <div className="font-extrabold text-5xl sm:text-7xl lg:text-[98px] text-[#092328] tracking-tight leading-[1.08] mt-1 sm:mt-2">
                        invoice financing
                    </div>

                    {/* Line 3: ledger records */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mt-2 sm:mt-3 leading-none">

                        {/* with (italic serif) */}
                        <span className="font-editorial-italic text-5xl sm:text-7xl lg:text-[98px] text-[#092328] font-normal mr-1">
                            with
                        </span>

                        {/* ledger records (bold sans) */}
                        <span className="font-extrabold text-5xl sm:text-7xl lg:text-[98px] text-[#092328] tracking-tight">
                            ledger records
                        </span>

                        {/* 3D Safe Kiosk Sticker with floating money (matching the ATM sticker in image.png) */}
                        <div className="relative inline-flex items-center align-middle ml-1">

                            {/* Floating green banknote 2 */}
                            <div className="absolute -top-7 -right-2 pointer-events-none animate-float-cash-delayed">
                                <div className="bg-[#76C457] text-[#092328] border border-[#529337] px-2 py-0.5 rounded text-[10px] font-black shadow-sm -rotate-6">
                                    Canton
                                </div>
                            </div>

                            {/* Safe Kiosk Sticker SVG */}
                            <div className="w-12 h-14 sm:w-16 sm:h-20 bg-gradient-to-b from-[#76C457] to-[#488b2e] rounded-2xl p-1.5 sm:p-2 border-2 border-[#092328] shadow-2xl flex flex-col justify-between transform rotate-3 hover:rotate-0 transition-transform">
                                <div className="bg-[#092328] rounded-md py-0.5 text-center text-[7px] sm:text-[9px] font-black text-[#76C457] tracking-wider uppercase">
                                    9ja Ledger
                                </div>
                                <div className="bg-[#092328] rounded-md p-1 border border-[#174852] text-center my-0.5">
                                    <div className="text-[7px] sm:text-[9px] font-mono text-[#76C457] font-bold">
                                        ON-CHAIN
                                    </div>
                                </div>
                                <div className="flex items-center justify-between px-1">
                                    <div className="w-4 sm:w-6 h-1 bg-[#092328] rounded-full"></div>
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></div>
                                </div>
                            </div>

                        </div>

                    </div>

                </div>

                {/* Human-friendly Subtitle */}
                <p className="mt-8 text-base sm:text-lg lg:text-xl text-[#092328]/85 max-w-2xl mx-auto font-medium leading-relaxed">
                    Record buyer-confirmed invoices and financing agreements on Canton while preserving payment terms. Funding and settlement transfers happen separately.
                </p>

                {/* 3 Digestible Value Badges */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs font-bold text-[#092328]">
                    <span className="inline-flex items-center gap-1.5 bg-[#f4e6b1] border border-[#ebdca4] px-3.5 py-1.5 rounded-full shadow-xs">
                        <span className="text-[#2b6819] font-black">&#10003;</span> Genuine Trade First
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-[#f4e6b1] border border-[#ebdca4] px-3.5 py-1.5 rounded-full shadow-xs">
                        <span className="text-[#2b6819] font-black">&#10003;</span> Duplicate-Financing Guard
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-[#f4e6b1] border border-[#ebdca4] px-3.5 py-1.5 rounded-full shadow-xs">
                        <span className="text-[#2b6819] font-black">&#10003;</span> Sub-transaction Privacy
                    </span>
                </div>

                {/* Interactive CTA Button with Toggle Slider and Cursor Arrow */}
                <div className="mt-10 sm:mt-12 flex flex-col items-center relative">

                    <div className="relative group">

                        {/* Dark capsule button container */}
                        {currentProfile ? (
                            currentProfile.isVerified ? (
                                <Link
                                    href="/dashboard"
                                    className="bg-[#092328] hover:bg-[#10363e] text-white px-7 sm:px-9 py-4 sm:py-4.5 rounded-md border border-[#174b55] shadow-2xl flex items-center gap-4 transition-all transform group-hover:scale-[1.02] active:scale-[0.99]"
                                >
                                    <span className="font-extrabold text-sm sm:text-base text-gray-200">
                                        Open Trade App
                                    </span>
                                    <div className="w-12 h-6.5 bg-[#163f47] rounded-full p-1 flex items-center border border-[#1f5763]">
                                        <div className="w-4.5 h-4.5 rounded-full bg-[#76C457] shadow-md transform translate-x-5 transition-transform group-hover:translate-x-5" />
                                    </div>
                                </Link>
                            ) : (
                                <button
                                    onClick={() => { store.setPendingRegistrationType('commercial'); router.push('/register'); }}
                                    className="bg-[#092328] hover:bg-[#10363e] text-white px-7 sm:px-9 py-4 sm:py-4.5 rounded-md border border-[#174b55] shadow-2xl flex items-center gap-4 transition-all transform group-hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
                                >
                                    <span className="font-extrabold text-sm sm:text-base text-gray-200">
                                        Complete Registration
                                    </span>
                                    <div className="w-12 h-6.5 bg-[#163f47] rounded-full p-1 flex items-center border border-[#1f5763]">
                                        <div className="w-4.5 h-4.5 rounded-full bg-[#76C457] shadow-md transform translate-x-5 transition-transform group-hover:translate-x-5" />
                                    </div>
                                </button>
                            )
                        ) : (
                            <button
                                onClick={() => setIsWalletModalOpen(true)}
                                className="bg-[#092328] hover:bg-[#10363e] text-white px-7 sm:px-9 py-4 sm:py-4.5 rounded-md border border-[#174b55] shadow-2xl flex items-center gap-4 transition-all transform group-hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
                            >
                                <span className="font-extrabold text-sm sm:text-base text-gray-200">
                                    Connect Wallet
                                </span>
                                <div className="w-12 h-6.5 bg-[#163f47] rounded-full p-1 flex items-center border border-[#1f5763]">
                                    <div className="w-4.5 h-4.5 rounded-full bg-[#76C457] shadow-md transform translate-x-5 transition-transform group-hover:translate-x-5" />
                                </div>
                            </button>
                        )}

                        {/* Mouse cursor pointer arrow */}
                        <div className="absolute -bottom-4 -right-4 sm:-right-6 pointer-events-none transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <svg className="w-8 h-8 sm:w-9 sm:h-9 filter drop-shadow-lg" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M4 3L11.5 21L14.5 13.5L22 10.5L4 3Z"
                                    fill="#ffffff"
                                    stroke="#092328"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                    </div>

                </div>

            </section>

            {/* 3. The 3 Main Roles (Simplified, Human-Friendly, No Buttons) */}
            <section className="pt-8 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 bg-[#f4e6b1] border border-[#ebdca4] px-3.5 py-1 rounded-full text-xs font-bold text-[#092328] mb-3">
                        <span className="w-2 h-2 rounded-full bg-[#76C457]"></span>
                        Built for Nigerian Commerce
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-extrabold text-[#092328] tracking-tight">
                        Who Uses 9jaTrade?
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-[#092328]/75 leading-relaxed">
                        Three distinct roles collaborate on one shared, private ledger to unlock working capital.
                    </p>
                </div>

                {/* 3 Role Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">

                    {/* Card 1: Supplier */}
                    <div className="bg-[#fffdf5] rounded-3xl border border-[#ebdca4] p-7 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <span className="bg-[#092328] text-[#76C457] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Supplier
                                </span>
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-[#76C457]/20 border border-[#76C457]/40 flex items-center justify-center text-[#2b6819] mb-5">
                                <IconFileText className="w-6 h-6" />
                            </div>

                            <h3 className="text-2xl font-black text-[#092328] mb-2 tracking-tight">
                                Commercial Suppliers
                            </h3>
                            <p className="text-xs sm:text-sm text-[#2b6819] font-bold mb-3">
                                Document financing terms against a buyer-confirmed receivable.
                            </p>
                            <p className="text-xs text-[#092328]/80 leading-relaxed mb-6">
                                Designed for manufacturers, food processors, and logistics vendors seeking a ledger-backed financing workflow.
                            </p>

                            <div className="space-y-2.5 pt-4 border-t border-[#ebdca4] text-xs text-[#092328]/90">
                                <div className="flex items-start gap-2.5">
                                    <span className="text-[#2b6819] font-black shrink-0">&#10003;</span>
                                    <span>Upload digital invoices with delivery notes</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="text-[#2b6819] font-black shrink-0">&#10003;</span>
                                    <span>Receive competitive advance offers up to 85%</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="text-[#2b6819] font-black shrink-0">&#10003;</span>
                                    <span>Accept terms and record funding status against the invoice</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-[#ebdca4] text-[11px] font-bold text-[#2b6819]">
                            Benefit: On-ledger offers &amp; auditable contract history
                        </div>
                    </div>

                    {/* Card 2: Buyer */}
                    <div className="bg-[#fffdf5] rounded-3xl border border-[#ebdca4] p-7 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <span className="bg-[#092328] text-[#76C457] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Buyer
                                </span>
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-[#092328]/10 border border-[#092328]/20 flex items-center justify-center text-[#092328] mb-5">
                                <IconBuilding className="w-6 h-6" />
                            </div>

                            <h3 className="text-2xl font-black text-[#092328] mb-2 tracking-tight">
                                Enterprise Buyers
                            </h3>
                            <p className="text-xs sm:text-sm text-[#2b6819] font-bold mb-3">
                                Strengthen vendors while preserving your payment terms.
                            </p>
                            <p className="text-xs text-[#092328]/80 leading-relaxed mb-6">
                                Designed for retail supermarkets, FMCG giants, and corporate procurers managing critical vendor supply chains with flexible commercial credit cycles.
                            </p>

                            <div className="space-y-2.5 pt-4 border-t border-[#ebdca4] text-xs text-[#092328]/90">
                                <div className="flex items-start gap-2.5">
                                    <span className="text-[#2b6819] font-black shrink-0">&#10003;</span>
                                    <span>Confirm delivery and acknowledge debt with one click</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="text-[#2b6819] font-black shrink-0">&#10003;</span>
                                    <span>Suppliers can arrange financing without changing your invoice due date</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="text-[#2b6819] font-black shrink-0">&#10003;</span>
                                    <span>Record financier and supplier settlement allocations at maturity</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-[#ebdca4] text-[11px] font-bold text-[#2b6819]">
                            Benefit: Supply chain resilience without balance-sheet strain
                        </div>
                    </div>

                    {/* Card 3: Financier */}
                    <div className="bg-[#fffdf5] rounded-3xl border border-[#ebdca4] p-7 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <span className="bg-[#092328] text-[#76C457] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Financier
                                </span>
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-[#76C457]/20 border border-[#76C457]/40 flex items-center justify-center text-[#2b6819] mb-5">
                                <IconBank className="w-6 h-6" />
                            </div>

                            <h3 className="text-2xl font-black text-[#092328] mb-2 tracking-tight">
                                Institutional Financiers
                            </h3>
                            <p className="text-xs sm:text-sm text-[#2b6819] font-bold mb-3">
                                Evaluate ledger-confirmed receivables and record financing terms.
                            </p>
                            <p className="text-xs text-[#092328]/80 leading-relaxed mb-6">
                                Designed for commercial banks, factoring firms, and debt funds seeking short-tenor returns backed by confirmed delivery.
                            </p>

                            <div className="space-y-2.5 pt-4 border-t border-[#ebdca4] text-xs text-[#092328]/90">
                                <div className="flex items-start gap-2.5">
                                    <span className="text-[#2b6819] font-black shrink-0">&#10003;</span>
                                    <span>Inspect cryptographic proof without seeing private margins</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="text-[#2b6819] font-black shrink-0">&#10003;</span>
                                    <span>Ledger locks mathematically prevent duplicate loans</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="text-[#2b6819] font-black shrink-0">&#10003;</span>
                                    <span>Record agreed return terms and maturity allocations on Canton</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-[#ebdca4] text-[11px] font-bold text-[#2b6819]">
                            Benefit: Zero duplicate-financing risk &amp; auditable settlement allocation
                        </div>
                    </div>

                </div>

            </section>

            {/* Trust Passport Modal */}
            <TrustPassportModal
                data={selectedPassport}
                onClose={() => setSelectedPassport(null)}
            />

            {/* Connect Wallet Modal */}
            <ConnectWalletModal
                isOpen={isWalletModalOpen}
                onClose={() => setIsWalletModalOpen(false)}
                currentParty={store.getCurrentParty() || 'Not Connected'}
                onSelectParty={handleLandingConnect}
            />

            {/* Footer */}
            <footer className="bg-[#092328] text-white border-t border-[#0f3942] py-8 text-xs text-gray-400">
                <div className="w-full px-6 sm:px-10 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-white">9ja<span className="text-[#76C457]">Trade</span></span>
                        <span className="text-gray-500 mx-2">&middot;</span>
                        <span className="text-gray-400">Privacy-Preserving B2B Trade Network</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                        <Link href="/about" className="text-[#76C457] hover:underline">How It Works</Link>
                        {currentProfile && (
                            <>
                                {currentProfile.isVerified && <Link href="/dashboard" className="hover:text-white transition-colors">Trade App</Link>}
                                {!currentProfile.isVerified && (
                                    <button onClick={() => { store.setPendingRegistrationType('commercial'); router.push('/register'); }} className="text-[#76C457] hover:underline cursor-pointer">Register</button>
                                )}
                            </>
                        )}
                        {!currentProfile?.isVerified && (
                            <button
                                onClick={() => { store.setPendingRegistrationType('financier'); router.push('/register'); }}
                                className="text-[#76C457] hover:underline transition-colors ml-2 cursor-pointer"
                            >
                                Register Financier
                            </button>
                        )}
                    </div>
                </div>
            </footer>

        </div>
    );
}
