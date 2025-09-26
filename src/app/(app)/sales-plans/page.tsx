
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
import { Input } from "@/components/ui/input";
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
import { collection, getDocs, query, where, doc, setDoc, getDoc, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import type { User, SalesmanPlan } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Sparkles, Loader2 } from "lucide-react";
import { generateSalesPlanItems } from "@/ai/flows/generate-sales-plan-items";

const salesPlanSchema = z.object({
  salesmanId: z.string().min(1, "Salesman is required."),
  location: z.string().min(1, "Location is required."),
  itemsToCarry: z.string().optional(),
});

type SalesPlanFormValues = z.infer<typeof salesPlanSchema>;

type EnrichedPlan = SalesmanPlan & { salesmanName: string; salesmanId: string };

export default function SalesPlansPage() {
  const { toast } = useToast();
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<{ [key: string]: Partial<SalesmanPlan> }>({});
  const [allPlans, setAllPlans] = useState<EnrichedPlan[]>([]);
  const [user] = useAuthState(auth);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<SalesPlanFormValues>({
    resolver: zodResolver(salesPlanSchema),
    defaultValues: {
      salesmanId: "",
      location: "",
      itemsToCarry: "",
    },
  });

  const selectedSalesmanId = form.watch("salesmanId");

  useEffect(() => {
    const fetchSalesmen = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "salesman"));
        const querySnapshot = await getDocs(q);
        const salesmenData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setSalesmen(salesmenData);
      } catch (error) {
        console.error("Error fetching salesmen: ", error);
        toast({ title: "Error", description: "Failed to fetch salesmen.", variant: "destructive" });
      }
    };
    fetchSalesmen();

    const plansCollectionRef = collection(db, "salesman_plans");
    const unsubscribe = onSnapshot(plansCollectionRef, async (snapshot) => {
        const plansData: { [key: string]: Partial<SalesmanPlan> } = {};
        const enrichedPlansPromises = snapshot.docs.map(async (planDoc) => {
            const plan = planDoc.data() as SalesmanPlan;
            plansData[planDoc.id] = plan;

            const userDoc = await getDoc(doc(db, "users", planDoc.id));
            const salesmanName = userDoc.exists() ? (userDoc.data() as User).name : "Unknown Salesman";

            return {
                ...plan,
                salesmanId: planDoc.id,
                salesmanName: salesmanName,
            };
        });

        const resolvedEnrichedPlans = await Promise.all(enrichedPlansPromises);
        setPlans(plansData);
        setAllPlans(resolvedEnrichedPlans);
    });

    return () => unsubscribe();
}, [toast]);
  
  useEffect(() => {
    if (selectedSalesmanId && plans[selectedSalesmanId]) {
      const plan = plans[selectedSalesmanId];
      form.setValue("location", plan.location || "");
      form.setValue("itemsToCarry", plan.itemsToCarry || "");
    } else {
      // Reset if no plan exists for the selected salesman
      form.reset({
        salesmanId: selectedSalesmanId,
        location: "",
        itemsToCarry: "",
      });
    }
  }, [selectedSalesmanId, plans, form]);


  async function onSubmit(data: SalesPlanFormValues) {
    if(!user) {
        toast({ title: "Error", description: "You must be logged in to perform this action.", variant: "destructive"});
        return;
    }
    setLoading(true);
    try {
      const planDocRef = doc(db, "salesman_plans", data.salesmanId);
      const currentPlanDoc = await getDoc(planDocRef);

      // If a plan already exists, move it to history
      if (currentPlanDoc.exists()) {
        const oldPlanData = currentPlanDoc.data() as SalesmanPlan;
        if(oldPlanData.location) { // Only add to history if there was a location
            await addDoc(collection(db, "salesman_plan_history"), {
                ...oldPlanData,
                salesmanId: data.salesmanId,
                endDate: serverTimestamp() 
            });
        }
      }
      
      const adminUserDoc = await getDoc(doc(db, "users", user.uid));
      const adminName = adminUserDoc.exists() ? adminUserDoc.data().name : "Admin/Manager";
      
      // Set the new plan
      await setDoc(planDocRef, {
        location: data.location,
        itemsToCarry: data.itemsToCarry,
        updatedAt: serverTimestamp(),
        assignedBy: user.uid,
        assignedByName: adminName,
      });

      toast({
        title: "Plan Saved",
        description: "The plan has been successfully saved for the salesman.",
      });
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Error",
        description: "Failed to save the plan.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }
  
  const handleEditClick = (salesmanId: string) => {
      form.setValue("salesmanId", salesmanId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleGenerateItems = async () => {
    if(!aiPrompt) {
      toast({ title: "Prompt is empty", description: "Please enter some keywords to generate an item list.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateSalesPlanItems({ prompt: aiPrompt });
      form.setValue("itemsToCarry", result.itemList);
      toast({ title: "Item List Generated", description: "AI has generated the item list." });
    } catch (error) {
      console.error("Error generating item list:", error);
      toast({ title: "AI Error", description: "Failed to generate item list from prompt.", variant: "destructive" });
    }
    setIsGenerating(false);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Salesman Daily Plans</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create or Edit a Plan</CardTitle>
              <CardDescription>
                Select a salesman to set their location for the day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="salesmanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salesman</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a salesman" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {salesmen.length > 0 ? (
                          salesmen.map((salesman) => (
                            <SelectItem key={salesman.id} value={salesman.id}>
                              {salesman.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled>
                            Loading salesmen...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Gulberg, Lahore" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>AI Item List Generator</FormLabel>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g., extra soap, new brochures, price list" 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <Button type="button" onClick={handleGenerateItems} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Generate</span>
                  </Button>
                </div>
                 <p className="text-sm text-muted-foreground">
                    Enter keywords and let AI create a detailed list for the salesman.
                </p>
              </div>

              <FormField
                control={form.control}
                name="itemsToCarry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Items to Carry (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List any specific items the salesman needs to carry..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !selectedSalesmanId}>
              {loading ? "Saving Plan..." : "Save Plan"}
            </Button>
          </div>
        </form>
      </Form>
      
       <Card>
        <CardHeader>
          <CardTitle>All Saved Plans</CardTitle>
          <CardDescription>
            A list of all currently active plans for your salesmen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesman</TableHead>
                <TableHead>Current Location</TableHead>
                <TableHead>Items to Carry</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No plans saved yet.
                  </TableCell>
                </TableRow>
              ) : (
                allPlans.map((plan) => (
                  <TableRow key={plan.salesmanId}>
                    <TableCell className="font-medium">{plan.salesmanName}</TableCell>
                    <TableCell>{plan.location}</TableCell>
                    <TableCell>{plan.itemsToCarry || "N/A"}</TableCell>
                    <TableCell>{plan.assignedByName || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(plan.salesmanId)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
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
