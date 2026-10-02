'use client';

import { TrustPassportData } from '@/lib/services/tradeStore';
import { CANTON_CONFIG } from '@/lib/canton/config';

interface TrustPassportModalProps {
  data: TrustPassportData | null;
  onClose: () => void;
}

export function TrustPassportModal({ data, onClose }: TrustPassportModalProps) {
  if (!data) return null;

  const {
    invoice,
    invoiceCid,
    buyerConfirmation,
    deliveryConfirmation,
    activeAgreement,
    settlementRecord,
    aiVerificationSummary
  } = data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'InvoiceSubmitted':
        return <span className="bg-amber-100 text-amber-900 text-xs px-3 py-1 rounded-full font-bold">Submitted for Review</span>;
      case 'InvoiceConfirmed':
        return <span className="bg-[#e4f5de] text-[#2b6819] text-xs px-3 py-1 rounded-full font-bold">Buyer Obligation Confirmed</span>;
      case 'InvoiceDelivered':
        return <span className="bg-[#76C457]/20 text-[#092328] border border-[#76C457]/40 text-xs px-3 py-1 rounded-full font-bold">Delivered & Fulfilled</span>;
      case 'InvoiceFinanced':
        return <span className="bg-[#092328] text-[#76C457] text-xs px-3 py-1 rounded-full font-bold">Financed (Ledger Locked)</span>;
      case 'InvoiceSettled':
        return <span className="bg-[#76C457] text-[#092328] text-xs px-3 py-1 rounded-full font-extrabold">Settled & Closed</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full font-bold">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#092328]/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in font-sans">
      <div className="bg-[#FDF4D2] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#ebdca4]">
        
        {/* Modal Header in #092328 with #76C457 logo badge */}
        <div className="px-6 py-5 bg-[#092328] text-white flex items-center justify-between border-b border-[#0f3942]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#76C457] rounded-xl flex items-center justify-center text-[#092328] font-black text-lg">
              TP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Invoice Trust Passport</h2>
                <span className="bg-[#0d343b] text-[#76C457] border border-[#174e58] text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  Cryptographically Verified
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Invoice ID: {invoice.invoiceId} · Obligation Ref: #{invoice.invoiceId.replace('INV-', '')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#0f3942] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body in #FDF4D2 */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">

          {/* AI Evidence Analyst Card */}
          <div className="bg-[#f7ebbd] border border-[#ebdca4] rounded-2xl p-5">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#092328] flex items-center justify-center shrink-0 mt-0.5 text-[#76C457]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <h4 className="text-sm font-extrabold text-[#092328]">AI Evidence Integrity Summary</h4>
                  <span className={`text-xs px-3 py-0.5 rounded-full font-bold self-start sm:self-auto ${
                    aiVerificationSummary.isFinanceable 
                      ? 'bg-[#76C457] text-[#092328]' 
                      : invoice.status === 'InvoiceFinanced' || invoice.status === 'InvoiceSettled'
                      ? 'bg-[#092328] text-white'
                      : 'bg-amber-200 text-amber-950'
                  }`}>
                    {aiVerificationSummary.isFinanceable ? '✓ Eligible for Financing' : invoice.status}
                  </span>
                </div>
                <p className="text-xs text-[#092328]/80 leading-relaxed mb-4">
                  {aiVerificationSummary.reason}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#092328] block mb-1.5 uppercase text-[11px] tracking-wider">
                      Verified On-Chain Checks:
                    </span>
                    <ul className="space-y-1.5">
                      {aiVerificationSummary.verifiedChecks.map((check, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[#092328]">
                          <span className="text-[#2b6819] font-black shrink-0">✓</span> {check}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {aiVerificationSummary.missingItems.length > 0 && (
                    <div>
                      <span className="font-bold text-amber-950 block mb-1.5 uppercase text-[11px] tracking-wider">
                        Pending Workflow Steps:
                      </span>
                      <ul className="space-y-1.5">
                        {aiVerificationSummary.missingItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-amber-900">
                            <span className="text-amber-600 font-bold shrink-0">○</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid with Large High-Contrast Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#f6e9bc] border border-[#ebdca4] p-4 rounded-2xl">
              <span className="text-[11px] text-[#092328]/60 font-bold uppercase tracking-wider block">Face Value</span>
              <span className="text-2xl font-extrabold text-[#092328] block mt-1">
                ₦{invoice.amount.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#092328]/50 font-mono block mt-0.5">{invoice.currency} (NGN)</span>
            </div>
            <div className="bg-[#f6e9bc] border border-[#ebdca4] p-4 rounded-2xl">
              <span className="text-[11px] text-[#092328]/60 font-bold uppercase tracking-wider block">Lifecycle State</span>
              <div className="mt-2">{getStatusBadge(invoice.status)}</div>
            </div>
            <div className="bg-[#f6e9bc] border border-[#ebdca4] p-4 rounded-2xl">
              <span className="text-[11px] text-[#092328]/60 font-bold uppercase tracking-wider block">Credit Terms</span>
              <span className="text-lg font-bold text-[#092328] block mt-1">
                {Math.max(1, Math.round((new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) / (1000 * 60 * 60 * 24))) || 60} Days
              </span>
              <span className="text-[10px] text-[#092328]/60 block">Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
            <div className="bg-[#f6e9bc] border border-[#ebdca4] p-4 rounded-2xl">
              <span className="text-[11px] text-[#092328]/60 font-bold uppercase tracking-wider block">Security Integrity</span>
              <span className="text-xs font-mono text-[#092328] block truncate mt-1">
                Multi-Party Verified
              </span>
              <span className="text-[10px] text-[#2b6819] font-bold block mt-0.5">● Record Active &amp; Valid</span>
            </div>
          </div>

          {/* Chronological Lifecycle Trail */}
          <div>
            <h3 className="text-xs font-extrabold text-[#092328] uppercase tracking-wider mb-3">
              On-Chain Commercial Lifecycle Trail
            </h3>
            <div className="border border-[#ebdca4] rounded-2xl divide-y divide-[#ebdca4] overflow-hidden">
              
              {/* Step 1: Invoice Created */}
              <div className="p-4 sm:p-5 flex items-start gap-4 bg-[#FDF4D2]">
                <div className="w-8 h-8 rounded-xl bg-[#092328] text-[#76C457] flex items-center justify-center font-black text-xs shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#092328]">Commercial Obligation Created</h4>
                    <span className="text-[11px] text-[#092328]/60 font-mono">{new Date(invoice.issueDate).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-[#092328]/80 mt-1">
                    Supplier <strong className="text-[#092328]">{invoice.supplier}</strong> issued invoice to <strong className="text-[#092328]">{invoice.buyer}</strong>.
                  </p>
                  <p className="text-xs text-[#092328]/60 mt-1 italic">&quot;{invoice.description}&quot;</p>
                </div>
              </div>

              {/* Step 2: Buyer Confirmation */}
              <div className="p-4 sm:p-5 flex items-start gap-4 bg-[#FDF4D2]">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  buyerConfirmation ? 'bg-[#76C457] text-[#092328]' : 'bg-[#e4d4a4] text-gray-600'
                }`}>
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#092328]">Buyer Obligation Acknowledgement</h4>
                    {buyerConfirmation && (
                      <span className="text-[11px] text-[#092328]/60 font-mono">{new Date(buyerConfirmation.confirmedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {buyerConfirmation ? (
                    <div className="mt-1">
                      <p className="text-xs text-[#092328] font-medium">
                        ✓ Formal acknowledgement: &quot;{buyerConfirmation.confirmationNotes}&quot;
                      </p>
                      <span className="text-[10px] text-[#092328]/60 font-mono block mt-1">
                        Signatory: {buyerConfirmation.buyer} · Acknowledged Debt: ₦{buyerConfirmation.amount.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#092328]/50 mt-1">
                      Awaiting formal acknowledgement from {invoice.buyer}.
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3: Fulfillment Evidence */}
              <div className="p-4 sm:p-5 flex items-start gap-4 bg-[#FDF4D2]">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  deliveryConfirmation ? 'bg-[#76C457] text-[#092328]' : 'bg-[#e4d4a4] text-gray-600'
                }`}>
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#092328]">Fulfillment & Delivery Confirmation</h4>
                    {deliveryConfirmation && (
                      <span className="text-[11px] text-[#092328]/60 font-mono">{new Date(deliveryConfirmation.deliveredAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {deliveryConfirmation ? (
                    <div className="mt-1">
                      <p className="text-xs text-[#092328] font-medium">
                        ✓ Fulfillment confirmed: &quot;{deliveryConfirmation.fulfillmentNotes}&quot;
                      </p>
                      <span className="text-[10px] text-[#092328]/60 font-mono block mt-1">
                        Waybill Cryptographic Hash: {deliveryConfirmation.evidence.documentHash.slice(0, 24)}...
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#092328]/50 mt-1">
                      Physical receipt confirmation pending from buyer.
                    </p>
                  )}
                </div>
              </div>

              {/* Step 4: Financing Agreement */}
              <div className="p-4 sm:p-5 flex items-start gap-4 bg-[#FDF4D2]">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  activeAgreement ? 'bg-[#092328] text-[#76C457]' : 'bg-[#e4d4a4] text-gray-600'
                }`}>
                  4
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#092328]">
                      Financing Agreement & Duplicate Guard
                    </h4>
                    {activeAgreement && (
                      <span className="bg-[#76C457] text-[#092328] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                        {activeAgreement.isFunded ? 'Capital Disbursed' : 'Offer Accepted'}
                      </span>
                    )}
                  </div>
                  {activeAgreement ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-[#092328]">
                        Financier <strong className="text-[#092328]">{activeAgreement.financier}</strong> committed upfront capital of ₦{activeAgreement.fundingAmount.toLocaleString()}.
                      </p>
                      <div className="grid grid-cols-3 gap-2 bg-[#f6e9bc] p-3 rounded-xl text-xs text-[#092328] font-mono border border-[#ebdca4]">
                        <div>
                          <span className="text-gray-600 block text-[10px] uppercase">Upfront Advance</span>
                          <strong>₦{activeAgreement.fundingAmount.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-[10px] uppercase">Financing Fee</span>
                          <strong className="text-amber-800">₦{activeAgreement.financingFee.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-[10px] uppercase">Repayment Total</span>
                          <strong>₦{activeAgreement.totalRepaymentToFinancier.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#092328]/50 mt-1">
                      No active financing agreement yet. Invoice receivable remains unencumbered.
                    </p>
                  )}
                </div>
              </div>

              {/* Step 5: Final Settlement Record */}
              <div className="p-4 sm:p-5 flex items-start gap-4 bg-[#FDF4D2]">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  settlementRecord ? 'bg-[#76C457] text-[#092328]' : 'bg-[#e4d4a4] text-gray-600'
                }`}>
                  5
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#092328]">Settlement & Automated Disbursement</h4>
                    {settlementRecord && (
                      <span className="text-[11px] text-[#092328]/60 font-mono">{new Date(settlementRecord.settledAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {settlementRecord ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-[#092328] font-bold">
                        ✓ Obligation fully settled! Payment Ref: <span className="font-mono text-emerald-900">{settlementRecord.paymentReference}</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3 bg-[#f6e9bc] p-3 rounded-xl text-xs font-mono text-[#092328] border border-[#ebdca4]">
                        <div>
                          <span className="text-gray-600 block text-[10px] uppercase">Financier Payout</span>
                          <strong className="text-sm text-[#2b6819]">₦{settlementRecord.financierPayout.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-gray-600 block text-[10px] uppercase">Supplier Remainder</span>
                          <strong className="text-sm text-[#2b6819]">₦{settlementRecord.supplierRemainderPayout.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#092328]/50 mt-1">
                      Settlement triggers at maturity upon buyer payment.
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Cryptographic Document Hashes in #092328 Dark Card */}
          <div>
            <h3 className="text-xs font-extrabold text-[#092328] uppercase tracking-wider mb-2">
              Cryptographic Evidence Hashes (Anchored on Ledger)
            </h3>
            <div className="bg-[#092328] text-gray-200 rounded-2xl p-4 font-mono text-xs space-y-2.5">
              {invoice.supportingDocuments.map((doc, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-1 pb-2 border-b border-[#0f3942] last:border-none last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#0f3942] text-[#76C457] px-2 py-0.5 rounded-full text-[10px] font-sans font-bold">
                      {doc.docType}
                    </span>
                    <span className="text-gray-400">{doc.uriOrRef}</span>
                  </div>
                  <div className="text-gray-300 font-mono" title={doc.documentHash}>
                    SHA256: {doc.documentHash.slice(0, 16)}...{doc.documentHash.slice(-8)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#f6e9bc] border-t border-[#ebdca4] flex items-center justify-between">
          <span className="text-xs text-[#092328]/70 font-medium">
            9jaTrade Verified Commercial Receivables Platform
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#092328] hover:bg-[#133e46] text-[#76C457] rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            Close Passport
          </button>
        </div>

      </div>
    </div>
  );
}
