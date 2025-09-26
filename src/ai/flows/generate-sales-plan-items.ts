
'use server';
/**
 * @fileOverview An AI agent for generating a salesman's "items to carry" list.
 *
 * - generateSalesPlanItems - A function that handles the item list generation.
 * - GenerateSalesPlanItemsInput - The input type for the function.
 * - GenerateSalesPlanItemsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSalesPlanItemsInputSchema = z.object({
  prompt: z
    .string()
    .describe('A short prompt with keywords about the items, e.g., "extra soap, new brochures, price list".'),
});
export type GenerateSalesPlanItemsInput = z.infer<
  typeof GenerateSalesPlanItemsInputSchema
>;

const GenerateSalesPlanItemsOutputSchema = z.object({
  itemList: z
    .string()
    .describe('The fully-formed, detailed list of items for the salesman to carry in Roman Urdu.'),
});
export type GenerateSalesPlanItemsOutput = z.infer<
  typeof GenerateSalesPlanItemsOutputSchema
>;

export async function generateSalesPlanItems(
  input: GenerateSalesPlanItemsInput
): Promise<GenerateSalesPlanItemsOutput> {
  return generateSalesPlanItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSalesPlanItemsPrompt',
  input: {schema: GenerateSalesPlanItemsInputSchema},
  output: {schema: GenerateSalesPlanItemsOutputSchema},
  prompt: `You are an expert sales manager who is fluent in Roman Urdu. Your task is to convert simple keywords into a clear, concise, and professional list of items for a salesman to carry for the day, in Roman Urdu. Use a direct and instructional tone.

  Example User Prompt: "extra soap, new brochures, price list"
  Example AI Output: "Aaj aapko yeh cheezein apne saath le kar jani hain:
- Ziyada demand wale ilaqon ke liye sabun ke extra dabbe.
- Nayee campaign ke liye naye promotional brochures.
- Mukammal price list ki ek updated copy."

  User Prompt: {{{prompt}}}

  Generate a suitable item list in Roman Urdu based on the prompt. Keep it professional, direct, and clear. Do not use overly formal or begging language like "guzarish hai".
  `,
});

const generateSalesPlanItemsFlow = ai.defineFlow(
  {
    name: 'generateSalesPlanItemsFlow',
    inputSchema: GenerateSalesPlanItemsInputSchema,
    outputSchema: GenerateSalesPlanItemsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
