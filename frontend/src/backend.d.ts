import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface InventoryItem {
    stockQuantity: bigint;
    plantName: string;
    unit: string;
    sellingPrice: bigint;
    category: string;
    costPrice: bigint;
}
export interface Expenditure {
    date: string;
    description: string;
    category: ExpenditureCategory;
    amount: bigint;
}
export interface SalesRecord {
    customerName?: string;
    paymentMethod: PaymentMethod;
    customerPhoto?: string;
    date: string;
    customerMobile?: string;
    totalAmount: bigint;
    items: Array<SaleItem>;
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
export interface StockMovement {
    date: string;
    notes: string;
    quantity: bigint;
    reason: MovementReason;
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
export interface backendInterface {
    addExpenditure(exp: Expenditure): Promise<void>;
    addInventoryItem(item: InventoryItem): Promise<void>;
    addSalesRecord(record: SalesRecord): Promise<void>;
    createInvoice(invoice: Invoice): Promise<bigint>;
    getAllExpenditures(): Promise<Array<Expenditure>>;
    getAllSalesRecords(): Promise<Array<SalesRecord>>;
    getInventory(): Promise<Array<InventoryItem>>;
    getInvoice(invoiceNumber: bigint): Promise<Invoice>;
    getSalesRecord(date: string): Promise<SalesRecord>;
    getStockMovements(plantName: string): Promise<Array<StockMovement>>;
    updateStockMovement(plantName: string, movement: StockMovement): Promise<void>;
}
