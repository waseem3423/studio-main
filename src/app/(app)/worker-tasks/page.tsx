"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { generateTaskDescription } from "@/ai/flows/generate-task-description";


const workerTaskSchema = z.object({
  workerId: z.string().min(1, "Worker is required."),
  task: z.string().min(1, "Task description is required."),
});

type WorkerTaskFormValues = z.infer<typeof workerTaskSchema>;

export default function WorkerTasksPage() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<{ [key: string]: Partial<WorkerTaskFormValues> }>({});
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [workerGender, setWorkerGender] = useState<"male" | "female">("male");
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<WorkerTaskFormValues>({
    resolver: zodResolver(workerTaskSchema),
    defaultValues: {
      workerId: "",
      task: "",
    },
  });

  const selectedWorkerId = form.watch("workerId");

  useEffect(() => {
    const fetchWorkersAndTasks = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "worker"));
        const querySnapshot = await getDocs(q);
        const workersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setWorkers(workersData);

        const tasksData: { [key: string]: Partial<WorkerTaskFormValues> } = {};
        for (const worker of workersData) {
            const taskDoc = await getDoc(doc(db, "worker_tasks", worker.id));
            if (taskDoc.exists()) {
                tasksData[worker.id] = taskDoc.data();
            }
        }
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ title: "Error", description: "Failed to fetch workers or tasks.", variant: "destructive" });
      }
    };
    fetchWorkersAndTasks();
  }, [toast]);
  
  useEffect(() => {
      if(selectedWorkerId && tasks[selectedWorkerId]) {
          form.setValue("task", tasks[selectedWorkerId].task || "");
      } else {
          form.setValue("task", "");
      }
  }, [selectedWorkerId, tasks, form]);

  async function onSubmit(data: WorkerTaskFormValues) {
    setLoading(true);
    try {
      await setDoc(doc(db, "worker_tasks", data.workerId), {
        task: data.task,
        assignedAt: serverTimestamp(),
        progress: "" // Reset progress when assigning a new task
      }, { merge: true });
      toast({
        title: "Task Assigned",
        description: "The task has been successfully assigned to the worker.",
      });
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: "Failed to assign the task.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }

  const handleGenerateTask = async () => {
    if(!aiPrompt) {
      toast({ title: "Prompt is empty", description: "Please enter some keywords to generate a task.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateTaskDescription({ prompt: aiPrompt, workerGender });
      form.setValue("task", result.taskDescription);
      toast({ title: "Task Generated", description: "AI has generated the task description in Roman Urdu." });
    } catch (error) {
      console.error("Error generating task:", error);
      toast({ title: "AI Error", description: "Failed to generate task from prompt.", variant: "destructive" });
    }
    setIsGenerating(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 font-headline">Worker Daily Tasks</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Assign or Edit a Task</CardTitle>
              <CardDescription>
                Select a worker to view, edit, or assign a new task for the day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Worker</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a worker" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workers.length > 0 ? (
                              workers.map((worker) => (
                                <SelectItem key={worker.id} value={worker.id}>
                                  {worker.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="loading" disabled>
                                Loading workers...
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={(value: "male" | "female") => setWorkerGender(value)} value={workerGender}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                    </Select>
                  </FormItem>
                </div>

              <div className="space-y-2">
                <FormLabel>AI Task Generator (Roman Urdu)</FormLabel>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g., 50 soap, 20 bleach" 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <Button type="button" onClick={handleGenerateTask} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Generate with AI</span>
                  </Button>
                </div>
                 <p className="text-sm text-muted-foreground">
                    Enter keywords and let AI create a detailed task description in Roman Urdu.
                </p>
              </div>

              <FormField
                control={form.control}
                name="task"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 50 boxes of soap and 20 boxes of bleach..."
                        {...field}
                        rows={5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !selectedWorkerId}>
              {loading ? "Assigning Task..." : "Assign Task"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
