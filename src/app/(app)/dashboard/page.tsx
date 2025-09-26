
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DollarSign, Package, ShoppingCart, MapPin, Briefcase, Warehouse, ClipboardCheck, CheckSquare, Sparkles, TrendingUp, TrendingDown, Clock, UserCog } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { useAppSettings } from "@/components/app-settings-provider";
import { getCurrencySymbol } from "@/lib/currencies";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, Timestamp, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { User, SalesmanPlan, WorkerTask, Sale, Expense } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { analyzeFinancialHealth, FinancialHealthOutput } from "@/ai/flows/financial-health-analysis";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";


const AIFinancialSummary = () => {
    const [summary, setSummary] = useState<FinancialHealthOutput | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { settings } = useAppSettings();
    const currencySymbol = getCurrencySymbol(settings.currency);

    useEffect(() => {
        const fetchAndAnalyze = async () => {
            setLoading(true);
            try {
                // Fetch data for the last 30 days
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - 30);

                // Fetch Sales
                const salesQuery = query(
                    collection(db, "sales"),
                    where("date", ">=", startDate),
                    where("date", "<=", endDate)
                );
                const salesSnapshot = await getDocs(salesQuery);
                const salesData: Sale[] = salesSnapshot.docs.map(doc => doc.data() as Sale);
                const totalRevenue = salesData.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);

                // Fetch Expenses
                const expensesQuery = query(
                    collection(db, "expenses"),
                    where("date", ">=", startDate.toISOString().split('T')[0]),
                    where("date", "<=", endDate.toISOString().split('T')[0])
                );
                const expensesSnapshot = await getDocs(expensesQuery);
                const expensesData: Expense[] = expensesSnapshot.docs.map(doc => doc.data() as Expense);
                const totalExpenses = expensesData.reduce((acc, exp) => acc + exp.amount, 0);

                // Get top products
                 const productCounts: { [name: string]: number } = {};
                 salesData.forEach(sale => {
                     sale.products.forEach(p => {
                         productCounts[p.productName] = (productCounts[p.productName] || 0) + p.quantity;
                     });
                 });
                const topProducts = Object.entries(productCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([name, quantity]) => `${name} (${quantity} sold)`)
                    .join(', ');

                // Call AI Flow
                const result = await analyzeFinancialHealth({
                    totalRevenue,
                    totalExpenses,
                    topSellingProducts: topProducts || "No products sold in the last 30 days."
                });

                setSummary(result);

            } catch (err) {
                console.error("Error in AI financial analysis:", err);
                setError("Failed to generate AI summary. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchAndAnalyze();
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                        <Sparkles className="h-6 w-6 text-primary" />
                        <span>AI Financial Summary (Last 30 Days)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-8 w-1/3 mt-2" />
                </CardContent>
            </Card>
        );
    }
    
    if (error) {
        return (
             <Alert variant="destructive">
                <Sparkles className="h-4 w-4" />
                <AlertTitle>AI Analysis Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    if (!summary) return null;

    const isProfit = summary.financialStatus === "Profit";

    return (
        <Card className="bg-muted/20 border-dashed">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                    <Sparkles className="h-6 w-6 text-primary" />
                    AI Financial Summary (Last 30 Days)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className={`flex items-center gap-2 p-3 rounded-lg ${isProfit ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {isProfit ? <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" /> : <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />}
                    <span className={`text-lg font-bold ${isProfit ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        Status: {summary.financialStatus} (Net: {currencySymbol}{(summary.netResult || 0).toFixed(2)})
                    </span>
                </div>
                <div>
                    <h4 className="font-semibold mb-1">AI Analyst's Summary:</h4>
                    <p className="text-sm text-muted-foreground">{summary.summary}</p>
                </div>
                <div>
                    <h4 className="font-semibold mb-1">Suggestions for Improvement:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {summary.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
            </CardContent>
        </Card>
    )
}

const SalesmanDashboard = () => {
  const [plan, setPlan] = useState<SalesmanPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const planDocRef = doc(db, "salesman_plans", user.uid);

    const fetchPlan = async () => {
      try {
        const planDoc = await getDoc(planDocRef);
        if (planDoc.exists()) {
          setPlan(planDoc.data() as SalesmanPlan);
        }
      } catch (error) {
        console.error("Error fetching salesman plan: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [user]);

  const formatPlanDate = (date: any) => {
    if (!date) return null;
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, "dd MMM, yyyy 'at' hh:mm a");
  };

  if (loading) {
    return (
       <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
       <h1 className="text-3xl font-bold font-headline">Your Daily Plan</h1>
       {plan && plan.location ? (
         <div className="grid gap-4 md:grid-cols-1">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Location</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-headline">{plan.location}</div>
                    {plan.assignedByName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <UserCog className="h-3 w-3" />
                            Assigned by: {plan.assignedByName}
                        </p>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Items to Carry (Optional)</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {plan.itemsToCarry || "No special items requested."}
                    </p>
                     {plan.updatedAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                            <Clock className="h-3 w-3" />
                            Last Updated: {formatPlanDate(plan.updatedAt)}
                        </p>
                    )}
                </CardContent>
            </Card>
         </div>
       ) : (
        <Card className="flex items-center justify-center p-8">
            <CardContent className="flex items-center justify-center">
                <p className="text-muted-foreground text-center">Your plan for today has not been set yet. Please check back later or contact your manager.</p>
            </CardContent>
        </Card>
       )}
    </div>
  )
}

const WorkerDashboard = () => {
    const [task, setTask] = useState<WorkerTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [user] = useAuthState(auth);
    const [progress, setProgress] = useState("");
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const taskDocRef = doc(db, "worker_tasks", user.uid);
        const fetchTask = async () => {
            try {
                const taskDoc = await getDoc(taskDocRef);
                if (taskDoc.exists()) {
                    setTask(taskDoc.data() as WorkerTask);
                } else {
                    setTask(null);
                }
            } catch (error) {
                console.error("Error fetching worker task: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTask();
    }, [user, toast]);

    const handleProgressUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !task) return;

        setIsSubmitting(true);
        try {
            const isTaskDone = progress.trim().toLowerCase() === 'done';
            
            if (isTaskDone) {
                 const taskDocRef = doc(db, "worker_tasks", user.uid);
                // Move to history
                await addDoc(collection(db, "worker_task_history"), {
                    workerId: user.uid,
                    task: task.task,
                    completedAt: serverTimestamp()
                });

                // Update the current task progress to 'Done' instead of deleting
                await updateDoc(taskDocRef, {
                    progress: 'Done',
                    updatedAt: serverTimestamp()
                });
                
                toast({ title: "Task Completed!", description: "Great job! Your task has been moved to history." });
                // Fetch the updated task to show 'Done' status correctly
                const taskDoc = await getDoc(taskDocRef);
                if (taskDoc.exists()) {
                    setTask(taskDoc.data() as WorkerTask);
                }

            } else {
                 const taskDocRef = doc(db, "worker_tasks", user.uid);
                await updateDoc(taskDocRef, {
                    progress: progress,
                    updatedAt: serverTimestamp()
                });
                toast({ title: "Success", description: "Your progress has been updated." });
                const taskDoc = await getDoc(taskDocRef);
                 if (taskDoc.exists()) {
                    setTask(taskDoc.data() as WorkerTask);
                }
            }

        } catch (error) {
            console.error("Error updating progress: ", error);
            toast({ title: "Error", description: "Failed to update progress.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const formatTaskDate = (date: any) => {
        if (!date) return null;
        const d = date.toDate ? date.toDate() : new Date(date);
        return format(d, "dd MMM, yyyy 'at' hh:mm a");
    }


    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-3xl font-bold font-headline">Worker Dashboard</h1>
             {task ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Today's Task</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start p-4 border rounded-lg bg-muted/20">
                            <ClipboardCheck className="h-6 w-6 mr-4 mt-1 text-primary"/>
                            <div>
                                <p className="text-lg font-semibold">{task.task}</p>
                                {task.assignedAt && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Clock className="h-3 w-3" />
                                        Assigned on: {formatTaskDate(task.assignedAt)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleProgressUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="progress" className="font-medium flex items-center gap-2">
                                    <CheckSquare className="h-5 w-5" />
                                    Update Your Progress
                                </label>
                                <Input 
                                    id="progress"
                                    value={progress}
                                    onChange={(e) => setProgress(e.target.value)}
                                    placeholder="e.g., 40 boxes packed. Type 'Done' to complete."
                                    disabled={task.progress?.toLowerCase() === 'done'}
                                />
                                <p className="text-sm text-muted-foreground">
                                    {task.progress?.toLowerCase() === 'done' 
                                        ? "This task is completed. A new task will be assigned by your manager." 
                                        : "Let your manager know how much work you've completed."
                                    }
                                </p>
                            </div>
                             <Button type="submit" disabled={isSubmitting || task.progress?.toLowerCase() === 'done'}>
                                {isSubmitting ? "Updating..." : "Update Progress"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Card className="flex flex-col items-center justify-center text-center p-8 md:p-16">
                    <CardHeader>
                        <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                            <Warehouse className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <CardTitle className="mt-4 font-headline">Welcome!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground max-w-md">
                            Your task for today has not been set yet. You can manage inventory from the inventory page.
                        </p>
                        <Link href="/inventory" className="text-primary underline mt-4 inline-block">
                            Go to Inventory
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}


export default function DashboardPage() {
  const { settings } = useAppSettings();
  const currencySymbol = getCurrencySymbol(settings.currency);

  const [user, loading, error] = useAuthState(auth);
  const [role, setRole] = useState<User['role'] | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      } else if (!loading) {
        // if no user and not loading, we can stop loading role
        setRoleLoading(false);
      }
    };
    if (isClient) {
        fetchUserRole();
    }
  }, [user, loading, isClient]);

  if (!isClient || loading || roleLoading) {
    return (
       <div>
        <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
         <div className="grid grid-cols-1 gap-4 lg:grid-cols-7 mt-4">
            <div className="lg:col-span-4"><Skeleton className="h-80" /></div>
            <div className="lg:col-span-3"><Skeleton className="h-80" /></div>
        </div>
      </div>
    )
  }

  if (role === 'salesman') {
    return <SalesmanDashboard />;
  }

  if (role === 'worker') {
    return <WorkerDashboard />;
  }

  // Admin, Manager, Cashier Dashboard
  if (role) {
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
        {(role === 'admin' || role === 'manager') && <AIFinancialSummary />}
        </div>
    );
  }

  // Fallback for when role is not determined or no user
  return null;
}
