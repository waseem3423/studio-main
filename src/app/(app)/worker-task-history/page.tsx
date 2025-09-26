"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
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
import { format } from "date-fns";

type TaskHistory = {
  id: string;
  task: string;
  completedAt: Timestamp | string;
};

export default function WorkerTaskHistoryPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (user) {
        setLoading(true);
        try {
          // Query for new, correctly saved tasks
          const correctHistoryQuery = query(
            collection(db, "worker_task_history"),
            where("workerId", "==", user.uid)
          );
          
          // Query for old, incorrectly saved tasks
          const incorrectHistoryQuery = query(
            collection(db, "worker_task_history"),
            where("salesmanId", "==", user.uid)
          );

          const [correctSnapshot, incorrectSnapshot] = await Promise.all([
              getDocs(correctHistoryQuery),
              getDocs(incorrectHistoryQuery)
          ]);
          
          const correctData = correctSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as TaskHistory)
          );
          
          const incorrectData = incorrectSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as TaskHistory)
          );
          
          // Merge and remove duplicates (if any)
          const allDataMap = new Map<string, TaskHistory>();
          [...correctData, ...incorrectData].forEach(item => {
              allDataMap.set(item.id, item);
          });
          
          const combinedHistory = Array.from(allDataMap.values());

          // Sort combined history by date
          combinedHistory.sort((a, b) => {
              const dateA = a.completedAt instanceof Timestamp ? a.completedAt.toMillis() : new Date(a.completedAt).getTime();
              const dateB = b.completedAt instanceof Timestamp ? b.completedAt.toMillis() : new Date(b.completedAt).getTime();
              return dateB - dateA;
          });

          setHistory(combinedHistory);

        } catch (error) {
          console.error("Error fetching task history: ", error);
        } finally {
          setLoading(false);
        }
      } else if (!loadingAuth) {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, loadingAuth]);

  const formatDate = (date: Timestamp | string) => {
    if (!date) return "N/A";
    if (typeof date === 'string') {
        return format(new Date(date), "dd MMM, yyyy 'at' hh:mm a");
    }
    return format(date.toDate(), "dd MMM, yyyy 'at' hh:mm a");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">My Completed Tasks</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Task History</CardTitle>
          <CardDescription>A log of all the tasks you have completed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Description</TableHead>
                <TableHead className="text-right">Completion Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || loadingAuth ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center h-24">
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center h-24">
                    You have not completed any tasks yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.task}</TableCell>
                    <TableCell className="text-right">
                      {formatDate(item.completedAt)}
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