"use client";

import { useActionState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { analyzeSale, FormState } from "./actions";

const initialState: FormState = {
  message: "",
};

export function AnomalyForm() {
  const [state, formAction] = useActionState(analyzeSale, initialState);

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Analyze Salesman Activity</CardTitle>
          <CardDescription>
            Enter the details of a sale to check for any anomalies using AI.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesmanName">Salesman Name</Label>
                <Input
                  id="salesmanName"
                  name="salesmanName"
                  placeholder="e.g., Ali Khan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder="e.g., Butt General Store"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="saleDate">Sale Date</Label>
                <Input
                  id="saleDate"
                  name="saleDate"
                  type="date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saleTime">Sale Time</Label>
                <Input
                  id="saleTime"
                  name="saleTime"
                  type="time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationData">Location Data</Label>
              <Input
                id="locationData"
                name="locationData"
                placeholder="e.g., Gulberg, Lahore"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productsSold">Products Sold</Label>
              <Textarea
                id="productsSold"
                name="productsSold"
                placeholder="e.g., 10x Soap, 5x Bleach"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSaleAmount">Total Sale Amount</Label>
              <Input
                id="totalSaleAmount"
                name="totalSaleAmount"
                type="number"
                placeholder="e.g., 2500"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-4">
            <Button type="submit">Analyze Sale</Button>
            {state?.data && (
              <Alert variant={state.data.anomalyDetected ? "destructive" : "default"} className={!state.data.anomalyDetected ? "border-green-500/50 text-green-700 dark:border-green-500/50 dark:text-green-400" : ""}>
                {state.data.anomalyDetected ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <AlertTitle className="font-headline">
                  {state.data.anomalyDetected ? "Anomaly Detected" : "No Anomaly Detected"}
                </AlertTitle>
                <AlertDescription>
                  {state.data.anomalyDescription}
                </AlertDescription>
              </Alert>
            )}
            {state?.issues && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Please correct the following issues:
                        <ul className="list-disc list-inside">
                            {state.issues.map(issue => <li key={issue.path[0]}>{issue.message}</li>)}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
