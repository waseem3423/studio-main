'use server';
/**
 * @fileOverview An AI agent for generating worker task descriptions.
 *
 * - generateTaskDescription - A function that handles the task generation process.
 * - GenerateTaskDescriptionInput - The input type for the generateTaskDescription function.
 * - GenerateTaskDescriptionOutput - The return type for the generateTaskDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTaskDescriptionInputSchema = z.object({
  prompt: z
    .string()
    .describe('A short prompt with keywords about the task, e.g., "50 soap, 20 bleach".'),
  workerGender: z
    .enum(['male', 'female'])
    .describe("The gender of the worker, to ensure grammatically correct Roman Urdu."),
});
export type GenerateTaskDescriptionInput = z.infer<
  typeof GenerateTaskDescriptionInputSchema
>;

const GenerateTaskDescriptionOutputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The fully-formed, detailed task description for the worker in Roman Urdu.'),
});
export type GenerateTaskDescriptionOutput = z.infer<
  typeof GenerateTaskDescriptionOutputSchema
>;

export async function generateTaskDescription(
  input: GenerateTaskDescriptionInput
): Promise<GenerateTaskDescriptionOutput> {
  return generateTaskDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTaskDescriptionPrompt',
  input: {schema: GenerateTaskDescriptionInputSchema},
  output: {schema: GenerateTaskDescriptionOutputSchema},
  prompt: `You are an expert logistics and warehouse manager who is fluent in Roman Urdu. Your task is to convert simple keywords into a clear, concise, and professional task description for a warehouse worker, in Roman Urdu.

  You must consider the worker's gender to ensure the language is grammatically correct.
  - If gender is 'male', use masculine verbs (e.g., "karna hai", "pack karein").
  - If gender is 'female', use feminine verbs (e.g., "karni hai", "pack karein").

  Example User Prompt: "50 boxes soap, 20 boxes bleach", Gender: "male"
  Example AI Output: "Aapko 50 sabun ke dabbe aur 20 bleach ke dabbe pack karne hain. Is baat ka khayal rakhein ke packing mehfooz ho aur dispatch ke liye tayyar ho. Kaam mukammal hone par progress update karein."

  Example User Prompt: "100 bottles juice", Gender: "female"
  Example AI Output: "Aapko 100 juice ki bottles theek se pack karni hain. Is baat ka khayal rakhein ke packing mehfooz ho aur dispatch ke liye tayyar ho. Kaam mukammal hone par progress update karein."


  User Prompt: {{{prompt}}}
  Worker's Gender: {{{workerGender}}}

  Generate a suitable task description in Roman Urdu based on the prompt and gender. Keep it professional and direct.
  `,
});

const generateTaskDescriptionFlow = ai.defineFlow(
  {
    name: 'generateTaskDescriptionFlow',
    inputSchema: GenerateTaskDescriptionInputSchema,
    outputSchema: GenerateTaskDescriptionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
