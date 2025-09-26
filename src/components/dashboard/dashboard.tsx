
"use client";

import { DollarSign, Package, Users, ShoppingCart } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { useAppSettings } from "@/components/app-settings-provider";
import { getCurrencySymbol } from "@/lib/currencies";

export default function DashboardPage() {
  const { settings } = useAppSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={`${currencySymbol}0.00`}
          icon={DollarSign}
          description="+0% from last month"
        />
        <StatsCard
          title="Total Units Sold"
          value="0"
          icon={ShoppingCart}
          description="+0% from last month"
        />
        <StatsCard
          title="Best Selling Product"
          value="N/A"
          icon={Package}
          description="0 units this month"
        />
        <StatsCard
          title="Profit/Loss"
          value={`+${currencySymbol}0.00`}
          icon={DollarSign}
          description="+0% from last month"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <SalesChart />
        </div>
        <div className="lg:col-span-3">
          <RecentSales />
        </div>
      </div>
    </div>
  );
}
