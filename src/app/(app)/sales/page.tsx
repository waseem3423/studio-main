
"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, doc, getDoc, query, where, addDoc, serverTimestamp, writeBatch, runTransaction, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import type { Product, User, Customer } from "@/lib/data";
import { Combobox } from "@/components/ui/combobox";

const productSaleSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  productName: z.string(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
});

const salesEntrySchema = z.object({
  date: z.date({
    required_error: "A date of sale is required.",
  }),
  salesmanId: z.string().min(1, "Salesman is required."),
  customerId: z.string().min(1, "Customer is required."),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  products: z.array(productSaleSchema).min(1, "At least one product is required."),
  discount: z.coerce.number().min(0, "Discount cannot be negative.").optional(),
  amountReceived: z.coerce.number().min(0, "Amount received cannot be negative."),
});

type SalesEntryFormValues = z.infer<typeof salesEntrySchema>;

export default function SalesPage() {
  const { toast } = useToast();
  const [user, loadingAuth] = useAuthState(auth);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<SalesEntryFormValues>({
    resolver: zodResolver(salesEntrySchema),
    defaultValues: {
      date: new Date(),
      salesmanId: "",
      customerId: "",
      products: [{ productId: "", productName: "", quantity: 1, unitPrice: 0 }],
      discount: 0,
      amountReceived: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });
  
  const customerId = form.watch("customerId");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.exists() ? userDoc.data().role : null;
        setUserRole(role);

        if (role === 'salesman') {
          form.setValue('salesmanId', user.uid);
          const q = query(collection(db, "customers"), where("salesmanId", "==", user.uid));
          const custSnapshot = await getDocs(q);
          setCustomers(custSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
        } else {
            // For admin/manager, fetch all customers
            const custSnapshot = await getDocs(collection(db, "customers"));
            setCustomers(custSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
        }

        const productsSnapshot = await getDocs(collection(db, "products"));
        setProducts(productsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

        if (role === 'admin' || role === 'manager') {
          const q = query(collection(db, "users"), where("role", "==", "salesman"));
          const salesmenSnapshot = await getDocs(q);
          setSalesmen(salesmenSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        }
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ title: "Error", description: "Failed to load required data.", variant: "destructive" });
      }
      setLoading(false);
    };

    if(user) fetchData();
  }, [user, toast]);

  const customerOptions = useMemo(() => {
    return customers.map(c => ({ value: c.id, label: c.name }));
  }, [customers]);

  async function onSubmit(data: SalesEntryFormValues) {
    const isNewCustomer = data.customerId === 'new';

    if (isNewCustomer && (!data.customerName || !data.customerPhone || !data.customerAddress)) {
      toast({ title: "Error", description: "Please fill new customer details.", variant: "destructive" });
      return;
    }
    
    if (data.products.length === 0 || !data.products[0].productId) {
      toast({ title: "Error", description: "Please add at least one product.", variant: "destructive" });
      return;
    }

    const totalAmount = data.products.reduce((acc, p) => acc + (p.quantity * p.unitPrice), 0) - (data.discount || 0);
    const dueAmount = totalAmount - data.amountReceived;

    if (data.amountReceived > totalAmount) {
      toast({ title: "Error", description: "Amount received cannot be greater than the total amount.", variant: "destructive" });
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Check stock and prepare product updates
        const productUpdates: { ref: any, newStock: number }[] = [];
        for (const saleProduct of data.products) {
            const productRef = doc(db, "products", saleProduct.productId);
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error(`Product ${saleProduct.productName} not found.`);
            }
            const currentStock = productDoc.data().stock as number;
            if (currentStock < saleProduct.quantity) {
                throw new Error(`Not enough stock for ${saleProduct.productName}. Available: ${currentStock}, Requested: ${saleProduct.quantity}`);
            }
            const newStock = currentStock - saleProduct.quantity;
            productUpdates.push({ ref: productRef, newStock });
        }

        // 2. Handle customer (new or existing)
        let currentCustomerId = data.customerId;
        let customerData;

        if (isNewCustomer) {
          const newCustomerRef = doc(collection(db, "customers"));
          customerData = {
            name: data.customerName!,
            phone: data.customerPhone!,
            address: data.customerAddress!,
            salesmanId: data.salesmanId,
            createdAt: serverTimestamp(),
            totalDue: dueAmount,
          };
          transaction.set(newCustomerRef, customerData);
          currentCustomerId = newCustomerRef.id;
        } else {
          const customerRef = doc(db, "customers", currentCustomerId);
          const customerDoc = await transaction.get(customerRef);
          if (!customerDoc.exists()) throw new Error("Customer not found!");
          customerData = customerDoc.data();
          const newTotalDue = (customerData.totalDue || 0) + dueAmount;
          transaction.update(customerRef, { totalDue: newTotalDue });
        }
        
        // 3. Create Sale record
        const saleRef = doc(collection(db, "sales"));
        transaction.set(saleRef, {
            ...data,
            customerId: currentCustomerId,
            customerName: isNewCustomer ? data.customerName : customerData.name,
            customerPhone: isNewCustomer ? data.customerPhone : customerData.phone,
            customerAddress: isNewCustomer ? data.customerAddress : customerData.address,
            totalAmount,
            paidAmount: data.amountReceived,
            dueAmount,
            createdAt: serverTimestamp(),
        });
        
        // 4. Create Payment record if amount received
        if (data.amountReceived > 0) {
            const paymentRef = doc(collection(db, "payments"));
            transaction.set(paymentRef, {
                saleId: saleRef.id,
                customerId: currentCustomerId,
                salesmanId: data.salesmanId,
                amount: data.amountReceived,
                date: data.date,
                createdAt: serverTimestamp(),
            });
        }

        // 5. Apply stock updates
        for (const update of productUpdates) {
            transaction.update(update.ref, { stock: update.newStock });
        }
      });

      toast({
        title: "Sale Recorded",
        description: "The new sale and stock update have been successfully recorded.",
      });

      // Refetch customers to include the new one
      if (isNewCustomer && user) {
        if(userRole === 'salesman'){
            const q = query(collection(db, "customers"), where("salesmanId", "==", user.uid));
            const custSnapshot = await getDocs(q);
            setCustomers(custSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
        } else {
            const custSnapshot = await getDocs(collection(db, "customers"));
            setCustomers(custSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
        }
      }
      
      // Refetch products to get updated stock
      const productsSnapshot = await getDocs(collection(db, "products"));
      setProducts(productsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));


      form.reset({
        date: new Date(),
        salesmanId: userRole === 'salesman' ? user!.uid : "",
        customerId: "",
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        products: [{ productId: "", productName: "", quantity: 1, unitPrice: 0 }],
        discount: 0,
        amountReceived: 0,
      });

    } catch (error) {
        console.error("Error saving sale: ", error);
        toast({ title: "Error", description: `Failed to save the sale. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  }

  if (loadingAuth || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 font-headline">Daily Sales Entry</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Sale Details</CardTitle>
              <CardDescription>Enter the details for the new sale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Sale</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {(userRole === 'admin' || userRole === 'manager') && (
                    <FormField
                    control={form.control}
                    name="salesmanId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Salesman</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a salesman" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {salesmen.map((salesman) => (
                                <SelectItem key={salesman.id} value={salesman.id}>
                                {salesman.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 )}
              </div>
              
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Customer</FormLabel>
                    <Combobox
                      options={[{ value: 'new', label: 'Add New Customer' }, ...customerOptions]}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select or add a customer..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {customerId === 'new' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                   <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter customer name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Customer Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 0300-1234567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="md:col-span-2">
                       <FormField
                          control={form.control}
                          name="customerAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Customer Address</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Shop # 5, Main Market, Lahore" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                </div>
              )}

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Products Sold</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col md:flex-row gap-4 items-start border p-4 rounded-lg relative">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
                    <FormField
                      control={form.control}
                      name={`products.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              const product = products.find(p => p.id === value);
                              if (product) {
                                form.setValue(`products.${index}.unitPrice`, product.salePrice);
                                form.setValue(`products.${index}.productName`, product.name);
                              }
                              field.onChange(value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products.length > 0 ? products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} (Stock: {product.stock})
                                </SelectItem>
                              )) : <SelectItem value="loading" disabled>Loading products...</SelectItem>}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity (Boxes)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per Box</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    className="md:mt-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: "", productName: "", quantity: 1, unitPrice: 0 })}
                className="mt-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
                <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Discount</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="amountReceived"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount Received</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
           </Card>

          <div className="flex justify-end">
            <Button type="submit">Record Sale</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
