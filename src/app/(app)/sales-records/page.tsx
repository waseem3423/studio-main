
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
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
import { useAppSettings } from "@/components/app-settings-provider";
import { getCurrencySymbol } from "@/lib/currencies";
import { format } from "date-fns";
import type { Sale, User } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type EnrichedSale = Sale & {
  salesmanName?: string;
  customerName: string;
};

export default function SalesRecordsPage() {
  const [sales, setSales] = useState<EnrichedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useAppSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const salesQuery = query(collection(db, "sales"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(salesQuery);
        const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));

        const enrichedSales = await Promise.all(
          salesData.map(async (sale) => {
            let salesmanName = "N/A";
            if (sale.salesmanId) {
              const userDoc = await getDoc(doc(db, "users", sale.salesmanId));
              if (userDoc.exists()) {
                salesmanName = (userDoc.data() as User).name;
              }
            }
            return {
              ...sale,
              salesmanName,
              customerName: sale.customer,
            };
          })
        );

        setSales(enrichedSales);
      } catch (error) {
        console.error("Error fetching sales records: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    if (date.seconds) {
      return format(new Date(date.seconds * 1000), "dd/MM/yyyy");
    }
    return format(new Date(date), "dd/MM/yyyy");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">Sales Records</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Sales</CardTitle>
          <CardDescription>A complete list of all recorded sales.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Salesman</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading sales records...</TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No sales records found.</TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <Collapsible asChild key={sale.id} >
                    <>
                      <TableRow>
                        <TableCell>{formatDate(sale.date)}</TableCell>
                        <TableCell>{sale.salesmanName}</TableCell>
                        <TableCell>
                          <div className="font-medium">{sale.customerName}</div>
                          <div className="text-sm text-muted-foreground">{sale.customerPhone}</div>
                          <div className="text-sm text-muted-foreground">{sale.customerAddress}</div>
                        </TableCell>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-start p-1 h-auto">
                              <Badge variant="outline">{sale.products.length} items</Badge>
                              <ChevronsUpDown className="h-4 w-4" />
                              <span className="sr-only">Toggle</span>
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="text-right font-headline">
                          {currencySymbol}{(sale.totalAmount ?? 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={5} className="p-0">
                            <div className="p-4 bg-muted/50">
                                <h4 className="font-semibold mb-2">Products Sold:</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    {sale.products.map((p, index) => (
                                        <li key={index}>
                                            {p.productName} - {p.quantity} boxes @ {currencySymbol}{p.unitPrice.toFixed(2)} each
                                        </li>
                                    ))}
                                </ul>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
