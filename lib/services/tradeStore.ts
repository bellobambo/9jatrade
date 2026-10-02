'use client';

import { useEffect, useState } from 'react';
import {
  BuyerConfirmationPayload, CompanyProfilePayload, CompanyRole, DeliveryConfirmationPayload,
  DocumentEvidence, FinancingAgreementPayload, FinancingOfferPayload, FinancingRequestPayload,
  InvoiceItem, InvoicePayload, RegistrationRequestPayload, SettlementRecordPayload,
} from '../canton/types';
import { getCantonClient } from '../canton/client';
import { CANTON_CONFIG } from '../canton/config';

type LedgerContract<T> = { contractId: string; templateId: string; payload: T };

function ledgerContracts(value: unknown, result: LedgerContract<Record<string, unknown>>[] = []) {
  if (Array.isArray(value)) value.forEach((item) => ledgerContracts(item, result));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.contractId === 'string' && typeof record.templateId === 'string' && record.createArgument && typeof record.createArgument === 'object') {
      result.push({ contractId: record.contractId, templateId: record.templateId, payload: record.createArgument as Record<string, unknown> });
    }
    Object.values(record).forEach((item) => ledgerContracts(item, result));
  }
  return result;
}

const DECIMAL_FIELDS = new Set(['amount', 'quantity', 'unitPrice', 'itemTotal', 'invoiceAmount', 'maxFundingRequested', 'fundingAmount', 'financingFee', 'totalRepayment', 'totalRepaymentToFinancier', 'supplierBalanceDue', 'settlementAmount', 'totalSettledAmount', 'financierPayout', 'supplierRemainderPayout']);

function ledgerValue(value: unknown, key?: string): unknown {
  if (typeof value === 'number' && key && DECIMAL_FIELDS.has(key)) return String(value);
  if (Array.isArray(value)) return value.map((item) => ledgerValue(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [entryKey, ledgerValue(entryValue, entryKey)]));
  return value;
}

export interface TrustPassportData {
  invoice: InvoicePayload;
  invoiceCid: string;
  buyerConfirmation?: BuyerConfirmationPayload;
  buyerConfirmationCid?: string;
  deliveryConfirmation?: DeliveryConfirmationPayload;
  deliveryConfirmationCid?: string;
  financingRequest?: FinancingRequestPayload;
  financingOffers: FinancingOfferPayload[];
  activeAgreement?: FinancingAgreementPayload;
  settlementRecord?: SettlementRecordPayload;
  aiVerificationSummary: { isFinanceable: boolean; reason: string; verifiedChecks: string[]; missingItems: string[] };
}

function asPayload<T>(contract: LedgerContract<Record<string, unknown>>): LedgerContract<T> {
  return contract as LedgerContract<T>;
}

class TradeStateStore {
  private connectedParty: string | null = null;
  private profile: CompanyProfilePayload | null = null;
  private pendingRegistrationType: 'commercial' | 'financier' = 'commercial';
  private contracts: LedgerContract<Record<string, unknown>>[] = [];
  private listeners = new Set<() => void>();
  private loading = false;
  private error: string | null = null;
  private restoring: Promise<void> | null = null;
  private walletEventsInitialized = false;

  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private notify() { this.listeners.forEach((listener) => listener()); }
  getCurrentParty() { return this.connectedParty; }
  getCurrentProfile() { return this.profile; }
  getPendingRegistrationType() { return this.pendingRegistrationType; }
  setPendingRegistrationType(type: 'commercial' | 'financier') { this.pendingRegistrationType = type; this.notify(); }
  getError() { return this.error; }
  isLoading() { return this.loading; }

  initialize() {
    if (this.walletEventsInitialized) return;
    this.walletEventsInitialized = true;
    const client = getCantonClient();
    client.on('session:disconnected', () => this.disconnectParty());
    client.on('session:expired', () => this.disconnectParty());
  }

  async connectParty(party: string) {
    this.loading = true; this.error = null; this.notify();
    try {
      const session = await getCantonClient().getActiveSession();
      if (!session || session.partyId !== party) throw new Error('Connect this party through a Canton wallet first.');
      this.connectedParty = party;
      this.profile = null;
      this.contracts = [];
      await this.refresh();
      if (this.error) throw new Error(this.error);
    } catch (error) {
      this.connectedParty = null;
      this.profile = null;
      this.contracts = [];
      this.error = error instanceof Error ? error.message : 'Unable to connect this Canton party.';
      throw error;
    } finally {
      this.loading = false; this.notify();
    }
  }

  async restoreConnection() {
    if (this.connectedParty) return;
    if (!this.restoring) {
      this.restoring = (async () => {
        const session = await getCantonClient().getActiveSession();
        if (session) await this.connectParty(session.partyId);
      })().catch((error: unknown) => {
        this.error = error instanceof Error ? error.message : 'Unable to restore the Canton wallet session.';
        this.notify();
      }).finally(() => { this.restoring = null; });
    }
    await this.restoring;
  }

  disconnectParty() {
    this.connectedParty = null;
    this.profile = null;
    this.contracts = [];
    this.error = null;
    this.notify();
  }

  async refresh() {
    if (!this.connectedParty) { this.contracts = []; this.notify(); return; }
    this.loading = true; this.error = null; this.notify();
    try {
      const session = await getCantonClient().getActiveSession();
      if (!session || session.partyId !== this.connectedParty) throw new Error('The Canton wallet session is disconnected or has changed parties.');
      const ledgerEnd = await getCantonClient().ledgerApi({ requestMethod: 'POST', resource: '/v2/state/ledger-end' });
      const ledgerEndBody = this.parseLedgerResponse(ledgerEnd) as Record<string, unknown>;
      const offset = ledgerEndBody.offset ?? ledgerEndBody.ledgerEnd;
      if (offset === undefined) throw new Error('Canton did not return a ledger offset.');
      const activeContracts = await getCantonClient().ledgerApi({
        requestMethod: 'POST',
        resource: '/v2/state/active-contracts',
        body: {
          activeAtOffset: offset,
          eventFormat: {
            filtersByParty: { [this.connectedParty]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }] } },
            verbose: true,
          },
          verbose: true,
        },
      });
      this.contracts = ledgerContracts(this.parseLedgerResponse(activeContracts));
      const ledgerProfile = this.contracts.find((contract) => contract.templateId.endsWith(':Registration:CompanyProfile') && contract.payload.companyParty === this.connectedParty);
      this.profile = ledgerProfile ? asPayload<CompanyProfilePayload>(ledgerProfile).payload : null;
    } catch (error) {
      this.contracts = [];
      this.profile = null;
      this.error = error instanceof Error ? error.message : 'Unable to read the Canton ledger.';
    } finally {
      this.loading = false; this.notify();
    }
  }

  private byTemplate<T>(suffix: string) { return this.contracts.filter((contract) => contract.templateId.endsWith(suffix)).map(asPayload<T>); }
  getCompanyProfiles(role?: CompanyRole) {
    const profiles = this.byTemplate<CompanyProfilePayload>(':Registration:CompanyProfile').map((contract) => contract.payload);
    return role ? profiles.filter((profile) => profile.role === role) : profiles;
  }
  getRegistrationRequests() {
    return this.byTemplate<RegistrationRequestPayload>(':Registration:RegistrationRequest').map((contract) => ({ payload: contract.payload, cid: contract.contractId }));
  }
  getInvoices() { return this.byTemplate<InvoicePayload>(':Invoice:Invoice').map((contract) => ({ payload: contract.payload, cid: contract.contractId })); }
  getInvoice(invoiceId: string) { return this.getInvoices().find((invoice) => invoice.payload.invoiceId === invoiceId); }
  getBuyerConfirmations() { return this.byTemplate<BuyerConfirmationPayload>(':Invoice:BuyerConfirmation').map((contract) => contract.payload); }
  getFinancingRequests() { return this.byTemplate<FinancingRequestPayload>(':Financing:FinancingRequest').map((contract) => contract.payload); }
  getFinancingOffersForInvoice(invoiceId: string) { return this.byTemplate<FinancingOfferPayload>(':Financing:FinancingOffer').filter((contract) => contract.payload.invoiceId === invoiceId).map((contract) => contract.payload); }
  getAgreements() { return this.byTemplate<FinancingAgreementPayload>(':Financing:FinancingAgreement').map((contract) => contract.payload); }
  getSettlementRecords() { return this.byTemplate<SettlementRecordPayload>(':Financing:SettlementRecord').map((contract) => contract.payload); }

  getTrustPassport(invoiceId: string): TrustPassportData | null {
    const invoice = this.getInvoice(invoiceId); if (!invoice) return null;
    const confirmation = this.byTemplate<BuyerConfirmationPayload>(':Invoice:BuyerConfirmation').find((contract) => contract.payload.invoiceId === invoiceId);
    const delivery = this.byTemplate<DeliveryConfirmationPayload>(':Invoice:DeliveryConfirmation').find((contract) => contract.payload.invoiceId === invoiceId);
    const request = this.byTemplate<FinancingRequestPayload>(':Financing:FinancingRequest').find((contract) => contract.payload.invoiceId === invoiceId);
    const agreement = this.byTemplate<FinancingAgreementPayload>(':Financing:FinancingAgreement').find((contract) => contract.payload.invoiceId === invoiceId);
    const settlement = this.byTemplate<SettlementRecordPayload>(':Financing:SettlementRecord').find((contract) => contract.payload.invoiceId === invoiceId);
    const isFinanceable = ['InvoiceConfirmed', 'InvoiceDelivered'].includes(invoice.payload.status);
    return { invoice: invoice.payload, invoiceCid: invoice.cid, buyerConfirmation: confirmation?.payload, buyerConfirmationCid: confirmation?.contractId, deliveryConfirmation: delivery?.payload, deliveryConfirmationCid: delivery?.contractId, financingRequest: request?.payload, financingOffers: this.getFinancingOffersForInvoice(invoiceId), activeAgreement: agreement?.payload, settlementRecord: settlement?.payload, aiVerificationSummary: { isFinanceable, reason: isFinanceable ? 'Ledger-confirmed invoice is eligible for financing.' : 'Invoice must be confirmed or delivered before financing.', verifiedChecks: confirmation ? ['Buyer confirmation recorded on Canton.'] : [], missingItems: confirmation ? [] : ['Buyer confirmation'] } };
  }

  private requireConnectedRole(role: CompanyRole) {
    if (!this.connectedParty || this.profile?.companyParty !== this.connectedParty || this.profile.role !== role || !this.profile.isVerified) {
      throw new Error(`Connect an approved ${role.replace('Role', '').toLowerCase()} party to continue.`);
    }
    return this.connectedParty;
  }
  private parseLedgerResponse(response: unknown) {
    if (response && typeof response === 'object' && 'response' in response) {
      const body = (response as { response?: unknown }).response;
      if (typeof body === 'string') return JSON.parse(body) as unknown;
      return body;
    }
    return response;
  }

  private async command(body: Record<string, unknown>) {
    const session = await getCantonClient().getActiveSession();
    if (!session || session.partyId !== this.connectedParty) throw new Error('Connect a Canton wallet before submitting commands.');
    if (body.actingParty !== session.partyId) throw new Error('Canton commands must be submitted by the connected wallet party.');
    const template = String(body.template || '');
    const templateId = `${CANTON_CONFIG.packageId}:${template}`;
    const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : {};
    const command = body.kind === 'create'
      ? { CreateCommand: { templateId, createArguments: ledgerValue(payload) } }
      : { ExerciseCommand: { templateId, contractId: body.contractId, choice: body.choice, choiceArgument: ledgerValue(payload) } };
    if (body.kind !== 'create' && body.kind !== 'exercise') throw new Error('Unsupported Canton command.');
    const provider = getCantonClient().asProvider();
    const params = { commands: [command], commandId: crypto.randomUUID() };
    try {
      return await provider.request({ method: 'prepareExecuteAndWait', params });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: unknown }).code : null;
      if (code !== -32601 && code !== 4200) throw error;
      return provider.request({ method: 'prepareExecute', params });
    }
  }

  async createRegistrationRequest(data: { applicantParty: string; companyName: string; businessLocation: string; cacOrRegistrationNumber: string; requestedRole: CompanyRole; roleCode: number }) {
    if (data.applicantParty !== this.connectedParty) throw new Error('Connect the applicant Canton party before submitting registration.');
    if (!CANTON_CONFIG.operatorParty) throw new Error('NEXT_PUBLIC_CANTON_OPERATOR_PARTY is not configured.');
    await this.command({ kind: 'create', actingParty: data.applicantParty, template: 'Registration:RegistrationRequest', payload: { ...data, operator: CANTON_CONFIG.operatorParty } });
    await this.refresh();
    const request = this.getRegistrationRequests().find(({ payload }) => payload.applicantParty === data.applicantParty && payload.companyName === data.companyName);
    if (!request) throw new Error('The registration request was submitted but is not visible to the connected party.');
    return { request: request.payload };
  }

  async approveRegistration(contractId: string) {
    const actingParty = this.connectedParty;
    if (!actingParty) throw new Error('Connect the operator Canton party first.');
    await this.command({ kind: 'exercise', actingParty, template: 'Registration:RegistrationRequest', contractId, choice: 'ApproveRegistration', payload: {} });
    await this.refresh();
  }

  async createInvoice(data: { invoiceId: string; buyer: string; supplier?: string; amount: number; description: string; items: InvoiceItem[]; dueDateDays?: number }) {
    const supplier = this.requireConnectedRole('SupplierRole');
    if (data.supplier && data.supplier !== supplier) throw new Error('Invoice supplier must be the connected Canton party.');
    const operator = this.profile?.operator;
    if (!operator) throw new Error('The connected supplier profile has no configured operator.');
    const now = new Date(); const dueDate = new Date(now.getTime() + (data.dueDateDays || 60) * 86400000);
    const payload = { invoiceId: data.invoiceId, supplier, buyer: data.buyer, operator, amount: data.amount, currency: 'NGN', issueDate: now.toISOString(), dueDate: dueDate.toISOString(), description: data.description, items: data.items, supportingDocuments: [] as DocumentEvidence[], status: 'InvoiceDraft', correctionNotes: null };
    await this.command({ kind: 'create', actingParty: supplier, template: 'Invoice:Invoice', payload });
    await this.refresh();
    const draft = this.getInvoice(data.invoiceId);
    if (!draft) throw new Error('The invoice draft was submitted but is not visible to the connected supplier.');
    await this.command({ kind: 'exercise', actingParty: supplier, template: 'Invoice:Invoice', contractId: draft.cid, choice: 'SubmitForReview', payload: {} });
    await this.refresh(); return this.getInvoice(data.invoiceId);
  }

  async confirmInvoice(invoiceId: string, confirmationNotes: string) {
    const invoice = this.getInvoice(invoiceId); if (!invoice) throw new Error('Invoice not found on Canton.');
    this.requireConnectedRole('BuyerRole');
    if (invoice.payload.buyer !== this.connectedParty) throw new Error('Only the invoice buyer can confirm this invoice.');
    await this.command({ kind: 'exercise', actingParty: invoice.payload.buyer, template: 'Invoice:Invoice', contractId: invoice.cid, choice: 'ConfirmInvoice', payload: { confirmationNotes } });
    await this.refresh();
  }
  async confirmDelivery(invoiceId: string, fulfillmentNotes: string, deliveryEvidence: DocumentEvidence) {
    const invoice = this.getInvoice(invoiceId); if (!invoice) throw new Error('Invoice not found on Canton.');
    this.requireConnectedRole('BuyerRole');
    if (invoice.payload.buyer !== this.connectedParty) throw new Error('Only the invoice buyer can confirm delivery.');
    if (!/^[a-f0-9]{64}$/i.test(deliveryEvidence.documentHash)) throw new Error('Provide the SHA-256 hash of the delivery document.');
    if (!deliveryEvidence.uriOrRef.trim()) throw new Error('Provide the document storage reference.');
    await this.command({ kind: 'exercise', actingParty: invoice.payload.buyer, template: 'Invoice:Invoice', contractId: invoice.cid, choice: 'ConfirmDelivery', payload: { fulfillmentNotes, deliveryEvidence } });
    await this.refresh();
  }
  async requestFinancing(invoiceId: string, maxFundingRequested: number) {
    const invoice = this.getInvoice(invoiceId); if (!invoice) throw new Error('Invoice not found on Canton.');
    this.requireConnectedRole('SupplierRole');
    if (invoice.payload.supplier !== this.connectedParty) throw new Error('Only the invoice supplier can request financing.');
    if (CANTON_CONFIG.financierParties.length === 0) throw new Error('NEXT_PUBLIC_CANTON_FINANCIER_PARTIES is not configured.');
    await this.command({ kind: 'create', actingParty: invoice.payload.supplier, template: 'Financing:FinancingRequest', payload: { requestId: `REQ-${invoiceId}`, invoiceId, invoiceCid: invoice.cid, supplier: invoice.payload.supplier, buyer: invoice.payload.buyer, operator: invoice.payload.operator, eligibleFinanciers: CANTON_CONFIG.financierParties, invoiceAmount: invoice.payload.amount, maxFundingRequested, currency: invoice.payload.currency, dueDate: invoice.payload.dueDate } });
    await this.refresh();
  }
  async makeFinancingOffer(data: { invoiceId: string; financier?: string; fundingAmount: number; financingFee: number; termDays: number; conditions: string }) {
    const request = this.byTemplate<FinancingRequestPayload>(':Financing:FinancingRequest').find((contract) => contract.payload.invoiceId === data.invoiceId); if (!request) throw new Error('Financing request not found on Canton.');
    const financier = this.requireConnectedRole('FinancierRole');
    if (data.financier && data.financier !== financier) throw new Error('Financier must be the connected Canton party.');
    await this.command({ kind: 'exercise', actingParty: financier, template: 'Financing:FinancingRequest', contractId: request.contractId, choice: 'MakeFinancingOffer', payload: { offerId: `OFFER-${crypto.randomUUID().slice(0, 8)}`, financier, fundingAmount: data.fundingAmount, financingFee: data.financingFee, termDays: data.termDays, offerExpiry: new Date(Date.now() + 604800000).toISOString(), conditions: data.conditions } });
    await this.refresh();
  }
  async acceptFinancingOffer(offerId: string) {
    const offer = this.byTemplate<FinancingOfferPayload>(':Financing:FinancingOffer').find((contract) => contract.payload.offerId === offerId); if (!offer) throw new Error('Financing offer not found on Canton.');
    this.requireConnectedRole('SupplierRole');
    if (offer.payload.supplier !== this.connectedParty) throw new Error('Only the offer supplier can accept it.');
    await this.command({ kind: 'exercise', actingParty: offer.payload.supplier, template: 'Financing:FinancingOffer', contractId: offer.contractId, choice: 'AcceptFinancingOffer', payload: { agreementId: `AGREE-${offer.payload.invoiceId}-${crypto.randomUUID().slice(0, 8)}` } });
    await this.refresh();
  }
  async markAsFunded(agreementId: string) {
    const agreement = this.byTemplate<FinancingAgreementPayload>(':Financing:FinancingAgreement').find((contract) => contract.payload.agreementId === agreementId); if (!agreement) throw new Error('Agreement not found on Canton.');
    this.requireConnectedRole('FinancierRole');
    if (agreement.payload.financier !== this.connectedParty) throw new Error('Only the agreement financier can mark it funded.');
    await this.command({ kind: 'exercise', actingParty: agreement.payload.financier, template: 'Financing:FinancingAgreement', contractId: agreement.contractId, choice: 'MarkAsFunded', payload: {} });
    await this.refresh();
  }
  async settleFinancing(agreementId: string, paymentReference: string) {
    if (!paymentReference.trim()) throw new Error('Enter the real payment reference before recording settlement.');
    const agreement = this.byTemplate<FinancingAgreementPayload>(':Financing:FinancingAgreement').find((contract) => contract.payload.agreementId === agreementId); if (!agreement) throw new Error('Agreement not found on Canton.');
    this.requireConnectedRole('BuyerRole');
    if (agreement.payload.buyer !== this.connectedParty) throw new Error('Only the agreement buyer can settle it.');
    await this.command({ kind: 'exercise', actingParty: agreement.payload.buyer, template: 'Financing:FinancingAgreement', contractId: agreement.contractId, choice: 'SettleFinancing', payload: { settlementAmount: agreement.payload.invoiceAmount, paymentReference } });
    await this.refresh();
    const invoice = this.getInvoice(agreement.payload.invoiceId);
    if (invoice && invoice.payload.status === 'InvoiceFinanced') {
      await this.command({ kind: 'exercise', actingParty: agreement.payload.buyer, template: 'Invoice:Invoice', contractId: invoice.cid, choice: 'CloseInvoiceAsSettled', payload: {} });
      await this.refresh();
    }
  }
}

export const tradeStateStore = new TradeStateStore();
export function useTradeStore() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const unsubscribe = tradeStateStore.subscribe(() => setVersion((version) => version + 1));
    tradeStateStore.initialize();
    void tradeStateStore.restoreConnection();
    return unsubscribe;
  }, []);
  return tradeStateStore;
}
