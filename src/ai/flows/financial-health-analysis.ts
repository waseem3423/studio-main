
'use server';
/**
 * @fileOverview A financial health analysis AI agent.
 *
 * - analyzeFinancialHealth - A function that handles the financial analysis process.
 * - FinancialHealthInput - The input type for the analyzeFinancialHealth function.
 * - FinancialHealthOutput - The return type for the analyzeFinancialHealth function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialHealthInputSchema = z.object({
  totalRevenue: z.number().describe('The total revenue over a period.'),
  totalExpenses: z.number().describe('The total expenses over the same period.'),
  topSellingProducts: z
    .string()
    .describe('A comma-separated list of top-selling products.'),
});
export type FinancialHealthInput = z.infer<typeof FinancialHealthInputSchema>;

const FinancialHealthOutputSchema = z.object({
  financialStatus: z
    .enum(['Profit', 'Loss', 'Breakeven'])
    .describe('The overall financial status.'),
  netResult: z.number().describe('The net result (Revenue - Expenses).'),
  summary: z
    .string()
    .describe('A concise, one or two-sentence summary of the financial health.'),
  suggestions: z
    .array(z.string())
    .describe(
      'A list of 2-3 actionable suggestions for business improvement.'
    ),
});
export type FinancialHealthOutput = z.infer<typeof FinancialHealthOutputSchema>;

export async function analyzeFinancialHealth(input: FinancialHealthInput): Promise<FinancialHealthOutput> {
  return financialHealthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialHealthPrompt',
  input: {schema: FinancialHealthInputSchema},
  output: {schema: FinancialHealthOutputSchema},
  prompt: `You are an expert business analyst AI for a small-to-medium-sized enterprise. Your task is to analyze the provided financial data and give a clear, concise, and actionable summary in Roman Urdu.

  Analyze the following data for the last 30 days:
  - Total Revenue: {{{totalRevenue}}}
  - Total Expenses: {{{totalExpenses}}}
  - Top Selling Products: {{{topSellingProducts}}}

  Based on this data, perform the following steps:
  1.  Calculate the net result (Total Revenue - Total Expenses).
  2.  Determine the financial status: 'Profit' if net result is positive, 'Loss' if negative, and 'Breakeven' if zero.
  3.  Write a brief, insightful summary (1-2 sentences) in Roman Urdu, explaining the current situation. Mention the net result in the summary.
  4.  Provide 2-3 concrete, actionable suggestions for improvement in Roman Urdu. These suggestions should be practical for a small business. For example, if there's a loss, suggest ways to cut costs or boost sales. If there's a profit, suggest how to capitalize on it. If top-selling products are mentioned, use that information in your suggestions.

  Provide the output in the specified JSON format. The 'summary' and 'suggestions' fields MUST be in Roman Urdu.`,
});

const financialHealthFlow = ai.defineFlow(
  {
    name: 'financialHealthFlow',
    inputSchema: FinancialHealthInputSchema,
    outputSchema: FinancialHealthOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
