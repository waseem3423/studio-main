
"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "@/lib/data";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DatePicker } from "@/components/reports/date-picker";
import { Download, FileText, BarChart2, DollarSign, Package, AlertTriangle, UserCheck, ClipboardCheck } from "lucide-react";
import { SalesReportDownloader } from "@/components/reports/sales-report-downloader";
import { ExpenseReportDownloader } from "@/components/reports/expense-report-downloader";
import { ProfitAndLossReportDownloader } from "@/components/reports/profit-loss-report-downloader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MySalesReportDownloader } from "@/components/reports/my-sales-report-downloader";
import { MyTaskHistoryReportDownloader } from "@/components/reports/my-task-history-report-downloader";


export default function ReportsPage() {
  const [user, authLoading] = useAuthState(auth);
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [salesStartDate, setSalesStartDate] = useState<Date | undefined>();
  const [salesEndDate, setSalesEndDate] = useState<Date | undefined>();
  const [salesReportError, setSalesReportError] = useState<string | null>(null);

  const [expenseStartDate, setExpenseStartDate] = useState<Date | undefined>();
  const [expenseEndDate, setExpenseEndDate] = useState<Date | undefined>();
  const [expenseReportError, setExpenseReportError] = useState<string | null>(null);


  const [plStartDate, setPlStartDate] = useState<Date | undefined>();
  const [plEndDate, setPlEndDate] = useState<Date | undefined>();
  const [plReportError, setPlReportError] = useState<string | null>(null);

  const [mySalesStartDate, setMySalesStartDate] = useState<Date | undefined>();
  const [mySalesEndDate, setMySalesEndDate] = useState<Date | undefined>();
  const [mySalesReportError, setMySalesReportError] = useState<string | null>(null);


  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role as User['role']);
          }
        } catch (err) {
          console.error("Error fetching user role: ", err);
        } finally {
          setRoleLoading(false);
        }
      } else if (!authLoading) {
        setRoleLoading(false);
      }
    };
    fetchUserRole();
  }, [user, authLoading]);

  const handleDownload = (reportType: string) => {
    // This is now handled by specific components
    alert(`This functionality for ${reportType} is not yet implemented.`);
  };

  const validateSalesReportDates = () => {
      if (salesStartDate && salesEndDate && salesStartDate > salesEndDate) {
          setSalesReportError("Start date cannot be after end date.");
          return false;
      }
      setSalesReportError(null);
      return true;
  }
  
    const validateExpenseReportDates = () => {
      if (expenseStartDate && expenseEndDate && expenseStartDate > expenseEndDate) {
          setExpenseReportError("Start date cannot be after end date.");
          return false;
      }
      setExpenseReportError(null);
      return true;
  }
  
    const validatePlReportDates = () => {
      if (plStartDate && plEndDate && plStartDate > plEndDate) {
          setPlReportError("Start date cannot be after end date.");
          return false;
      }
      setPlReportError(null);
      return true;
  }
  
   const validateMySalesReportDates = () => {
      if (mySalesStartDate && mySalesEndDate && mySalesStartDate > mySalesEndDate) {
          setMySalesReportError("Start date cannot be after end date.");
          return false;
      }
      setMySalesReportError(null);
      return true;
  }


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">Reports</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Admin & Manager Reports */}
        {(role === 'admin' || role === 'manager') && (
            <>
                <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <BarChart2 className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline">Sales Report</CardTitle>
                    </div>
                    <CardDescription className="pt-2">
                    Generate and download a detailed CSV of all sales within a specific date range.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <DatePicker date={salesStartDate} setDate={setSalesStartDate} placeholder="Select start date" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <DatePicker date={salesEndDate} setDate={setSalesEndDate} placeholder="Select end date" />
                    </div>
                    {salesReportError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Validation Error</AlertTitle>
                            <AlertDescription>{salesReportError}</AlertDescription>
                        </Alert>
                    )}
                    <SalesReportDownloader 
                    startDate={salesStartDate}
                    endDate={salesEndDate}
                    onValidate={validateSalesReportDates}
                    />
                </CardContent>
                </Card>

                <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline">Expense Report</CardTitle>
                    </div>
                    <CardDescription className="pt-2">
                    Get a breakdown of all expenses categorized by type for a chosen period.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <DatePicker date={expenseStartDate} setDate={setExpenseStartDate} placeholder="Select start date" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <DatePicker date={expenseEndDate} setDate={setExpenseEndDate} placeholder="Select end date" />
                    </div>
                    {expenseReportError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Validation Error</AlertTitle>
                            <AlertDescription>{expenseReportError}</AlertDescription>
                        </Alert>
                    )}
                    <ExpenseReportDownloader 
                    startDate={expenseStartDate}
                    endDate={expenseEndDate}
                    onValidate={validateExpenseReportDates}
                    />
                </CardContent>
                </Card>

                <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <DollarSign className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline">Profit &amp; Loss Report</CardTitle>
                    </div>
                    <CardDescription className="pt-2">
                    Calculate your net profit or loss based on total revenue and expenses.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <DatePicker date={plStartDate} setDate={setPlStartDate} placeholder="Select start date" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <DatePicker date={plEndDate} setDate={setPlEndDate} placeholder="Select end date" />
                    </div>
                    {plReportError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Validation Error</AlertTitle>
                            <AlertDescription>{plReportError}</AlertDescription>
                        </Alert>
                    )}
                    <ProfitAndLossReportDownloader 
                        startDate={plStartDate}
                        endDate={plEndDate}
                        onValidate={validatePlReportDates}
                    />
                </CardContent>
                </Card>
                
                <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Package className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline">Inventory Report</CardTitle>
                    </div>
                    <CardDescription className="pt-2">
                    Download a complete snapshot of your current product inventory levels.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full mt-4" onClick={() => handleDownload("Inventory")}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                    </Button>
                </CardContent>
                </Card>
            </>
        )}
        
        {/* Salesman Report */}
        {role === 'salesman' && (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <UserCheck className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline">My Sales Report</CardTitle>
                    </div>
                    <CardDescription className="pt-2">
                    Download a detailed report of all the sales you have made.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <DatePicker date={mySalesStartDate} setDate={setMySalesStartDate} placeholder="Select start date" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <DatePicker date={mySalesEndDate} setDate={setMySalesEndDate} placeholder="Select end date" />
                    </div>
                    {mySalesReportError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Validation Error</AlertTitle>
                            <AlertDescription>{mySalesReportError}</AlertDescription>
                        </Alert>
                    )}
                    <MySalesReportDownloader 
                        startDate={mySalesStartDate}
                        endDate={mySalesEndDate}
                        onValidate={validateMySalesReportDates}
                    />
                </CardContent>
            </Card>
        )}
        
        {/* Worker Report */}
        {role === 'worker' && (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <ClipboardCheck className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline">My Task History Report</CardTitle>
                    </div>
                    <CardDescription className="pt-2">
                        Download a report of all your completed tasks.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <MyTaskHistoryReportDownloader />
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
}
