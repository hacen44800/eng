import { z } from 'zod';

const cefr = z.enum(['A1', 'A2', 'B1', 'B2']);
const id = z.string().regex(/^[a-z0-9-]+$/);

export const grammarItem = z.object({
  id, level: cefr,
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

export const listeningItem = z.discriminatedUnion('kind', [
  z.object({
    id, level: cefr, kind: z.literal('mcq'),
    audio: z.string().min(1), question: z.string().min(1),
    choices: z.array(z.string().min(1)).length(4),
    answer: z.number().int().min(0).max(3),
    explanation: z.string().min(1),
  }),
  z.object({ id, level: cefr, kind: z.literal('dictation'), audio: z.string().min(1) }),
]);

export const writingPrompt = z.object({
  id,
  prompt: z.string().min(1),
  promptFr: z.string().min(1),
  rubric: z.array(z.string().min(1)).length(4),
  modelAnswer: z.string().min(1),
});

export const speakingItem = z.object({ id, level: cefr, text: z.string().min(1) });

export type GrammarItem = z.infer<typeof grammarItem>;
export type ListeningItem = z.infer<typeof listeningItem>;
export type WritingPrompt = z.infer<typeof writingPrompt>;
export type SpeakingItem = z.infer<typeof speakingItem>;

export const placementContentSchema = z.object({
  grammar: z.array(grammarItem),
  listening: z.array(listeningItem),
  writing: z.array(writingPrompt),
  speaking: z.array(speakingItem),
});
export type PlacementContent = z.infer<typeof placementContentSchema>;
