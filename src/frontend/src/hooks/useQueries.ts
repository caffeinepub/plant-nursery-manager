import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Expenditure,
  ExpenditureCategory,
  InventoryItem,
  Invoice,
  PaymentStatus,
  PriorityRequest,
  PriorityRequestCreate,
  SalesRecord,
  StockMovement,
  UserProfile,
} from "../backend";
import type { PriorityRequestStatus, UserRole } from "../backend";
import { useActor } from "./useActor";

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Role ─────────────────────────────────────────────────────────────────────

export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserRole>({
    queryKey: ["callerUserRole"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getMyRole() as Promise<UserRole>;
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

// Alias for consistency
export const useGetMyRole = useGetCallerUserRole;

export function useAssignRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: UserRole }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.assignRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
    },
  });
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export function useGetAllSalesRecords() {
  const { actor, isFetching } = useActor();

  return useQuery<SalesRecord[]>({
    queryKey: ["salesRecords"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const records = await actor.getSales();
      return [...records].sort((a, b) => {
        if (b.date > a.date) return 1;
        if (b.date < a.date) return -1;
        return 0;
      });
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}

// Alias
export const useGetSales = useGetAllSalesRecords;

export function useAddSalesRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: SalesRecord) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addSale(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesRecords"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// Alias
export const useAddSale = useAddSalesRecord;

export function useDeleteSalesRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billingNumber: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteSale(billingNumber);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesRecords"] });
    },
  });
}

// Alias
export const useDeleteSale = useDeleteSalesRecord;

export function useGetSalesByPlant(
  plantName: string,
  startDate: string,
  endDate: string,
  enabled = true,
) {
  const { actor, isFetching } = useActor();

  return useQuery<[bigint, bigint]>({
    queryKey: ["salesByPlant", plantName, startDate, endDate],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getSalesByPlant(plantName, startDate, endDate);
    },
    enabled: !!actor && !isFetching && !!plantName && enabled,
  });
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export function useGetInventory() {
  const { actor, isFetching } = useActor();

  return useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getInventory();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}

export function useAddInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: InventoryItem) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addInventoryItem(item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useRecordStockMovement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      plantName,
      movement,
    }: {
      plantName: string;
      movement: StockMovement;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.recordStockMovement(plantName, movement);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({
        queryKey: ["stockMovements", variables.plantName],
      });
    },
  });
}

// Alias for backward compatibility with old name used in Inventory.tsx
export const useUpdateStockMovement = useRecordStockMovement;

export function useGetStockMovements(plantName: string) {
  const { actor, isFetching } = useActor();

  return useQuery<StockMovement[]>({
    queryKey: ["stockMovements", plantName],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getStockMovements(plantName);
    },
    enabled: !!actor && !isFetching && !!plantName,
  });
}

// ─── Expenditure ──────────────────────────────────────────────────────────────

export function useGetAllExpenditures() {
  const { actor, isFetching } = useActor();

  return useQuery<Expenditure[]>({
    queryKey: ["expenditures"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getAllExpenditures();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias
export const useGetExpenditures = useGetAllExpenditures;

export function useAddExpenditure() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exp: Expenditure) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addExpenditure(exp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useGetAllInvoices() {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createInvoice(invoice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useGetInvoice(invoiceNumber: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice>({
    queryKey: ["invoice", invoiceNumber?.toString()],
    queryFn: async () => {
      if (!actor || invoiceNumber === null)
        throw new Error("No invoice number");
      return actor.getInvoice(invoiceNumber);
    },
    enabled: !!actor && !isFetching && invoiceNumber !== null,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatCurrency(amount: bigint | number): string {
  const num = typeof amount === "bigint" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  startDate: string,
  endDate: string,
): T[] {
  if (!startDate && !endDate) return items;
  return items.filter((item) => {
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });
}

export function filterExpendituresByCategory(
  items: Expenditure[],
  category: ExpenditureCategory | "all",
): Expenditure[] {
  if (category === "all") return items;
  return items.filter((item) => item.category === category);
}

export function filterInvoicesByStatus(
  items: Invoice[],
  status: PaymentStatus | "all",
): Invoice[] {
  if (status === "all") return items;
  return items.filter((item) => item.paymentStatus === status);
}

// ─── Priority Requests ────────────────────────────────────────────────────────

export function useGetPriorityRequests() {
  const { actor, isFetching } = useActor();

  return useQuery<PriorityRequest[]>({
    queryKey: ["priorityRequests"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPriorityRequests();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}

export function useAddPriorityRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: PriorityRequestCreate) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addPriorityRequest(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priorityRequests"] });
    },
  });
}

// ─── Inventory Mutations ──────────────────────────────────────────────────────

export function useUpdateInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      plantName,
      updatedItem,
    }: {
      plantName: string;
      updatedItem: InventoryItem;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateInventoryItem(plantName, updatedItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeleteInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plantName: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteInventoryItem(plantName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdatePriorityRequestStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      deliveryDate,
    }: {
      id: bigint;
      status: PriorityRequestStatus;
      deliveryDate: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updatePriorityRequestStatus(id, status, deliveryDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priorityRequests"] });
    },
  });
}
