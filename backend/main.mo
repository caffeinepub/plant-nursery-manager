import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Order "mo:core/Order";
import Iter "mo:core/Iter";



actor {
  type SaleItem = {
    plantName : Text;
    quantity : Nat;
    unitPrice : Nat;
  };

  type SalesRecord = {
    date : Text;
    items : [SaleItem];
    totalAmount : Nat;
    paymentMethod : PaymentMethod;
    customerName : ?Text;
    customerMobile : ?Text;
    customerPhoto : ?Text;
  };

  type PaymentMethod = {
    #cash;
    #card;
    #upi;
  };

  type InventoryItem = {
    plantName : Text;
    category : Text;
    unit : Text;
    stockQuantity : Nat;
    costPrice : Nat;
    sellingPrice : Nat;
  };

  type StockMovement = {
    date : Text;
    quantity : Nat;
    reason : MovementReason;
    notes : Text;
  };

  type MovementReason = {
    #purchase;
    #sale;
    #loss;
    #adjustment;
  };

  type Expenditure = {
    date : Text;
    category : ExpenditureCategory;
    description : Text;
    amount : Nat;
  };

  type ExpenditureCategory = {
    #rent;
    #labour;
    #supplies;
    #transport;
    #utilities;
    #other;
  };

  type Invoice = {
    invoiceNumber : Nat;
    date : Text;
    customerName : Text;
    customerPhone : Text;
    lineItems : [SaleItem];
    subtotal : Nat;
    discount : Nat;
    tax : Nat;
    grandTotal : Nat;
    paymentStatus : PaymentStatus;
  };

  type PaymentStatus = {
    #paid;
    #unpaid;
  };

  type ProfitAnalysis = {
    totalRevenue : Nat;
    totalExpenditure : Nat;
    grossProfit : Nat;
    netProfit : Nat;
  };

  let salesRecords = Map.empty<Text, SalesRecord>();
  let inventory = Map.empty<Text, InventoryItem>();
  let stockMovements = Map.empty<Text, [StockMovement]>();
  let expenditures = Map.empty<Text, Expenditure>();
  let invoices = Map.empty<Nat, Invoice>();

  var nextInvoiceNumber = 1;

  module SalesRecord {
    public func compare(a : SalesRecord, b : SalesRecord) : Order.Order {
      Text.compare(a.date, b.date);
    };
  };

  module Expenditure {
    public func compare(a : Expenditure, b : Expenditure) : Order.Order {
      Text.compare(a.date, b.date);
    };
  };

  public shared ({ caller }) func addSalesRecord(record : SalesRecord) : async () {
    salesRecords.add(record.date, record);
  };

  public query ({ caller }) func getSalesRecord(date : Text) : async SalesRecord {
    switch (salesRecords.get(date)) {
      case (null) { Runtime.trap("Sales record not found") };
      case (?record) { record };
    };
  };

  public shared ({ caller }) func addInventoryItem(item : InventoryItem) : async () {
    inventory.add(item.plantName, item);
  };

  public shared ({ caller }) func updateStockMovement(plantName : Text, movement : StockMovement) : async () {
    let existingMovements = switch (stockMovements.get(plantName)) {
      case (null) { [] };
      case (?movements) { movements };
    };
    let newMovements = existingMovements.concat([movement]);
    stockMovements.add(plantName, newMovements);
  };

  public shared ({ caller }) func addExpenditure(exp : Expenditure) : async () {
    expenditures.add(exp.date, exp);
  };

  public shared ({ caller }) func createInvoice(invoice : Invoice) : async Nat {
    let invoiceNumber = nextInvoiceNumber;
    let newInvoice = { invoice with invoiceNumber };
    invoices.add(invoiceNumber, newInvoice);
    nextInvoiceNumber += 1;
    invoiceNumber;
  };

  public query ({ caller }) func getInvoice(invoiceNumber : Nat) : async Invoice {
    switch (invoices.get(invoiceNumber)) {
      case (null) { Runtime.trap("Invoice not found") };
      case (?invoice) { invoice };
    };
  };

  public query ({ caller }) func getAllSalesRecords() : async [SalesRecord] {
    salesRecords.values().toArray().sort();
  };

  public query ({ caller }) func getAllExpenditures() : async [Expenditure] {
    expenditures.values().toArray().sort();
  };

  public query ({ caller }) func getInventory() : async [InventoryItem] {
    inventory.values().toArray();
  };

  public query ({ caller }) func getStockMovements(plantName : Text) : async [StockMovement] {
    switch (stockMovements.get(plantName)) {
      case (null) { [] };
      case (?movements) { movements };
    };
  };
};
