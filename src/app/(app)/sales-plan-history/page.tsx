
"use client";

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
import { format } from "date-fns";
import type { SalesmanPlan, User } from "@/lib/data";
import { UserCog } from "lucide-react";

type EnrichedPlanHistory = SalesmanPlan & {
  id: string;
  salesmanId: string;
  salesmanName?: string;
  endDate: { seconds: number; nanoseconds: number; } | Date;
};

export default function SalesPlanHistoryPage() {
  const [history, setHistory] = useState<EnrichedPlanHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const historyQuery = query(collection(db, "salesman_plan_history"), orderBy("endDate", "desc"));
        const querySnapshot = await getDocs(historyQuery);
        const historyData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        const enrichedHistory = await Promise.all(
          historyData.map(async (plan) => {
            let salesmanName = "N/A";
            if (plan.salesmanId) {
              try {
                const userDoc = await getDoc(doc(db, "users", plan.salesmanId));
                if (userDoc.exists()) {
                  salesmanName = (userDoc.data() as User).name;
                }
              } catch (e) { console.error("Could not fetch salesman name for history") }
            }
             if (plan.assignedBy && !plan.assignedByName) {
                try {
                    const assignerDoc = await getDoc(doc(db, "users", plan.assignedBy));
                    if (assignerDoc.exists()) {
                        plan.assignedByName = (assignerDoc.data() as User).name;
                    }
                } catch (e) { console.error("Could not fetch assigner name for history") }
            }
            return {
              ...plan,
              salesmanName,
            };
          })
        );

        setHistory(enrichedHistory);
      } catch (error) {
        console.error("Error fetching sales plan history: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    if (date.seconds) {
      return format(new Date(date.seconds * 1000), "dd MMM, yyyy 'at' hh:mm a");
    }
    return format(new Date(date), "dd MMM, yyyy 'at' hh:mm a");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">Salesman Plan History</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Plan Archives</CardTitle>
          <CardDescription>A complete log of all past salesman plans.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesman</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Items to Carry</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead>Plan End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Loading history...</TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No history records found.</TableCell>
                </TableRow>
              ) : (
                history.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.salesmanName}</TableCell>
                    <TableCell>{plan.location}</TableCell>
                    <TableCell>{plan.itemsToCarry || "N/A"}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                           <UserCog className="h-4 w-4 text-muted-foreground"/>
                           <span>{plan.assignedByName || "N/A"}</span>
                        </div>
                    </TableCell>
                    <TableCell>{formatDate(plan.endDate)}</TableCell>
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
