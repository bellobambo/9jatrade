'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ConnectCantonModal } from '@/components/ConnectCantonModal';
import { useTradeStore } from '@/lib/services/tradeStore';
import {
  IconFileText,
  IconCheckCircle,
  IconTruck,
  IconShield,
  IconExchange,
  IconLock,
  IconCoins,
  IconArrowRight,
  IconCheck,
  IconBank,
  IconBuilding,
  IconEyeOff,
  IconClock,
} from '@/components/Icons';

export default function AboutPage() {
  const store = useTradeStore();
  const currentProfile = store.getCurrentProfile();
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  const pipelineStages = [
    {
      step: 1,
      title: 'Invoice Issued',
      actor: 'Supplier',
      actorBadge: 'bg-[#123e47] text-[#76C457]',
      icon: IconFileText,
      tagline: 'Creates the commercial obligation',
      summary: 'The supplier records invoice terms, item details, and a due date as a Canton contract.',
      details: [
        'Digitally signed with supplier Party ID',
        'Includes invoice amount, flexible payment due date, and item specifications',
        'The contract state is read from the Canton ledger',
      ],
      cantonGuard: 'Verified Obligation'
    },
    {
      step: 2,
      title: 'Buyer Acknowledged',
      actor: 'Enterprise Buyer',
      actorBadge: 'bg-[#1a4030] text-emerald-300',
      icon: IconCheckCircle,
      tagline: 'Formal debt acknowledgement',
      summary: 'The enterprise buyer reviews the invoice and formally confirms their obligation to pay at maturity.',
      details: [
        'Buyer verifies purchase order match and commercial terms',
        'Buyer commits to paying the full face value at due date',
        'No invoice can be financed without this explicit confirmation',
      ],
      cantonGuard: 'Buyer Acknowledged'
    },
    {
      step: 3,
      title: 'Delivery Certified',
      actor: 'Enterprise Buyer',
      actorBadge: 'bg-[#1a4030] text-emerald-300',
      icon: IconTruck,
      tagline: 'Verifies physical trade occurred',
      summary: 'The buyer inspects the delivered shipment at the warehouse and attaches proof of physical receipt.',
      details: [
        'Eliminates ghost deliveries and paper-only invoices',
        'Disputes or partial deliveries are addressed before financing',
        'Ties real-world logistics to the digital ledger',
      ],
      cantonGuard: 'Delivery Certified'
    },
    {
      step: 4,
      title: 'Trust Passport',
      actor: '9jaTrade Engine',
      actorBadge: 'bg-[#092328] text-white',
      icon: IconShield,
      tagline: 'Structured audit trail',
      summary: '9jaTrade compiles the confirmation history, fulfillment proof, and party identities into a verifiable summary.',
      details: [
        'Financiers review verified facts instead of unverified PDFs',
        'Zero manual paperwork review delays',
        'Keeps supplier margins confidential via sub-transaction privacy',
      ],
      cantonGuard: 'Audit Passport'
    },
    {
      step: 5,
      title: 'Financiers Bid',
      actor: 'Financiers',
      actorBadge: 'bg-[#2a2d48] text-indigo-300',
      icon: IconExchange,
      tagline: 'Competitive market pricing',
      summary: 'Verified financiers view the financing request and compete by submitting customized upfront advance offers.',
      details: [
        'Financiers quote advance rate (e.g. 75% to 85%), return fee, and maturity',
        'Suppliers compare multiple competing offers side-by-side',
        'Market competition delivers the lowest financing cost to suppliers',
      ],
      cantonGuard: 'Competitive Bids'
    },
    {
      step: 6,
      title: 'Funding & Lock',
      actor: 'Supplier & Financier',
      actorBadge: 'bg-[#123e47] text-[#76C457]',
      icon: IconLock,
      tagline: 'Zero double-pledge guarantee',
      summary: 'The supplier accepts an offer. Canton creates the agreement and locks the invoice; funding is handled separately.',
      details: [
        'Financier records funding status after making the off-ledger transfer',
        'Ledger transitions invoice into locked financed state',
        'A consumed invoice contract prevents a second financing agreement',
      ],
      cantonGuard: 'Duplicate Financing Locked'
    },
    {
      step: 7,
      title: 'Settlement',
      actor: 'All Three Parties',
      actorBadge: 'bg-[#092328] text-[#76C457]',
      icon: IconCoins,
      tagline: 'Settlement allocation record',
      summary: 'At maturity, the buyer records a payment reference on Canton. The contract records allocation amounts but does not move funds.',
      details: [
        'The agreement records the financier share and supplier remainder',
        'The buyer must transfer funds separately from this Daml choice',
        'The invoice and agreement are marked settled on the ledger',
      ],
      cantonGuard: 'Settlement Recorded'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#FDF4D2] text-[#092328] font-sans selection:bg-[#76C457] selection:text-[#092328]">

      {/* Top Main Navbar */}
      <Navbar />

      {/* Main Content Container */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16">

        {/* Page Header */}
        <div className="w-full text-center mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 bg-[#f4e6b1] border border-[#ebdca4] px-4 py-1.5 rounded-full text-xs font-bold text-[#092328] mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#76C457]"></span>
            Product Architecture &amp; User Journey
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-[#092328] tracking-tight">
            How 9jaTrade Works
          </h1>
          <p className="mt-4 text-base sm:text-xl text-[#092328]/85 font-medium leading-relaxed">
            A Canton-backed workflow for recording confirmed invoices and financing terms while keeping private contract data scoped to participants.
          </p>
        </div>

        <div className="mx-auto w-full max-w-6xl">
        {/* 1. The Core Principle in Plain English */}
        <section className="bg-[#092328] text-white rounded-3xl p-6 sm:p-10 mb-16 border border-[#144852] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#76C457]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <span className="text-[#76C457] font-mono text-xs uppercase tracking-widest font-black block mb-2">
                The Core Principle
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-4">
                Real Trade First. Financing Second.
              </h2>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-4">
                Traditional factoring suffers from fraud because lenders underwrite unverified paper, or rogue suppliers pledge the same Files to multiple banks. DeFi protocols fail because businesses refuse to leak their customer names and prices on public blockchains.
              </p>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                <strong className="text-[#76C457]">9jaTrade fixes this:</strong> Financing is only unlocked after the buyer confirms the obligation and certifies goods delivery. Once funded, the invoice is locked cryptographically so it cannot ever be pledged twice.
              </p>
            </div>

            <div className="lg:col-span-5 bg-[#0e353e] rounded-2xl p-6 border border-[#1b5461] space-y-3.5">
              <div className="text-xs font-black text-[#76C457] uppercase tracking-widest flex items-center justify-between pb-3 border-b border-[#1b5461]">
                <span>Three Core Guarantees</span>
                <span className="font-mono text-[11px] text-gray-400">Institutional Security</span>
              </div>

              <div className="flex items-start gap-3 text-xs text-gray-200">
                <div className="w-5 h-5 rounded-full bg-[#76C457]/20 text-[#76C457] flex items-center justify-center shrink-0 font-bold">1</div>
                <div><strong>No Fake Invoices:</strong> Obligor buyer must acknowledge the debt on-ledger before any liquidity offer can be requested.</div>
              </div>

              <div className="flex items-start gap-3 text-xs text-gray-200">
                <div className="w-5 h-5 rounded-full bg-[#76C457]/20 text-[#76C457] flex items-center justify-center shrink-0 font-bold">2</div>
                <div><strong>Zero Double-Pledging:</strong> Cryptographic ledger locks mathematically prevent borrowing twice against the same invoice.</div>
              </div>

              <div className="flex items-start gap-3 text-xs text-gray-200">
                <div className="w-5 h-5 rounded-full bg-[#76C457]/20 text-[#76C457] flex items-center justify-center shrink-0 font-bold">3</div>
                <div><strong>Sub-Transaction Privacy:</strong> Only you, your buyer, and your selected financier see the trade data.</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Interactive Pipeline Roadmap (The User Journey) */}
        <section className="mb-20">

          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-black font-mono uppercase tracking-wider text-[#092328]/60 bg-[#f4e6b1] border border-[#ebdca4] px-3.5 py-1 rounded-full">
              The User Journey
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#092328] tracking-tight mt-3">
              7-Stage Invoice Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-[#092328]/70 mt-2">
              Click any stage below to inspect how the transaction progresses from draft to final settlement.
            </p>
          </div>

          {/* Horizontal Stepper Strip */}
          <div className="bg-[#fffdf5] rounded-3xl border border-[#ebdca4] p-4 sm:p-6 mb-8 shadow-sm overflow-x-auto">
            <div className="flex items-center min-w-[700px] justify-between relative">

              {/* Connecting background line */}
              <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-[#ebdca4] z-0" />

              {pipelineStages.map((stage) => {
                const IconComp = stage.icon;
                const isSelected = activeStep === stage.step;
                const isPast = activeStep > stage.step;

                return (
                  <button
                    key={stage.step}
                    onClick={() => setActiveStep(stage.step)}
                    className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all ${isSelected
                        ? 'bg-[#092328] text-[#76C457] ring-4 ring-[#76C457]/40 shadow-lg scale-110'
                        : isPast
                          ? 'bg-[#76C457] text-[#092328]'
                          : 'bg-[#fffdf5] text-[#092328] border-2 border-[#ebdca4] hover:border-[#092328]'
                        }`}
                    >
                      <IconComp className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    <span className={`text-[11px] sm:text-xs font-bold mt-2.5 transition-colors whitespace-nowrap ${isSelected ? 'text-[#092328] font-black' : 'text-gray-500'
                      }`}>
                      {stage.title}
                    </span>

                    <span className="text-[9px] font-mono text-gray-400">
                      Stage {stage.step}
                    </span>
                  </button>
                );
              })}

            </div>
          </div>

          {/* Selected Stage Detail Panel */}
          {(() => {
            const activeData = pipelineStages[activeStep - 1];
            const IconComponent = activeData.icon;

            return (
              <div className="bg-[#fffdf5] rounded-3xl border border-[#ebdca4] p-6 sm:p-10 shadow-lg transition-all animate-fade-in">

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#ebdca4] mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#092328] text-[#76C457] flex items-center justify-center shadow-md">
                      <IconComponent className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-gray-500">
                          STAGE 0{activeData.step} OF 07
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${activeData.actorBadge}`}>
                          Actor: {activeData.actor}
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black text-[#092328]">
                        {activeData.title}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-[#f4e6b1] border border-[#ebdca4] px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold text-[#092328]">
                    {activeData.cantonGuard}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                  <div className="lg:col-span-7 space-y-4">
                    <p className="text-base sm:text-lg text-[#092328] font-medium leading-relaxed">
                      {activeData.summary}
                    </p>

                    <div className="space-y-2.5 pt-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#092328]/70 block">
                        What happens at this stage:
                      </span>
                      {activeData.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-[#092328]/85">
                          <span className="text-[#2b6819] font-black shrink-0 mt-0.5">&#10003;</span>
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-[#fbf7e8] rounded-2xl p-5 border border-[#ebdca4] space-y-3">
                    <span className="text-xs font-black uppercase tracking-wider text-[#092328] block">
                      Why it matters
                    </span>
                    <p className="text-xs sm:text-sm text-[#092328]/80 leading-relaxed">
                      {activeData.tagline}. In traditional markets, this step relies on easily faked paperwork. On 9jaTrade, it is cryptographically signed and verified on a privacy-preserving ledger.
                    </p>

                    <div className="pt-3 border-t border-[#ebdca4] flex items-center justify-between text-xs">
                      <button
                        onClick={() => setActiveStep((prev) => (prev > 1 ? prev - 1 : 1))}
                        disabled={activeStep === 1}
                        className={`font-bold transition-opacity ${activeStep === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:underline text-[#092328]'}`}
                      >
                        &larr; Previous Stage
                      </button>

                      <button
                        onClick={() => setActiveStep((prev) => (prev < 7 ? prev + 1 : 7))}
                        disabled={activeStep === 7}
                        className={`font-bold text-[#2b6819] transition-opacity flex items-center gap-1 ${activeStep === 7 ? 'opacity-30 cursor-not-allowed' : 'hover:underline'}`}
                      >
                        Next Stage &rarr;
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}

        </section>

        {/* 3. Real-World Walkthrough: How The Money Moves */}
        <section className="bg-[#fffdf5] rounded-3xl border border-[#ebdca4] p-7 sm:p-10 mb-20 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-[#ebdca4] mb-8">
            <div>
              <span className="text-xs font-mono font-black uppercase tracking-wider text-[#2b6819] bg-[#76C457]/20 border border-[#76C457]/40 px-3 py-1 rounded-full">
                Real-World Example
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#092328] tracking-tight mt-2">
                Bello Electronics &amp; ABC Retail Ltd
              </h2>
            </div>
            <div className="text-left lg:text-right font-mono text-xs">
              <span className="text-gray-500">Invoice Amount:</span>{' '}
              <strong className="text-base text-[#092328] font-black">₦10,000,000</strong>{' '}
              <span className="text-gray-500">(Flexible Payment Terms &middot; Example: 60 Days)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Story Walkthrough */}
            <div className="lg:col-span-6 space-y-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#092328] text-white flex items-center justify-center shrink-0 font-bold text-xs font-mono">1</span>
                <div>
                  <strong>The Trade:</strong> Bello Electronics delivers ₦10,000,000 worth of computer equipment to ABC Retail Ltd. ABC Retail agrees to deferred payment terms (e.g. 60 days).
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#092328] text-white flex items-center justify-center shrink-0 font-bold text-xs font-mono">2</span>
                <div>
                  <strong>The Problem:</strong> Bello needs working capital now to pay suppliers and payroll, and cannot afford to wait the full payment period.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#092328] text-white flex items-center justify-center shrink-0 font-bold text-xs font-mono">3</span>
                <div>
                  <strong>Verification:</strong> ABC Retail signs the obligation on 9jaTrade and confirms physical delivery at their warehouse.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#092328] text-white flex items-center justify-center shrink-0 font-bold text-xs font-mono">4</span>
                <div>
                  <strong>Financing Requested:</strong> Bello requests up to ₦8,500,000 upfront. Multiple registered financiers submit competitive terms.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#092328] text-white flex items-center justify-center shrink-0 font-bold text-xs font-mono">5</span>
                <div>
                  <strong>Offer Accepted &amp; Locked:</strong> Bello chooses Apex Credit. Capital is advanced, and the invoice is locked against double financing.
                </div>
              </div>
            </div>

            {/* Bids & Settlement Box */}
            <div className="lg:col-span-6 bg-[#092328] text-white rounded-2xl p-5 border border-[#16444f]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#16444f]">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Marketplace Offers</span>
                <span className="text-[11px] font-mono text-[#76C457]">Invoice Maturity Terms</span>
              </div>

              {/* Offers Table */}
              <div className="overflow-x-auto text-xs font-mono mb-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#16444f] text-[10px]">
                      <th className="py-1">Financier</th>
                      <th className="py-1">Upfront Advance</th>
                      <th className="py-1">Return Fee</th>
                      <th className="py-1">Advance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#16444f]/60 text-gray-200 text-[11px]">
                    <tr className="bg-[#76C457]/15 text-white font-bold">
                      <td className="py-2 text-[#76C457]">Apex Credit (Selected)</td>
                      <td className="py-2">₦8,500,000</td>
                      <td className="py-2">₦400,000</td>
                      <td className="py-2">85%</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-300">Credence Capital</td>
                      <td className="py-2">₦8,000,000</td>
                      <td className="py-2">₦300,000</td>
                      <td className="py-2">80%</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-300">Union Yield</td>
                      <td className="py-2">₦7,500,000</td>
                      <td className="py-2">₦250,000</td>
                      <td className="py-2">75%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Settlement Distribution */}
              <div className="bg-[#113a43] rounded-xl p-4 border border-[#1b5563] text-xs space-y-2 font-sans">
                <div className="font-bold text-[#76C457] flex items-center justify-between text-xs">
                  <span>Example settlement allocation</span>
                  <span className="font-mono text-[11px]">₦10,000,000 recorded</span>
                </div>

                <div className="flex items-center justify-between text-gray-300 text-xs">
                  <span>&rarr; Apex Credit (₦8.5m principal + ₦400k return):</span>
                  <span className="font-mono font-bold text-white">₦8,900,000</span>
                </div>

                <div className="flex items-center justify-between text-gray-300 text-xs">
                  <span>&rarr; Bello Electronics (Remaining balance):</span>
                  <span className="font-mono font-bold text-[#76C457]">₦1,100,000</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 4. The 3 Participant Roles */}
        <section className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black font-mono uppercase tracking-wider text-[#092328]/60 bg-[#f4e6b1] border border-[#ebdca4] px-3.5 py-1 rounded-full">
              Who Is It For?
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#092328] tracking-tight mt-3">
              Three Main Roles
            </h2>
            <p className="text-xs sm:text-sm text-[#092328]/70 mt-2">
              Every participant operates through sovereign digital identity and verified permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Supplier Card */}
            <div className="bg-[#fffdf5] rounded-3xl border border-[#ebdca4] p-7 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-[#092328] text-[#76C457] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Supplier
                  </span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-[#76C457]/20 border border-[#76C457]/40 flex items-center justify-center text-[#092328] mb-4">
                  <IconFileText className="w-6 h-6 text-[#2b6819]" />
                </div>

                <h3 className="text-xl font-black text-[#092328] mb-2">
                  Commercial Suppliers
                </h3>
                <p className="text-xs text-[#2b6819] font-bold mb-3">
                  Convert unpaid invoices of any payment term into cash today.
                </p>
                <p className="text-xs text-[#092328]/80 leading-relaxed mb-4">
                  For manufacturers, farmers, and distributors waiting on delayed corporate buyer payments.
                </p>

                <div className="space-y-2 pt-3 border-t border-[#ebdca4] text-xs text-[#092328]/90">
                  <div className="flex items-start gap-2">
                    <span className="text-[#2b6819] font-bold">&#10003;</span>
                    <span>Issue digital invoices with PO and waybill hashes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#2b6819] font-bold">&#10003;</span>
                    <span>Request upfront financing up to 85% of face value</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#2b6819] font-bold">&#10003;</span>
                    <span>Compare competing offers to get the best rate</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#ebdca4] text-[11px] font-mono text-gray-500 flex justify-between">
                <span>Obligation Mode:</span>
                <span className="font-bold text-[#092328]">Direct Origination &middot; Confidential</span>
              </div>
            </div>

            {/* Buyer Card */}
            <div className="bg-[#fffdf5] rounded-3xl border border-[#ebdca4] p-7 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-[#092328] text-[#76C457] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Buyer
                  </span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-[#092328]/10 border border-[#092328]/20 flex items-center justify-center text-[#092328] mb-4">
                  <IconBuilding className="w-6 h-6 text-[#092328]" />
                </div>

                <h3 className="text-xl font-black text-[#092328] mb-2">
                  Enterprise Buyers
                </h3>
                <p className="text-xs text-[#2b6819] font-bold mb-3">
                  Strengthen suppliers without paying early.
                </p>
                <p className="text-xs text-[#092328]/80 leading-relaxed mb-4">
                  For retail chains, FMCG brands, and corporate procurers managing extensive supplier networks.
                </p>

                <div className="space-y-2 pt-3 border-t border-[#ebdca4] text-xs text-[#092328]/90">
                  <div className="flex items-start gap-2">
                    <span className="text-[#2b6819] font-bold">&#10003;</span>
                    <span>Confirm debt obligations and delivery receipts online</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#2b6819] font-bold">&#10003;</span>
                    <span>Retain your agreed payment terms while suppliers get funded today</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#2b6819] font-bold">&#10003;</span>
                    <span>Record settlement allocation amounts at maturity</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#ebdca4] text-[11px] font-mono text-gray-500 flex justify-between">
                <span>Settlement Mode:</span>
                <span className="font-bold text-[#092328]">Recorded allocation &middot; Payment handled separately</span>
              </div>
            </div>

            {/* Financier Card */}
            <div className="bg-[#fffdf5] rounded-3xl border border-[#ebdca4] p-7 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-[#092328] text-[#76C457] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Financier
                  </span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-[#76C457]/20 border border-[#76C457]/40 flex items-center justify-center text-[#092328] mb-4">
                  <IconBank className="w-6 h-6 text-[#2b6819]" />
                </div>

                <h3 className="text-xl font-black text-[#092328] mb-2">
                  Institutional Financiers
                </h3>
                <p className="text-xs text-[#2b6819] font-bold mb-3">
                  Deploy capital into verified receivables.
                </p>
                <p className="text-xs text-[#092328]/80 leading-relaxed mb-4">
                  For commercial banks, private debt funds, and factoring institutions seeking low-risk yields.
                </p>

                <div className="space-y-2 pt-3 border-t border-[#ebdca4] text-xs text-[#092328]/90">
                  <div className="flex items-start gap-2">
                    <span className="text-[#2b6819] font-bold">&#10003;</span>
                    <span>Inspect cryptographic Trust Passports without data leaks</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#2b6819] font-bold">&#10003;</span>
                    <span>Cryptographic lock mathematically prevents duplicate financing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#2b6819] font-bold">&#10003;</span>
                    <span>Automatic return fee distribution upon settlement</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#ebdca4] text-[11px] font-mono text-gray-500 flex justify-between">
                <span>Protection Mode:</span>
                <span className="font-bold text-[#092328]">Immutable Lock &middot; Low Risk Yield</span>
              </div>
            </div>

          </div>
        </section>

        {/* 5. Bottom Call to Action */}
        <section className="bg-[#092328] text-white rounded-3xl p-8 sm:p-12 text-center border border-[#144852] shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Ready to Accelerate Your Working Capital?
          </h2>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Connect with your HackCanton Ledger access token and allocated party to register your company and start issuing or financing verified commercial obligations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {currentProfile ? (
              <Link
                href="/dashboard"
                className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black text-sm px-6 py-3 rounded-full transition-all shadow-md"
              >
                Go to Trade Dashboard &rarr;
              </Link>
            ) : (
              <button
                onClick={() => setIsConnectionModalOpen(true)}
                className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black text-sm px-6 py-3 rounded-full transition-all shadow-md cursor-pointer"
              >
                Connect to Ledger to Begin &rarr;
              </button>
            )}

            <Link
              href="/"
              className="bg-[#123e47] hover:bg-[#1a515c] text-white font-bold text-sm px-6 py-3 rounded-full transition-all border border-[#1d5562]"
            >
              Return to Home
            </Link>
          </div>
        </section>
        </div>

      </main>

      {/* Connect to the Canton Ledger API */}
      <ConnectCantonModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        currentParty={store.getCurrentParty()}
        onConnect={(partyId, accessToken) => store.connectParty(partyId, accessToken)}
      />

      {/* Footer */}
      <footer className="bg-[#092328] text-white border-t border-[#0f3942] py-8 text-xs text-gray-400 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-white">9ja<span className="text-[#76C457]">Trade</span></span>
            <span className="text-gray-500 mx-2">&middot;</span>
            <span className="text-gray-400">Privacy-Preserving B2B Trade Network</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/about" className="text-[#76C457] hover:underline">How It Works</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
