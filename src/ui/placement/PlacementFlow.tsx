import { useMemo } from 'react';
import { makeEvent, type AppEvent } from '../../core/events';
import type { Cefr } from '../../core/levels';
import type { Services } from '../../services';
import { placementProgress } from '../../core/placement/progress';
import { GRAMMAR_QUESTION_COUNT } from '../../core/placement/grammarEngine';
import GrammarStep from './GrammarStep';
import ListeningStep from './ListeningStep';
import WritingStep from './WritingStep';
import SpeakingStep from './SpeakingStep';

export type PlacementFlowProps = { services: Services; uid: string; events: AppEvent[]; sessionId: string; onDone: () => void };

const STEP_TITLES = { grammar: '1/4 Grammaire et vocabulaire', listening: '2/4 Écoute', writing: '3/4 Écrit', speaking: '4/4 Oral', done: 'Terminé' };

export default function PlacementFlow({ services, uid, events, sessionId, onDone }: PlacementFlowProps) {
  const { content, store, deviceId, speech, grader } = services;
  const p = useMemo(() => placementProgress(events, sessionId, content), [events, sessionId, content]);
  const append = (e: AppEvent) => store.append(uid, e);

  const answer = (skill: 'grammarVocab' | 'listening' | 'speaking', itemId: string, level: Cefr) =>
    (correct: boolean) => append(makeEvent('placement_answer', { sessionId, skill, itemId, level, correct }, deviceId));

  const finish = () => {
    append(makeEvent('placement_completed', { sessionId }, deviceId));
    onDone();
  };

  return (
    <main>
      <p className="muted">{STEP_TITLES[p.step]}</p>
      {p.step === 'grammar' && p.nextGrammar && (
        <GrammarStep key={p.nextGrammar.id} item={p.nextGrammar} index={p.grammarHistory.length} total={GRAMMAR_QUESTION_COUNT}
          onAnswer={answer('grammarVocab', p.nextGrammar.id, p.nextGrammar.level)} />
      )}
      {p.step === 'listening' && p.nextListening && (
        <ListeningStep key={p.nextListening.id} item={p.nextListening} speech={speech}
          onAnswer={answer('listening', p.nextListening.id, p.nextListening.level)} />
      )}
      {p.step === 'writing' && p.nextWriting && (
        <WritingStep key={p.nextWriting.id} prompt={p.nextWriting} grader={grader}
          onGraded={score => append(makeEvent('production_graded',
            { context: 'placement', sessionId, skill: 'writing', promptId: p.nextWriting!.id, score }, deviceId))} />
      )}
      {p.step === 'speaking' && p.nextSpeaking && (
        <SpeakingStep key={p.nextSpeaking.id} item={p.nextSpeaking} speech={speech}
          onAnswer={answer('speaking', p.nextSpeaking.id, p.nextSpeaking.level)} />
      )}
      {p.step === 'done' && (
        <section className="card">
          <h2>Test terminé</h2>
          <button onClick={finish}>Voir mon résultat</button>
        </section>
      )}
      <button className="secondary" onClick={onDone}>Pause (reprendre plus tard)</button>
    </main>
  );
}
