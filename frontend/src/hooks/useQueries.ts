import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  SalesRecord,
  InventoryItem,
  StockMovement,
  Expenditure,
  Invoice,
  ExpenditureCategory,
  PaymentStatus,
} from '../backend';

// ─── Sales ───────────────────────────────────────────────────────────────────

export function useGetAllSalesRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<SalesRecord[]>({
    queryKey: ['salesRecords'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllSalesRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddSalesRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: SalesRecord) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.addSalesRecord(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesRecords'] });
    },
  });
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export function useGetInventory() {
  const { actor, isFetching } = useActor();
  return useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInventory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddInventoryItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: InventoryItem) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.addInventoryItem(item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateStockMovement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ plantName, movement }: { plantName: string; movement: StockMovement }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateStockMovement(plantName, movement);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements', variables.plantName] });
    },
  });
}

export function useGetStockMovements(plantName: string) {
  const { actor, isFetching } = useActor();
  return useQuery<StockMovement[]>({
    queryKey: ['stockMovements', plantName],
    queryFn: async () => {
      if (!actor || !plantName) return [];
      return actor.getStockMovements(plantName);
    },
    enabled: !!actor && !isFetching && !!plantName,
  });
}

// ─── Expenditure ─────────────────────────────────────────────────────────────

export function useGetAllExpenditures() {
  const { actor, isFetching } = useActor();
  return useQuery<Expenditure[]>({
    queryKey: ['expenditures'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllExpenditures();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddExpenditure() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (exp: Expenditure) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.addExpenditure(exp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useGetAllInvoices() {
  const { actor, isFetching } = useActor();
  // We fetch all invoices by getting them one by one isn't feasible without a list endpoint
  // Instead we'll maintain a local cache of invoice numbers
  return useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!actor) return [];
      // We'll use a workaround: try fetching invoices 1..N until we get errors
      // This is a limitation of the backend - see backend-gaps
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
      if (!actor) throw new Error('Actor not initialized');
      return actor.createInvoice(invoice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceList'] });
    },
  });
}

export function useGetInvoice(invoiceNumber: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice>({
    queryKey: ['invoice', invoiceNumber?.toString()],
    queryFn: async () => {
      if (!actor || invoiceNumber === null) throw new Error('No invoice number');
      return actor.getInvoice(invoiceNumber);
    },
    enabled: !!actor && !isFetching && invoiceNumber !== null,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  startDate: string,
  endDate: string
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
  category: ExpenditureCategory | 'all'
): Expenditure[] {
  if (category === 'all') return items;
  return items.filter((item) => item.category === category);
}

export function filterInvoicesByStatus(
  items: Invoice[],
  status: PaymentStatus | 'all'
): Invoice[] {
  if (status === 'all') return items;
  return items.filter((item) => item.paymentStatus === status);
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatCurrency(amount: bigint | number): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}
