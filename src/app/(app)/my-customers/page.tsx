
"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, runTransaction, addDoc, serverTimestamp, getDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";
import type { Customer, Sale, Payment } from "@/lib/data";
import { useAppSettings } from "@/components/app-settings-provider";
import { getCurrencySymbol } from "@/lib/currencies";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type EnrichedSale = Sale & { payments: Payment[] };

const formatDateSafely = (date: any): string => {
    if (!date) return 'N/A';
    try {
        const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        return format(dateObj, "dd MMM, yyyy");
    } catch (error) {
        console.error("Error formatting date:", date, error);
        return 'Invalid Date';
    }
};

const formatPaymentDateSafely = (date: any): string => {
    if (!date) return 'N/A';
    try {
        const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        return format(dateObj, "dd MMM, yyyy");
    } catch (error) {
        console.error("Error formatting payment date:", date, error);
        return 'Invalid Date';
    }
}

export default function MyCustomersPage() {
  const [user] = useAuthState(auth);
  const { settings } = useAppSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<EnrichedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [isDeleteCustomerDialogOpen, setIsDeleteCustomerDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "" });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const { toast } = useToast();

  const fetchCustomers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "customers"), where("salesmanId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const customersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      customersData.sort((a,b) => a.name.localeCompare(b.name));
      setCustomers(customersData);
    } catch (error) {
      console.error("Error fetching customers: ", error);
      toast({ title: "Error", description: "Failed to fetch customers.", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
        fetchCustomers();
    }
  }, [user]);

  const fetchCustomerDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoading(true);
    try {
      const salesQuery = query(
        collection(db, "sales"),
        where("customerId", "==", customer.id)
      );
      const salesSnapshot = await getDocs(salesQuery);
      const salesData = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      
      const enrichedSales: EnrichedSale[] = await Promise.all(salesData.map(async sale => {
          const paymentsQuery = query(collection(db, "payments"), where("saleId", "==", sale.id));
          const paymentsSnapshot = await getDocs(paymentsQuery);
          const payments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);
          // Sort payments in code
          payments.sort((a, b) => {
              const dateA = a.date instanceof Date ? a.date.getTime() : (a.date as any)?.seconds * 1000 || 0;
              const dateB = b.date instanceof Date ? b.date.getTime() : (b.date as any)?.seconds * 1000 || 0;
              return dateA - dateB;
          });
          return {...sale, payments };
      }));
      
      // Sort sales in code
      enrichedSales.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date.getTime() : (a.date as any)?.seconds * 1000 || 0;
          const dateB = b.date instanceof Date ? b.date.getTime() : (b.date as any)?.seconds * 1000 || 0;
          return dateB - dateA;
      });

      setCustomerSales(enrichedSales);

    } catch (error) {
      console.error("Error fetching sales details: ", error);
      toast({ title: "Error", description: "Failed to fetch customer's sales details.", variant: "destructive" });
    }
    setLoading(false);
  };
  
  const handleAddPayment = async () => {
      if (!selectedSale || !selectedCustomer || !user) return;
      if (paymentAmount <= 0) {
          toast({ title: "Invalid Amount", description: "Payment amount must be positive.", variant: "destructive"});
          return;
      }
      if (paymentAmount > selectedSale.dueAmount) {
          toast({ title: "Invalid Amount", description: "Payment cannot be more than the due amount.", variant: "destructive"});
          return;
      }

      try {
        await runTransaction(db, async (transaction) => {
            const saleRef = doc(db, "sales", selectedSale.id);
            const customerRef = doc(db, "customers", selectedCustomer.id);
            const paymentRef = doc(collection(db, "payments"));

            const saleDoc = await transaction.get(saleRef);
            const customerDoc = await transaction.get(customerRef);

            if (!saleDoc.exists() || !customerDoc.exists()) {
                throw new Error("Sale or Customer not found");
            }
            
            const currentSaleData = saleDoc.data() as Sale;
            const currentCustomerData = customerDoc.data() as Customer;

            // 1. Update Sale
            const newPaidAmount = currentSaleData.paidAmount + paymentAmount;
            const newDueAmount = currentSaleData.dueAmount - paymentAmount;
            transaction.update(saleRef, { paidAmount: newPaidAmount, dueAmount: newDueAmount });

            // 2. Update Customer's totalDue
            const newTotalDue = currentCustomerData.totalDue - paymentAmount;
            transaction.update(customerRef, { totalDue: newTotalDue });
            
            // 3. Add Payment record
            transaction.set(paymentRef, {
                saleId: selectedSale.id,
                customerId: selectedCustomer.id,
                salesmanId: user.uid,
                amount: paymentAmount,
                date: new Date(),
                createdAt: serverTimestamp(),
            });
        });
        toast({ title: "Payment Added", description: "Payment has been recorded successfully." });
        setIsPaymentDialogOpen(false);
        setPaymentAmount(0);
        setSelectedSale(null);
        // Refresh data
        await fetchCustomers();
        if(selectedCustomer) {
            const updatedCustomerDoc = await getDoc(doc(db, "customers", selectedCustomer.id));
            if(updatedCustomerDoc.exists()) {
                const updatedCustomerData = {id: updatedCustomerDoc.id, ...updatedCustomerDoc.data()} as Customer
                await fetchCustomerDetails(updatedCustomerData)
            }
        };

      } catch (error) {
          console.error("Error adding payment: ", error);
          toast({ title: "Error", description: `Failed to add payment. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
      }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { name, phone, address } = newCustomer;

    if (!name || !phone || !address) {
        toast({ title: "Missing Information", description: "Please fill out all fields.", variant: "destructive"});
        return;
    }

    try {
        await addDoc(collection(db, "customers"), {
            name,
            phone,
            address,
            salesmanId: user.uid,
            totalDue: 0,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Customer Added", description: `${name} has been added to your customer list.` });
        setIsAddCustomerDialogOpen(false);
        setNewCustomer({ name: "", phone: "", address: "" }); // Reset state
        fetchCustomers(); // Refresh the list
    } catch (error) {
        console.error("Error adding customer: ", error);
        toast({ title: "Error", description: `Failed to add customer.`, variant: "destructive" });
    }
  };
  
  const handleUpdateCustomer = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingCustomer) return;
      
      const { name, phone, address } = editingCustomer;
      if (!name || !phone || !address) {
          toast({ title: "Missing Information", description: "Please fill out all fields.", variant: "destructive"});
          return;
      }

      try {
          const customerRef = doc(db, "customers", editingCustomer.id);
          await updateDoc(customerRef, { name, phone, address });
          toast({ title: "Customer Updated", description: "Customer details have been updated." });
          setIsEditCustomerDialogOpen(false);
          setEditingCustomer(null);
          fetchCustomers();
      } catch (error) {
          console.error("Error updating customer:", error);
          toast({ title: "Error", description: "Failed to update customer.", variant: "destructive" });
      }
  }

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
        // A more robust solution might check for related sales before deleting
        await deleteDoc(doc(db, "customers", customerToDelete.id));

        toast({ title: "Customer Deleted", description: "The customer has been successfully deleted." });
        setIsDeleteCustomerDialogOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
    } catch (error) {
        console.error("Error deleting customer:", error);
        toast({ title: "Error", description: "Failed to delete customer.", variant: "destructive" });
    }
  };

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEditCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingCustomer(prev => prev ? ({ ...prev, [name]: value }) : null);
  };

  const openPaymentDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setIsPaymentDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditCustomerDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteCustomerDialogOpen(true);
  };
  
  if (loading && !selectedCustomer) {
      return <div>Loading customers...</div>
  }

  if (selectedCustomer) {
    return (
      <div>
        <Button onClick={() => setSelectedCustomer(null)} className="mb-4">
          &larr; Back to All Customers
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{selectedCustomer.name}</CardTitle>
            <CardDescription>
              Phone: {selectedCustomer.phone} | Address: {selectedCustomer.address}
            </CardDescription>
            <Badge className={selectedCustomer.totalDue > 0 ? "bg-red-500/20 text-red-700 border-red-500/50" : "bg-green-500/20 text-green-700 border-green-500/50"}>
              Total Due: {currencySymbol}{selectedCustomer.totalDue.toFixed(2)}
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? <p>Loading details...</p> : (
                <Accordion type="single" collapsible className="w-full">
                {customerSales.map(sale => (
                    <AccordionItem value={sale.id} key={sale.id}>
                    <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                        <span>Sale on {formatDateSafely(sale.date)}</span>
                        <Badge variant={sale.dueAmount > 0 ? 'destructive' : 'default'}>
                            Due: {currencySymbol}{sale.dueAmount.toFixed(2)}
                        </Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p><strong>Total Bill:</strong> {currencySymbol}{sale.totalAmount.toFixed(2)}</p>
                            <p><strong>Total Paid:</strong> {currencySymbol}{sale.paidAmount.toFixed(2)}</p>
                            <hr className="my-2"/>
                            <h4 className="font-semibold mb-2">Products:</h4>
                            <ul className="list-disc pl-5 text-sm">
                                {sale.products.map((p, i) => <li key={i}>{p.productName} (Qty: {p.quantity})</li>)}
                            </ul>
                            <h4 className="font-semibold mt-4 mb-2">Payment History:</h4>
                            {sale.payments.length > 0 ? (
                                <ul className="list-disc pl-5 text-sm">
                                    {sale.payments.map((p, i) => <li key={i}>{currencySymbol}{p.amount.toFixed(2)} on {formatPaymentDateSafely(p.date)}</li>)}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No payments recorded for this sale yet.</p>}
                            
                            {sale.dueAmount > 0 && (
                                <Button onClick={() => openPaymentDialog(sale)} size="sm" className="mt-4">
                                    Receive Payment
                                </Button>
                            )}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                ))}
                </Accordion>
            )}
          </CardContent>
        </Card>
        
         <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Receive Payment</DialogTitle>
                <DialogDescription>
                Receive payment from {selectedCustomer.name} for sale on {selectedSale ? formatDateSafely(selectedSale.date) : ''}. 
                Due amount is {currencySymbol}{selectedSale?.dueAmount.toFixed(2)}.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Input 
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                    max={selectedSale?.dueAmount}
                />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleAddPayment}>Save Payment</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold mb-8 font-headline">My Customers</h1>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>
                Here are all the customers you have added.
            </CardDescription>
          </div>
           <Button onClick={() => setIsAddCustomerDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Customer
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No customers found.</TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{customer.totalDue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => fetchCustomerDetails(customer)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDeleteDialog(customer)}
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
      
       {/* Add Customer Dialog */}
      <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
        <DialogContent>
            <form onSubmit={handleAddCustomer}>
                <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                    <DialogDescription>
                    Fill in the details for the new customer. This will add them to your permanent list.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name-add" className="text-right">Name</Label>
                        <Input id="name-add" name="name" value={newCustomer.name} onChange={handleNewCustomerChange} className="col-span-3" placeholder="e.g., Ali General Store" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone-add" className="text-right">Phone</Label>
                        <Input id="phone-add" name="phone" value={newCustomer.phone} onChange={handleNewCustomerChange} className="col-span-3" placeholder="0300-1234567" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address-add" className="text-right">Address</Label>
                        <Input id="address-add" name="address" value={newCustomer.address} onChange={handleNewCustomerChange} className="col-span-3" placeholder="Shop # 5, Main Market, Lahore" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit">Save Customer</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Customer Dialog */}
      {editingCustomer && (
        <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
            <DialogContent>
                <form onSubmit={handleUpdateCustomer}>
                    <DialogHeader>
                        <DialogTitle>Edit Customer</DialogTitle>
                        <DialogDescription>Update the details for {editingCustomer.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name-edit" className="text-right">Name</Label>
                            <Input id="name-edit" name="name" value={editingCustomer.name} onChange={handleEditCustomerChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone-edit" className="text-right">Phone</Label>
                            <Input id="phone-edit" name="phone" value={editingCustomer.phone} onChange={handleEditCustomerChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="address-edit" className="text-right">Address</Label>
                            <Input id="address-edit" name="address" value={editingCustomer.address} onChange={handleEditCustomerChange} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      )}

      {/* Delete Customer Dialog */}
      {customerToDelete && (
        <Dialog open={isDeleteCustomerDialogOpen} onOpenChange={setIsDeleteCustomerDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the customer "{customerToDelete.name}". All associated sales data will remain but will no longer be linked to a customer.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button variant="destructive" onClick={handleDeleteCustomer}>Confirm Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
