"use server";

import {
  detectSalesmanAnomaly,
  DetectSalesmanAnomalyOutput,
} from "@/ai/flows/salesman-anomaly-detection";
import { z } from "zod";

const FormSchema = z.object({
  salesmanName: z.string().min(1, "Salesman name is required."),
  saleDate: z.string().min(1, "Sale date is required."),
  saleTime: z.string().min(1, "Sale time is required."),
  customerName: z.string().min(1, "Customer name is required."),
  locationData: z.string().min(1, "Location data is required."),
  productsSold: z.string().min(1, "Products sold is required."),
  totalSaleAmount: z.coerce
    .number()
    .min(0, "Total sale amount must be a positive number."),
});

export type FormState = {
  message: string;
  fields?: Record<string, string>;
  issues?: z.ZodIssue[];
  data?: DetectSalesmanAnomalyOutput;
};

export async function analyzeSale(
  prevState: FormState,
  data: FormData
): Promise<FormState> {
  const formData = Object.fromEntries(data);
  const parsed = FormSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      message: "Invalid form data.",
      fields: Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, value.toString()])
      ),
      issues: parsed.error.issues,
    };
  }

  try {
    const result = await detectSalesmanAnomaly(parsed.data);
    return {
      message: "Analysis complete.",
      data: result,
    };
  } catch (error) {
    return {
      message: "An error occurred during analysis. Please try again.",
    };
  }
}
