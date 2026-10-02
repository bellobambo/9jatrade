// TypeScript representations matching the Daml contracts in:
// - Types.daml
// - Registration.daml
// - Invoice.daml
// - Financing.daml

export type CompanyRole = 'SupplierRole' | 'BuyerRole' | 'FinancierRole';

export type InvoiceStatus =
  | 'InvoiceDraft'
  | 'InvoiceSubmitted'
  | 'InvoiceConfirmed'
  | 'InvoiceDelivered'
  | 'InvoiceFinanced'
  | 'InvoiceSettled'
  | 'InvoiceRejected'
  | 'InvoiceDisputed';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  itemTotal: number;
}

export interface DocumentEvidence {
  docType: 'PurchaseOrder' | 'InvoicePDF' | 'DeliveryNote' | 'Waybill' | 'InspectionReport';
  documentHash: string; // SHA-256 hash
  uriOrRef: string;
}

export type DisputeType =
  | { tag: 'AmountMismatch' }
  | { tag: 'DeliveryIncomplete' }
  | { tag: 'QualityIssue' }
  | { tag: 'OtherDispute'; value: string };

// Daml Template Payloads
export interface CompanyProfilePayload {
  operator: string;
  companyParty: string;
  companyName: string;
  businessLocation: string;
  cacOrRegistrationNumber: string;
  role: CompanyRole;
  roleCode: number;
  isVerified: boolean;
}

export interface RegistrationRequestPayload {
  operator: string;
  applicantParty: string;
  companyName: string;
  businessLocation: string;
  cacOrRegistrationNumber: string;
  requestedRole: CompanyRole;
  roleCode: number;
}

export interface InvoicePayload {
  invoiceId: string;
  supplier: string;
  buyer: string;
  operator: string;
  amount: number;
  currency: string;
  issueDate: string; // ISO timestamp
  dueDate: string;   // ISO timestamp
  description: string;
  items: InvoiceItem[];
  supportingDocuments: DocumentEvidence[];
  status: InvoiceStatus;
  correctionNotes?: string | null;
}

export interface BuyerConfirmationPayload {
  invoiceId: string;
  supplier: string;
  buyer: string;
  operator: string;
  amount: number;
  currency: string;
  dueDate: string;
  confirmedAt: string;
  confirmationNotes: string;
}

export interface DeliveryConfirmationPayload {
  invoiceId: string;
  supplier: string;
  buyer: string;
  operator: string;
  deliveredAt: string;
  fulfillmentNotes: string;
  evidence: DocumentEvidence;
}

export interface InvoiceDisputePayload {
  invoiceId: string;
  initiator: string;
  counterparty: string;
  operator: string;
  disputeType: DisputeType;
  evidenceNotes: string;
  resolved: boolean;
}

export interface FinancingRequestPayload {
  requestId: string;
  invoiceId: string;
  invoiceCid: string;
  supplier: string;
  buyer: string;
  operator: string;
  eligibleFinanciers: string[];
  invoiceAmount: number;
  maxFundingRequested: number;
  currency: string;
  dueDate: string;
}

export interface FinancingOfferPayload {
  offerId: string;
  requestId: string;
  invoiceId: string;
  invoiceCid: string;
  financier: string;
  supplier: string;
  buyer: string;
  operator: string;
  invoiceAmount: number;
  fundingAmount: number;
  financingFee: number;
  totalRepayment: number;
  currency: string;
  termDays: number;
  offerExpiry: string;
  invoiceDueDate: string;
  conditions: string;
}

export interface FinancingBidNoticePayload {
  requestId: string;
  invoiceId: string;
  offerId: string;
  financier: string;
  supplier: string;
  eligibleFinanciers: string[];
  operator: string;
  submittedAt: string;
}

export interface FinancingAgreementPayload {
  agreementId: string;
  invoiceId: string;
  supplier: string;
  buyer: string;
  financier: string;
  operator: string;
  invoiceAmount: number;
  fundingAmount: number;
  financingFee: number;
  totalRepaymentToFinancier: number;
  supplierBalanceDue: number;
  currency: string;
  dueDate: string;
  isFunded: boolean;
  isSettled: boolean;
}

export interface SettlementRecordPayload {
  agreementId: string;
  invoiceId: string;
  supplier: string;
  buyer: string;
  financier: string;
  operator: string;
  totalSettledAmount: number;
  financierPayout: number;
  supplierRemainderPayout: number;
  currency: string;
  settledAt: string;
  paymentReference: string;
}

// Canton Contract wrapper returned by Ledger API
export interface CantonContract<T> {
  contractId: string;
  templateId: string;
  payload: T;
  signatories?: string[];
  observers?: string[];
}
