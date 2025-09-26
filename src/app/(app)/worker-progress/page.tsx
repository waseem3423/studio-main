
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, doc } from "firebase/firestore";
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
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/data";

type WorkerWithTask = User & {
    task?: string;
    progress?: string;
};

export default function WorkerProgressPage() {
    const [workersWithTasks, setWorkersWithTasks] = useState<WorkerWithTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkers = async () => {
            const q = query(collection(db, "users"), where("role", "==", "worker"));
            const querySnapshot = await getDocs(q);
            const workersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            
            // Set initial data
            setWorkersWithTasks(workersData);
            setLoading(false);

            // Set up listeners for each worker's task
            workersData.forEach(worker => {
                const taskDocRef = doc(db, "worker_tasks", worker.id);
                onSnapshot(taskDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const { task, progress } = docSnap.data();
                        setWorkersWithTasks(prevWorkers => 
                            prevWorkers.map(w => 
                                w.id === worker.id ? { ...w, task, progress } : w
                            )
                        );
                    } else {
                        // Handle case where task is deleted
                         setWorkersWithTasks(prevWorkers => 
                            prevWorkers.map(w => 
                                w.id === worker.id ? { ...w, task: undefined, progress: undefined } : w
                            )
                        );
                    }
                });
            });
        };

        fetchWorkers();
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold font-headline">Worker Daily Progress</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Live Progress Overview</CardTitle>
                    <CardDescription>
                        Track the progress of all workers in real-time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Worker Name</TableHead>
                                <TableHead>Assigned Task</TableHead>
                                <TableHead>Current Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">Loading worker data...</TableCell>
                                </TableRow>
                            ) : workersWithTasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">No workers found.</TableCell>
                                </TableRow>
                            ) : (
                                workersWithTasks.map((worker) => (
                                    <TableRow key={worker.id}>
                                        <TableCell className="font-medium">{worker.name}</TableCell>
                                        <TableCell>{worker.task || <span className="text-muted-foreground">No task assigned</span>}</TableCell>
                                        <TableCell>
                                            {worker.progress ? (
                                                <Badge variant="secondary">{worker.progress}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">No progress updated</span>
                                            )}
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
