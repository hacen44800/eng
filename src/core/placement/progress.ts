import { normalizeEvents, type AppEvent, type PlacementAnswerEvent } from '../events';
import type { GrammarItem, ListeningItem, PlacementContent, SpeakingItem, WritingPrompt } from '../../content/schemas';
import { nextGrammarItem, type AnswerRecord } from './grammarEngine';

export type PlacementStep = 'grammar' | 'listening' | 'writing' | 'speaking' | 'done';

export type PlacementProgress = {
  sessionId: string;
  step: PlacementStep;
  grammarHistory: AnswerRecord[];
  nextGrammar: GrammarItem | null;
  nextListening: ListeningItem | null;
  nextWriting: WritingPrompt | null;
  nextSpeaking: SpeakingItem | null;
};

function sessionOf(e: AppEvent): string {
  return e.payload.sessionId;
}

/** Dernière session commencée et non terminée, ou null. */
export function activeSessionId(events: AppEvent[]): string | null {
  const sorted = normalizeEvents(events);
  const completed = new Set(sorted.filter(e => e.type === 'placement_completed').map(sessionOf));
  for (let i = sorted.length - 1; i >= 0; i--) {
    const s = sessionOf(sorted[i]);
    if (!completed.has(s)) return s;
  }
  return null;
}

/** Réponses de la session pour une compétence, première réponse par item uniquement. */
export function answersFor(events: AppEvent[], sessionId: string, skill: PlacementAnswerEvent['payload']['skill']): AnswerRecord[] {
  const seen = new Set<string>();
  const out: AnswerRecord[] = [];
  for (const e of normalizeEvents(events)) {
    if (e.type !== 'placement_answer' || e.payload.sessionId !== sessionId || e.payload.skill !== skill) continue;
    if (seen.has(e.payload.itemId)) continue;
    seen.add(e.payload.itemId);
    out.push({ itemId: e.payload.itemId, level: e.payload.level, correct: e.payload.correct });
  }
  return out;
}

export function writingScoresFor(events: AppEvent[], sessionId: string): Map<string, number> {
  const scores = new Map<string, number>();
  for (const e of normalizeEvents(events)) {
    if (e.type === 'production_graded' && e.payload.sessionId === sessionId && !scores.has(e.payload.promptId)) {
      scores.set(e.payload.promptId, e.payload.score);
    }
  }
  return scores;
}

export function placementProgress(events: AppEvent[], sessionId: string, content: PlacementContent): PlacementProgress {
  const grammarHistory = answersFor(events, sessionId, 'grammarVocab');
  const listeningDone = new Set(answersFor(events, sessionId, 'listening').map(a => a.itemId));
  const speakingDone = new Set(answersFor(events, sessionId, 'speaking').map(a => a.itemId));
  const writingDone = writingScoresFor(events, sessionId);

  const nextGrammar = nextGrammarItem(content.grammar, grammarHistory);
  const nextListening = content.listening.find(i => !listeningDone.has(i.id)) ?? null;
  const nextWriting = content.writing.find(w => !writingDone.has(w.id)) ?? null;
  const nextSpeaking = content.speaking.find(s => !speakingDone.has(s.id)) ?? null;

  const step: PlacementStep =
    nextGrammar ? 'grammar' : nextListening ? 'listening' : nextWriting ? 'writing' : nextSpeaking ? 'speaking' : 'done';

  return { sessionId, step, grammarHistory, nextGrammar, nextListening, nextWriting, nextSpeaking };
}
