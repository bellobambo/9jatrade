'use client';

import { useEffect, useState } from 'react';
import {
  BuyerConfirmationPayload, CompanyProfilePayload, CompanyRole, DeliveryConfirmationPayload,
  DocumentEvidence, FinancingAgreementPayload, FinancingOfferPayload, FinancingRequestPayload,
  InvoiceItem, InvoicePayload, RegistrationRequestPayload, SettlementRecordPayload,
} from '../canton/types';
import { CANTON_CONFIG } from '../canton/config';
import { hasPartyRight, parseLedgerAccessToken } from '../canton/auth';
import { callLedgerApi } from '../canton/ledgerApi';

type LedgerContract<T> = { contractId: string; templateId: string; payload: T };
type CantonCoinHolding = { contractId: string; owner: string; instrumentId: { id: string }; amount: string; locked: boolean };
type SavedLedgerConnection = { party: string; accessToken: string };
const LEDGER_SESSION_STORAGE_KEY = '9jatrade.canton-ledger-connection';

const LEDGER_TEMPLATES = [
  'Registration:CompanyProfile',
  'Registration:RegistrationRequest',
  'Invoice:Invoice',
  'Invoice:BuyerConfirmation',
  'Invoice:DeliveryConfirmation',
  'Financing:FinancingRequest',
  'Financing:FinancingOffer',
  'Financing:FinancingAgreement',
  'Financing:SettlementRecord',
] as const;

function ledgerContracts(value: unknown, result: LedgerContract<Record<string, unknown>>[] = []) {
  if (Array.isArray(value)) value.forEach((item) => ledgerContracts(item, result));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const contractId = typeof record.contractId === 'string' ? record.contractId : record.contract_id;
    const templateId = typeof record.templateId === 'string' ? record.templateId : record.template_id;
    const payload = record.createArgument ?? record.create_arguments ?? record.payload;
    if (typeof contractId === 'string' && typeof templateId === 'string' && payload && typeof payload === 'object') {
      result.push({ contractId, templateId, payload: payload as Record<string, unknown> });
    }
    Object.values(record).forEach((item) => ledgerContracts(item, result));
  }
  return result;
}

function cantonCoinHoldings(value: unknown, result: CantonCoinHolding[] = [], seen = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((item) => cantonCoinHoldings(item, result, seen));
    return result;
  }
  if (!value || typeof value !== 'object') return result;

  const record = value as Record<string, unknown>;
  const contractId = typeof record.contractId === 'string' ? record.contractId : null;
  const interfaceViews = record.interfaceViews;
  if (contractId && Array.isArray(interfaceViews) && !seen.has(contractId)) {
    for (const item of interfaceViews) {
      if (!item || typeof item !== 'object') continue;
      const view = (item as Record<string, unknown>).viewValue;
      if (!view || typeof view !== 'object') continue;
      const holding = view as Record<string, unknown>;
      const owner = holding.owner;
      const amount = holding.amount;
      const instrumentId = holding.instrumentId;
      if (
        typeof owner === 'string'
        && (typeof amount === 'string' || typeof amount === 'number')
        && instrumentId && typeof instrumentId === 'object'
        && typeof (instrumentId as Record<string, unknown>).id === 'string'
      ) {
        const instrument = instrumentId as Record<string, unknown>;
        if (instrument.id === 'Amulet') {
          result.push({
            contractId,
            owner,
            instrumentId: { id: 'Amulet' },
            amount: String(amount),
            locked: Boolean(holding.lock && typeof holding.lock === 'object'),
          });
          seen.add(contractId);
          break;
        }
      }
    }
  }

  Object.values(record).forEach((nested) => cantonCoinHoldings(nested, result, seen));
  return result;
}

function sumDecimalStrings(values: string[]): string {
  const parsed = values.map((value) => {
    const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
    if (!match) throw new Error('The Ledger API returned a malformed Canton Coin amount.');
    return { negative: match[1] === '-', integer: match[2], fraction: match[3] ?? '' };
  });
  const precision = Math.max(0, ...parsed.map(({ fraction }) => fraction.length));
  const total = parsed.reduce((sum, value) => {
    const magnitude = BigInt(`${value.integer}${value.fraction.padEnd(precision, '0')}`);
    return sum + (value.negative ? -magnitude : magnitude);
  }, BigInt(0));
  const negative = total < BigInt(0);
  const digits = (negative ? -total : total).toString().padStart(precision + 1, '0');
  const integer = precision ? digits.slice(0, -precision) : digits;
  const fraction = precision ? digits.slice(-precision).replace(/0+$/, '') : '';
  return `${negative ? '-' : ''}${integer}${fraction ? `.${fraction}` : ''}`;
}

function formatCcBalance(amount: string): string {
  const [integer, fraction] = amount.split('.');
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${groupedInteger}${fraction ? `.${fraction}` : ''} CC`;
}

const DECIMAL_FIELDS = new Set(['amount', 'quantity', 'unitPrice', 'itemTotal', 'invoiceAmount', 'maxFundingRequested', 'fundingAmount', 'financingFee', 'totalRepayment', 'totalRepaymentToFinancier', 'supplierBalanceDue', 'settlementAmount', 'totalSettledAmount', 'financierPayout', 'supplierRemainderPayout']);
const INTEGER_FIELDS = new Set(['roleCode', 'termDays']);

function ledgerValue(value: unknown, key?: string): unknown {
  if (typeof value === 'number' && key && (DECIMAL_FIELDS.has(key) || INTEGER_FIELDS.has(key))) return String(value);
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
  private accessToken: string | null = null;
  private ledgerUserId: string | null = null;
  private restoringConnection: Promise<void> | null = null;
  private restoreAttempted = false;
  private restoring = false;
  private tokenBalance: string | null = null;
  private tokenBalanceLoading = false;
  private tokenBalanceError: string | null = null;

  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private notify() { this.listeners.forEach((listener) => listener()); }
  getCurrentParty() { return this.connectedParty; }
  getCurrentProfile() { return this.profile; }
  getPendingRegistrationType() { return this.pendingRegistrationType; }
  setPendingRegistrationType(type: 'commercial' | 'financier') { this.pendingRegistrationType = type; this.notify(); }
  getError() { return this.error; }
  isLoading() { return this.loading; }
  isRestoringConnection() { return this.restoring; }
  getTokenBalance() { return this.tokenBalance; }
  isTokenBalanceLoading() { return this.tokenBalanceLoading; }
  getTokenBalanceError() { return this.tokenBalanceError; }

  async connectParty(party: string, accessToken: string) {
    this.loading = true; this.error = null; this.notify();
    try {
      if (!party.trim()) throw new Error('Paste the allocated Canton party ID from the NODERS Wallet.');
      const token = accessToken.trim();
      const claims = parseLedgerAccessToken(token);
      const rights = await callLedgerApi(token, { operation: 'userRights' });
      if (!hasPartyRight(rights, 'CanActAs', party) || !hasPartyRight(rights, 'CanReadAs', party)) {
        throw new Error('This Ledger user does not have both CanActAs and CanReadAs on that party. Check the party ID and rights in the NODERS Console.');
      }
      await callLedgerApi(token, { operation: 'packageStatus', packageId: CANTON_CONFIG.packageId });

      this.accessToken = token;
      this.ledgerUserId = claims.sub;
      this.connectedParty = party;
      this.profile = null;
      this.contracts = [];
      await this.refresh();
      if (this.error) throw new Error(this.error);
      this.saveConnection({ party, accessToken: token });
      void this.refreshTokenBalance();
    } catch (error) {
      const storageError = this.clearSavedConnection();
      this.connectedParty = null;
      this.accessToken = null;
      this.ledgerUserId = null;
      this.profile = null;
      this.contracts = [];
      this.tokenBalance = null;
      this.tokenBalanceLoading = false;
      this.tokenBalanceError = null;
      const message = error instanceof Error ? error.message : 'Unable to connect to the Canton Ledger API.';
      this.error = storageError ? `${message} ${storageError}` : message;
      throw new Error(this.error);
    } finally {
      this.loading = false; this.notify();
    }
  }

  async restoreConnection() {
    if (this.connectedParty || this.restoreAttempted) return;
    if (!this.restoringConnection) {
      this.restoreAttempted = true;
      this.restoring = true;
      this.restoringConnection = (async () => {
        try {
          const saved = this.readSavedConnection();
          if (saved) await this.connectParty(saved.party, saved.accessToken);
        } catch (error) {
          const storageError = this.clearSavedConnection();
          const message = error instanceof Error ? error.message : 'Unable to restore the Ledger API connection.';
          this.error = storageError ? `${message} ${storageError}` : message;
        } finally {
          this.restoring = false;
          this.notify();
        }
      })().finally(() => {
        this.restoringConnection = null;
      });
    }
    await this.restoringConnection;
  }

  disconnectParty() {
    const storageError = this.clearSavedConnection();
    this.connectedParty = null;
    this.accessToken = null;
    this.ledgerUserId = null;
    this.profile = null;
    this.contracts = [];
    this.tokenBalance = null;
    this.tokenBalanceError = null;
    this.error = storageError;
    this.notify();
  }

  private readSavedConnection(): SavedLedgerConnection | null {
    let serialized: string | null;
    try {
      serialized = window.localStorage.getItem(LEDGER_SESSION_STORAGE_KEY);
    } catch {
      throw new Error('Browser local storage is unavailable. Enable site storage to restore the Ledger connection after reload.');
    }
    if (!serialized) return null;

    let saved: unknown;
    try {
      saved = JSON.parse(serialized) as unknown;
    } catch {
      this.clearSavedConnection();
      throw new Error('The saved Ledger connection is invalid. Reconnect with a current access token.');
    }
    if (
      !saved
      || typeof saved !== 'object'
      || !('party' in saved)
      || !('accessToken' in saved)
      || typeof saved.party !== 'string'
      || typeof saved.accessToken !== 'string'
    ) {
      this.clearSavedConnection();
      throw new Error('The saved Ledger connection is invalid. Reconnect with a current access token.');
    }
    return { party: saved.party, accessToken: saved.accessToken };
  }

  private saveConnection(connection: SavedLedgerConnection) {
    try {
      window.localStorage.setItem(LEDGER_SESSION_STORAGE_KEY, JSON.stringify(connection));
    } catch {
      throw new Error('The Ledger connection succeeded, but this browser could not save it for reloads. Enable local storage and reconnect.');
    }
  }

  private clearSavedConnection(): string | null {
    try {
      window.localStorage.removeItem(LEDGER_SESSION_STORAGE_KEY);
      return null;
    } catch {
      return 'Could not clear the saved Ledger connection from browser local storage.';
    }
  }

  async refreshTokenBalance() {
    if (!this.connectedParty || !this.accessToken) {
      this.tokenBalance = null;
      this.tokenBalanceError = null;
      this.tokenBalanceLoading = false;
      this.notify();
      return;
    }

    const party = this.connectedParty;
    const token = this.accessToken;
    this.tokenBalanceLoading = true;
    this.tokenBalanceError = null;
    this.notify();
    try {
      const ledgerEnd = await callLedgerApi(token, { operation: 'ledgerEnd' });
      if (!ledgerEnd || typeof ledgerEnd !== 'object' || !('offset' in ledgerEnd) || typeof ledgerEnd.offset !== 'number') {
        throw new Error('The Ledger API did not return a valid ledger offset for the Canton Coin balance query.');
      }
      const response = await callLedgerApi(token, {
        operation: 'tokenHoldings',
        party,
        activeAtOffset: ledgerEnd.offset,
      });
      const amounts = cantonCoinHoldings(response)
        .filter((holding) => holding.owner === party && !holding.locked)
        .map((holding) => holding.amount);
      this.tokenBalance = formatCcBalance(sumDecimalStrings(amounts));
    } catch (error) {
      if (this.connectedParty === party && this.accessToken === token) {
        this.tokenBalance = null;
        this.tokenBalanceError = error instanceof Error ? error.message : 'Unable to read Canton Coin holdings.';
      }
    } finally {
      if (this.connectedParty !== party || this.accessToken !== token) return;
      this.tokenBalanceLoading = false;
      this.notify();
    }
  }

  async refresh() {
    if (!this.connectedParty) { this.contracts = []; this.notify(); return; }
    this.loading = true; this.error = null; this.notify();
    try {
      if (!this.accessToken || !this.ledgerUserId) throw new Error('Reconnect with a current Ledger API access token.');
      const party = this.connectedParty;
      this.contracts = await this.readActiveContracts(party);
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

  private async readActiveContracts(party: string) {
    if (!this.accessToken) throw new Error('Reconnect with a current Ledger API access token.');
    const ledgerEnd = await callLedgerApi(this.accessToken, { operation: 'ledgerEnd' });
    if (!ledgerEnd || typeof ledgerEnd !== 'object' || !('offset' in ledgerEnd)) {
      throw new Error('The Ledger API did not return an offset from /v2/state/ledger-end.');
    }

    const activeContracts = await callLedgerApi(this.accessToken, {
      operation: 'activeContracts',
      request: {
        activeAtOffset: ledgerEnd.offset,
        eventFormat: {
          filtersByParty: {
            [party]: {
              cumulative: [{
                identifierFilter: {
                  WildcardFilter: { value: { includeCreatedEventBlob: false } },
                },
              }],
            },
          },
          verbose: true,
        },
      },
    });

    return ledgerContracts(activeContracts).filter((contract) => (
      LEDGER_TEMPLATES.some((template) => contract.templateId.endsWith(`:${template}`))
    ));
  }

  private byTemplate<T>(suffix: string) { return this.contracts.filter((contract) => contract.templateId.endsWith(suffix)).map(asPayload<T>); }
  getCompanyProfiles(role?: CompanyRole) {
    const profiles = this.byTemplate<CompanyProfilePayload>(':Registration:CompanyProfile').map((contract) => contract.payload);
    return role ? profiles.filter((profile) => profile.role === role) : profiles;
  }
  getRegistrationRequests() {
    return this.byTemplate<RegistrationRequestPayload>(':Registration:RegistrationRequest').map((contract) => ({ payload: contract.payload, cid: contract.contractId }));
  }
  getInvoices() {
    const invoices = this.byTemplate<InvoicePayload>(':Invoice:Invoice').map((contract) => ({ payload: contract.payload, cid: contract.contractId }));
    const requests = this.getFinancingRequests();
    const agreements = this.getAgreements();

    // Inject proxy invoices for Financiers who don't have read access to the base Invoice contract
    for (const source of [...requests, ...agreements]) {
      if (!invoices.find(inv => inv.payload.invoiceId === source.invoiceId)) {
        invoices.push({
          cid: 'hidden-invoice-cid',
          payload: {
            invoiceId: source.invoiceId,
            supplier: source.supplier,
            buyer: source.buyer,
            operator: source.operator,
            amount: 'invoiceAmount' in source ? source.invoiceAmount : 0,
            currency: 'currency' in source ? source.currency : 'NGN',
            issueDate: 'dueDate' in source ? source.dueDate : '',
            dueDate: 'dueDate' in source ? source.dueDate : '',
            description: 'Commercial Receivables Financing Request',
            items: [],
            supportingDocuments: [],
            status: 'fundingAmount' in source ? 'InvoiceFinanced' : 'InvoiceConfirmed'
          } as any
        });
      }
    }
    return invoices;
  }
  getInvoice(invoiceId: string) { return this.getInvoices().find((invoice) => invoice.payload.invoiceId === invoiceId); }
  getBuyerConfirmations() { return this.byTemplate<BuyerConfirmationPayload>(':Invoice:BuyerConfirmation').map((contract) => contract.payload); }
  getFinancingRequests() { return this.byTemplate<FinancingRequestPayload>(':Financing:FinancingRequest').map((contract) => contract.payload); }
  getFinancingOffersForInvoice(invoiceId: string) { return this.byTemplate<FinancingOfferPayload>(':Financing:FinancingOffer').filter((contract) => contract.payload.invoiceId === invoiceId).map((contract) => contract.payload); }
  getAgreements() { return this.byTemplate<FinancingAgreementPayload>(':Financing:FinancingAgreement').map((contract) => contract.payload); }
  getSettlementRecords() { return this.byTemplate<SettlementRecordPayload>(':Financing:SettlementRecord').map((contract) => contract.payload); }

  getTrustPassport(invoiceId: string): TrustPassportData | null {
    let invoice = this.getInvoice(invoiceId);
    const request = this.byTemplate<FinancingRequestPayload>(':Financing:FinancingRequest').find((contract) => contract.payload.invoiceId === invoiceId);
    const agreement = this.byTemplate<FinancingAgreementPayload>(':Financing:FinancingAgreement').find((contract) => contract.payload.invoiceId === invoiceId);

    // If the invoice contract is hidden from the current party (e.g. Financier), construct a proxy invoice from the request/agreement.
    if (!invoice && (request || agreement)) {
      const proxySource = request?.payload || agreement?.payload;
      if (proxySource) {
        invoice = {
          cid: 'hidden-invoice-cid',
          payload: {
            invoiceId,
            supplier: proxySource.supplier,
            buyer: proxySource.buyer,
            operator: proxySource.operator,
            amount: 'invoiceAmount' in proxySource ? proxySource.invoiceAmount : 0,
            currency: 'currency' in proxySource ? proxySource.currency : 'NGN',
            issueDate: 'dueDate' in proxySource ? proxySource.dueDate : '',
            dueDate: 'dueDate' in proxySource ? proxySource.dueDate : '',
            description: 'Commercial Receivables Financing Request',
            items: [],
            supportingDocuments: [],
            status: agreement ? 'InvoiceFinanced' : 'InvoiceConfirmed'
          } as any
        };
      }
    }

    if (!invoice) return null;

    const confirmation = this.byTemplate<BuyerConfirmationPayload>(':Invoice:BuyerConfirmation').find((contract) => contract.payload.invoiceId === invoiceId);
    const delivery = this.byTemplate<DeliveryConfirmationPayload>(':Invoice:DeliveryConfirmation').find((contract) => contract.payload.invoiceId === invoiceId);
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
  private async command(body: Record<string, unknown>) {
    if (!this.accessToken || !this.ledgerUserId || !this.connectedParty) {
      throw new Error('Connect to the Canton Ledger API before submitting commands.');
    }
    if (body.actingParty !== this.connectedParty) throw new Error('Canton commands must be submitted by the connected party.');
    const template = String(body.template || '');
    const templateId = `#${CANTON_CONFIG.packageName}:${template}`;
    const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : {};
    const command = body.kind === 'create'
      ? { CreateCommand: { templateId, createArguments: ledgerValue(payload) } }
      : { ExerciseCommand: { templateId, contractId: body.contractId, choice: body.choice, choiceArgument: ledgerValue(payload) } };
    if (body.kind !== 'create' && body.kind !== 'exercise') throw new Error('Unsupported Canton command.');
    return callLedgerApi(this.accessToken, {
      operation: 'submitCommand',
      request: {
        commands: {
          commands: [command],
          commandId: crypto.randomUUID(),
          userId: this.ledgerUserId,
          actAs: [this.connectedParty],
        },
      },
    });
  }

  async createRegistrationRequest(data: { applicantParty: string; companyName: string; businessLocation: string; cacOrRegistrationNumber: string; requestedRole: CompanyRole; roleCode: number }) {
    if (data.applicantParty !== this.connectedParty) throw new Error('Connect the applicant Canton party before submitting registration.');
    if (!CANTON_CONFIG.operatorParty) throw new Error('NEXT_PUBLIC_CANTON_OPERATOR_PARTY is not configured.');
    const requestPayload = { ...data, operator: CANTON_CONFIG.operatorParty };
    await this.command({ kind: 'create', actingParty: data.applicantParty, template: 'Registration:RegistrationRequest', payload: requestPayload });
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
    if (!Number.isFinite(maxFundingRequested) || maxFundingRequested <= 0 || maxFundingRequested > invoice.payload.amount) {
      throw new Error('Requested funding must be greater than zero and no more than the invoice amount.');
    }
    if (!['InvoiceConfirmed', 'InvoiceDelivered'].includes(invoice.payload.status)) {
      throw new Error('The buyer must confirm the invoice before financing can be requested.');
    }
    if (CANTON_CONFIG.financierParties.length === 0) throw new Error('NEXT_PUBLIC_CANTON_FINANCIER_PARTIES is not configured.');
    await this.command({ kind: 'create', actingParty: invoice.payload.supplier, template: 'Financing:FinancingRequest', payload: { requestId: `REQ-${invoiceId}`, invoiceId, invoiceCid: invoice.cid, supplier: invoice.payload.supplier, buyer: invoice.payload.buyer, operator: invoice.payload.operator, eligibleFinanciers: CANTON_CONFIG.financierParties, invoiceAmount: invoice.payload.amount, maxFundingRequested, currency: invoice.payload.currency, dueDate: invoice.payload.dueDate } });
    await this.refresh();
  }
  async makeFinancingOffer(data: { invoiceId: string; financier?: string; fundingAmount: number; financingFee: number; termDays: number; conditions: string }) {
    const request = this.byTemplate<FinancingRequestPayload>(':Financing:FinancingRequest').find((contract) => contract.payload.invoiceId === data.invoiceId); if (!request) throw new Error('Financing request not found on Canton.');
    const financier = this.requireConnectedRole('FinancierRole');
    if (data.financier && data.financier !== financier) throw new Error('Financier must be the connected Canton party.');
    if (!request.payload.eligibleFinanciers.includes(financier)) throw new Error('This financier party is not eligible for the request.');
    if (!Number.isFinite(data.fundingAmount) || data.fundingAmount <= 0 || data.fundingAmount > request.payload.maxFundingRequested) {
      throw new Error('Funding must be greater than zero and no more than the supplier requested.');
    }
    if (!Number.isFinite(data.financingFee) || data.financingFee < 0 || data.fundingAmount + data.financingFee > request.payload.invoiceAmount) {
      throw new Error('Funding plus fee cannot exceed the invoice amount.');
    }
    if (!Number.isInteger(data.termDays) || data.termDays <= 0) throw new Error('Financing term must be a positive whole number of days.');
    await this.command({ kind: 'exercise', actingParty: financier, template: 'Financing:FinancingRequest', contractId: request.contractId, choice: 'MakeFinancingOffer', payload: { offerId: `OFFER-${crypto.randomUUID().slice(0, 8)}`, financier, fundingAmount: data.fundingAmount, financingFee: data.financingFee, termDays: data.termDays, offerExpiry: new Date(Date.now() + 604800000).toISOString(), conditions: data.conditions } });
    await this.refresh();
  }
  async acceptFinancingOffer(offerId: string) {
    // Always re-fetch fresh contracts from the ledger immediately before exercising.
    // The cached contractId can become stale if the FinancingOffer contract was
    // archived and recreated (e.g. another offer cycle or concurrent action) between
    // the last refresh() and the moment the user clicks Accept — causing HTTP 404.
    const freshContracts = await this.readActiveContracts(this.connectedParty!);
    const offer = freshContracts
      .filter((c) => c.templateId.endsWith(':Financing:FinancingOffer'))
      .map(asPayload<FinancingOfferPayload>)
      .find((contract) => contract.payload.offerId === offerId);
    if (!offer) throw new Error('Financing offer not found on Canton. It may have already been accepted, withdrawn, or expired — please refresh and try again.');
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
    void tradeStateStore.restoreConnection();
    return unsubscribe;
  }, []);
  return tradeStateStore;
}
