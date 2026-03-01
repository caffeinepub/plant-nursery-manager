import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface SalesRecord {
    customerName?: string;
    paymentMethod: PaymentMethod;
    customerPhoto?: string;
    date: string;
    customerMobile?: string;
    totalAmount: bigint;
    items: Array<SaleItem>;
    billingNumber: string;
}
export interface Invoice {
    tax: bigint;
    customerName: string;
    lineItems: Array<SaleItem>;
    paymentStatus: PaymentStatus;
    customerPhone: string;
    date: string;
    grandTotal: bigint;
    invoiceNumber: bigint;
    discount: bigint;
    subtotal: bigint;
}
export interface Expenditure {
    date: string;
    description: string;
    category: ExpenditureCategory;
    amount: bigint;
}
export interface InventoryItem {
    plantName: string;
    unit: string;
    sellingPrice: bigint;
    category: string;
    currentStock: bigint;
    costPrice: bigint;
}
export interface PriorityRequestCreate {
    customerName: string;
    status: PriorityRequestStatus;
    plantName: string;
    customerPhone: string;
    plantVariety: string;
    deliveryDate?: string;
    notes?: string;
    quantity: bigint;
    requestDate: string;
    wantedDate: string;
}
export interface PriorityRequest {
    id: bigint;
    customerName: string;
    status: PriorityRequestStatus;
    plantName: string;
    customerPhone: string;
    plantVariety: string;
    deliveryDate?: string;
    notes?: string;
    quantity: bigint;
    requestDate: string;
    wantedDate: string;
}
export interface StockMovement {
    date: string;
    notes: string;
    quantity: bigint;
    reason: MovementReason;
}
export interface UserProfile {
    name: string;
    role: string;
}
export interface SaleItem {
    plantName: string;
    quantity: bigint;
    unitPrice: bigint;
}
export enum ExpenditureCategory {
    other = "other",
    supplies = "supplies",
    labour = "labour",
    rent = "rent",
    transport = "transport",
    utilities = "utilities"
}
export enum MovementReason {
    adjustment = "adjustment",
    loss = "loss",
    sale = "sale",
    purchase = "purchase"
}
export enum PaymentMethod {
    upi = "upi",
    card = "card",
    cash = "cash"
}
export enum PaymentStatus {
    paid = "paid",
    unpaid = "unpaid"
}
export enum PriorityRequestStatus {
    pending = "pending",
    fulfilled = "fulfilled"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addExpenditure(exp: Expenditure): Promise<void>;
    addInventoryItem(item: InventoryItem): Promise<void>;
    addPriorityRequest(request: PriorityRequestCreate): Promise<bigint>;
    addSale(sale: SalesRecord): Promise<string>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignRole(user: Principal, role: UserRole): Promise<void>;
    createInvoice(invoice: Invoice): Promise<bigint>;
    deleteInventoryItem(plantName: string): Promise<void>;
    deleteSale(billingNumber: string): Promise<void>;
    getAllExpenditures(): Promise<Array<Expenditure>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getInventory(): Promise<Array<InventoryItem>>;
    getInvoice(invoiceNumber: bigint): Promise<Invoice>;
    getMyRole(): Promise<UserRole>;
    getPriorityRequests(): Promise<Array<PriorityRequest>>;
    getSales(): Promise<Array<SalesRecord>>;
    getSalesByPlant(plantName: string, startDate: string, endDate: string): Promise<[bigint, bigint]>;
    getStockMovements(plantName: string): Promise<Array<StockMovement>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    recordStockMovement(plantName: string, movement: StockMovement): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateInventoryItem(plantName: string, updatedItem: InventoryItem): Promise<void>;
    updatePriorityRequestStatus(id: bigint, status: PriorityRequestStatus, deliveryDate: string | null): Promise<void>;
}
