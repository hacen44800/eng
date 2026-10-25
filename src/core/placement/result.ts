import { normalizeEvents, type AppEvent } from '../events';
import type { Cefr, Skill } from '../levels';
import { answersFor, writingScoresFor } from './progress';
import { levelFromAnswers, levelFromScores, weakestSkill } from './scoring';

export type PlacementResult = { sessionId: string; completedAt: number; levels: Record<Skill, Cefr>; weakest: Skill };

export function latestPlacementResult(events: AppEvent[]): PlacementResult | null {
  const sorted = normalizeEvents(events);
  const last = [...sorted].reverse().find(e => e.type === 'placement_completed');
  if (!last) return null;
  const sessionId = last.payload.sessionId;
  const levels: Record<Skill, Cefr> = {
    grammarVocab: levelFromAnswers(answersFor(sorted, sessionId, 'grammarVocab')),
    listening: levelFromAnswers(answersFor(sorted, sessionId, 'listening')),
    writing: levelFromScores([...writingScoresFor(sorted, sessionId).values()]),
    speaking: levelFromAnswers(answersFor(sorted, sessionId, 'speaking')),
  };
  return { sessionId, completedAt: last.createdAt, levels, weakest: weakestSkill(levels) };
}
