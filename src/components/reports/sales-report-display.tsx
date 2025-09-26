
"use client";

import type { SalesReportData } from "@/app/(app)/reports/actions";
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
import { DollarSign, ShoppingCart, Percent } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";

interface SalesReportDisplayProps {
  data: SalesReportData;
}

export function SalesReportDisplay({ data }: SalesReportDisplayProps) {
  const { settings } = useAppSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    if (date.seconds) {
      return format(new Date(date.seconds * 1000), "dd/MM/yyyy");
    }
    if(typeof date === 'string') {
        return format(new Date(date), "dd/MM/yyyy");
    }
    return format(date, "dd/MM/yyyy");
  };

  return (
    <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatsCard 
                title="Total Revenue"
                value={`${currencySymbol}${data.totalRevenue.toFixed(2)}`}
                icon={DollarSign}
            />
            <StatsCard 
                title="Total Sales"
                value={data.totalSales.toString()}
                icon={ShoppingCart}
            />
            <StatsCard 
                title="Total Discount"
                value={`${currencySymbol}${data.totalDiscount.toFixed(2)}`}
                icon={Percent}
            />
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Sales</CardTitle>
          <CardDescription>
            A detailed list of all sales within the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Salesman</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No sales recorded in this period.
                  </TableCell>
                </TableRow>
              ) : (
                data.sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{formatDate(sale.date)}</TableCell>
                    <TableCell>{sale.salesmanName}</TableCell>
                    <TableCell>{sale.customer}</TableCell>
                    <TableCell>{sale.products.length} items</TableCell>
                    <TableCell className="text-right font-medium">
                      {currencySymbol}{(sale.totalAmount ?? 0).toFixed(2)}
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
