export enum TransactionStatus {
  Queued = 'queued',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum ExtensionType {
  CsvUpload = 'csv-upload',
  QuickOrder = 'quick-order',
  ShoppingList = 'shopping-list',
  CustomerPermission = 'customer-permission',
  Quotation = 'quotation',
  FinanceCredit = 'finance-credit',
  BlockCheckout = 'block-checkout',
}

export enum TranslationType {
  CsvUpload = 'csv-upload',
  QuickOrder = 'quick-order',
  CustomerPermission = 'customer-permission',
  ShoppingList = 'shopping-list',
  Quotation = 'quotation',
  FinanceCredit = 'finance-credit',
  OrderHistory = 'order-history',
  BlockCheckout = 'block-checkout',
}

export enum RoleType {
  OrderingOnly = 'Ordering only',
  LocationAdmin = 'Location admin',
}

export enum ShoppingListStatus {
  Draft = 'draft',
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum QuoteStatus {
  UnderReviewFirstState = 1,
  UnderReviewSecondState = 2,
  PriceProvided = 3,
  Accepted = 4,
  Rejected = 5,
  Expired = 6,
  DealClosed = 7,
}

export enum TransactionOperationType {
  Reimbursed = 'reimbursed',
  Purchased ='purchased',
  Reverted = 'reverted',
}

export enum Roles{
  Admin = 'admin',
  Member = 'member',
}

export enum Permissions {
  ReadMembers = 'read_members',
  WriteMembers = 'write_members',
  ReadRoles = 'read_roles',
  WriteRoles = 'write_roles',
}

export enum QuantityErrorType {
  OutOfRangeAndStep = 'out_of_range_and_step',
  BelowMinAndStep = 'below_min_and_step',
  ExceedInventory = 'exceed_inventory',
}

export enum OrderPaymentStatus {
  Paid = 'PAID',
  Pending = 'PENDING',
  Authorized = 'AUTHORIZED',
  PartiallyPaid = 'PARTIALLY_PAID',
  PartiallyRefunded = 'PARTIALLY_REFUNDED',
  Refunded = 'REFUNDED',
  Voided = 'VOIDED',
  Expired = 'EXPIRED',
}

export enum FinancialViewMode {
  Individual = 'individual',
  Location = 'location',
}

export enum CsvPollingStatus {
  Failed = 'FAILED',
}

export enum CustomerPermission {
  ReadAllShoppingList = 'read_shopping_list',
}
