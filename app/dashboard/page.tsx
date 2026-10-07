'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/Navbar';
import { useTradeStore, TrustPassportData } from '@/lib/services/tradeStore';
import { TrustPassportModal } from '@/components/TrustPassportModal';
import { ConnectCantonModal } from '@/components/ConnectCantonModal';
import { IconExchange, IconFileText, IconBuilding, IconBank, IconLock } from '@/components/Icons';

type DashboardTab = 'all' | 'supplier' | 'buyer' | 'financier';

const getInvoiceStatusColor = (status: string) => {
  switch (status) {
    case 'InvoiceDraft': return 'bg-[#f0e3b9]/50 text-[#092328]/70 border border-[#ebdca4]';
    case 'InvoiceSubmitted': return 'bg-[#f6e9bc] text-[#092328] border border-[#ebdca4] shadow-sm';
    case 'InvoiceConfirmed': return 'bg-[#e4f5de] text-[#2b6819] border border-[#76C457]/50';
    case 'InvoiceDelivered': return 'bg-[#76C457]/20 text-[#092328] border border-[#76C457]/40';
    case 'InvoiceFinanced': return 'bg-[#092328] text-[#76C457] border border-[#092328] shadow-sm';
    case 'InvoiceSettled': return 'bg-[#76C457] text-[#092328] border border-[#67b049] shadow-sm';
    case 'InvoiceRejected': return 'bg-red-100 text-red-900 border border-red-300';
    case 'InvoiceDisputed': return 'bg-orange-100 text-orange-900 border border-orange-300';
    default: return 'bg-amber-100 text-amber-900 border border-amber-300';
  }
};

export default function UnifiedTradeDashboard() {
  const store = useTradeStore();
  const invoices = store.getInvoices();
  const agreements = store.getAgreements();
  const currentProfile = store.getCurrentProfile();
  const currentParty = store.getCurrentParty();
  const ownPendingRequest = currentParty
    ? store.getRegistrationRequests().find(({ payload }) => payload.applicantParty === currentParty)
    : undefined;
  const registeredBuyers = store.getCompanyProfiles('BuyerRole');

  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Default tab based on active role if registered
  const roleDefaultTab: DashboardTab = currentProfile?.role === 'FinancierRole'
    ? 'financier'
    : currentProfile?.role === 'BuyerRole'
      ? 'buyer'
      : currentProfile?.role === 'SupplierRole'
        ? 'supplier'
        : 'all';
  const [activeTab, setActiveTab] = useState<DashboardTab>('all');
  const selectedTab = currentProfile ? roleDefaultTab : activeTab;
  const visibleAgreements = agreements.filter((agreement) => {
    if (!currentProfile) return true;
    if (currentProfile.role === 'SupplierRole') return agreement.supplier === currentParty;
    if (currentProfile.role === 'BuyerRole') return agreement.buyer === currentParty;
    return agreement.financier === currentParty;
  });
  const [selectedPassport, setSelectedPassport] = useState<TrustPassportData | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinancingModal, setShowFinancingModal] = useState<string | null>(null);
  const [showOffersDrawer, setShowOffersDrawer] = useState<string | null>(null);
  const [confirmModalInvoice, setConfirmModalInvoice] = useState<string | null>(null);
  const [deliveryModalInvoice, setDeliveryModalInvoice] = useState<string | null>(null);
  const [settleModalInvoice, setSettleModalInvoice] = useState<string | null>(null);
  const [offerModalInvoice, setOfferModalInvoice] = useState<string | null>(null);

  // Form states
  const [maxFundingInput, setMaxFundingInput] = useState<number>(8500000);
  const [newInvId, setNewInvId] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState(registeredBuyers[0]?.companyParty || '');
  const [customBuyerParty, setCustomBuyerParty] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newDesc, setNewDesc] = useState('');
  const [newQuantity, setNewQuantity] = useState<number | ''>('');
  const [newWeight, setNewWeight] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);
  const [isRequestingFinance, setIsRequestingFinance] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isMakingOffer, setIsMakingOffer] = useState(false);
  const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
  const [isMarkingFunded, setIsMarkingFunded] = useState(false);

  const [confirmNotes, setConfirmNotes] = useState('We acknowledge the commercial obligation.');
  const [deliveryNotes, setDeliveryNotes] = useState('Full consignment inspected and accepted in good order at designated warehouse.');
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [deliveryReference, setDeliveryReference] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const [fundingAmount, setFundingAmount] = useState<number>(8500000);
  const [financingFee, setFinancingFee] = useState<number>(600000);
  const [conditions, setConditions] = useState<string>('Valid waybill and formal buyer obligation acknowledgement required.');
  const activeOfferRequest = offerModalInvoice
    ? store.getFinancingRequests().find((request) => request.invoiceId === offerModalInvoice)
    : undefined;
  const financingInvoice = showFinancingModal
    ? invoices.find(({ payload }) => payload.invoiceId === showFinancingModal)?.payload
    : undefined;

  const showToast = (message: string) => toast.success(message);
  const showError = (error: unknown) => toast.error(error instanceof Error ? error.message : 'Canton command failed.');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await store.refresh();
      if (store.getError()) throw new Error(store.getError() ?? 'Unable to refresh the Canton ledger.');
      showToast('Ledger data refreshed.');
    } catch (error) {
      showError(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Actions
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const buyerParty = (selectedBuyer && selectedBuyer !== '__manual__') ? selectedBuyer : customBuyerParty.trim();
    const invoiceId = newInvId;

    setIsSubmittingInvoice(true);
    try {
      await store.createInvoice({
        invoiceId,
        buyer: buyerParty,
        supplier: currentProfile?.companyParty,
        amount: Number(Number(newAmount).toFixed(10)),
        description: newDesc,
        items: [
          {
            description: newDesc || 'Commercial Goods',
            quantity: Number(Number(newQuantity).toFixed(10)) || 1,
            unit: newWeight ? `Weight: ${newWeight}` : 'Units',
            unitPrice: Number((Number(newAmount) / (Number(newQuantity) || 1)).toFixed(10)),
            itemTotal: Number(Number(newAmount).toFixed(10))
          }
        ]
      });
      setShowCreateModal(false);
      setNewInvId('');
      setNewAmount('');
      showToast(`Invoice ${invoiceId} created and submitted successfully!`);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleRequestFinancing = async (invoiceId: string) => {
    setIsRequestingFinance(true);
    try {
      await store.requestFinancing(invoiceId, maxFundingInput);
      setShowFinancingModal(null);
      showToast(`Financing request opened for ₦${maxFundingInput.toLocaleString()}. Competing financiers notified!`);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsRequestingFinance(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setIsAcceptingOffer(true);
    try {
      await store.acceptFinancingOffer(offerId);
      setShowOffersDrawer(null);
      showToast('Offer accepted. The invoice is locked and a financing agreement is recorded on Canton.');
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsAcceptingOffer(false);
    }
  };

  const handleConfirmInvoice = async (invoiceId: string) => {
    setIsConfirming(true);
    try {
      await store.confirmInvoice(invoiceId, confirmNotes);
      setConfirmModalInvoice(null);
      showToast(`Commercial debt obligation confirmed by buyer.`);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleConfirmDelivery = async (invoiceId: string) => {
    setIsDelivering(true);
    try {
      if (!deliveryFile) throw new Error('Select the delivery document to hash.');
      if (!deliveryReference.trim()) throw new Error('Enter the durable storage reference for the delivery document.');
      const digest = await crypto.subtle.digest('SHA-256', await deliveryFile.arrayBuffer());
      const documentHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      await store.confirmDelivery(invoiceId, deliveryNotes, { docType: 'DeliveryNote', documentHash, uriOrRef: deliveryReference.trim() });
      setDeliveryModalInvoice(null);
      setDeliveryFile(null);
      setDeliveryReference('');
      showToast('Buyer delivery confirmation and document hash recorded on Canton.');
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsDelivering(false);
    }
  };

  const handleMakeOffer = async (invoiceId: string) => {
    setIsMakingOffer(true);
    try {
      if (currentProfile?.role !== 'FinancierRole') throw new Error('Connect an approved financier profile first.');
      await store.makeFinancingOffer({
        invoiceId,
        financier: currentProfile.companyParty,
        fundingAmount,
        financingFee,
        termDays: 60,
        conditions,
      });
      setOfferModalInvoice(null);
      showToast('Financing offer submitted! Supplier notified.');
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsMakingOffer(false);
    }
  };

  const handleMarkFunded = async (agreementId: string) => {
    setIsMarkingFunded(true);
    try {
      await store.markAsFunded(agreementId);
      showToast('Funding marked as disbursed on Canton. This choice does not transfer funds.');
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsMarkingFunded(false);
    }
  };

  const handleSettle = async (agreementId: string) => {
    setIsSettling(true);
    try {
      await store.settleFinancing(agreementId, paymentRef);
      setSettleModalInvoice(null);
      showToast('Settlement allocation recorded on Canton. Funds must be transferred separately.');
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSettling(false);
    }
  };

  // Find invoice currently selected for settlement modal
  const settlingInvoiceItem = settleModalInvoice
    ? invoices.find(inv => {
      const p = store.getTrustPassport(inv.payload.invoiceId);
      return p?.activeAgreement?.agreementId === settleModalInvoice;
    })
    : null;
  const settlingAgreement = settlingInvoiceItem
    ? store.getTrustPassport(settlingInvoiceItem.payload.invoiceId)?.activeAgreement
    : null;

  // Filter invoices according to tab
  const displayedInvoices = invoices.filter(({ payload: inv }) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'supplier') {
      return currentProfile?.role === 'SupplierRole' && inv.supplier === currentParty;
    }
    if (selectedTab === 'buyer') {
      return currentProfile?.role === 'BuyerRole' && inv.buyer === currentParty;
    }
    if (selectedTab === 'financier') {
      if (currentProfile?.role !== 'FinancierRole') return false;
      const financingRequest = store.getFinancingRequests().find((request) => request.invoiceId === inv.invoiceId);
      const agreement = store.getTrustPassport(inv.invoiceId)?.activeAgreement;
      return Boolean(
        financingRequest?.eligibleFinanciers.includes(currentParty ?? '')
        || agreement?.financier === currentParty
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#FDF4D2] text-[#092328] font-sans">
      <Navbar />

      {/* Dashboard Top Banner */}
      <div className="bg-[#FDF4D2] border-b border-[#ebdca4]">
        <div className="w-full px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#092328] text-[#76C457] text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  {currentProfile ? currentProfile.role.replace('Role', ' Portal') : 'Trade Dashboard'}
                </span>
                <span className="text-xs text-[#092328]/60 font-mono">
                  {currentProfile ? `${currentProfile.companyName} (${currentProfile.cacOrRegistrationNumber})` : 'Unregistered Session'}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-[#092328] mt-2 tracking-tight">
                Privacy-Preserving Trade Hub
              </h1>
              <p className="text-sm text-[#092328]/70 mt-1">
                Manage commercial receivables, certify deliveries, and execute automated financing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {currentProfile?.role === 'SupplierRole' && (
                <button
                  onClick={() => { setNewInvId(`INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`); setNewAmount(''); setNewDesc(''); setNewQuantity(''); setNewWeight(''); setShowCreateModal(true); }}
                  className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] text-sm font-black px-5 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Issue Commercial Invoice
                </button>
              )}
              <button
                type="button"
                onClick={() => { void handleRefresh(); }}
                disabled={isRefreshing}
                className="rounded-xl border border-[#ebdca4] bg-[#fffdf5] px-4 py-3 text-xs font-bold text-[#092328] disabled:cursor-wait disabled:opacity-60"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh ledger'}
              </button>
            </div>
          </div>

          {/* Unified Role Segmented Pill Bar */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
            {!currentProfile && <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${selectedTab === 'all'
                ? 'bg-[#092328] text-white shadow-xs'
                : 'bg-[#f0e3b9] text-[#092328]/70 hover:text-[#092328]'
                }`}
            >
              <IconExchange className="w-4 h-4 text-[#76C457]" />
              <span>All Network Invoices ({invoices.length})</span>
            </button>}

            {(!currentProfile || currentProfile.role === 'SupplierRole') && <button
              onClick={() => setActiveTab('supplier')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${selectedTab === 'supplier'
                ? 'bg-[#092328] text-[#76C457] shadow-xs'
                : 'bg-[#f0e3b9] text-[#092328]/70 hover:text-[#092328]'
                }`}
            >
              <IconFileText className="w-4 h-4 text-[#76C457]" />
              <span>Supplier Desk (Originate & Finance)</span>
            </button>}

            {(!currentProfile || currentProfile.role === 'BuyerRole') && <button
              onClick={() => setActiveTab('buyer')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${selectedTab === 'buyer'
                ? 'bg-[#092328] text-[#76C457] shadow-xs'
                : 'bg-[#f0e3b9] text-[#092328]/70 hover:text-[#092328]'
                }`}
            >
              <IconBuilding className="w-4 h-4 text-[#76C457]" />
              <span>Buyer Desk (Acknowledge & Deliver)</span>
            </button>}

            {(!currentProfile || currentProfile.role === 'FinancierRole') && <button
              onClick={() => setActiveTab('financier')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${selectedTab === 'financier'
                ? 'bg-[#092328] text-[#76C457] shadow-xs'
                : 'bg-[#f0e3b9] text-[#092328]/70 hover:text-[#092328]'
                }`}
            >
              <IconBank className="w-4 h-4 text-[#76C457]" />
              <span>Financier Desk (Marketplace & Yield)</span>
            </button>}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 flex-1">

        {store.getError() && currentParty && (
          <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-words">{store.getError()}</p>
            <button
              type="button"
              onClick={() => { void handleRefresh(); }}
              disabled={isRefreshing}
              className="shrink-0 rounded-lg border border-red-300 px-3 py-2 text-xs font-bold disabled:opacity-60"
            >
              Retry
            </button>
          </div>
        )}

        {!currentParty ? (
          /* Locked State: Connect to the Ledger First */
          <div className="bg-[#fffdf5] border border-[#ebdca4] rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto shadow-xl my-8">
            <div className="w-16 h-16 rounded-2xl bg-[#092328] text-[#76C457] flex items-center justify-center mx-auto mb-5 shadow-md">
              <IconLock className="w-8 h-8 text-[#76C457]" />
            </div>
            <h2 className="text-2xl font-black text-[#092328] mb-3">
              Ledger API Connection Required
            </h2>
            <p className="text-xs sm:text-sm text-[#092328]/70 leading-relaxed mb-8">
              Connect with your HackCanton Ledger access token and allocated party to view your verified commercial obligations, originate invoices, and participate in trade financing.
            </p>
            <button
              onClick={() => setIsConnectionModalOpen(true)}
              className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black text-sm px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Connect to Ledger Now
            </button>
          </div>
        ) : !currentProfile ? (
          <div className="mx-auto my-8 w-full max-w-3xl rounded-3xl border border-[#ebdca4] bg-[#fffdf5] p-6 shadow-xl sm:p-10">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${ownPendingRequest ? 'bg-amber-100 text-amber-900' : 'bg-[#f6e9bc] text-[#092328]'}`}>
              {ownPendingRequest ? 'Operator approval pending' : 'Company profile required'}
            </span>
            <h2 className="mt-4 text-2xl font-black text-[#092328]">
              {ownPendingRequest ? 'Your registration is awaiting approval' : 'Complete company registration to start trading'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#092328]/75">
              {ownPendingRequest
                ? `${ownPendingRequest.payload.companyName} is registered as a pending ${ownPendingRequest.payload.requestedRole} request. An authorized operator party must approve it before trade actions become available.`
                : 'Your Ledger connection is active, but this party does not yet have an approved company profile. Submit your company details and wait for operator approval.'}
            </p>
            {ownPendingRequest && (
              <div className="mt-5 min-w-0 rounded-xl border border-[#ebdca4] bg-[#FDF4D2] p-4">
                <p className="text-xs font-bold text-[#092328]/70">Registration contract ID</p>
                <code className="mt-2 block max-h-20 overflow-y-auto break-all font-mono text-xs">{ownPendingRequest.cid}</code>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-xl bg-[#092328] px-5 py-3 text-sm font-bold text-[#76C457]">
                {ownPendingRequest ? 'View registration status' : 'Go to company registration'}
              </Link>
              <button
                type="button"
                onClick={() => { void handleRefresh(); }}
                disabled={isRefreshing}
                className="rounded-xl border border-[#ebdca4] px-5 py-3 text-sm font-bold disabled:opacity-60"
              >
                {isRefreshing ? 'Checking...' : 'Check approval status'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Invoices List / Empty State */}
            {displayedInvoices.length === 0 ? (
              <div className="bg-[#FDF4D2] border border-[#ebdca4] rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-[#092328] text-[#76C457] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <IconFileText className="w-8 h-8 text-[#76C457]" />
                </div>
                <h3 className="text-xl font-extrabold text-[#092328] mb-2">No Receivables Found in this View</h3>
                <p className="text-xs text-[#092328]/70 max-w-md mx-auto mb-6">
                  {currentProfile.role === 'SupplierRole'
                    ? 'Create an invoice to start a verified trade flow, or refresh the ledger to check for new activity.'
                    : 'No invoices are currently visible for this view. Refresh the ledger to check for new activity.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {currentProfile.role === 'SupplierRole' && (
                    <button
                      onClick={() => { setNewInvId(`INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`); setNewAmount(''); setNewDesc(''); setNewQuantity(''); setNewWeight(''); setShowCreateModal(true); }}
                      className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black text-xs px-6 py-3 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      + Issue Commercial Invoice
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { void handleRefresh(); }}
                    disabled={isRefreshing}
                    className="rounded-xl border border-[#ebdca4] px-6 py-3 text-xs font-bold disabled:opacity-60"
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh ledger'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedInvoices.map(({ payload: inv }) => {
                  const passport = store.getTrustPassport(inv.invoiceId);
                  const offers = store.getFinancingOffersForInvoice(inv.invoiceId);
                  const financingRequest = store.getFinancingRequests().find((request) => request.invoiceId === inv.invoiceId);
                  const supplierCanAct = currentProfile.role === 'SupplierRole' && inv.supplier === currentParty;
                  const buyerCanAct = currentProfile.role === 'BuyerRole' && inv.buyer === currentParty;
                  const financierCanAct = currentProfile.role === 'FinancierRole'
                    && Boolean(financingRequest?.eligibleFinanciers.includes(currentParty ?? ''));
                  const isSubmitted = inv.status === 'InvoiceSubmitted';
                  const isConfirmed = inv.status === 'InvoiceConfirmed';
                  const isDelivered = inv.status === 'InvoiceDelivered';
                  const isFinanced = inv.status === 'InvoiceFinanced';
                  const isSettled = inv.status === 'InvoiceSettled';
                  const agreement = passport?.activeAgreement;

                  return (
                    <div
                      key={inv.invoiceId}
                      className="bg-[#FDF4D2] border border-[#ebdca4] rounded-3xl p-6 lg:p-8 shadow-xs hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                        {/* Left Column: Details */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-lg font-black text-[#092328]">{inv.invoiceId}</span>
                            <span className={`text-xs px-3 py-1 rounded-full font-bold ${getInvoiceStatusColor(inv.status)}`}>
                              {inv.status}
                            </span>
                            <span className="text-xs text-[#092328]/60 font-medium hidden sm:inline">Verified Obligation</span>
                          </div>

                          <p className="text-base font-semibold text-[#092328]">{inv.description}</p>

                          <div className="flex flex-wrap items-center gap-5 text-xs text-[#092328]/70">
                            <span>Supplier: <strong className="text-[#092328] font-bold">{inv.supplier.split('::')[0]}</strong></span>
                            <span>•</span>
                            <span>Buyer: <strong className="text-[#092328] font-bold">{inv.buyer.split('::')[0]}</strong></span>
                            <span>•</span>
                            <span>Face Value: <strong className="text-2xl font-black text-[#092328] ml-1">₦{Number(inv.amount).toLocaleString()}</strong></span>
                            <span>•</span>
                            <span>Due Date: <strong className="text-[#092328]">{new Date(inv.dueDate).toLocaleDateString()}</strong></span>
                          </div>
                        </div>

                        {/* Right Column: Actions */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">

                          {/* Inspect Trust Passport */}
                          <button
                            onClick={() => setSelectedPassport(passport)}
                            className="bg-[#f6e9bc] hover:bg-[#ebdca4] text-[#092328] border border-[#ebdca4] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-[#76C457]"></span>
                            Trust Passport
                          </button>

                          {/* Supplier Action: Request Financing */}
                          {supplierCanAct && (isConfirmed || isDelivered) && !isFinanced && !isSettled && !financingRequest && (
                            <button
                              onClick={() => {
                                setMaxFundingInput(Math.round(inv.amount * 0.85));
                                setShowFinancingModal(inv.invoiceId);
                              }}
                              className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              Request Financing
                            </button>
                          )}

                          {/* Supplier Action: View Competing Offers */}
                          {supplierCanAct && offers.length > 0 && !isFinanced && !isSettled && (
                            <button
                              onClick={() => setShowOffersDrawer(inv.invoiceId)}
                              className="bg-[#092328] hover:bg-[#133e46] text-[#76C457] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <span>Review Bids</span>
                              <span className="bg-[#76C457] text-[#092328] text-[10px] font-black px-1.5 py-0.5 rounded-full">{offers.length}</span>
                            </button>
                          )}
                          {supplierCanAct && financingRequest && offers.length === 0 && !isFinanced && !isSettled && (
                            <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900">
                              Financing request open · waiting for offers
                            </span>
                          )}

                          {/* Buyer Action 1: Confirm Obligation */}
                          {buyerCanAct && isSubmitted && (
                            <button
                              onClick={() => {
                                setConfirmNotes(`We acknowledge the ₦${Number(inv.amount).toLocaleString()} commercial obligation to ${inv.supplier.split('::')[0]}.`);
                                setConfirmModalInvoice(inv.invoiceId);
                              }}
                              className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              Confirm Obligation
                            </button>
                          )}

                          {/* Buyer Action 2: Confirm Delivery */}
                          {buyerCanAct && isConfirmed && (
                            <button
                              onClick={() => setDeliveryModalInvoice(inv.invoiceId)}
                              className="bg-[#092328] hover:bg-[#133e46] text-[#76C457] text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              Confirm Delivery
                            </button>
                          )}

                          {/* Financier Action: Submit Offer */}
                          {financierCanAct && (isConfirmed || isDelivered) && !isFinanced && !isSettled && (
                            <button
                              onClick={() => {
                                setFundingAmount(Math.min(Math.round(inv.amount * 0.85), financingRequest?.maxFundingRequested ?? inv.amount));
                                setFinancingFee(Math.round(inv.amount * 0.06));
                                setOfferModalInvoice(inv.invoiceId);
                              }}
                              className="bg-[#092328] hover:bg-[#133e46] text-[#76C457] border border-[#1a4a54] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                            >
                              Quote Terms
                            </button>
                          )}

                          {/* Financier Action: Mark Funded */}
                          {financierCanAct && isFinanced && agreement && !agreement.isFunded && agreement.financier === currentParty && (
                            <button
                              onClick={() => handleMarkFunded(agreement.agreementId)}
                              disabled={isMarkingFunded}
                              className="bg-[#e4f5de] hover:bg-[#c9efbf] border border-[#76C457] text-[#2b6819] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[125px]"
                            >
                              {isMarkingFunded ? (
                                <span className="flex items-center gap-1.5">
                                  <svg className="animate-spin h-3.5 w-3.5 text-[#2b6819]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Marking...
                                </span>
                              ) : (
                                'Mark as Funded'
                              )}
                            </button>
                          )}

                          {/* Settlement Action */}
                          {buyerCanAct && isFinanced && agreement?.isFunded && agreement.buyer === currentParty && (
                            <button
                              onClick={() => setSettleModalInvoice(agreement.agreementId)}
                              className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              Record Settlement
                            </button>
                          )}

                          {/* Settled Badge */}
                          {isSettled && (
                            <span className="bg-[#76C457] text-[#092328] text-xs font-black px-4 py-2.5 rounded-xl">
                              ✓ Settled & Paid
                            </span>
                          )}

                        </div>

                      </div>

                      {/* Items Preview */}
                      <div className="mt-5 pt-4 border-t border-[#ebdca4] text-xs">
                        <span className="font-bold text-[#092328] block mb-2 uppercase text-[11px] tracking-wider">
                          Commercial Items & Supporting Documents:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-gray-700">
                          {inv.items.map((item, idx) => (
                            <div key={idx} className="bg-[#f6e9bc] p-3 rounded-xl border border-[#ebdca4]">
                              <span className="font-bold text-[#092328] block truncate">{item.description}</span>
                              <div className="flex justify-between text-[11px] text-[#092328]/70 mt-1">
                                <span>{Number(item.quantity)} {item.unit}</span>
                                <span className="font-bold text-[#092328]">₦{Number(item.itemTotal).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Active Loan Portfolio (If viewing Financier Desk or Agreements exist) */}
            {(selectedTab === 'all' || selectedTab === 'supplier' || selectedTab === 'financier') && visibleAgreements.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-extrabold text-[#092328] mb-4">Active Loan Portfolio</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleAgreements.map(agree => (
                    <div key={agree.agreementId} className="bg-[#FDF4D2] border border-[#ebdca4] rounded-3xl p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-sm font-extrabold text-[#092328]">{agree.agreementId}</span>
                        <span className={`text-[11px] px-3 py-1 rounded-full font-black ${agree.isSettled ? 'bg-[#76C457] text-[#092328]' :
                          agree.isFunded ? 'bg-[#092328] text-[#76C457]' :
                            'bg-amber-200 text-amber-900'
                          }`}>
                          {agree.isSettled ? 'FULL SETTLEMENT COMPLETE' : agree.isFunded ? 'FUNDED & ACTIVE' : 'PENDING DISBURSEMENT'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-[#f6e9bc] p-4 rounded-2xl text-xs mb-4 font-mono border border-[#ebdca4]">
                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase">Disbursed</span>
                          <strong className="text-base font-black text-[#092328]">₦{Number(agree.fundingAmount).toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase">Expected Yield</span>
                          <strong className="text-base font-bold text-[#2b6819]">₦{Number(agree.financingFee).toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase">Gross Return</span>
                          <strong className="text-base font-black text-[#092328]">₦{Number(agree.totalRepaymentToFinancier).toLocaleString()}</strong>
                        </div>
                      </div>

                      {/* Disburse Capital button */}
                      {currentProfile.role === 'FinancierRole' && agree.financier === currentParty && !agree.isFunded && !agree.isSettled && (
                        <button
                          onClick={() => handleMarkFunded(agree.agreementId)}
                          className="w-full bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black py-3 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Disburse Capital (Mark as Funded)
                        </button>
                      )}

                      {agree.isFunded && !agree.isSettled && (
                        <div className="text-center text-xs text-[#092328] font-bold bg-[#f7ebbd] py-2.5 rounded-xl border border-[#ebdca4]">
                          Awaiting buyer maturity payment of ₦{Number(agree.totalRepaymentToFinancier).toLocaleString()}
                        </div>
                      )}

                      {agree.isSettled && (
                        <div className="text-center text-xs text-[#092328] font-black bg-[#76C457] py-2.5 rounded-xl">
                          ✓ Yield Realized: ₦{Number(agree.financingFee).toLocaleString()} (Principal + Fee Returned)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Modal 1: Create Invoice */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#092328]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF4D2] rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-[#ebdca4]">
            <h2 className="text-xl font-extrabold text-[#092328] mb-2">Create Commercial Invoice</h2>
            <p className="text-xs text-[#092328]/80 mb-5">
              Record the invoice terms as a Daml contract on Canton.
            </p>
            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#092328] mb-1">Invoice ID / Number</label>
                <input
                  type="text"
                  value={newInvId}
                  readOnly
                  className="w-full border border-[#ebdca4] bg-[#f0ead8] rounded-xl p-3 font-mono text-xs font-bold text-[#092328]/70 cursor-not-allowed select-all"
                />
              </div>

              <div>
                <label className="block font-bold text-[#092328] mb-1">Obligor (Buyer) Party ID</label>
                <input
                  type="text"
                  placeholder="Paste full Buyer Party ID (e.g. DangoteRetail::1220…)"
                  value={customBuyerParty}
                  onChange={e => setCustomBuyerParty(e.target.value)}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#092328] mb-1">Total Commercial Amount (₦)</label>
                <input
                  type="number"
                  value={newAmount}
                  placeholder="0.00"
                  onChange={e => setNewAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 font-mono text-base font-extrabold text-[#092328]"
                  required
                  min={1}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block font-bold text-[#092328] mb-1">Total Quantity</label>
                  <input
                    type="number"
                    value={newQuantity}
                    placeholder="e.g. 5"
                    onChange={e => setNewQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 text-xs"
                    required
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="block font-bold text-[#092328] mb-1">Total Weight / Unit <span className="font-normal text-[#092328]/60">(Optional)</span></label>
                  <input
                    type="text"
                    value={newWeight}
                    placeholder="e.g. 500 kg"
                    onChange={e => setNewWeight(e.target.value)}
                    className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#092328] mb-1">Description / Goods Specification</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 text-xs resize-y"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmittingInvoice}
                  className="px-4 py-2.5 border border-[#ebdca4] rounded-xl text-[#092328] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvoice}
                  className="px-5 py-2.5 bg-[#76C457] hover:bg-[#67b049] text-[#092328] rounded-xl font-black cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px]"
                >
                  {isSubmittingInvoice ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-[#092328]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Sign & Submit Invoice'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirm Obligation (Buyer) */}
      {confirmModalInvoice && (
        <div className="fixed inset-0 z-50 bg-[#092328]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF4D2] rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-[#ebdca4]">
            <h2 className="text-xl font-extrabold text-[#092328] mb-2">Acknowledge Commercial Debt</h2>
            <p className="text-xs text-[#092328]/80 mb-4">
              Formally sign the obligation. Financiers will be able to verify this commitment.
            </p>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#092328] mb-1">Acknowledgement Notes</label>
                <textarea
                  value={confirmNotes}
                  onChange={e => setConfirmNotes(e.target.value)}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 text-xs"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmModalInvoice(null)}
                  disabled={isConfirming}
                  className="px-4 py-2.5 border border-[#ebdca4] rounded-xl text-[#092328] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmInvoice(confirmModalInvoice)}
                  disabled={isConfirming}
                  className="px-5 py-2.5 bg-[#76C457] hover:bg-[#67b049] text-[#092328] rounded-xl font-black cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px]"
                >
                  {isConfirming ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-[#092328]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing...
                    </span>
                  ) : (
                    'Sign Obligation'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Confirm Delivery (Buyer) */}
      {deliveryModalInvoice && (
        <div className="fixed inset-0 z-50 bg-[#092328]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF4D2] rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-[#ebdca4]">
            <h2 className="text-xl font-extrabold text-[#092328] mb-4">Certify Fulfillment & Delivery</h2>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#092328] mb-1">Delivery Inspection Remarks</label>
                <textarea
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 text-xs"
                  rows={3}
                />
              </div>
              <div>
                <label className="block font-bold text-[#092328] mb-1">Delivery document (Local File)</label>
                <p className="text-[10px] text-[#092328]/60 mb-2 leading-tight">Select the physical waybill/receipt. The file is never uploaded; the app simply calculates its secure SHA-256 cryptographic hash locally to record on the ledger.</p>
                <input
                  type="file"
                  onChange={(event) => setDeliveryFile(event.target.files?.[0] || null)}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 text-xs cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-bold text-[#092328] mb-1">Document Link (URL)</label>
                <p className="text-[10px] text-[#092328]/60 mb-2 leading-tight">Add a link to the hosted document (e.g., Google Drive).</p>
                <input
                  type="text"
                  value={deliveryReference}
                  onChange={(event) => setDeliveryReference(event.target.value)}
                  placeholder="https://, ipfs://, or s3:// reference"
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setDeliveryModalInvoice(null)}
                  disabled={isDelivering}
                  className="px-4 py-2.5 border border-[#ebdca4] rounded-xl text-[#092328] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmDelivery(deliveryModalInvoice)}
                  disabled={isDelivering}
                  className="px-5 py-2.5 bg-[#76C457] hover:bg-[#67b049] text-[#092328] rounded-xl font-black cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px]"
                >
                  {isDelivering ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-[#092328]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Certifying...
                    </span>
                  ) : (
                    'Certify Delivery'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Request Financing (Supplier) */}
      {showFinancingModal && (
        <div className="fixed inset-0 z-50 bg-[#092328]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF4D2] rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-[#ebdca4]">
            <h2 className="text-xl font-extrabold text-[#092328] mb-2">Request Invoice Financing</h2>
            <p className="text-xs text-[#092328]/80 mb-4">
              Publish a financing request for invoice <strong>{showFinancingModal}</strong> to verified institutional financiers.
            </p>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#092328] mb-1">Target Advance Capital (₦)</label>
                <input
                  type="number"
                  min={1}
                  max={financingInvoice?.amount}
                  value={maxFundingInput}
                  onChange={e => setMaxFundingInput(Number(e.target.value))}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 font-mono text-base font-extrabold text-[#092328]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowFinancingModal(null)}
                  disabled={isRequestingFinance}
                  className="px-4 py-2.5 border border-[#ebdca4] rounded-xl text-[#092328] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRequestFinancing(showFinancingModal)}
                  disabled={isRequestingFinance}
                  className="px-5 py-2.5 bg-[#76C457] hover:bg-[#67b049] text-[#092328] rounded-xl font-black cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px]"
                >
                  {isRequestingFinance ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-[#092328]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Broadcasting...
                    </span>
                  ) : (
                    'Broadcast Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Review Financing Offers & Accept Bid (Supplier) */}
      {showOffersDrawer && (
        <div className="fixed inset-0 z-50 bg-[#092328]/60 backdrop-blur-xs flex justify-end">
          <div className="bg-[#FDF4D2] w-full max-w-md h-full p-8 shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-[#ebdca4]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#ebdca4] mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-[#092328]">Competing Financing Offers</h3>
                  <span className="text-xs font-mono text-[#092328]/60">Invoice: {showOffersDrawer}</span>
                </div>
                <button
                  onClick={() => setShowOffersDrawer(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#ebdca4] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {store.getFinancingOffersForInvoice(showOffersDrawer).map(offer => (
                  <div key={offer.offerId} className="bg-[#f6e9bc] p-5 rounded-2xl border border-[#ebdca4] space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#092328]">{offer.financier.split('::')[0]}</span>
                      <span className="bg-[#76C457] text-[#092328] text-[10px] font-black px-2 py-0.5 rounded-full">
                        {offer.termDays} Days Tenor
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Funding Advance</span>
                        <strong className="text-base text-[#092328] font-black">₦{Number(offer.fundingAmount).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Fee / Return</span>
                        <strong className="text-base text-[#2b6819] font-bold">₦{Number(offer.financingFee).toLocaleString()}</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#092328]/70 italic">&quot;{offer.conditions}&quot;</p>

                    <button
                      onClick={() => handleAcceptOffer(offer.offerId)}
                      disabled={isAcceptingOffer}
                      className="w-full bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black py-2.5 rounded-xl text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-h-[36px]"
                    >
                      {isAcceptingOffer ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-3.5 w-3.5 text-[#092328]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        'Accept Bid & Lock Receivable'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-[#092328]/60 mt-6 pt-4 border-t border-[#ebdca4]">
              *Accepting creates a binding financing agreement and permanently guards against duplicate financing.
            </p>
          </div>
        </div>
      )}

      {/* Modal 5: Submit Financing Offer (Financier) */}
      {offerModalInvoice && (
        <div className="fixed inset-0 z-50 bg-[#092328]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF4D2] rounded-3xl max-w-md w-full p-8 shadow-2xl border border-[#ebdca4]">
            <h2 className="text-xl font-extrabold text-[#092328] mb-2">Submit Financing Offer</h2>
            <p className="text-xs text-[#092328]/80 mb-4">
              Quote economic terms for invoice <strong>{offerModalInvoice}</strong>.
            </p>
            {activeOfferRequest && (
              <p className="mb-4 rounded-xl border border-[#ebdca4] bg-[#fffdf5] p-3 text-xs text-[#092328]/75">
                Supplier requested up to ₦{Number(activeOfferRequest.maxFundingRequested).toLocaleString()} against an invoice of ₦{Number(activeOfferRequest.invoiceAmount).toLocaleString()}.
              </p>
            )}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#092328] mb-1">Upfront Funding Amount (₦)</label>
                <input
                  type="number"
                  min={1}
                  max={activeOfferRequest?.maxFundingRequested}
                  value={fundingAmount}
                  onChange={e => setFundingAmount(Number(e.target.value))}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 text-base font-extrabold text-[#092328]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#092328] mb-1">Financing Return / Fee (₦)</label>
                <input
                  type="number"
                  min={0}
                  max={activeOfferRequest ? activeOfferRequest.invoiceAmount - fundingAmount : undefined}
                  value={financingFee}
                  onChange={e => setFinancingFee(Number(e.target.value))}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 text-base font-extrabold text-[#2b6819]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#092328] mb-1">Conditions</label>
                <textarea
                  value={conditions}
                  onChange={e => setConditions(e.target.value)}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 text-xs"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setOfferModalInvoice(null)}
                  disabled={isMakingOffer}
                  className="px-4 py-2.5 border border-[#ebdca4] rounded-xl text-[#092328] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleMakeOffer(offerModalInvoice)}
                  disabled={isMakingOffer}
                  className="px-5 py-2.5 bg-[#76C457] hover:bg-[#67b049] text-[#092328] rounded-xl font-black cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[210px]"
                >
                  {isMakingOffer ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-[#092328]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Financing Offer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Settle Obligation */}
      {settleModalInvoice && settlingInvoiceItem && settlingAgreement && (
        <div className="fixed inset-0 z-50 bg-[#092328]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF4D2] rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-[#ebdca4]">
            <h2 className="text-xl font-extrabold text-[#092328] mb-2">Settle Commercial Obligation</h2>
            <p className="text-xs text-[#092328]/80 mb-4">
              Record the buyer&apos;s payment reference for <strong>₦{Number(settlingInvoiceItem.payload.amount).toLocaleString()}</strong>. This does not initiate or transfer funds.
            </p>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#092328] mb-1">Payment Reference</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3 font-mono text-xs"
                />
              </div>
              <div className="bg-[#f6e9bc] p-4 rounded-xl border border-[#ebdca4] text-xs text-[#092328] font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span>Financier Allocation:</span>
                  <strong className="text-sm font-black text-[#2b6819]">₦{Number(settlingAgreement.totalRepaymentToFinancier).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Supplier Remainder:</span>
                  <strong className="text-sm font-black text-[#2b6819]">₦{(Number(settlingInvoiceItem.payload.amount) - Number(settlingAgreement.totalRepaymentToFinancier)).toLocaleString()}</strong>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setSettleModalInvoice(null)}
                  disabled={isSettling}
                  className="px-4 py-2.5 border border-[#ebdca4] rounded-xl text-[#092328] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSettle(settleModalInvoice)}
                  disabled={isSettling}
                  className="px-5 py-2.5 bg-[#76C457] hover:bg-[#67b049] text-[#092328] rounded-xl font-black cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[210px]"
                >
                  {isSettling ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-[#092328]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Recording...
                    </span>
                  ) : (
                    'Record Settlement on Canton'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trust Passport Modal */}
      <TrustPassportModal
        data={selectedPassport}
        onClose={() => setSelectedPassport(null)}
      />

      {/* Connect to the Canton Ledger API */}
      <ConnectCantonModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        currentParty={store.getCurrentParty()}
        onConnect={(partyId, accessToken) => store.connectParty(partyId, accessToken)}
      />

    </div>
  );
}
