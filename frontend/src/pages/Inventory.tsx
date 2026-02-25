import { useState } from 'react';
import { Plus, Package, ArrowUp, ArrowDown, History, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  useGetInventory,
  useAddInventoryItem,
  useUpdateStockMovement,
  useGetStockMovements,
  getTodayString,
  formatCurrency,
} from '../hooks/useQueries';
import { MovementReason } from '../backend';

function StockMovementHistory({ plantName }: { plantName: string }) {
  const { data: movements = [], isLoading } = useGetStockMovements(plantName);

  if (isLoading) return <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>;
  if (movements.length === 0) return <div className="text-center py-4 text-muted-foreground text-sm">No movement history</div>;

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {[...movements].reverse().map((m, idx) => (
        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-sm">
          <div>
            <span className={`font-medium capitalize ${m.reason === MovementReason.purchase ? 'text-primary' : m.reason === MovementReason.sale ? 'text-accent' : 'text-destructive'}`}>
              {m.reason as string}
            </span>
            {m.notes && <span className="text-muted-foreground ml-2">· {m.notes}</span>}
          </div>
          <div className="text-right">
            <span className={`font-semibold ${m.reason === MovementReason.purchase ? 'text-primary' : 'text-accent'}`}>
              {m.reason === MovementReason.purchase ? '+' : '-'}{Number(m.quantity)}
            </span>
            <p className="text-xs text-muted-foreground">{m.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Inventory() {
  const today = getTodayString();
  const [addOpen, setAddOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState('');

  // Add plant form
  const [plantName, setPlantName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  // Movement form
  const [movPlant, setMovPlant] = useState('');
  const [movDate, setMovDate] = useState(today);
  const [movQty, setMovQty] = useState('');
  const [movReason, setMovReason] = useState<MovementReason>(MovementReason.purchase);
  const [movNotes, setMovNotes] = useState('');

  const { data: inventory = [], isLoading } = useGetInventory();
  const addItem = useAddInventoryItem();
  const updateMovement = useUpdateStockMovement();

  const handleAddPlant = async () => {
    if (!plantName || !category || !unit || !stockQuantity || !costPrice || !sellingPrice) return;
    await addItem.mutateAsync({
      plantName,
      category,
      unit,
      stockQuantity: BigInt(Math.round(parseFloat(stockQuantity))),
      costPrice: BigInt(Math.round(parseFloat(costPrice))),
      sellingPrice: BigInt(Math.round(parseFloat(sellingPrice))),
    });
    setAddOpen(false);
    setPlantName(''); setCategory(''); setUnit('');
    setStockQuantity(''); setCostPrice(''); setSellingPrice('');
  };

  const handleMovement = async () => {
    if (!movPlant || !movQty || !movReason) return;
    await updateMovement.mutateAsync({
      plantName: movPlant,
      movement: {
        date: movDate,
        quantity: BigInt(Math.round(parseFloat(movQty))),
        reason: movReason,
        notes: movNotes,
      },
    });
    setMovementOpen(false);
    setMovPlant(''); setMovQty(''); setMovNotes('');
    setMovReason(MovementReason.purchase);
  };

  const stockBadge = (qty: number) => {
    if (qty === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (qty < 10) return <Badge className="bg-accent/10 text-accent border-accent/30 border">{qty}</Badge>;
    return <Badge variant="secondary">{qty}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage plants and stock movements</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUp className="w-4 h-4" />
                Stock Movement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Record Stock Movement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Plant</Label>
                  <Select value={movPlant} onValueChange={setMovPlant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.map((inv) => (
                        <SelectItem key={inv.plantName} value={inv.plantName}>
                          {inv.plantName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" value={movDate} onChange={(e) => setMovDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input type="number" min="1" placeholder="0" value={movQty} onChange={(e) => setMovQty(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Select value={movReason} onValueChange={(v) => setMovReason(v as MovementReason)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MovementReason.purchase}>Purchase (Stock In)</SelectItem>
                      <SelectItem value={MovementReason.sale}>Sale (Stock Out)</SelectItem>
                      <SelectItem value={MovementReason.loss}>Loss / Damage</SelectItem>
                      <SelectItem value={MovementReason.adjustment}>Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Input placeholder="Additional notes..." value={movNotes} onChange={(e) => setMovNotes(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleMovement} disabled={updateMovement.isPending || !movPlant || !movQty}>
                  {updateMovement.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Record Movement'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Plant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add New Plant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Plant Name</Label>
                  <Input placeholder="e.g. Rose Bush" value={plantName} onChange={(e) => setPlantName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Input placeholder="e.g. Flowering" value={category} onChange={(e) => setCategory(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit</Label>
                    <Input placeholder="e.g. pot, kg" value={unit} onChange={(e) => setUnit(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Initial Stock Quantity</Label>
                  <Input type="number" min="0" placeholder="0" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cost Price (₹)</Label>
                    <Input type="number" min="0" placeholder="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Selling Price (₹)</Label>
                    <Input type="number" min="0" placeholder="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddPlant}
                  disabled={addItem.isPending || !plantName || !category || !unit}
                >
                  {addItem.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Add Plant'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Movement History: {selectedPlant}
            </DialogTitle>
          </DialogHeader>
          {selectedPlant && <StockMovementHistory plantName={selectedPlant} />}
        </DialogContent>
      </Dialog>

      {/* Inventory Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Current Stock
            <Badge variant="secondary" className="ml-1">{inventory.length} plants</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />)}
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No plants in inventory yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                Add First Plant
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Plant Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const margin = Number(item.sellingPrice) - Number(item.costPrice);
                    const marginPct = Number(item.costPrice) > 0
                      ? ((margin / Number(item.costPrice)) * 100).toFixed(0)
                      : '0';
                    return (
                      <TableRow key={item.plantName} className="hover:bg-muted/20">
                        <TableCell className="font-medium">{item.plantName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                        <TableCell className="text-sm">{item.unit}</TableCell>
                        <TableCell>{stockBadge(Number(item.stockQuantity))}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(item.costPrice)}</TableCell>
                        <TableCell className="text-sm font-medium text-primary">{formatCurrency(item.sellingPrice)}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${margin >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {margin >= 0 ? '+' : ''}{marginPct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => {
                              setSelectedPlant(item.plantName);
                              setHistoryOpen(true);
                            }}
                          >
                            <History className="w-3 h-3" />
                            History
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
