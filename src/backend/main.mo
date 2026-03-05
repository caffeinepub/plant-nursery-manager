import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Migration "migration";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

(with migration = Migration.run)
actor {
  var accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type UserProfile = {
    name : Text;
    role : Text;
  };

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
    billingNumber : Text;
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

  type PriorityRequestCreate = {
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

  let userProfiles = Map.empty<Principal, UserProfile>();
  let inventory = Map.empty<Text, InventoryItem>();
  let stockMovements = Map.empty<Text, [StockMovement]>();
  let expenditures = Map.empty<Text, Expenditure>();
  let persistentSales = List.empty<SalesRecord>();
  let invoices = Map.empty<Nat, Invoice>();

  let priorityRequests = List.empty<PriorityRequest>();
  var nextInvoiceNumber = 1;
  var billingCounter = 1;
  var nextPriorityRequestId = 1;

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

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func assignRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func getMyRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func addSale(sale : SalesRecord) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add sales");
    };

    for (item in sale.items.values()) {
      switch (inventory.get(item.plantName)) {
        case (null) { () };
        case (?inventoryItem) {
          let newInventoryItem = {
            inventoryItem with
            currentStock = if (inventoryItem.currentStock >= item.quantity) {
              inventoryItem.currentStock - item.quantity;
            } else { 0 };
          };
          inventory.add(item.plantName, newInventoryItem);
        };
      };
    };

    let billingNumber = "INV-" # billingCounter.toText();
    let updatedSale = { sale with billingNumber };
    persistentSales.add(updatedSale);
    billingCounter += 1;

    billingNumber;
  };

  public query ({ caller }) func getSales() : async [SalesRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales");
    };
    persistentSales.toArray();
  };

  public query ({ caller }) func getSalesByPlant(plantName : Text, startDate : Text, endDate : Text) : async (Nat, Nat) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales");
    };

    var totalQuantity = 0;
    var totalRevenue = 0;

    persistentSales.values().forEach(
      func(sale) {
        if (sale.date >= startDate and sale.date <= endDate) {
          for (item in sale.items.values()) {
            if (item.plantName == plantName) {
              totalQuantity += item.quantity;
              totalRevenue += item.quantity * item.unitPrice;
            };
          };
        };
      }
    );
    (totalQuantity, totalRevenue);
  };

  public shared ({ caller }) func addInventoryItem(item : InventoryItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add inventory items");
    };
    inventory.add(item.plantName, item);
  };

  public shared ({ caller }) func deleteInventoryItem(plantName : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete inventory items");
    };
    if (not inventory.containsKey(plantName)) {
      Runtime.trap("Inventory item not found");
    };
    inventory.remove(plantName);
  };

  public shared ({ caller }) func updateInventoryItem(plantName : Text, updatedItem : InventoryItem) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can update inventory items");
    };

    let existingItem = inventory.get(plantName);

    switch (existingItem) {
      case (null) { Runtime.trap("Inventory item not found") };
      case (?_) {
        inventory.add(plantName, updatedItem);
      };
    };
  };

  public query ({ caller }) func getInventory() : async [InventoryItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inventory");
    };
    inventory.values().toArray();
  };

  public shared ({ caller }) func recordStockMovement(plantName : Text, movement : StockMovement) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update stock movements");
    };

    let existingMovements = switch (stockMovements.get(plantName)) {
      case (null) { [] };
      case (?movements) { movements };
    };
    let newMovements = existingMovements.concat([movement]);
    stockMovements.add(plantName, newMovements);

    switch (inventory.get(plantName)) {
      case (null) {
        let newItem : InventoryItem = {
          plantName;
          category = "Unknown";
          unit = "Unknown";
          currentStock = movement.quantity;
          costPrice = 0;
          sellingPrice = 0;
        };
        inventory.add(plantName, newItem);
      };
      case (?existingItem) {
        let updatedStock = switch (movement.reason) {
          case (#purchase) { existingItem.currentStock + movement.quantity };
          case (#adjustment) { if (existingItem.currentStock >= movement.quantity) { existingItem.currentStock - movement.quantity } else { 0 } };
          case (#loss) { if (existingItem.currentStock >= movement.quantity) { existingItem.currentStock - movement.quantity } else { 0 } };
          case (#sale) { if (existingItem.currentStock >= movement.quantity) { existingItem.currentStock - movement.quantity } else { 0 } };
        };
        let updatedItem = {
          existingItem with currentStock = updatedStock;
        };
        inventory.add(plantName, updatedItem);
      };
    };
  };

  public query ({ caller }) func getStockMovements(plantName : Text) : async [StockMovement] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stock movements");
    };
    switch (stockMovements.get(plantName)) {
      case (null) { [] };
      case (?movements) { movements };
    };
  };

  public shared ({ caller }) func addExpenditure(exp : Expenditure) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add expenditures");
    };
    expenditures.add(exp.date, exp);
  };

  public query ({ caller }) func getAllExpenditures() : async [Expenditure] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenditures");
    };
    expenditures.values().toArray().sort();
  };

  public shared ({ caller }) func createInvoice(invoice : Invoice) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create invoices");
    };
    let invoiceNumber = nextInvoiceNumber;
    let newInvoice = { invoice with invoiceNumber };
    invoices.add(invoiceNumber, newInvoice);
    nextInvoiceNumber += 1;
    invoiceNumber;
  };

  public query ({ caller }) func getInvoice(invoiceNumber : Nat) : async Invoice {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view invoices");
    };
    switch (invoices.get(invoiceNumber)) {
      case (null) { Runtime.trap("Invoice not found") };
      case (?invoice) { invoice };
    };
  };

  public shared ({ caller }) func addPriorityRequest(request : PriorityRequestCreate) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add priority requests");
    };

    let newRequest : PriorityRequest = {
      id = nextPriorityRequestId;
      customerName = request.customerName;
      customerPhone = request.customerPhone;
      plantName = request.plantName;
      plantVariety = request.plantVariety;
      quantity = request.quantity;
      requestDate = request.requestDate;
      wantedDate = request.wantedDate;
      status = request.status;
      deliveryDate = request.deliveryDate;
      notes = request.notes;
    };

    priorityRequests.add(newRequest);
    nextPriorityRequestId += 1;
    newRequest.id;
  };

  public query ({ caller }) func getPriorityRequests() : async [PriorityRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view priority requests");
    };
    priorityRequests.toArray();
  };

  public shared ({ caller }) func updatePriorityRequestStatus(id : Nat, status : PriorityRequestStatus, deliveryDate : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update priority requests");
    };

    var index = 0;
    var foundIndex : ?Nat = null;
    let requests = priorityRequests.toArray();
    if (requests.size() > 0) {
      while (foundIndex == null and index < requests.size()) {
        if (requests[index].id == id) {
          foundIndex := ?index;
        } else {
          index += 1;
        };
      };
    };

    switch (foundIndex) {
      case (?found) {
        let updatedRequests = requests.concat([{ requests[found] with status = status; deliveryDate = deliveryDate }]);
        priorityRequests.clear();
        priorityRequests.addAll(updatedRequests.values());
      };
      case (null) { () };
    };
  };

  public shared ({ caller }) func deleteSale(billingNumber : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete sales");
    };

    let filteredSales = persistentSales.filter(
      func(sale) {
        sale.billingNumber != billingNumber;
      }
    );

    persistentSales.clear();
    persistentSales.addAll(filteredSales.values());
  };
};
