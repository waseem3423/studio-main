
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAppSettings } from "../app-settings-provider";
import { getCurrencySymbol } from "@/lib/currencies";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import type { Sale, User } from "@/lib/data";
import { Skeleton } from "../ui/skeleton";

export function RecentSales() {
  const { settings } = useAppSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentSales = async () => {
      setLoading(true);
      try {
        const salesQuery = query(collection(db, "sales"), orderBy("createdAt", "desc"), limit(5));
        const querySnapshot = await getDocs(salesQuery);
        const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));

        // Fetch salesman names for each sale
        const salesWithNames = await Promise.all(salesData.map(async (sale) => {
          if (!sale.salesmanId) {
              return { ...sale, salesmanName: "Unknown" };
          }
          const userDoc = await getDoc(doc(db, "users", sale.salesmanId));
          const salesmanName = userDoc.exists() ? (userDoc.data() as User).name : "Unknown";
          return { ...sale, salesmanName };
        }));

        setSales(salesWithNames);
      } catch (error) {
        console.error("Error fetching recent sales: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentSales();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Recent Sales</CardTitle>
        <CardDescription>Your most recent sales will appear here.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="space-y-4">
                <div className="flex items-center space-x-4"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-[150px]" /><Skeleton className="h-4 w-[100px]" /></div></div>
                <div className="flex items-center space-x-4"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-[150px]" /><Skeleton className="h-4 w-[100px]" /></div></div>
                <div className="flex items-center space-x-4"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-[150px]" /><Skeleton className="h-4 w-[100px]" /></div></div>
            </div>
        ) : sales.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No recent sales
          </div>
        ) : (
          <div className="space-y-8">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {sale.customerName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || 'N/A'}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {sale.customerName || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sold by: {sale.salesmanName}
                  </p>
                </div>
                <div className="ml-auto font-medium font-headline">
                  +{currencySymbol}{(sale.totalAmount ?? 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
