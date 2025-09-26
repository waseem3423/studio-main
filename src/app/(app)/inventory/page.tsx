
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAppSettings } from "@/components/app-settings-provider";
import { getCurrencySymbol } from "@/lib/currencies";

type Product = {
  id: string;
  name: string;
  sku: string;
  piecesPerBox: number;
  stock: number;
  costPrice: number;
  salePrice: number;
  expiryDate?: string;
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const { settings } = useAppSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);


  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products: ", error);
      toast({ title: "Error", description: "Failed to fetch products.", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const generateSku = (productName: string) => {
    const namePart = productName.slice(0, 3).toUpperCase();
    const numberPart = Math.floor(100 + Math.random() * 900);
    return `${namePart}-${numberPart}`;
  };

  const handleAddOrEditProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const piecesPerBox = parseInt(formData.get("piecesPerBox") as string, 10);
    const stock = parseInt(formData.get("stock") as string, 10);
    const costPrice = parseFloat(formData.get("costPrice") as string);
    const salePrice = parseFloat(formData.get("salePrice") as string);
    const finalExpiryDate = expiryDate ? format(expiryDate, "yyyy-MM-dd") : undefined;

    if (!name || isNaN(costPrice) || isNaN(salePrice) || isNaN(piecesPerBox) || isNaN(stock)) {
      toast({ title: "Error", description: "Please fill all fields correctly.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (currentProduct) {
        // Edit
        const productDoc = doc(db, "products", currentProduct.id);
        await updateDoc(productDoc, { name, piecesPerBox, stock, costPrice, salePrice, expiryDate: finalExpiryDate });
        toast({ title: "Success", description: "Product updated successfully." });
      } else {
        // Add
        const sku = generateSku(name);
        await addDoc(collection(db, "products"), { name, sku, piecesPerBox, stock, costPrice, salePrice, expiryDate: finalExpiryDate, createdAt: serverTimestamp() });
        toast({ title: "Success", description: "Product added successfully." });
      }
      fetchProducts();
      setIsDialogOpen(false);
      setCurrentProduct(null);
      setExpiryDate(undefined);
    } catch (error) {
      console.error("Error saving product: ", error);
      toast({ title: "Error", description: "Failed to save product.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDeleteProduct = async () => {
    if (!currentProduct) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "products", currentProduct.id));
      toast({ title: "Success", description: "Product deleted successfully." });
      fetchProducts();
      setIsDeleteDialogOpen(false);
      setCurrentProduct(null);
    } catch (error) {
      console.error("Error deleting product: ", error);
      toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
    }
    setLoading(false);
  };

  const openAddDialog = () => {
    setCurrentProduct(null);
    setExpiryDate(undefined);
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setCurrentProduct(product);
    setExpiryDate(product.expiryDate ? new Date(product.expiryDate) : undefined);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setCurrentProduct(product);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">Inventory</h1>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Product List</CardTitle>
            <CardDescription>
              A list of all products in your inventory.
            </CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <PlusCircle className="mr-2" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Stock (Boxes)</TableHead>
                <TableHead>Pieces/Box</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Sale Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">Loading products...</TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No products found. Add one to get started.</TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{product.piecesPerBox}</TableCell>
                    <TableCell>
                      {product.expiryDate ? format(new Date(product.expiryDate), "dd/MM/yyyy") : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {currencySymbol}{product.costPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {currencySymbol}{product.salePrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => openDeleteDialog(product)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>                  
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAddOrEditProduct}>
            <DialogHeader>
              <DialogTitle>{currentProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              <DialogDescription>
                {currentProduct ? 'Update the details of your product.' : 'Fill in the details for the new product.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" defaultValue={currentProduct?.name} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="piecesPerBox" className="text-right">Pieces/Box</Label>
                <Input id="piecesPerBox" name="piecesPerBox" type="number" defaultValue={currentProduct?.piecesPerBox} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock" className="text-right">Stock (Boxes)</Label>
                <Input id="stock" name="stock" type="number" defaultValue={currentProduct?.stock ?? 0} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="costPrice" className="text-right">Cost Price (per Box)</Label>
                <Input id="costPrice" name="costPrice" type="number" step="0.01" defaultValue={currentProduct?.costPrice} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="salePrice" className="text-right">Sale Price (per Box)</Label>
                <Input id="salePrice" name="salePrice" type="number" step="0.01" defaultValue={currentProduct?.salePrice} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Expiry Date</Label>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !expiryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiryDate}
                      onSelect={setExpiryDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the product "{currentProduct?.name}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteProduct} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    
