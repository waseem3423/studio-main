
"use server";

import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { z } from "zod";
import type { Sale, User, Expense } from "@/lib/data";
import { getDoc, doc } from "firebase/firestore";

const ReportFormSchema = z.object({
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
    message: "Start date cannot be after end date.",
    path: ["startDate"],
});


// Sales Report Types and Action
export type EnrichedSale = Sale & {
  salesmanName?: string;
};

export type SalesReportData = {
    totalRevenue: number;
    totalSales: number;
    totalDiscount: number;
    sales: EnrichedSale[];
};

export type SalesReportState = {
  message: string;
  issues?: z.ZodIssue[];
  data?: SalesReportData;
};

export async function generateSalesReport(
  prevState: SalesReportState,
  formData: FormData
): Promise<SalesReportState> {
  const parsed = ReportFormSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    return {
      message: "Invalid form data.",
      issues: parsed.error.issues,
    };
  }

  const { startDate, endDate } = parsed.data;
  
  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setHours(23, 59, 59, 999);

  try {
    const salesQuery = query(
      collection(db, "sales"),
      where("date", ">=", new Date(startDate)),
      where("date", "<=", adjustedEndDate)
    );

    const querySnapshot = await getDocs(salesQuery);
    const salesData: Sale[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        date: (data.date as Timestamp).toDate().toISOString(),
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      } as unknown as Sale;
    });

    if (salesData.length === 0) {
        return {
            message: "No sales found for the selected date range.",
            data: { totalRevenue: 0, totalSales: 0, totalDiscount: 0, sales: [] }
        }
    }

    const enrichedSales = await Promise.all(
        salesData.map(async (sale) => {
          let salesmanName = "N/A";
          if (sale.salesmanId) {
            try {
              const userDoc = await getDoc(doc(db, "users", sale.salesmanId));
              if (userDoc.exists()) {
                salesmanName = (userDoc.data() as User).name;
              }
            } catch (e) {
                console.error(`Could not fetch user ${sale.salesmanId}`, e)
            }
          }
          return {
            ...sale,
            salesmanName,
          };
        })
    );

    const totalRevenue = enrichedSales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);
    const totalDiscount = enrichedSales.reduce((acc, sale) => acc + (sale.discount || 0), 0);

    return {
      message: "Report generated successfully.",
      data: {
        totalRevenue,
        totalSales: enrichedSales.length,
        totalDiscount,
        sales: enrichedSales,
      },
    };
  } catch (error) {
    console.error("Error generating sales report: ", error);
    return {
      message: "An error occurred while generating the sales report. Please try again.",
    };
  }
}

// Expense Report Types and Action
export type ExpenseReportData = {
    totalExpenses: number;
    expenseCount: number;
    expenses: Expense[];
};

export type ExpenseReportState = {
  message: string;
  issues?: z.ZodIssue[];
  data?: ExpenseReportData;
};

export async function generateExpenseReport(
  prevState: ExpenseReportState,
  formData: FormData
): Promise<ExpenseReportState> {
  const parsed = ReportFormSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    return {
      message: "Invalid form data.",
      issues: parsed.error.issues,
    };
  }
  
  const { startDate, endDate } = parsed.data;
  
  try {
    const expensesQuery = query(
      collection(db, "expenses"),
      where("date", ">=", startDate.split('T')[0]),
      where("date", "<=", endDate.split('T')[0])
    );

    const querySnapshot = await getDocs(expensesQuery);
    const expensesData: Expense[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Expense
    });

    if (expensesData.length === 0) {
        return {
            message: "No expenses found for the selected date range.",
            data: { totalExpenses: 0, expenseCount: 0, expenses: [] }
        }
    }

    const totalExpenses = expensesData.reduce((acc, exp) => acc + exp.amount, 0);

    return {
      message: "Expense report generated successfully.",
      data: {
        totalExpenses,
        expenseCount: expensesData.length,
        expenses: expensesData,
      },
    };
  } catch (error) {
    console.error("Error generating expense report: ", error);
    return {
      message: "An error occurred while generating the expense report. Please try again.",
    };
  }
}


// Profit and Loss Report
export type ProfitLossReportData = {
    totalRevenue: number;
    totalExpenses: number;
    netProfitOrLoss: number;
};

export type ProfitLossReportState = {
  message: string;
  issues?: z.ZodIssue[];
  data?: ProfitLossReportData;
};


export async function generateProfitAndLossReport(
  prevState: ProfitLossReportState,
  formData: FormData
): Promise<ProfitLossReportState> {
  const parsed = ReportFormSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    return {
      message: "Invalid form data.",
      issues: parsed.error.issues,
    };
  }

  const { startDate, endDate } = parsed.data;
  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setHours(23, 59, 59, 999);

  try {
    // Calculate Total Revenue
    const salesQuery = query(
      collection(db, "sales"),
      where("date", ">=", new Date(startDate)),
      where("date", "<=", adjustedEndDate)
    );
    const salesSnapshot = await getDocs(salesQuery);
    const salesData = salesSnapshot.docs.map(doc => doc.data() as Sale);
    const totalRevenue = salesData.reduce((acc, sale) => acc + sale.totalAmount, 0);

    // Calculate Total Expenses
    const expensesQuery = query(
      collection(db, "expenses"),
      where("date", ">=", startDate.split('T')[0]),
      where("date", "<=", endDate.split('T')[0])
    );
    const expensesSnapshot = await getDocs(expensesQuery);
    const expensesData = expensesSnapshot.docs.map(doc => doc.data() as Expense);
    const totalExpenses = expensesData.reduce((acc, exp) => acc + exp.amount, 0);
    
    const netProfitOrLoss = totalRevenue - totalExpenses;

    return {
      message: "Profit & Loss report generated successfully.",
      data: {
        totalRevenue,
        totalExpenses,
        netProfitOrLoss,
      },
    };
  } catch (error) {
    console.error("Error generating Profit & Loss report: ", error);
    return {
      message: "An error occurred while generating the Profit & Loss report.",
    };
  }
}

// My Sales Report (for Salesman)
export async function generateMySalesReport(
  prevState: SalesReportState,
  formData: FormData
): Promise<SalesReportState> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return { message: "You must be logged in to generate a report." };
    }

    const salesmanId = currentUser.uid;

    const parsed = ReportFormSchema.safeParse({
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
    });

    if (!parsed.success) {
        return { message: "Invalid form data.", issues: parsed.error.issues };
    }

    const { startDate, endDate } = parsed.data;
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    try {
        const salesQuery = query(
            collection(db, "sales"),
            where("salesmanId", "==", salesmanId),
            where("date", ">=", new Date(startDate)),
            where("date", "<=", adjustedEndDate)
        );

        const querySnapshot = await getDocs(salesQuery);
        const salesData: Sale[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: (data.date as Timestamp).toDate().toISOString(),
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            } as unknown as Sale;
        });

        if (salesData.length === 0) {
            return {
                message: "No sales found for the selected date range.",
                data: { totalRevenue: 0, totalSales: 0, totalDiscount: 0, sales: [] }
            };
        }

        const totalRevenue = salesData.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);
        const totalDiscount = salesData.reduce((acc, sale) => acc + (sale.discount || 0), 0);

        return {
            message: "Report generated successfully.",
            data: {
                totalRevenue,
                totalSales: salesData.length,
                totalDiscount,
                sales: salesData.map(s => ({...s, salesmanName: currentUser.displayName || 'Me'})),
            },
        };
    } catch (error) {
        console.error("Error generating my sales report: ", error);
        return { message: "An error occurred while generating your sales report." };
    }
}


// Worker Task History Report
type WorkerTaskHistory = {
    id: string;
    workerId: string;
    task: string;
    completedAt: { seconds: number, nanoseconds: number } | string | Date;
}
export type WorkerTaskHistoryReportData = {
    tasks: WorkerTaskHistory[];
};

export type WorkerTaskHistoryReportState = {
  message: string;
  data?: WorkerTaskHistoryReportData;
};

export async function generateWorkerTaskHistoryReport(
  prevState: WorkerTaskHistoryReportState,
  formData: FormData
): Promise<WorkerTaskHistoryReportState> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return { message: "You must be logged in to generate a report." };
    }
    
    try {
        const historyQuery = query(
            collection(db, "worker_task_history"),
            where("workerId", "==", currentUser.uid),
            orderBy("completedAt", "desc")
        );

        const querySnapshot = await getDocs(historyQuery);
        const tasksData: WorkerTaskHistory[] = querySnapshot.docs.map(doc => {
             const data = doc.data();
             return {
                id: doc.id,
                ...data,
                completedAt: (data.completedAt as Timestamp).toDate().toISOString()
             } as WorkerTaskHistory
        });
        
        if(tasksData.length === 0) {
            return { message: "No completed tasks found." };
        }

        return {
            message: "Task history report generated successfully.",
            data: { tasks: tasksData }
        };

    } catch (error) {
        console.error("Error generating worker task history report: ", error);
        return { message: "An error occurred while generating the report." };
    }
}
