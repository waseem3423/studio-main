// Salesman anomaly detection flow to identify discrepancies in sales data.

'use server';

/**
 * @fileOverview Anomaly detection AI agent for salesman data.
 *
 * - detectSalesmanAnomaly - A function that handles the anomaly detection process.
 * - DetectSalesmanAnomalyInput - The input type for the detectSalesmanAnomaly function.
 * - DetectSalesmanAnomalyOutput - The return type for the detectSalesmanAnomaly function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectSalesmanAnomalyInputSchema = z.object({
  salesmanName: z.string().describe('The name of the salesman.'),
  saleDate: z.string().describe('The date of the sale (YYYY-MM-DD).'),
  saleTime: z.string().describe('The time of the sale (HH:MM).'),
  customerName: z.string().describe('The name of the customer.'),
  locationData: z.string().describe('The location data of the sale.'),
  productsSold: z.string().describe('Products sold during the sale.'),
  totalSaleAmount: z.number().describe('The total amount of the sale.'),
});

export type DetectSalesmanAnomalyInput = z.infer<typeof DetectSalesmanAnomalyInputSchema>;

const DetectSalesmanAnomalyOutputSchema = z.object({
  anomalyDetected: z.boolean().describe('Whether an anomaly was detected in the sales data.'),
  anomalyDescription: z.string().describe('A description of the anomaly, if any.'),
});

export type DetectSalesmanAnomalyOutput = z.infer<typeof DetectSalesmanAnomalyOutputSchema>;

export async function detectSalesmanAnomaly(input: DetectSalesmanAnomalyInput): Promise<DetectSalesmanAnomalyOutput> {
  return detectSalesmanAnomalyFlow(input);
}

const detectSalesmanAnomalyPrompt = ai.definePrompt({
  name: 'detectSalesmanAnomalyPrompt',
  input: {schema: DetectSalesmanAnomalyInputSchema},
  output: {schema: DetectSalesmanAnomalyOutputSchema},
  prompt: `You are an AI assistant that detects anomalies in sales data for a company.

  Analyze the following sales data to determine if there are any discrepancies or anomalies related to the salesman's location and timing.

  Salesman Name: {{{salesmanName}}}
  Sale Date: {{{saleDate}}}
  Sale Time: {{{saleTime}}}
  Customer Name: {{{customerName}}}
  Location Data: {{{locationData}}}
  Products Sold: {{{productsSold}}}
  Total Sale Amount: {{{totalSaleAmount}}}

  Based on the provided information, determine if there is any anomaly or discrepancy in the salesman's activity.
  For example, consider if the location data is drastically different from the expected sales region, or if the timing of the sale is unusual.

  If an anomaly is detected, set anomalyDetected to true and provide a detailed description in anomalyDescription.
  If no anomalies are found, set anomalyDetected to false and anomalyDescription to 'No anomalies detected.'`,
});

const detectSalesmanAnomalyFlow = ai.defineFlow(
  {
    name: 'detectSalesmanAnomalyFlow',
    inputSchema: DetectSalesmanAnomalyInputSchema,
    outputSchema: DetectSalesmanAnomalyOutputSchema,
  },
  async input => {
    const {output} = await detectSalesmanAnomalyPrompt(input);
    return output!;
  }
);
