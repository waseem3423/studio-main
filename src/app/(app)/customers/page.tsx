
"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, runTransaction, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";
import type { Customer, Sale, Payment, User } from "@/lib/data";
import { useAppSettings } from "@/components/app-settings-provider";
import { getCurrencySymbol } from "@/lib/currencies";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search } from "lucide-react";

type EnrichedSale = Sale & { payments: Payment[] };
type EnrichedCustomer = Customer & { salesmanName: string };

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

export default function AllCustomersPage() {
  const [user] = useAuthState(auth);
  const { settings } = useAppSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);
  const [customers, setCustomers] = useState<EnrichedCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<EnrichedCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<EnrichedCustomer | null>(null);
  const [customerSales, setCustomerSales] = useState<EnrichedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchCustomers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));

      const q = query(collection(db, "customers"));
      const querySnapshot = await getDocs(q);
      const customersData = querySnapshot.docs.map(doc => {
          const customer = { id: doc.id, ...doc.data() } as Customer;
          const salesman = usersMap.get(customer.salesmanId);
          return {
              ...customer,
              salesmanName: salesman?.name || "Unknown"
          } as EnrichedCustomer;
      });
      
      customersData.sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(customersData);
      setFilteredCustomers(customersData);

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

  useEffect(() => {
    const results = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.salesmanName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(results);
  }, [searchTerm, customers]);


  const fetchCustomerDetails = async (customer: Customer) => {
    setSelectedCustomer(customer as EnrichedCustomer);
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
                salesmanId: currentSaleData.salesmanId, // Use salesman from sale record
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
                const salesman = customers.find(c => c.id === updatedCustomerDoc.id)?.salesmanName || "Unknown"
                const updatedCustomerData = {id: updatedCustomerDoc.id, salesmanName: salesman, ...updatedCustomerDoc.data()} as EnrichedCustomer
                await fetchCustomerDetails(updatedCustomerData)
            }
        };

      } catch (error) {
          console.error("Error adding payment: ", error);
          toast({ title: "Error", description: `Failed to add payment. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
      }
  };

  const openPaymentDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setIsPaymentDialogOpen(true);
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
              <br />
              <span className="text-xs">Managed by: {selectedCustomer.salesmanName}</span>
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
        <h1 className="text-3xl font-bold font-headline">All Customers</h1>
      </div>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>
                A complete list of all customers from all salesmen.
            </CardDescription>
          </div>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name, phone, or salesman..."
                    className="pl-8 sm:w-[300px] md:w-[400px] lg:w-[500px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Salesman</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No customers found.</TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.salesmanName}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{customer.totalDue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => fetchCustomerDetails(customer)}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
