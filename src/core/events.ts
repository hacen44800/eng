import type { Cefr, Skill } from './levels';

type Base<T extends string, P> = { id: string; type: T; payload: P; createdAt: number; deviceId: string };

export type PlacementAnswerEvent = Base<'placement_answer', {
  sessionId: string;
  skill: 'grammarVocab' | 'listening' | 'speaking';
  itemId: string;
  level: Cefr;
  correct: boolean;
}>;

export type ProductionGradedEvent = Base<'production_graded', {
  context: 'placement';
  sessionId: string;
  skill: Extract<Skill, 'writing'>;
  promptId: string;
  score: number; // 0..4
}>;

export type PlacementCompletedEvent = Base<'placement_completed', { sessionId: string }>;

export type AppEvent = PlacementAnswerEvent | ProductionGradedEvent | PlacementCompletedEvent;

type PayloadOf<T extends AppEvent['type']> = Extract<AppEvent, { type: T }>['payload'];

export function makeEvent<T extends AppEvent['type']>(
  type: T,
  payload: PayloadOf<T>,
  deviceId: string,
  now: number = Date.now(),
  id: string = crypto.randomUUID(),
): Extract<AppEvent, { type: T }> {
  return { id, type, payload, createdAt: now, deviceId } as Extract<AppEvent, { type: T }>;
}

export function normalizeEvents(events: AppEvent[]): AppEvent[] {
  const byId = new Map<string, AppEvent>();
  for (const e of events) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
