'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/Navbar';
import { useTradeStore } from '@/lib/services/tradeStore';
import { CompanyRole } from '@/lib/canton/types';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';
import { IconLock } from '@/components/Icons';

export default function RegisterPage() {
  const store = useTradeStore();
  const connectedParty = store.getCurrentParty();
  const currentProfile = store.getCurrentProfile();
  const registrationRequests = store.getRegistrationRequests();
  const requestsForOperator = registrationRequests.filter(({ payload }) => payload.operator === connectedParty);
  const ownPendingRequest = registrationRequests.find(({ payload }) => payload.applicantParty === connectedParty);

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Registration Type comes from global store instead of URL params
  const registrationType = store.getPendingRegistrationType();

  // Commercial Form State
  const [commRole, setCommRole] = useState<'SupplierRole' | 'BuyerRole'>('SupplierRole');
  const [commCompanyName, setCommCompanyName] = useState('');
  const [commLocation, setCommLocation] = useState('');
  const [commCac, setCommCac] = useState('');

  // Financier Form State (Separated)
  const [finCompanyName, setFinCompanyName] = useState('');
  const [finLocation, setFinLocation] = useState('');
  const [finCac, setFinCac] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') toast.error(message);
    else toast.success(message);
  };

  const handleCommercialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!connectedParty) throw new Error('Connect an allocated Canton party before registering.');
      const roleCode = commRole === 'SupplierRole' ? 1 : 2;
      await store.createRegistrationRequest({
        applicantParty: connectedParty,
        companyName: commCompanyName,
        businessLocation: commLocation,
        cacOrRegistrationNumber: commCac,
        requestedRole: commRole,
        roleCode,
      });

      showToast(`Registration request submitted for ${commCompanyName}. It is waiting for operator approval.`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to submit the registration request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinancierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!connectedParty) throw new Error('Connect an allocated Canton party before registering.');
      const requestedRole: CompanyRole = 'FinancierRole';
      const roleCode = 3;
      await store.createRegistrationRequest({
        applicantParty: connectedParty,
        companyName: finCompanyName,
        businessLocation: finLocation,
        cacOrRegistrationNumber: finCac,
        requestedRole,
        roleCode,
      });

      showToast(`Financier request submitted for ${finCompanyName}. It is waiting for operator approval.`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to submit the registration request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveRegistration = async (contractId: string) => {
    setIsSubmitting(true);
    try {
      await store.approveRegistration(contractId);
      showToast('Registration approved. The company profile is now active on Canton.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to approve registration.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FDF4D2] text-[#092328] font-sans">
      <Navbar />

      {/* Main Registration Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">

        {/* Title & Introduction */}
        <div className="text-left mb-10">
          <div className="inline-flex items-center gap-2 bg-[#f6e9bc] border border-[#ebdca4] px-3.5 py-1 rounded-full text-xs font-bold text-[#092328] mb-4">
            <span className="w-2 h-2 rounded-full bg-[#76C457]"></span>
            Enterprise Onboarding
          </div>
          <h1 className="text-4xl font-extrabold text-[#092328] tracking-tight">
            Register
          </h1>
          <p className="text-sm text-[#092328]/70 mt-2">
            Submit your company details to join the network.
          </p>
        </div>

        {requestsForOperator.length > 0 && (
          <section className="mb-8 border border-[#ebdca4] bg-[#fffdf5] p-6">
            <h2 className="text-lg font-black text-[#092328]">Registration requests</h2>
            <div className="mt-4 divide-y divide-[#ebdca4]">
              {requestsForOperator.map(({ payload, cid }) => (
                <div key={cid} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold">{payload.companyName}</p>
                    <p className="text-xs text-[#092328]/70">{payload.applicantParty} · {payload.requestedRole}</p>
                    <p className="text-xs text-[#092328]/70">{payload.cacOrRegistrationNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApproveRegistration(cid)}
                    disabled={isSubmitting}
                    className="bg-[#092328] px-4 py-2 text-xs font-bold text-[#76C457] disabled:opacity-50"
                  >
                    Approve on Canton
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {!connectedParty ? (
          /* Locked State: Connect a Canton Party First */
          <div className="bg-[#fffdf5] border border-[#ebdca4] rounded-3xl p-10 sm:p-14 text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#092328] text-[#76C457] flex items-center justify-center mx-auto mb-5 shadow-md">
              <IconLock className="w-8 h-8 text-[#76C457]" />
            </div>
            <h2 className="text-2xl font-black text-[#092328] mb-3">
              Canton Party Required
            </h2>
            <p className="text-xs sm:text-sm text-[#092328]/70 leading-relaxed mb-8">
              Connect a party allocated by your Canton participant before submitting a registration request.
            </p>
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black text-sm px-8 py-3.5 rounded-md shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Connect Canton Party
            </button>
          </div>
        ) : currentProfile ? (
          <div className="border border-[#ebdca4] bg-[#fffdf5] p-6">
            <h2 className="text-lg font-black">Company profile active on Canton</h2>
            <p className="mt-2 text-sm">{currentProfile.companyName} · {currentProfile.role}</p>
            <p className="mt-1 font-mono text-xs text-[#092328]/70">{currentProfile.companyParty}</p>
          </div>
        ) : ownPendingRequest ? (
          <div className="border border-[#ebdca4] bg-[#fffdf5] p-6">
            <h2 className="text-lg font-black">Registration awaiting operator approval</h2>
            <p className="mt-2 text-sm">{ownPendingRequest.payload.companyName} · {ownPendingRequest.payload.requestedRole}</p>
            <p className="mt-1 font-mono text-xs text-[#092328]/70">{ownPendingRequest.cid}</p>
          </div>
        ) : (
          <>


            {/* Form 1: Commercial Registration (Supplier or Buyer with dropdown) */}
            {registrationType === 'commercial' && (
              <div className="bg-[#FDF4D2] border border-[#ebdca4] rounded-3xl p-8 lg:p-10 shadow-xl">
                <div className="pb-6 border-b border-[#ebdca4] mb-6">
                  <h2 className="text-2xl font-black text-[#092328]">Company Registration</h2>
                  <p className="text-xs text-[#092328]/70 mt-0.5">
                    Select your role.
                  </p>
                </div>

                <form onSubmit={handleCommercialSubmit} className="space-y-5 text-xs">

                  {/* Role Dropdown */}
                  <div>
                    <label className="block text-sm font-extrabold text-[#092328] mb-1.5">
                      Role <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={commRole}
                      onChange={(e) => setCommRole(e.target.value as 'SupplierRole' | 'BuyerRole')}
                      className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3.5 text-sm font-bold text-[#092328] outline-none focus:border-[#76C457]"
                      required
                    >
                      <option value="SupplierRole">Seller</option>
                      <option value="BuyerRole">Buyer</option>
                    </select>
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-extrabold text-[#092328] mb-1.5">
                      Company Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dangote Agro Logistics Ltd"
                      value={commCompanyName}
                      onChange={(e) => setCommCompanyName(e.target.value)}
                      className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3.5 text-sm font-semibold text-[#092328] outline-none focus:border-[#76C457]"
                      required
                    />
                  </div>

                  {/* Grid: Business Location & CAC Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-extrabold text-[#092328] mb-1.5">
                        Location <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ikeja, Lagos, Nigeria"
                        value={commLocation}
                        onChange={(e) => setCommLocation(e.target.value)}
                        className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3.5 text-sm font-semibold text-[#092328] outline-none focus:border-[#76C457]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-extrabold text-[#092328] mb-1.5">
                        CAC Registration Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. RC-1849202"
                        value={commCac}
                        onChange={(e) => setCommCac(e.target.value)}
                        className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3.5 text-sm font-mono font-semibold text-[#092328] outline-none focus:border-[#76C457]"
                        required
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#76C457] hover:bg-[#67b049] text-[#092328] font-black text-sm px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>

                </form>
              </div>
            )}

            {/* Form 2: Financier Registration (Separated!) */}
            {registrationType === 'financier' && (
              <div className="bg-[#FDF4D2] border border-[#ebdca4] rounded-3xl p-8 lg:p-10 shadow-xl">
                <div className="pb-6 border-b border-[#ebdca4] mb-6">
                  <h2 className="text-2xl font-black text-[#092328]">Financier Registration</h2>
                  <p className="text-xs text-[#092328]/70 mt-0.5">
                    Register as a capital provider.
                  </p>
                </div>

                <form onSubmit={handleFinancierSubmit} className="space-y-5 text-xs">

                  {/* Institution Name */}
                  <div>
                    <label className="block text-sm font-extrabold text-[#092328] mb-1.5">
                      Institution Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. African Trade Capital"
                      value={finCompanyName}
                      onChange={(e) => setFinCompanyName(e.target.value)}
                      className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3.5 text-sm font-semibold text-[#092328] outline-none focus:border-[#76C457]"
                      required
                    />
                  </div>

                  {/* Grid: Business Location & License Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-extrabold text-[#092328] mb-1.5">
                        Headquarters <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Victoria Island, Lagos"
                        value={finLocation}
                        onChange={(e) => setFinLocation(e.target.value)}
                        className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3.5 text-sm font-semibold text-[#092328] outline-none focus:border-[#76C457]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-extrabold text-[#092328] mb-1.5">
                        License Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CBN-FC-2024-9182"
                        value={finCac}
                        onChange={(e) => setFinCac(e.target.value)}
                        className="w-full border border-[#ebdca4] bg-[#fffdf5] rounded-xl p-3.5 text-sm font-mono font-semibold text-[#092328] outline-none focus:border-[#76C457]"
                        required
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#092328] hover:bg-[#133e46] text-[#76C457] font-black text-sm px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>

                </form>
              </div>
            )}
          </>
        )}

      </main>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        currentParty={store.getCurrentParty() || 'Not Connected'}
        onSelectParty={(partyId) => store.connectParty(partyId)}
      />

      {/* Footer */}
      <footer className="bg-[#092328] text-white border-t border-[#0f3942] py-6 text-center text-xs text-gray-400 mt-12">
        <div className="w-full px-6 sm:px-10 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">9ja<span className="text-[#76C457]">Trade</span></span>
            <span className="text-gray-500">·</span>
            <span>Privacy-Preserving B2B Trade Network</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/about" className="text-[#76C457] hover:underline">How It Works</Link>
            {!currentProfile?.isVerified && (
              <button
                onClick={() => store.setPendingRegistrationType('financier')}
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
