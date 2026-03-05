import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";

module {
  type UserProfile = {
    name : Text;
    role : Text;
  };

  type SaleItem = {
    plantName : Text;
    quantity : Nat;
    unitPrice : Nat;
  };

  type PaymentMethod = {
    #cash;
    #card;
    #upi;
  };

  type SalesRecord = {
    date : Text;
    items : [SaleItem];
    totalAmount : Nat;
    paymentMethod : PaymentMethod;
    customerName : ?Text;
    customerMobile : ?Text;
    customerPhoto : ?Text;
    billingNumber : Text;
  };

  type InventoryItem = {
    plantName : Text;
    category : Text;
    unit : Text;
    currentStock : Nat;
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

  type PriorityRequest = {
    id : Nat;
    customerName : Text;
    customerPhone : Text;
    plantName : Text;
    plantVariety : Text;
    quantity : Nat;
    requestDate : Text;
    wantedDate : Text;
    status : PriorityRequestStatus;
    deliveryDate : ?Text;
    notes : ?Text;
  };

  type PriorityRequestStatus = {
    #pending;
    #fulfilled;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    inventory : Map.Map<Text, InventoryItem>;
    stockMovements : Map.Map<Text, [StockMovement]>;
    expenditures : Map.Map<Text, Expenditure>;
    persistentSales : List.List<SalesRecord>;
    invoices : Map.Map<Nat, Invoice>;
    priorityRequests : List.List<PriorityRequest>;
    nextInvoiceNumber : Nat;
    billingCounter : Nat;
    nextPriorityRequestId : Nat;
  };

  public func run(old : OldActor) : OldActor {
    let nonZeroPersistentSales = old.persistentSales.filter(
      func(sale) { if (sale.customerName != null) { Runtime.trap("SalesRecord.customerName type incompatibility") } else { true } }
    );
    { old with persistentSales = nonZeroPersistentSales };
  };
};
