# Plan 1 — Socle technique et Level 1 (diagnostic) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une PWA déployée sur GitHub Pages, avec connexion GitHub, journal d'événements synchronisé via Firestore, et le test de positionnement Level 1 complet (grammaire adaptative, écoute, écrit, oral) donnant un niveau CECRL par compétence.

**Architecture:** React + TypeScript (Vite). Toute la logique métier est dans `src/core/` (fonctions pures, testées), qui ne connaît ni l'UI ni Firebase. L'état de l'appli est **dérivé** du journal d'événements (`AppEvent[]`) : l'UI ajoute des événements via `EventStore`, s'abonne au journal, et recalcule tout avec `core`. Les dépendances externes (auth, store, synthèse/reconnaissance vocale, correcteur) sont injectées dans `App` via un objet `Services`, ce qui permet de tester l'UI avec des faux.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Vitest 2 + Testing Library + jsdom, zod 3, Firebase 11 (Auth GitHub, Firestore avec cache persistant), firebase-tools 13 + @firebase/rules-unit-testing 4 (émulateur), vite-plugin-pwa 0.21, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-24-appli-anglais-design.md`

**Suite :** le Plan 2 (séance quotidienne Level 2, répétition espacée ts-fsrs, contenu 14 jours, épreuve de fin) sera rédigé après ce plan.

## Global Constraints

- Tout le code et l'hébergement sur le compte GitHub perso `hacen44800`, dépôt `https://github.com/hacen44800/eng` (public). Identité de commit locale déjà réglée : `hacen44800` / `44492770+hacen44800@users.noreply.github.com`. Ne jamais modifier la config git globale.
- Coût nul : GitHub Pages + Firebase plan Spark (sans moyen de paiement). Projet Firebase créé avec un compte Google **perso**.
- Aucun secret dans le dépôt (le secret de l'OAuth App GitHub va uniquement dans la console Firebase). La config Firebase web n'est pas un secret.
- Règle de dépendance : `core/` n'importe que `core/` et les types de `content/`. `grader/` n'importe que `core/` et ses propres types. Seuls `firebase/`, `auth/`, `storage/` importent le SDK Firebase.
- Événements immuables dans `users/{uid}/events/{eventId}`, forme `{ id, type, payload, createdAt, deviceId }`, `id` = UUID client.
- Base URL Vite : `/eng/` (URL finale `https://hacen44800.github.io/eng/`).
- Langue : interface en français, contenu d'apprentissage en anglais, thème informatique / travail.
- Niveaux CECRL : `A1 | A2 | B1 | B2`. Compétences : `grammarVocab | listening | writing | speaking`.
- Extension LLM future : toute évaluation passe par l'interface `Grader` ; aucun écran ne dépend de `RubricGrader` directement.

## Review Focus

1. **Rechargement ou fermeture en plein test** → la personne s'attend à reprendre là où elle s'était arrêtée, sans perdre ses réponses. Couvert : `placementProgress` dérive l'étape courante du journal (Task 4, test « reprend une session inachevée »).
2. **Double clic sur une réponse** → une seule réponse doit compter. Couvert : `placementProgress` ignore les réponses en double pour un même item (Task 4, test « ignore les doublons d'item »).
3. **Micro refusé ou reconnaissance vocale indisponible** → l'étape orale bascule sur l'auto-évaluation au lieu de bloquer. Couvert : test UI `SpeakingStep` (Task 9).
4. **Réponse écrite vide** → impossible de la valider. Couvert : test UI `WritingStep` (Task 9).
5. **Pas de voix de synthèse disponible** → l'étape d'écoute affiche la phrase en texte avec un avertissement au lieu de bloquer. Couvert : test UI `ListeningStep` (Task 9).

---

## Structure des fichiers

```
package.json, tsconfig.json, vite.config.ts, vitest.rules.config.ts, index.html
firebase.json, firestore.rules, .firebaserc
.github/workflows/deploy.yml
public/icon.svg (+ PNG générés)
src/
  main.tsx                 point d'entrée : construit les vrais Services, rend <App>
  App.tsx                  routage par état : login / home / placement / result
  styles.css
  services.ts              interfaces AuthService, EventStore, Services
  device.ts                deviceId persistant (localStorage)
  content/
    schemas.ts             schémas zod + types des items
    placement/grammar.json, listening.json, writing.json, speaking.json
    placement/index.ts     charge et valide le contenu → PlacementContent
  core/
    levels.ts              Cefr, LEVELS, Skill, SKILLS
    events.ts              AppEvent, makeEvent, normalizeEvents
    textScore.ts           wordAccuracy
    placement/
      grammarEngine.ts     currentLevel, nextGrammarItem (escalier 2-haut/1-bas)
      scoring.ts           levelFromAnswers, levelFromScores, weakestSkill
      progress.ts          placementProgress (état du test dérivé du journal)
      result.ts            latestPlacementResult
  grader/
    types.ts               Grader, GradeTask, GradeAnswer, GradeResult
    rubricGrader.ts        RubricGrader
  speech/browserSpeech.ts  Speech, createBrowserSpeech
  firebase/config.ts, firebase/app.ts
  auth/githubAuth.ts       createGithubAuth
  storage/firestoreEventStore.ts  createFirestoreEventStore (+ outbox)
  ui/
    LoginScreen.tsx, HomeScreen.tsx, ResultScreen.tsx
    placement/PlacementFlow.tsx, GrammarStep.tsx, ListeningStep.tsx, WritingStep.tsx, SpeakingStep.tsx
    testing/fakeServices.ts
tests/rules/firestore.rules.test.ts
```

Les tests unitaires sont à côté du fichier testé (`*.test.ts(x)`).

---

### Task 1: Scaffold du projet, tests et déploiement GitHub Pages

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/App.test.tsx`, `.github/workflows/deploy.yml`
- Modify: `.gitignore`

**Interfaces:**
- Produces: commandes `npm run dev`, `npm test`, `npm run build`, `npm run typecheck` ; base URL `/eng/`.

- [ ] **Step 1: Créer `package.json`**

```json
{
  "name": "eng",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:rules": "firebase emulators:exec --only firestore --project demo-eng \"vitest run --config vitest.rules.config.ts\""
  }
}
```

- [ ] **Step 2: Installer les dépendances (versions épinglées)**

Run:
```bash
npm install react@18.3.1 react-dom@18.3.1 zod@3.23.8 firebase@11.0.2
npm install -D vite@5.4.11 @vitejs/plugin-react@4.3.4 typescript@5.6.3 @types/react@18.3.12 @types/react-dom@18.3.1 vitest@2.1.8 jsdom@25.0.1 @testing-library/react@16.1.0 @testing-library/user-event@14.5.2 @testing-library/jest-dom@6.6.3 vite-plugin-pwa@0.21.1 firebase-tools@13.29.1 @firebase/rules-unit-testing@4.0.1
```
Expected: installation sans erreur `ERESOLVE`.

- [ ] **Step 3: Créer `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["vitest/globals", "@testing-library/jest-dom", "vite-plugin-pwa/client"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.rules.config.ts"]
}
```

- [ ] **Step 4: Créer `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/eng/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['@testing-library/jest-dom/vitest'],
  },
});
```

- [ ] **Step 5: Créer `index.html`, `src/styles.css`, `src/main.tsx`, `src/App.tsx` minimaux**

`index.html` :
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Eng</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/styles.css` :
```css
:root { --bg: #fafafa; --fg: #1a1a1a; --muted: #666; --accent: #2457d6; --ok: #1f8a4c; --ko: #c0392b; --card: #fff; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #121212; --fg: #eee; --muted: #aaa; --accent: #7aa2ff; --ok: #4cc27f; --ko: #ff6b5e; --card: #1e1e1e; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 640px; margin: 0 auto; padding: 16px; }
.card { background: var(--card); border-radius: 12px; padding: 16px; margin: 12px 0; box-shadow: 0 1px 3px rgba(0,0,0,.15); }
button { font: inherit; padding: 10px 16px; border-radius: 8px; border: 1px solid var(--accent); background: var(--accent); color: #fff; cursor: pointer; }
button.secondary { background: transparent; color: var(--accent); }
button:disabled { opacity: .5; cursor: not-allowed; }
.choices { display: grid; gap: 8px; }
.muted { color: var(--muted); }
.ok { color: var(--ok); } .ko { color: var(--ko); }
textarea { width: 100%; min-height: 120px; font: inherit; padding: 8px; }
.banner { padding: 8px 12px; border-radius: 8px; background: #fff3cd; color: #5c4400; margin: 8px 0; }
```

`src/App.tsx` (temporaire, remplacé en Task 9) :
```tsx
export default function App() {
  return <main><h1>Eng</h1></main>;
}
```

`src/main.tsx` (temporaire, remplacé en Task 9) :
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 6: Écrire un test de fumée `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('affiche le titre', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Eng' })).toBeInTheDocument();
});
```

- [ ] **Step 7: Lancer tests, typecheck et build**

Run: `npm test && npm run build`
Expected: 1 test PASS, build OK, dossier `dist/` créé.

- [ ] **Step 8: Workflow de déploiement `.github/workflows/deploy.yml`**

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 9: Compléter `.gitignore`**

Contenu final :
```
node_modules/
dist/
dev-dist/
.env*
.claude/settings.local.json
firebase-debug.log
firestore-debug.log
ui-debug.log
```

- [ ] **Step 10: Commit et push**

```bash
git add -A
git commit -m "chore: scaffold Vite React TS, Vitest et déploiement GitHub Pages"
git push
```

- [ ] **Step 11: Étape manuelle (utilisateur) — activer Pages**

Sur `https://github.com/hacen44800/eng` → Settings → Pages → Build and deployment → Source : **GitHub Actions**. Puis Actions → Deploy → **Run workflow**.
Expected : `https://hacen44800.github.io/eng/` affiche « Eng ».

---

### Task 2: Niveaux, journal d'événements et score de texte (core)

**Files:**
- Create: `src/core/levels.ts`, `src/core/events.ts`, `src/core/events.test.ts`, `src/core/textScore.ts`, `src/core/textScore.test.ts`

**Interfaces:**
- Produces:
  - `type Cefr = 'A1'|'A2'|'B1'|'B2'`, `const LEVELS: readonly Cefr[]`, `type Skill = 'grammarVocab'|'listening'|'writing'|'speaking'`, `const SKILLS: readonly Skill[]`
  - `type AppEvent` (union discriminée par `type`), `makeEvent<T extends AppEvent['type']>(type, payload, deviceId, now?, id?): AppEvent`, `normalizeEvents(events: AppEvent[]): AppEvent[]`
  - `wordAccuracy(expected: string, actual: string): number` (0..1)

- [ ] **Step 1: Créer `src/core/levels.ts`**

```ts
export type Cefr = 'A1' | 'A2' | 'B1' | 'B2';
export const LEVELS: readonly Cefr[] = ['A1', 'A2', 'B1', 'B2'];

export type Skill = 'grammarVocab' | 'listening' | 'writing' | 'speaking';
export const SKILLS: readonly Skill[] = ['grammarVocab', 'listening', 'writing', 'speaking'];
```

- [ ] **Step 2: Écrire les tests `src/core/events.test.ts`**

```ts
import { makeEvent, normalizeEvents, type AppEvent } from './events';

const answer = (id: string, createdAt: number): AppEvent =>
  makeEvent('placement_answer',
    { sessionId: 's1', skill: 'grammarVocab', itemId: `q-${id}`, level: 'A1', correct: true },
    'dev', createdAt, id);

test('makeEvent remplit id, createdAt, deviceId', () => {
  const e = makeEvent('placement_completed', { sessionId: 's1' }, 'dev-1', 1000, 'abc');
  expect(e).toEqual({ id: 'abc', type: 'placement_completed', payload: { sessionId: 's1' }, createdAt: 1000, deviceId: 'dev-1' });
});

test('makeEvent génère un UUID par défaut', () => {
  const e = makeEvent('placement_completed', { sessionId: 's1' }, 'dev');
  expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
});

test('normalizeEvents trie par createdAt puis id', () => {
  const out = normalizeEvents([answer('b', 2), answer('c', 1), answer('a', 2)]);
  expect(out.map(e => e.id)).toEqual(['c', 'a', 'b']);
});

test('normalizeEvents supprime les doublons d\'id (fusion de deux appareils)', () => {
  const out = normalizeEvents([answer('a', 1), answer('b', 2), answer('a', 1)]);
  expect(out.map(e => e.id)).toEqual(['a', 'b']);
});
```

- [ ] **Step 3: Lancer les tests — échec attendu**

Run: `npx vitest run src/core/events.test.ts`
Expected: FAIL (module `./events` introuvable).

- [ ] **Step 4: Implémenter `src/core/events.ts`**

```ts
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
```

- [ ] **Step 5: Relancer — succès attendu**

Run: `npx vitest run src/core/events.test.ts`
Expected: 4 PASS.

- [ ] **Step 6: Écrire les tests `src/core/textScore.test.ts`**

```ts
import { wordAccuracy } from './textScore';

test('identique → 1, insensible à la casse et à la ponctuation', () => {
  expect(wordAccuracy('I deployed the fix.', 'i deployed the fix')).toBe(1);
});

test('mot manquant → ratio des mots attendus retrouvés dans l\'ordre', () => {
  expect(wordAccuracy('I deployed the fix', 'I deployed fix')).toBe(0.75);
});

test('mots en trop non pénalisés, ordre respecté', () => {
  expect(wordAccuracy('the build failed', 'uh the build has failed')).toBe(1);
});

test('vide → 0, attendu vide → 0', () => {
  expect(wordAccuracy('hello world', '')).toBe(0);
  expect(wordAccuracy('', 'hello')).toBe(0);
});

test('apostrophes conservées dans les mots', () => {
  expect(wordAccuracy("I don't know", "I dont know")).toBeCloseTo(2 / 3);
});
```

- [ ] **Step 7: Lancer — échec attendu**

Run: `npx vitest run src/core/textScore.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 8: Implémenter `src/core/textScore.ts`**

```ts
function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
}

/** Part des mots attendus retrouvés dans l'ordre (plus longue sous-séquence commune). */
export function wordAccuracy(expected: string, actual: string): number {
  const a = tokenize(expected);
  const b = tokenize(actual);
  if (a.length === 0 || b.length === 0) return 0;
  const dp: number[] = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length] / a.length;
}
```

- [ ] **Step 9: Relancer tous les tests**

Run: `npm test`
Expected: tous PASS.

- [ ] **Step 10: Commit**

```bash
git add src/core
git commit -m "feat(core): niveaux CECRL, journal d'événements et score de texte"
```

---

### Task 3: Schémas de contenu et banque du test de positionnement

**Files:**
- Create: `src/content/schemas.ts`, `src/content/placement/grammar.json`, `src/content/placement/listening.json`, `src/content/placement/writing.json`, `src/content/placement/speaking.json`, `src/content/placement/index.ts`, `src/content/placement/content.test.ts`

**Interfaces:**
- Consumes: `Cefr`, `LEVELS` (Task 2)
- Produces:
  - `type GrammarItem = { id: string; level: Cefr; prompt: string; choices: string[]; answer: number; explanation: string }`
  - `type ListeningItem = { id: string; level: Cefr; kind: 'mcq'; audio: string; question: string; choices: string[]; answer: number; explanation: string } | { id: string; level: Cefr; kind: 'dictation'; audio: string }`
  - `type WritingPrompt = { id: string; prompt: string; promptFr: string; rubric: string[]; modelAnswer: string }`
  - `type SpeakingItem = { id: string; level: Cefr; text: string }`
  - `type PlacementContent = { grammar: GrammarItem[]; listening: ListeningItem[]; writing: WritingPrompt[]; speaking: SpeakingItem[] }`
  - `const placementContent: PlacementContent` (validé au chargement)

- [ ] **Step 1: Créer `src/content/schemas.ts`**

```ts
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
```

- [ ] **Step 2: Écrire les tests `src/content/placement/content.test.ts`**

```ts
import { placementContent } from './index';
import { LEVELS } from '../../core/levels';

const { grammar, listening, writing, speaking } = placementContent;
const countBy = <T extends { level: string }>(xs: T[], lvl: string) => xs.filter(x => x.level === lvl).length;

test('ids uniques sur toute la banque', () => {
  const ids = [...grammar, ...listening, ...writing, ...speaking].map(x => x.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test.each(LEVELS)('grammaire : 15 items de niveau %s', lvl => {
  expect(countBy(grammar, lvl)).toBe(15);
});

test.each(LEVELS)('écoute : 3 items de niveau %s dont au moins 1 dictée', lvl => {
  const items = listening.filter(x => x.level === lvl);
  expect(items).toHaveLength(3);
  expect(items.some(x => x.kind === 'dictation')).toBe(true);
});

test('écoute triée par niveau croissant', () => {
  const idx = listening.map(x => LEVELS.indexOf(x.level));
  expect(idx).toEqual([...idx].sort((a, b) => a - b));
});

test('écrit : 3 sujets', () => {
  expect(writing).toHaveLength(3);
});

test.each(LEVELS)('oral : 2 phrases de niveau %s', lvl => {
  expect(countBy(speaking, lvl)).toBe(2);
});

test('oral trié par niveau croissant', () => {
  const idx = speaking.map(x => LEVELS.indexOf(x.level));
  expect(idx).toEqual([...idx].sort((a, b) => a - b));
});

test('grammaire : choix distincts et réponse unique', () => {
  for (const q of grammar) expect(new Set(q.choices).size).toBe(4);
});
```

- [ ] **Step 3: Créer `src/content/placement/index.ts`**

```ts
import { placementContentSchema, type PlacementContent } from '../schemas';
import grammar from './grammar.json';
import listening from './listening.json';
import writing from './writing.json';
import speaking from './speaking.json';

export const placementContent: PlacementContent = placementContentSchema.parse({ grammar, listening, writing, speaking });
```

- [ ] **Step 4: Rédiger le contenu JSON**

Règles de rédaction (s'appliquent à tous les fichiers) :
- Thème : travail en informatique (code, réunions, bugs, déploiement, équipe, projet), vie pro courante pour A1.
- Niveaux : A1 = présent simple, be/have, vocabulaire de base ; A2 = passé simple, futur proche, comparatifs, prépositions de temps ; B1 = present perfect, conditionnel, passif simple, connecteurs ; B2 = present perfect continu, passif complexe, discours rapporté, nuances lexicales (phrasal verbs, faux amis FR/EN comme *actually*, *eventually*).
- Un seul choix correct par question, distracteurs plausibles (erreurs typiques de francophones).
- `explanation` en français, une phrase.
- Ordre des items de grammaire : mélangé à l'intérieur de chaque niveau.
- `listening` et `speaking` : triés par niveau croissant.

`grammar.json` : **60 items, 15 par niveau**, ids `g-a1-01` … `g-b2-15`. Exemples (à inclure tels quels) :
```json
[
  { "id": "g-a1-01", "level": "A1", "prompt": "I ___ a developer.", "choices": ["am", "is", "are", "be"], "answer": 0, "explanation": "Avec « I », le verbe be se conjugue « am »." },
  { "id": "g-a2-01", "level": "A2", "prompt": "Yesterday we ___ the new version.", "choices": ["release", "released", "have released", "are releasing"], "answer": 1, "explanation": "« Yesterday » indique un moment passé terminé : prétérit." },
  { "id": "g-b1-01", "level": "B1", "prompt": "I ___ on this project since January.", "choices": ["work", "worked", "have worked", "am working"], "answer": 2, "explanation": "« since » + action qui dure jusqu'à maintenant : present perfect." },
  { "id": "g-b2-01", "level": "B2", "prompt": "The bug was ___ fixed after three weeks.", "choices": ["actually", "eventually", "currently", "possibly"], "answer": 1, "explanation": "« eventually » = finalement ; « actually » = en fait (faux ami)." }
]
```

`listening.json` : **12 items, 3 par niveau** (2 `mcq` + 1 `dictation` par niveau), ids `l-a1-01` … `l-b2-03`. Exemples :
```json
[
  { "id": "l-a1-01", "level": "A1", "kind": "mcq", "audio": "My name is Sam. I work in a small IT company.", "question": "Where does Sam work?", "choices": ["In a bank", "In a small IT company", "In a school", "At home"], "answer": 1, "explanation": "« I work in a small IT company »." },
  { "id": "l-a1-03", "level": "A1", "kind": "dictation", "audio": "I start work at nine." }
]
```

`writing.json` : **3 sujets**, ids `w-01` … `w-03` : (1) se présenter et présenter son métier, (2) décrire ce qu'on a fait au travail la semaine dernière, (3) expliquer un problème technique récent et comment on l'a résolu. Chaque `rubric` contient ces 4 critères (en français, adaptés au sujet) : « J'ai écrit au moins 3 phrases complètes », « J'ai utilisé le bon temps (présent / passé) », « Mon texte répond à la question posée », « J'ai utilisé au moins 3 mots ou expressions du vocabulaire professionnel ». Exemple :
```json
[
  { "id": "w-01", "prompt": "Introduce yourself and describe your job.", "promptFr": "Présente-toi et décris ton métier.", "rubric": ["J'ai écrit au moins 3 phrases complètes", "J'ai utilisé le présent correctement", "Mon texte répond à la question posée", "J'ai utilisé au moins 3 mots du vocabulaire professionnel"], "modelAnswer": "Hi, I'm Alex. I'm a software developer in a team of five people. I mostly work on the back end of a web application. Every day I write code, review pull requests and fix bugs." }
]
```

`speaking.json` : **8 phrases, 2 par niveau**, ids `s-a1-01` … `s-b2-02`, longueur croissante (A1 ≈ 5 mots, B2 ≈ 18 mots). Exemples :
```json
[
  { "id": "s-a1-01", "level": "A1", "text": "I work in a team." },
  { "id": "s-b2-01", "level": "B2", "text": "If we had migrated the database earlier, we wouldn't have run into these performance issues." }
]
```

- [ ] **Step 5: Lancer les tests de contenu**

Run: `npx vitest run src/content`
Expected: tous PASS. En cas d'échec, corriger le JSON (compte, id, ordre), jamais les tests.

- [ ] **Step 6: Commit**

```bash
git add src/content
git commit -m "feat(content): schémas zod et banque du test de positionnement"
```

---

### Task 4: Moteur du test de positionnement (core/placement)

**Files:**
- Create: `src/core/placement/grammarEngine.ts`, `src/core/placement/grammarEngine.test.ts`, `src/core/placement/scoring.ts`, `src/core/placement/scoring.test.ts`, `src/core/placement/progress.ts`, `src/core/placement/progress.test.ts`, `src/core/placement/result.ts`, `src/core/placement/result.test.ts`

**Interfaces:**
- Consumes: `Cefr`, `LEVELS`, `Skill`, `SKILLS`, `AppEvent`, `normalizeEvents`, `makeEvent` (Task 2) ; types de contenu (Task 3)
- Produces:
  - `type AnswerRecord = { itemId: string; level: Cefr; correct: boolean }`
  - `GRAMMAR_QUESTION_COUNT = 30`, `currentLevel(history: AnswerRecord[], start?: Cefr): Cefr`, `nextGrammarItem(bank: GrammarItem[], history: AnswerRecord[], max?: number): GrammarItem | null`
  - `levelFromAnswers(answers: { level: Cefr; correct: boolean }[]): Cefr`, `levelFromScores(scores: number[]): Cefr`, `weakestSkill(levels: Record<Skill, Cefr>): Skill`
  - `type PlacementStep = 'grammar' | 'listening' | 'writing' | 'speaking' | 'done'`
  - `type PlacementProgress = { sessionId: string; step: PlacementStep; grammarHistory: AnswerRecord[]; nextGrammar: GrammarItem | null; nextListening: ListeningItem | null; nextWriting: WritingPrompt | null; nextSpeaking: SpeakingItem | null }`
  - `activeSessionId(events: AppEvent[]): string | null` (session commencée et non terminée)
  - `placementProgress(events: AppEvent[], sessionId: string, content: PlacementContent): PlacementProgress`
  - `type PlacementResult = { sessionId: string; completedAt: number; levels: Record<Skill, Cefr>; weakest: Skill }`
  - `latestPlacementResult(events: AppEvent[]): PlacementResult | null`

- [ ] **Step 1: Tests `src/core/placement/grammarEngine.test.ts`**

```ts
import { currentLevel, nextGrammarItem, type AnswerRecord } from './grammarEngine';
import type { GrammarItem } from '../../content/schemas';
import type { Cefr } from '../levels';

const q = (id: string, level: Cefr): GrammarItem =>
  ({ id, level, prompt: id, choices: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'x' });
const r = (itemId: string, level: Cefr, correct: boolean): AnswerRecord => ({ itemId, level, correct });

test('démarre en A2', () => {
  expect(currentLevel([])).toBe('A2');
});

test('monte après 2 bonnes réponses consécutives', () => {
  expect(currentLevel([r('1', 'A2', true)])).toBe('A2');
  expect(currentLevel([r('1', 'A2', true), r('2', 'A2', true)])).toBe('B1');
});

test('descend après 1 erreur', () => {
  expect(currentLevel([r('1', 'A2', false)])).toBe('A1');
});

test('reste borné entre A1 et B2', () => {
  expect(currentLevel([r('1', 'A2', false), r('2', 'A1', false)])).toBe('A1');
  const allGood = Array.from({ length: 10 }, (_, i) => r(`${i}`, 'B2', true));
  expect(currentLevel(allGood)).toBe('B2');
});

test('propose un item non posé du niveau courant', () => {
  const bank = [q('a1-1', 'A1'), q('a2-1', 'A2'), q('a2-2', 'A2')];
  expect(nextGrammarItem(bank, [])?.id).toBe('a2-1');
  expect(nextGrammarItem(bank, [r('a2-1', 'A2', true)])?.id).toBe('a2-2');
});

test('niveau épuisé → niveau le plus proche, en dessous d\'abord', () => {
  const bank = [q('a1-1', 'A1'), q('b1-1', 'B1')];
  expect(nextGrammarItem(bank, [])?.id).toBe('a1-1');
});

test('s\'arrête au nombre max ou banque épuisée', () => {
  const bank = [q('a2-1', 'A2'), q('a2-2', 'A2')];
  expect(nextGrammarItem(bank, [r('a2-1', 'A2', true)], 1)).toBeNull();
  expect(nextGrammarItem(bank, [r('a2-1', 'A2', true), r('a2-2', 'A2', true)])).toBeNull();
});
```

- [ ] **Step 2: Lancer — échec attendu**

Run: `npx vitest run src/core/placement/grammarEngine.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `src/core/placement/grammarEngine.ts`**

```ts
import { LEVELS, type Cefr } from '../levels';
import type { GrammarItem } from '../../content/schemas';

export type AnswerRecord = { itemId: string; level: Cefr; correct: boolean };

export const GRAMMAR_QUESTION_COUNT = 30;

/** Escalier 2-haut / 1-bas : 2 bonnes réponses consécutives → niveau +1, 1 erreur → niveau -1. */
export function currentLevel(history: AnswerRecord[], start: Cefr = 'A2'): Cefr {
  let idx = LEVELS.indexOf(start);
  let streak = 0;
  for (const a of history) {
    if (a.correct) {
      streak++;
      if (streak >= 2) { idx = Math.min(idx + 1, LEVELS.length - 1); streak = 0; }
    } else {
      idx = Math.max(idx - 1, 0);
      streak = 0;
    }
  }
  return LEVELS[idx];
}

export function nextGrammarItem(bank: GrammarItem[], history: AnswerRecord[], max = GRAMMAR_QUESTION_COUNT): GrammarItem | null {
  if (history.length >= max) return null;
  const asked = new Set(history.map(h => h.itemId));
  const target = LEVELS.indexOf(currentLevel(history));
  const order = [0, -1, 1, -2, 2, -3, 3].map(d => target + d).filter(i => i >= 0 && i < LEVELS.length);
  for (const i of order) {
    const item = bank.find(q => q.level === LEVELS[i] && !asked.has(q.id));
    if (item) return item;
  }
  return null;
}
```

- [ ] **Step 4: Relancer — succès attendu**

Run: `npx vitest run src/core/placement/grammarEngine.test.ts`
Expected: 7 PASS.

- [ ] **Step 5: Tests `src/core/placement/scoring.test.ts`**

```ts
import { levelFromAnswers, levelFromScores, weakestSkill } from './scoring';
import type { Cefr } from '../levels';

const a = (level: Cefr, correct: boolean) => ({ level, correct });

test('niveau = plus haut niveau réussi à ≥ 60 % sans échec en dessous', () => {
  expect(levelFromAnswers([a('A1', true), a('A2', true), a('A2', true), a('B1', false), a('B1', false)])).toBe('A2');
});

test('niveau non testé ignoré (démarrage en A2)', () => {
  expect(levelFromAnswers([a('A2', true), a('A2', true), a('B1', true), a('B1', true), a('B1', false)])).toBe('B1');
});

test('échec à un niveau bloque les niveaux supérieurs', () => {
  expect(levelFromAnswers([a('A2', false), a('A2', false), a('B1', true)])).toBe('A1');
});

test('aucune réponse → A1', () => {
  expect(levelFromAnswers([])).toBe('A1');
});

test('scores 0..4 → niveau par moyenne', () => {
  expect(levelFromScores([1, 1, 2])).toBe('A1');   // 1.33
  expect(levelFromScores([2, 2, 3])).toBe('A2');   // 2.33
  expect(levelFromScores([3, 3, 4])).toBe('B1');   // 3.33
  expect(levelFromScores([4, 4, 3])).toBe('B2');   // 3.67
  expect(levelFromScores([])).toBe('A1');
});

test('compétence la plus faible, priorité à l\'oral en cas d\'égalité', () => {
  expect(weakestSkill({ grammarVocab: 'B1', listening: 'A2', writing: 'B1', speaking: 'B1' })).toBe('listening');
  expect(weakestSkill({ grammarVocab: 'A2', listening: 'A2', writing: 'A2', speaking: 'A2' })).toBe('speaking');
});
```

- [ ] **Step 6: Lancer — échec attendu**

Run: `npx vitest run src/core/placement/scoring.test.ts`
Expected: FAIL.

- [ ] **Step 7: Implémenter `src/core/placement/scoring.ts`**

```ts
import { LEVELS, type Cefr, type Skill } from '../levels';

const PASS_RATE = 0.6;

export function levelFromAnswers(answers: { level: Cefr; correct: boolean }[]): Cefr {
  let result: Cefr = 'A1';
  for (const lvl of LEVELS) {
    const at = answers.filter(a => a.level === lvl);
    if (at.length === 0) continue;
    const rate = at.filter(a => a.correct).length / at.length;
    if (rate >= PASS_RATE) result = lvl;
    else break;
  }
  return result;
}

export function levelFromScores(scores: number[]): Cefr {
  if (scores.length === 0) return 'A1';
  const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
  if (avg < 1.5) return 'A1';
  if (avg < 2.5) return 'A2';
  if (avg < 3.5) return 'B1';
  return 'B2';
}

// Ordre de priorité en cas d'égalité : l'objectif est l'oral.
const TIE_PRIORITY: Skill[] = ['speaking', 'listening', 'writing', 'grammarVocab'];

export function weakestSkill(levels: Record<Skill, Cefr>): Skill {
  return TIE_PRIORITY.reduce((min, s) => (LEVELS.indexOf(levels[s]) < LEVELS.indexOf(levels[min]) ? s : min));
}
```

- [ ] **Step 8: Relancer — succès attendu**

Run: `npx vitest run src/core/placement/scoring.test.ts`
Expected: 6 PASS.

- [ ] **Step 9: Tests `src/core/placement/progress.test.ts`**

```ts
import { activeSessionId, placementProgress } from './progress';
import { makeEvent, type AppEvent } from '../events';
import type { PlacementContent } from '../../content/schemas';

const content: PlacementContent = {
  grammar: [
    { id: 'g1', level: 'A2', prompt: 'p', choices: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'x' },
    { id: 'g2', level: 'A2', prompt: 'p', choices: ['a', 'b', 'c', 'd'], answer: 0, explanation: 'x' },
  ],
  listening: [{ id: 'l1', level: 'A1', kind: 'dictation', audio: 'hello' }],
  writing: [{ id: 'w1', prompt: 'p', promptFr: 'p', rubric: ['a', 'b', 'c', 'd'], modelAnswer: 'm' }],
  speaking: [{ id: 's1', level: 'A1', text: 'hi' }],
};

let t = 0;
const ans = (skill: 'grammarVocab' | 'listening' | 'speaking', itemId: string, correct = true, sessionId = 'S'): AppEvent =>
  makeEvent('placement_answer', { sessionId, skill, itemId, level: 'A2', correct }, 'd', ++t);
const graded = (promptId: string, sessionId = 'S'): AppEvent =>
  makeEvent('production_graded', { context: 'placement', sessionId, skill: 'writing', promptId, score: 3 }, 'd', ++t);

test('session vide → étape grammaire avec le premier item', () => {
  const p = placementProgress([], 'S', content);
  expect(p.step).toBe('grammar');
  expect(p.nextGrammar?.id).toBe('g1');
});

test('reprend une session inachevée à la bonne étape', () => {
  const events = [ans('grammarVocab', 'g1'), ans('grammarVocab', 'g2'), ans('listening', 'l1')];
  const p = placementProgress(events, 'S', content);
  expect(p.step).toBe('writing');
  expect(p.nextWriting?.id).toBe('w1');
});

test('ignore les doublons d\'item (double clic) : seule la première réponse compte', () => {
  const events = [ans('grammarVocab', 'g1', false), ans('grammarVocab', 'g1', true)];
  const p = placementProgress(events, 'S', content);
  expect(p.grammarHistory).toEqual([{ itemId: 'g1', level: 'A2', correct: false }]);
});

test('ignore les événements d\'une autre session', () => {
  const p = placementProgress([ans('grammarVocab', 'g1', true, 'OTHER')], 'S', content);
  expect(p.grammarHistory).toHaveLength(0);
});

test('toutes les étapes faites → done', () => {
  const events = [ans('grammarVocab', 'g1'), ans('grammarVocab', 'g2'), ans('listening', 'l1'), graded('w1'), ans('speaking', 's1')];
  expect(placementProgress(events, 'S', content).step).toBe('done');
});

test('activeSessionId : session commencée et non terminée', () => {
  expect(activeSessionId([])).toBeNull();
  const started = [ans('grammarVocab', 'g1')];
  expect(activeSessionId(started)).toBe('S');
  const done = [...started, makeEvent('placement_completed', { sessionId: 'S' }, 'd', ++t)];
  expect(activeSessionId(done)).toBeNull();
});
```

- [ ] **Step 10: Lancer — échec attendu**

Run: `npx vitest run src/core/placement/progress.test.ts`
Expected: FAIL.

- [ ] **Step 11: Implémenter `src/core/placement/progress.ts`**

```ts
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
```

- [ ] **Step 12: Relancer — succès attendu**

Run: `npx vitest run src/core/placement/progress.test.ts`
Expected: 6 PASS.

- [ ] **Step 13: Tests `src/core/placement/result.test.ts`**

```ts
import { latestPlacementResult } from './result';
import { makeEvent, type AppEvent } from '../events';
import type { Cefr } from '../levels';

let t = 0;
const ans = (sessionId: string, skill: 'grammarVocab' | 'listening' | 'speaking', level: Cefr, correct: boolean): AppEvent =>
  makeEvent('placement_answer', { sessionId, skill, itemId: `i${++t}`, level, correct }, 'd', t);
const graded = (sessionId: string, score: number): AppEvent =>
  makeEvent('production_graded', { context: 'placement', sessionId, skill: 'writing', promptId: `w${++t}`, score }, 'd', t);
const done = (sessionId: string): AppEvent => makeEvent('placement_completed', { sessionId }, 'd', ++t);

test('aucune session terminée → null', () => {
  expect(latestPlacementResult([ans('S', 'grammarVocab', 'A1', true)])).toBeNull();
});

test('calcule le niveau par compétence et la plus faible', () => {
  const events = [
    ans('S', 'grammarVocab', 'A2', true), ans('S', 'grammarVocab', 'A2', true),
    ans('S', 'listening', 'A1', false),
    graded('S', 3), graded('S', 3),
    ans('S', 'speaking', 'A1', true), ans('S', 'speaking', 'A2', false),
    done('S'),
  ];
  const r = latestPlacementResult(events)!;
  expect(r.sessionId).toBe('S');
  expect(r.levels).toEqual({ grammarVocab: 'A2', listening: 'A1', writing: 'B1', speaking: 'A1' });
  expect(r.weakest).toBe('speaking');
});

test('prend la session terminée la plus récente', () => {
  const events = [ans('OLD', 'grammarVocab', 'A1', true), done('OLD'), ans('NEW', 'grammarVocab', 'B1', true), done('NEW')];
  expect(latestPlacementResult(events)!.sessionId).toBe('NEW');
});
```

- [ ] **Step 14: Lancer — échec attendu**

Run: `npx vitest run src/core/placement/result.test.ts`
Expected: FAIL.

- [ ] **Step 15: Implémenter `src/core/placement/result.ts`**

```ts
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
```

- [ ] **Step 16: Lancer tous les tests et le typecheck**

Run: `npm test && npm run typecheck`
Expected: tous PASS, aucune erreur TS.

- [ ] **Step 17: Commit**

```bash
git add src/core/placement
git commit -m "feat(core): moteur du test de positionnement (escalier, scoring, progression, résultat)"
```

---

### Task 5: Correcteur par grille (grader)

**Files:**
- Create: `src/grader/types.ts`, `src/grader/rubricGrader.ts`, `src/grader/rubricGrader.test.ts`

**Interfaces:**
- Produces:
  - `type GradeTask = { kind: 'writing'; promptId: string; prompt: string; rubric: string[]; modelAnswer: string }`
  - `type GradeAnswer = { text: string; rubricChecks?: boolean[] }`
  - `type GradeResult = { score: number; feedback: string[] }` (score entier 0..4)
  - `interface Grader { readonly needsSelfAssessment: boolean; grade(task: GradeTask, answer: GradeAnswer): Promise<GradeResult> }`
  - `class RubricGrader implements Grader`

- [ ] **Step 1: Créer `src/grader/types.ts`**

```ts
export type GradeTask = { kind: 'writing'; promptId: string; prompt: string; rubric: string[]; modelAnswer: string };
export type GradeAnswer = { text: string; rubricChecks?: boolean[] };
export type GradeResult = { score: number; feedback: string[] };

/** Point d'extension : un futur LlmGrader implémente cette interface (needsSelfAssessment = false). */
export interface Grader {
  readonly needsSelfAssessment: boolean;
  grade(task: GradeTask, answer: GradeAnswer): Promise<GradeResult>;
}
```

- [ ] **Step 2: Tests `src/grader/rubricGrader.test.ts`**

```ts
import { RubricGrader } from './rubricGrader';
import type { GradeTask } from './types';

const task: GradeTask = { kind: 'writing', promptId: 'w1', prompt: 'p', rubric: ['A', 'B', 'C', 'D'], modelAnswer: 'm' };
const grader = new RubricGrader();

test('demande une auto-évaluation', () => {
  expect(grader.needsSelfAssessment).toBe(true);
});

test('score = nombre de critères cochés, feedback = critères manqués', async () => {
  const r = await grader.grade(task, { text: 'hello', rubricChecks: [true, false, true, false] });
  expect(r).toEqual({ score: 2, feedback: ['B', 'D'] });
});

test('texte vide → 0 quels que soient les critères', async () => {
  const r = await grader.grade(task, { text: '   ', rubricChecks: [true, true, true, true] });
  expect(r.score).toBe(0);
});

test('rubricChecks absent ou de mauvaise longueur → erreur', async () => {
  await expect(grader.grade(task, { text: 'x' })).rejects.toThrow('rubricChecks');
  await expect(grader.grade(task, { text: 'x', rubricChecks: [true] })).rejects.toThrow('rubricChecks');
});
```

- [ ] **Step 3: Lancer — échec attendu**

Run: `npx vitest run src/grader`
Expected: FAIL.

- [ ] **Step 4: Implémenter `src/grader/rubricGrader.ts`**

```ts
import type { GradeAnswer, GradeResult, GradeTask, Grader } from './types';

export class RubricGrader implements Grader {
  readonly needsSelfAssessment = true;

  async grade(task: GradeTask, answer: GradeAnswer): Promise<GradeResult> {
    const checks = answer.rubricChecks;
    if (!checks || checks.length !== task.rubric.length) {
      throw new Error('rubricChecks doit contenir une valeur par critère');
    }
    if (answer.text.trim() === '') {
      return { score: 0, feedback: [...task.rubric] };
    }
    return {
      score: checks.filter(Boolean).length,
      feedback: task.rubric.filter((_, i) => !checks[i]),
    };
  }
}
```

- [ ] **Step 5: Relancer — succès attendu**

Run: `npx vitest run src/grader`
Expected: 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/grader
git commit -m "feat(grader): interface Grader et correcteur par grille"
```

---

### Task 6: Synthèse et reconnaissance vocales (speech)

**Files:**
- Create: `src/speech/browserSpeech.ts`, `src/speech/browserSpeech.test.ts`

**Interfaces:**
- Produces:
  - `interface Speech { readonly canSpeak: boolean; readonly canListen: boolean; speak(text: string, rate?: number): Promise<void>; listen(): Promise<string> }`
  - `createBrowserSpeech(win?: SpeechWindow): Speech`
  - `const RATE_BY_LEVEL: Record<Cefr, number>`

- [ ] **Step 1: Tests `src/speech/browserSpeech.test.ts`**

```ts
import { createBrowserSpeech, type SpeechWindow } from './browserSpeech';

test('sans API → canSpeak et canListen à false, listen rejette', async () => {
  const s = createBrowserSpeech({} as SpeechWindow);
  expect(s.canSpeak).toBe(false);
  expect(s.canListen).toBe(false);
  await expect(s.listen()).rejects.toThrow('non disponible');
});

test('canSpeak exige une voix anglaise', () => {
  const synth = { getVoices: () => [{ lang: 'fr-FR' }], speak: vi.fn(), cancel: vi.fn() };
  const win = { speechSynthesis: synth, SpeechSynthesisUtterance: class {} } as unknown as SpeechWindow;
  expect(createBrowserSpeech(win).canSpeak).toBe(false);
  synth.getVoices = () => [{ lang: 'en-GB' }];
  expect(createBrowserSpeech(win).canSpeak).toBe(true);
});

test('listen renvoie la transcription', async () => {
  class FakeRecognition {
    lang = ''; interimResults = true; maxAlternatives = 0;
    onresult: ((e: unknown) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    start() { this.onresult?.({ results: [[{ transcript: 'hello world' }]] }); this.onend?.(); }
  }
  const s = createBrowserSpeech({ webkitSpeechRecognition: FakeRecognition } as unknown as SpeechWindow);
  expect(s.canListen).toBe(true);
  await expect(s.listen()).resolves.toBe('hello world');
});

test('listen rejette si le micro est refusé', async () => {
  class DeniedRecognition {
    lang = ''; interimResults = true; maxAlternatives = 0;
    onresult: ((e: unknown) => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    start() { this.onerror?.({ error: 'not-allowed' }); this.onend?.(); }
  }
  const s = createBrowserSpeech({ SpeechRecognition: DeniedRecognition } as unknown as SpeechWindow);
  await expect(s.listen()).rejects.toThrow('not-allowed');
});
```

- [ ] **Step 2: Lancer — échec attendu**

Run: `npx vitest run src/speech`
Expected: FAIL.

- [ ] **Step 3: Implémenter `src/speech/browserSpeech.ts`**

```ts
import type { Cefr } from '../core/levels';

export interface Speech {
  readonly canSpeak: boolean;
  readonly canListen: boolean;
  speak(text: string, rate?: number): Promise<void>;
  listen(): Promise<string>;
}

export const RATE_BY_LEVEL: Record<Cefr, number> = { A1: 0.8, A2: 0.9, B1: 1.0, B2: 1.1 };

type RecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
};
type RecognitionCtor = new () => Recognition;

export type SpeechWindow = {
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
  SpeechRecognition?: RecognitionCtor;
  webkitSpeechRecognition?: RecognitionCtor;
};

export function createBrowserSpeech(win: SpeechWindow = window as unknown as SpeechWindow): Speech {
  const synth = win.speechSynthesis;
  const Utterance = win.SpeechSynthesisUtterance;
  const RecognitionImpl = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  const englishVoice = () => synth?.getVoices().find(v => v.lang.toLowerCase().startsWith('en'));

  return {
    get canSpeak() { return !!synth && !!Utterance && !!englishVoice(); },
    canListen: !!RecognitionImpl,

    speak(text, rate = 1) {
      return new Promise((resolve, reject) => {
        if (!synth || !Utterance) return reject(new Error('Synthèse vocale non disponible'));
        synth.cancel();
        const u = new Utterance(text);
        u.lang = 'en-US';
        u.rate = rate;
        const voice = englishVoice();
        if (voice) u.voice = voice;
        u.onend = () => resolve();
        u.onerror = e => reject(new Error(e.error));
        synth.speak(u);
      });
    },

    listen() {
      return new Promise((resolve, reject) => {
        if (!RecognitionImpl) return reject(new Error('Reconnaissance vocale non disponible'));
        const rec = new RecognitionImpl();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        let transcript = '';
        let error: string | null = null;
        rec.onresult = e => { transcript = e.results[0]?.[0]?.transcript ?? ''; };
        rec.onerror = e => { error = e.error; };
        rec.onend = () => (error ? reject(new Error(error)) : resolve(transcript));
        rec.start();
      });
    },
  };
}
```

Note : dans Chrome, `getVoices()` est vide au tout premier chargement puis se remplit (événement `voiceschanged`). C'est pourquoi `canSpeak` est un getter évalué à chaque lecture.

- [ ] **Step 4: Relancer — succès attendu**

Run: `npx vitest run src/speech && npm run typecheck`
Expected: 4 PASS, pas d'erreur TS.

- [ ] **Step 5: Commit**

```bash
git add src/speech
git commit -m "feat(speech): enveloppe synthèse et reconnaissance vocales avec détection du support"
```

---

### Task 7: Firebase — configuration, connexion GitHub, journal synchronisé, règles de sécurité

**Files:**
- Create: `src/services.ts`, `src/device.ts`, `src/firebase/config.ts`, `src/firebase/app.ts`, `src/auth/githubAuth.ts`, `src/storage/firestoreEventStore.ts`, `src/storage/outbox.ts`, `src/storage/outbox.test.ts`, `firebase.json`, `.firebaserc`, `firestore.rules`, `vitest.rules.config.ts`, `tests/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: `AppEvent` (Task 2), `Speech` (Task 6), `Grader` (Task 5), `PlacementContent` (Task 3)
- Produces:
  - `type User = { uid: string; name: string }`
  - `interface AuthService { onUser(cb: (u: User | null) => void): () => void; signIn(): Promise<void>; signOut(): Promise<void> }`
  - `interface EventStore { append(uid: string, e: AppEvent): void; subscribe(uid: string, cb: (events: AppEvent[], pending: boolean) => void, onError: (err: Error) => void): () => void; flushOutbox(uid: string): void }`
  - `type Services = { auth: AuthService; store: EventStore; speech: Speech; grader: Grader; deviceId: string; content: PlacementContent }`
  - `getDeviceId(storage?: Storage): string`
  - `createOutbox(storage: Storage, key?: string)` → `{ add(e: AppEvent): void; drain(): AppEvent[] }`
  - `createGithubAuth(): AuthService`, `createFirestoreEventStore(onWriteError: (err: Error) => void): EventStore`

- [ ] **Step 1: Créer `src/services.ts` et `src/device.ts`**

`src/services.ts` :
```ts
import type { AppEvent } from './core/events';
import type { Grader } from './grader/types';
import type { Speech } from './speech/browserSpeech';
import type { PlacementContent } from './content/schemas';

export type User = { uid: string; name: string };

export interface AuthService {
  onUser(cb: (u: User | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

export interface EventStore {
  /** Ajout sans attente : écrit dans le cache local, synchronisé plus tard. */
  append(uid: string, e: AppEvent): void;
  subscribe(uid: string, cb: (events: AppEvent[], pending: boolean) => void, onError: (err: Error) => void): () => void;
  /** Renvoie les événements dont l'écriture avait échoué. */
  flushOutbox(uid: string): void;
}

export type Services = {
  auth: AuthService;
  store: EventStore;
  speech: Speech;
  grader: Grader;
  deviceId: string;
  content: PlacementContent;
};
```

`src/device.ts` :
```ts
const KEY = 'eng.deviceId';

export function getDeviceId(storage: Storage = localStorage): string {
  let id = storage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(KEY, id);
  }
  return id;
}
```

- [ ] **Step 2: Tests `src/storage/outbox.test.ts`**

```ts
import { createOutbox } from './outbox';
import { makeEvent } from '../core/events';

const e1 = makeEvent('placement_completed', { sessionId: 'a' }, 'd', 1, 'id1');
const e2 = makeEvent('placement_completed', { sessionId: 'b' }, 'd', 2, 'id2');

test('add puis drain renvoie les événements et vide la file', () => {
  const box = createOutbox(localStorage, 'test.outbox');
  box.add(e1); box.add(e2); box.add(e1);
  expect(box.drain().map(e => e.id)).toEqual(['id1', 'id2']);
  expect(box.drain()).toEqual([]);
});

test('contenu corrompu → file vide sans erreur', () => {
  localStorage.setItem('test.bad', '{pas du json');
  expect(createOutbox(localStorage, 'test.bad').drain()).toEqual([]);
});
```

- [ ] **Step 3: Lancer — échec attendu**

Run: `npx vitest run src/storage`
Expected: FAIL.

- [ ] **Step 4: Implémenter `src/storage/outbox.ts`**

```ts
import type { AppEvent } from '../core/events';

/** File locale des événements dont l'écriture Firestore a échoué. */
export function createOutbox(storage: Storage, key = 'eng.outbox') {
  const read = (): AppEvent[] => {
    try {
      const v = JSON.parse(storage.getItem(key) ?? '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  return {
    add(e: AppEvent) {
      const items = read();
      if (!items.some(x => x.id === e.id)) storage.setItem(key, JSON.stringify([...items, e]));
    },
    drain(): AppEvent[] {
      const items = read();
      storage.removeItem(key);
      return items;
    },
  };
}
```

- [ ] **Step 5: Relancer — succès attendu**

Run: `npx vitest run src/storage`
Expected: 2 PASS.

- [ ] **Step 6: Règles `firestore.rules`, `firebase.json`, `.firebaserc`**

`firestore.rules` :
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/events/{eventId} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.id == eventId
        && request.resource.data.keys().hasOnly(['id', 'type', 'payload', 'createdAt', 'deviceId'])
        && request.resource.data.type is string
        && request.resource.data.createdAt is int;
      allow update, delete: if false;
    }
  }
}
```

`firebase.json` :
```json
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": { "firestore": { "port": 8080 }, "ui": { "enabled": false } }
}
```

`.firebaserc` (le vrai id de projet est renseigné à l'étape manuelle 12) :
```json
{ "projects": { "default": "demo-eng" } }
```

- [ ] **Step 7: Tests des règles `tests/rules/firestore.rules.test.ts` et `vitest.rules.config.ts`**

`vitest.rules.config.ts` :
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/rules/**/*.test.ts'], environment: 'node', testTimeout: 20000 },
});
```

`tests/rules/firestore.rules.test.ts` :
```ts
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const ev = (id: string) => ({ id, type: 'placement_completed', payload: { sessionId: 's' }, createdAt: 1, deviceId: 'd' });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-eng',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

test('propriétaire : crée et lit ses événements', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertSucceeds(setDoc(doc(db, 'users/alice/events/e1'), ev('e1')));
  await assertSucceeds(getDoc(doc(db, 'users/alice/events/e1')));
});

test('autre utilisateur : lecture et écriture refusées', async () => {
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'users/alice/events/e1'), ev('e1')));
  const bob = env.authenticatedContext('bob').firestore();
  await assertFails(getDoc(doc(bob, 'users/alice/events/e1')));
  await assertFails(setDoc(doc(bob, 'users/alice/events/e2'), ev('e2')));
});

test('non connecté : tout refusé', async () => {
  const anon = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anon, 'users/alice/events/e1')));
  await assertFails(setDoc(doc(anon, 'users/alice/events/e1'), ev('e1')));
});

test('événement immuable : modification et suppression refusées', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertSucceeds(setDoc(doc(db, 'users/alice/events/e1'), ev('e1')));
  await assertFails(updateDoc(doc(db, 'users/alice/events/e1'), { type: 'x' }));
  await assertFails(deleteDoc(doc(db, 'users/alice/events/e1')));
});

test('id incohérent ou champ inconnu refusé', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertFails(setDoc(doc(db, 'users/alice/events/e1'), ev('autre')));
  await assertFails(setDoc(doc(db, 'users/alice/events/e2'), { ...ev('e2'), extra: true }));
});

test('hors de users/{uid}/events : refusé', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertFails(setDoc(doc(db, 'config/x'), { a: 1 }));
});
```

- [ ] **Step 8: Lancer les tests de règles (émulateur)**

Run: `npm run test:rules`
Expected: 6 PASS. Prérequis : Java 11+ installé (Java 21 présent sur le poste).

- [ ] **Step 9: Créer `src/firebase/config.ts` et `src/firebase/app.ts`**

`src/firebase/config.ts` (valeurs copiées à l'étape manuelle 12 ; ce ne sont pas des secrets) :
```ts
export const firebaseConfig = {
  apiKey: 'À_COPIER_DEPUIS_LA_CONSOLE',
  authDomain: 'À_COPIER_DEPUIS_LA_CONSOLE',
  projectId: 'À_COPIER_DEPUIS_LA_CONSOLE',
  appId: 'À_COPIER_DEPUIS_LA_CONSOLE',
};
```

`src/firebase/app.ts` :
```ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { firebaseConfig } from './config';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
```

- [ ] **Step 10: Créer `src/auth/githubAuth.ts`**

```ts
import { GithubAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../firebase/app';
import type { AuthService } from '../services';

export function createGithubAuth(): AuthService {
  return {
    onUser(cb) {
      return onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, name: u.displayName ?? u.email ?? 'moi' } : null));
    },
    async signIn() {
      await signInWithPopup(auth, new GithubAuthProvider());
    },
    async signOut() {
      await signOut(auth);
    },
  };
}
```

- [ ] **Step 11: Créer `src/storage/firestoreEventStore.ts`**

```ts
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../firebase/app';
import type { AppEvent } from '../core/events';
import type { EventStore } from '../services';
import { createOutbox } from './outbox';

export function createFirestoreEventStore(onWriteError: (err: Error) => void): EventStore {
  const outbox = createOutbox(localStorage);

  const write = (uid: string, e: AppEvent) => {
    // Pas d'await : la promesse ne se résout qu'à l'accusé du serveur (jamais hors ligne).
    setDoc(doc(db, 'users', uid, 'events', e.id), e).catch((err: Error) => {
      outbox.add(e);
      onWriteError(err);
    });
  };

  return {
    append: write,
    subscribe(uid, cb, onError) {
      const q = query(collection(db, 'users', uid, 'events'), orderBy('createdAt'));
      return onSnapshot(
        q,
        { includeMetadataChanges: true },
        snap => cb(snap.docs.map(d => d.data() as AppEvent), snap.metadata.hasPendingWrites),
        err => onError(err),
      );
    },
    flushOutbox(uid) {
      for (const e of outbox.drain()) write(uid, e);
    },
  };
}
```

- [ ] **Step 12: Étape manuelle (utilisateur, ~10 min) — créer et configurer Firebase**

Avec un compte Google **perso** :
1. `https://console.firebase.google.com` → **Ajouter un projet** → nom `eng` → désactiver Google Analytics → Créer. Rester sur le plan **Spark** (ne pas ajouter de moyen de paiement).
2. **Build → Firestore Database** → Créer → mode production → région `europe-west1` (ou `eur3`).
3. **Paramètres du projet → Vos applications → Web (`</>`)** → nom `eng-web`, sans Hosting → copier `apiKey`, `authDomain`, `projectId`, `appId` dans `src/firebase/config.ts`.
4. **GitHub** (compte `hacen44800`) : Settings → Developer settings → OAuth Apps → New OAuth App. Homepage : `https://hacen44800.github.io/eng/`. Callback : `https://<projectId>.firebaseapp.com/__/auth/handler`. Générer un client secret.
5. **Firebase → Build → Authentication** → Commencer → Méthode de connexion → **GitHub** → coller Client ID et Client secret (le secret reste dans la console Firebase, jamais dans le dépôt) → Enregistrer.
6. **Authentication → Paramètres → Domaines autorisés** : ajouter `hacen44800.github.io` (garder `localhost`) et supprimer tout autre domaine non nécessaire.
7. Dans `.firebaserc`, remplacer `demo-eng` par le `projectId`.
8. Déployer les règles : `npx firebase login` (compte Google perso), puis `npx firebase deploy --only firestore:rules`.
   Expected : « Deploy complete ».

- [ ] **Step 13: Vérifier typecheck et tests**

Run: `npm run typecheck && npm test`
Expected: aucune erreur, tous PASS.

- [ ] **Step 14: Commit et push**

```bash
git add -A
git commit -m "feat(firebase): connexion GitHub, journal Firestore hors ligne, outbox et règles de sécurité"
git push
```

---

### Task 8: Écrans de connexion, d'accueil et de résultat ; App et services

**Files:**
- Create: `src/ui/testing/fakeServices.ts`, `src/ui/LoginScreen.tsx`, `src/ui/HomeScreen.tsx`, `src/ui/ResultScreen.tsx`, `src/ui/labels.ts`
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `Services`, `User` (Task 7), `latestPlacementResult`, `activeSessionId`, `PlacementResult` (Task 4), `makeEvent` (Task 2)
- Produces:
  - `App({ services }: { services: Services })` — gère : connexion, abonnement au journal, bannière hors ligne / erreur, navigation `home | placement | result`
  - `createFakeServices(overrides?: Partial<Services>): Services & { emitUser(u: User | null): void; events: AppEvent[] }`
  - `SKILL_LABELS: Record<Skill, string>`
  - Contrat attendu de `PlacementFlow` (Task 9) : `PlacementFlow({ services, uid, events, sessionId, onDone }: { services: Services; uid: string; events: AppEvent[]; sessionId: string; onDone: () => void })`

- [ ] **Step 1: Créer `src/ui/labels.ts`**

```ts
import type { Skill } from '../core/levels';

export const SKILL_LABELS: Record<Skill, string> = {
  grammarVocab: 'Grammaire et vocabulaire',
  listening: 'Compréhension orale',
  writing: 'Expression écrite',
  speaking: 'Expression orale',
};
```

- [ ] **Step 2: Créer `src/ui/testing/fakeServices.ts`**

```ts
import type { AppEvent } from '../../core/events';
import type { Services, User } from '../../services';
import { RubricGrader } from '../../grader/rubricGrader';
import type { PlacementContent } from '../../content/schemas';

const tinyContent: PlacementContent = {
  grammar: [{ id: 'g1', level: 'A2', prompt: 'I ___ a developer.', choices: ['am', 'is', 'are', 'be'], answer: 0, explanation: 'am' }],
  listening: [{ id: 'l1', level: 'A1', kind: 'dictation', audio: 'I start work at nine.' }],
  writing: [{ id: 'w1', prompt: 'Describe your job.', promptFr: 'Décris ton métier.', rubric: ['A', 'B', 'C', 'D'], modelAnswer: 'I am a developer.' }],
  speaking: [{ id: 's1', level: 'A1', text: 'I work in a team.' }],
};

export function createFakeServices(overrides: Partial<Services> = {}) {
  let userCb: (u: User | null) => void = () => {};
  let eventsCb: (events: AppEvent[], pending: boolean) => void = () => {};
  const events: AppEvent[] = [];

  const services: Services = {
    auth: {
      onUser(cb) { userCb = cb; return () => {}; },
      signIn: vi.fn(async () => userCb({ uid: 'u1', name: 'Test' })),
      signOut: vi.fn(async () => userCb(null)),
    },
    store: {
      append: vi.fn((_uid: string, e: AppEvent) => { events.push(e); eventsCb([...events], false); }),
      subscribe(_uid, cb) { eventsCb = cb; cb([...events], false); return () => {}; },
      flushOutbox: vi.fn(),
    },
    speech: { canSpeak: true, canListen: true, speak: vi.fn(async () => {}), listen: vi.fn(async () => '') },
    grader: new RubricGrader(),
    deviceId: 'test-device',
    content: tinyContent,
    ...overrides,
  };
  return Object.assign(services, { emitUser: (u: User | null) => userCb(u), events });
}
```

- [ ] **Step 3: Remplacer `src/App.test.tsx`**

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createFakeServices } from './ui/testing/fakeServices';
import { makeEvent } from './core/events';

vi.mock('./ui/placement/PlacementFlow', () => ({
  default: ({ sessionId }: { sessionId: string }) => <p>flow:{sessionId}</p>,
}));

test('non connecté → écran de connexion', () => {
  const s = createFakeServices();
  render(<App services={s} />);
  act(() => s.emitUser(null));
  expect(screen.getByRole('button', { name: /se connecter avec github/i })).toBeInTheDocument();
});

test('connexion → accueil avec bouton du test, et vidage de l\'outbox', async () => {
  const s = createFakeServices();
  render(<App services={s} />);
  act(() => s.emitUser(null));
  await userEvent.click(screen.getByRole('button', { name: /se connecter avec github/i }));
  expect(await screen.findByRole('button', { name: /commencer le test/i })).toBeInTheDocument();
  expect(s.store.flushOutbox).toHaveBeenCalledWith('u1');
});

test('session inachevée → bouton reprendre', async () => {
  const s = createFakeServices();
  s.events.push(makeEvent('placement_answer', { sessionId: 'S1', skill: 'grammarVocab', itemId: 'g1', level: 'A2', correct: true }, 'd', 1));
  render(<App services={s} />);
  act(() => s.emitUser({ uid: 'u1', name: 'T' }));
  await userEvent.click(await screen.findByRole('button', { name: /reprendre le test/i }));
  expect(screen.getByText('flow:S1')).toBeInTheDocument();
});

test('résultat existant → affiché sur l\'accueil', async () => {
  const s = createFakeServices();
  s.events.push(makeEvent('placement_completed', { sessionId: 'S1' }, 'd', 1));
  render(<App services={s} />);
  act(() => s.emitUser({ uid: 'u1', name: 'T' }));
  expect(await screen.findByText(/compétence à travailler en priorité/i)).toBeInTheDocument();
});

test('connexion impossible → message d\'erreur', async () => {
  const s = createFakeServices();
  s.auth.signIn = vi.fn(async () => { throw new Error('network'); });
  render(<App services={s} />);
  act(() => s.emitUser(null));
  await userEvent.click(screen.getByRole('button', { name: /se connecter avec github/i }));
  expect(await screen.findByText(/connexion impossible/i)).toBeInTheDocument();
});
```

- [ ] **Step 4: Lancer — échec attendu**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (App n'accepte pas `services`, écrans absents).

- [ ] **Step 5: Créer `src/ui/LoginScreen.tsx`**

```tsx
import { useState } from 'react';

export default function LoginScreen({ onSignIn }: { onSignIn: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSignIn();
    } catch {
      setError('Connexion impossible : vérifie ton réseau et réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h1>Eng</h1>
      <p>Ton parcours pour parler anglais au travail.</p>
      <button onClick={signIn} disabled={busy}>Se connecter avec GitHub</button>
      {error && <p className="ko">{error}</p>}
    </main>
  );
}
```

- [ ] **Step 6: Créer `src/ui/ResultScreen.tsx`**

```tsx
import type { PlacementResult } from '../core/placement/result';
import { SKILLS } from '../core/levels';
import { SKILL_LABELS } from './labels';

export default function ResultScreen({ result }: { result: PlacementResult }) {
  return (
    <section className="card">
      <h2>Ton niveau</h2>
      <ul>
        {SKILLS.map(s => (
          <li key={s}>{SKILL_LABELS[s]} : <strong>{result.levels[s]}</strong></li>
        ))}
      </ul>
      <p>Compétence à travailler en priorité : <strong>{SKILL_LABELS[result.weakest]}</strong></p>
      <p className="muted">Test passé le {new Date(result.completedAt).toLocaleDateString('fr-FR')}.</p>
    </section>
  );
}
```

- [ ] **Step 7: Créer `src/ui/HomeScreen.tsx`**

```tsx
import type { PlacementResult } from '../core/placement/result';
import ResultScreen from './ResultScreen';

type Props = {
  name: string;
  result: PlacementResult | null;
  unfinishedSessionId: string | null;
  onStart: () => void;
  onResume: (sessionId: string) => void;
  onSignOut: () => void;
};

export default function HomeScreen({ name, result, unfinishedSessionId, onStart, onResume, onSignOut }: Props) {
  return (
    <main>
      <h1>Bonjour {name}</h1>
      {result && <ResultScreen result={result} />}
      <section className="card">
        <h2>Test de positionnement</h2>
        <p className="muted">Environ 45 minutes. Tu peux t'arrêter et reprendre plus tard.</p>
        {unfinishedSessionId ? (
          <button onClick={() => onResume(unfinishedSessionId)}>Reprendre le test</button>
        ) : (
          <button onClick={onStart}>{result ? 'Refaire le test' : 'Commencer le test'}</button>
        )}
      </section>
      <button className="secondary" onClick={onSignOut}>Se déconnecter</button>
    </main>
  );
}
```

- [ ] **Step 8: Remplacer `src/App.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { AppEvent } from './core/events';
import type { Services, User } from './services';
import { latestPlacementResult } from './core/placement/result';
import { activeSessionId } from './core/placement/progress';
import LoginScreen from './ui/LoginScreen';
import HomeScreen from './ui/HomeScreen';
import PlacementFlow from './ui/placement/PlacementFlow';

type View = { name: 'home' } | { name: 'placement'; sessionId: string };

export default function App({ services }: { services: Services }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [pending, setPending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ name: 'home' });

  useEffect(() => services.auth.onUser(setUser), [services]);

  useEffect(() => {
    if (!user) return;
    services.store.flushOutbox(user.uid);
    return services.store.subscribe(
      user.uid,
      (evts, isPending) => { setEvents(evts); setPending(isPending); setSyncError(null); },
      err => setSyncError(err.message),
    );
  }, [services, user]);

  const result = useMemo(() => latestPlacementResult(events), [events]);
  const unfinished = useMemo(() => activeSessionId(events), [events]);

  if (user === undefined) return <main><p className="muted">Chargement…</p></main>;
  if (user === null) return <LoginScreen onSignIn={() => services.auth.signIn()} />;

  return (
    <>
      {pending && <div className="banner">Hors ligne : tes réponses seront synchronisées au retour du réseau.</div>}
      {syncError && <div className="banner">Problème de synchronisation : {syncError}</div>}
      {view.name === 'placement' ? (
        <PlacementFlow
          services={services}
          uid={user.uid}
          events={events}
          sessionId={view.sessionId}
          onDone={() => setView({ name: 'home' })}
        />
      ) : (
        <HomeScreen
          name={user.name}
          result={result}
          unfinishedSessionId={unfinished}
          onStart={() => setView({ name: 'placement', sessionId: crypto.randomUUID() })}
          onResume={sessionId => setView({ name: 'placement', sessionId })}
          onSignOut={() => services.auth.signOut()}
        />
      )}
    </>
  );
}
```

- [ ] **Step 9: Créer un `PlacementFlow` provisoire pour compiler**

`src/ui/placement/PlacementFlow.tsx` (remplacé en Task 9) :
```tsx
import type { AppEvent } from '../../core/events';
import type { Services } from '../../services';

export type PlacementFlowProps = { services: Services; uid: string; events: AppEvent[]; sessionId: string; onDone: () => void };

export default function PlacementFlow({ onDone }: PlacementFlowProps) {
  return <main><button onClick={onDone}>Retour</button></main>;
}
```

- [ ] **Step 10: Remplacer `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { createGithubAuth } from './auth/githubAuth';
import { createFirestoreEventStore } from './storage/firestoreEventStore';
import { createBrowserSpeech } from './speech/browserSpeech';
import { RubricGrader } from './grader/rubricGrader';
import { getDeviceId } from './device';
import { placementContent } from './content/placement';
import type { Services } from './services';

const services: Services = {
  auth: createGithubAuth(),
  store: createFirestoreEventStore(err => console.error('Écriture refusée, mise en file locale', err)),
  speech: createBrowserSpeech(),
  grader: new RubricGrader(),
  deviceId: getDeviceId(),
  content: placementContent,
};

createRoot(document.getElementById('root')!).render(<StrictMode><App services={services} /></StrictMode>);
```

- [ ] **Step 11: Relancer — succès attendu**

Run: `npm test && npm run typecheck`
Expected: tous PASS (5 tests App), aucune erreur TS.

- [ ] **Step 12: Commit**

```bash
git add src
git commit -m "feat(ui): connexion GitHub, accueil, résultat et bannières de synchro"
```

---

### Task 9: Parcours du test de positionnement (UI)

**Files:**
- Create: `src/ui/placement/GrammarStep.tsx`, `src/ui/placement/ListeningStep.tsx`, `src/ui/placement/WritingStep.tsx`, `src/ui/placement/SpeakingStep.tsx`, `src/ui/placement/steps.test.tsx`, `src/ui/placement/PlacementFlow.test.tsx`
- Modify: `src/ui/placement/PlacementFlow.tsx`

**Interfaces:**
- Consumes: `placementProgress`, `GRAMMAR_QUESTION_COUNT` (Task 4), `wordAccuracy` (Task 2), `RATE_BY_LEVEL`, `Speech` (Task 6), `Grader` (Task 5), `makeEvent` (Task 2), `Services` (Task 7), `PlacementFlowProps` (Task 8)
- Produces (contrats des étapes, toutes « contrôlées » : elles signalent un résultat, PlacementFlow écrit l'événement) :
  - `GrammarStep({ item, index, total, onAnswer }: { item: GrammarItem; index: number; total: number; onAnswer: (correct: boolean) => void })`
  - `ListeningStep({ item, speech, onAnswer }: { item: ListeningItem; speech: Speech; onAnswer: (correct: boolean) => void })`
  - `WritingStep({ prompt, grader, onGraded }: { prompt: WritingPrompt; grader: Grader; onGraded: (score: number) => void })`
  - `SpeakingStep({ item, speech, onAnswer }: { item: SpeakingItem; speech: Speech; onAnswer: (correct: boolean) => void })`
  - Seuil de réussite dictée et oral : `wordAccuracy >= 0.8`

- [ ] **Step 1: Tests des étapes `src/ui/placement/steps.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GrammarStep from './GrammarStep';
import ListeningStep from './ListeningStep';
import WritingStep from './WritingStep';
import SpeakingStep from './SpeakingStep';
import { RubricGrader } from '../../grader/rubricGrader';
import type { Speech } from '../../speech/browserSpeech';

const speech = (over: Partial<Speech> = {}): Speech =>
  ({ canSpeak: true, canListen: true, speak: vi.fn(async () => {}), listen: vi.fn(async () => ''), ...over });

const grammarItem = { id: 'g1', level: 'A1' as const, prompt: 'I ___ a developer.', choices: ['am', 'is', 'are', 'be'], answer: 0, explanation: 'Avec I : am.' };

test('grammaire : bonne réponse → correction affichée puis onAnswer(true) au clic sur Suivant', async () => {
  const onAnswer = vi.fn();
  render(<GrammarStep item={grammarItem} index={0} total={30} onAnswer={onAnswer} />);
  await userEvent.click(screen.getByRole('button', { name: 'am' }));
  expect(screen.getByText('Avec I : am.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  expect(onAnswer).toHaveBeenCalledWith(true);
});

test('grammaire : un seul choix possible (pas de double réponse)', async () => {
  const onAnswer = vi.fn();
  render(<GrammarStep item={grammarItem} index={0} total={30} onAnswer={onAnswer} />);
  await userEvent.click(screen.getByRole('button', { name: 'is' }));
  expect(screen.getByRole('button', { name: 'am' })).toBeDisabled();
});

test('écoute sans voix de synthèse → phrase affichée avec avertissement', () => {
  render(<ListeningStep item={{ id: 'l1', level: 'A1', kind: 'dictation', audio: 'I start work at nine.' }} speech={speech({ canSpeak: false })} onAnswer={vi.fn()} />);
  expect(screen.getByText(/pas de voix anglaise/i)).toBeInTheDocument();
  expect(screen.getByText('I start work at nine.')).toBeInTheDocument();
});

test('dictée : texte proche → onAnswer(true)', async () => {
  const onAnswer = vi.fn();
  render(<ListeningStep item={{ id: 'l1', level: 'A1', kind: 'dictation', audio: 'I start work at nine.' }} speech={speech()} onAnswer={onAnswer} />);
  await userEvent.type(screen.getByRole('textbox'), 'I start work at nine');
  await userEvent.click(screen.getByRole('button', { name: /valider/i }));
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  expect(onAnswer).toHaveBeenCalledWith(true);
});

test('écrit : validation impossible si la réponse est vide', () => {
  render(<WritingStep prompt={{ id: 'w1', prompt: 'Describe your job.', promptFr: 'Décris ton métier.', rubric: ['A', 'B', 'C', 'D'], modelAnswer: 'm' }} grader={new RubricGrader()} onGraded={vi.fn()} />);
  expect(screen.getByRole('button', { name: /comparer avec le modèle/i })).toBeDisabled();
});

test('écrit : auto-évaluation → score = critères cochés', async () => {
  const onGraded = vi.fn();
  render(<WritingStep prompt={{ id: 'w1', prompt: 'Describe your job.', promptFr: 'Décris ton métier.', rubric: ['A', 'B', 'C', 'D'], modelAnswer: 'I am a developer.' }} grader={new RubricGrader()} onGraded={onGraded} />);
  await userEvent.type(screen.getByRole('textbox'), 'I am a developer in a team.');
  await userEvent.click(screen.getByRole('button', { name: /comparer avec le modèle/i }));
  expect(screen.getByText('I am a developer.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: 'A' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'C' }));
  await userEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
  expect(onGraded).toHaveBeenCalledWith(2);
});

test('oral : micro refusé → bascule sur l\'auto-évaluation', async () => {
  const onAnswer = vi.fn();
  render(<SpeakingStep item={{ id: 's1', level: 'A1', text: 'I work in a team.' }} speech={speech({ listen: vi.fn(async () => { throw new Error('not-allowed'); }) })} onAnswer={onAnswer} />);
  await userEvent.click(screen.getByRole('button', { name: /parler/i }));
  expect(await screen.findByText(/micro indisponible/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /je l'ai bien dit/i }));
  expect(onAnswer).toHaveBeenCalledWith(true);
});

test('oral : reconnaissance OK → score affiché puis onAnswer selon le seuil', async () => {
  const onAnswer = vi.fn();
  render(<SpeakingStep item={{ id: 's1', level: 'A1', text: 'I work in a team.' }} speech={speech({ listen: vi.fn(async () => 'I work in team') })} onAnswer={onAnswer} />);
  await userEvent.click(screen.getByRole('button', { name: /parler/i }));
  expect(await screen.findByText(/80 %/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  expect(onAnswer).toHaveBeenCalledWith(true);
});
```

- [ ] **Step 2: Lancer — échec attendu**

Run: `npx vitest run src/ui/placement/steps.test.tsx`
Expected: FAIL (composants absents).

- [ ] **Step 3: Créer `src/ui/placement/GrammarStep.tsx`**

```tsx
import { useState } from 'react';
import type { GrammarItem } from '../../content/schemas';

type Props = { item: GrammarItem; index: number; total: number; onAnswer: (correct: boolean) => void };

export default function GrammarStep({ item, index, total, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === item.answer;

  return (
    <section className="card">
      <p className="muted">Question {index + 1} / {total}</p>
      <h2>{item.prompt}</h2>
      <div className="choices">
        {item.choices.map((c, i) => (
          <button key={c} className={picked === null ? 'secondary' : ''} disabled={picked !== null} onClick={() => setPicked(i)}>
            {c}
          </button>
        ))}
      </div>
      {picked !== null && (
        <>
          <p className={correct ? 'ok' : 'ko'}>{correct ? 'Correct' : `Réponse : ${item.choices[item.answer]}`}</p>
          <p>{item.explanation}</p>
          <button onClick={() => onAnswer(correct)}>Suivant</button>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Créer `src/ui/placement/ListeningStep.tsx`**

```tsx
import { useState } from 'react';
import type { ListeningItem } from '../../content/schemas';
import { RATE_BY_LEVEL, type Speech } from '../../speech/browserSpeech';
import { wordAccuracy } from '../../core/textScore';

export const PASS_ACCURACY = 0.8;

type Props = { item: ListeningItem; speech: Speech; onAnswer: (correct: boolean) => void };

export default function ListeningStep({ item, speech, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState(false);

  const play = () => speech.speak(item.audio, RATE_BY_LEVEL[item.level]).catch(() => {});
  const correct = item.kind === 'mcq' ? picked === item.answer : wordAccuracy(item.audio, typed) >= PASS_ACCURACY;
  const answered = item.kind === 'mcq' ? picked !== null : checked;

  return (
    <section className="card">
      <h2>Écoute</h2>
      {speech.canSpeak ? (
        <button onClick={play}>Écouter</button>
      ) : (
        <>
          <p className="banner">Pas de voix anglaise disponible sur cet appareil : lis la phrase.</p>
          <p><em>{item.audio}</em></p>
        </>
      )}
      {item.kind === 'mcq' ? (
        <>
          <p>{item.question}</p>
          <div className="choices">
            {item.choices.map((c, i) => (
              <button key={i} className="secondary" disabled={picked !== null} onClick={() => setPicked(i)}>{c}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p>Écris ce que tu entends :</p>
          <textarea value={typed} onChange={e => setTyped(e.target.value)} disabled={checked} />
          {!checked && <button disabled={typed.trim() === ''} onClick={() => setChecked(true)}>Valider</button>}
        </>
      )}
      {answered && (
        <>
          <p className={correct ? 'ok' : 'ko'}>{correct ? 'Correct' : 'Pas tout à fait'}</p>
          <p>Texte : <em>{item.audio}</em></p>
          {item.kind === 'mcq' && <p>{item.explanation}</p>}
          <button onClick={() => onAnswer(correct)}>Suivant</button>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Créer `src/ui/placement/WritingStep.tsx`**

```tsx
import { useState } from 'react';
import type { WritingPrompt } from '../../content/schemas';
import type { Grader, GradeResult } from '../../grader/types';

type Props = { prompt: WritingPrompt; grader: Grader; onGraded: (score: number) => void };

export default function WritingStep({ prompt, grader, onGraded }: Props) {
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [checks, setChecks] = useState<boolean[]>(prompt.rubric.map(() => false));
  const [result, setResult] = useState<GradeResult | null>(null);

  const task = { kind: 'writing' as const, promptId: prompt.id, prompt: prompt.prompt, rubric: prompt.rubric, modelAnswer: prompt.modelAnswer };

  const grade = async () => {
    const r = await grader.grade(task, { text, rubricChecks: grader.needsSelfAssessment ? checks : undefined });
    setResult(r);
    onGraded(r.score);
  };

  return (
    <section className="card">
      <h2>{prompt.prompt}</h2>
      <p className="muted">{prompt.promptFr}</p>
      <textarea aria-label="Ta réponse" value={text} onChange={e => setText(e.target.value)} disabled={revealed} />
      {!revealed && (
        <button disabled={text.trim() === ''} onClick={() => (grader.needsSelfAssessment ? setRevealed(true) : grade())}>
          Comparer avec le modèle
        </button>
      )}
      {revealed && !result && (
        <>
          <h3>Exemple de réponse</h3>
          <p><em>{prompt.modelAnswer}</em></p>
          <h3>Coche ce qui est vrai pour ton texte</h3>
          {prompt.rubric.map((r, i) => (
            <label key={r} style={{ display: 'block' }}>
              <input type="checkbox" checked={checks[i]} onChange={() => setChecks(c => c.map((v, j) => (j === i ? !v : v)))} /> {r}
            </label>
          ))}
          <button onClick={grade}>Enregistrer</button>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Créer `src/ui/placement/SpeakingStep.tsx`**

```tsx
import { useState } from 'react';
import type { SpeakingItem } from '../../content/schemas';
import type { Speech } from '../../speech/browserSpeech';
import { wordAccuracy } from '../../core/textScore';
import { PASS_ACCURACY } from './ListeningStep';

type Props = { item: SpeakingItem; speech: Speech; onAnswer: (correct: boolean) => void };

export default function SpeakingStep({ item, speech, onAnswer }: Props) {
  const [heard, setHeard] = useState<string | null>(null);
  const [fallback, setFallback] = useState(!speech.canListen);
  const [busy, setBusy] = useState(false);

  const listen = async () => {
    setBusy(true);
    try {
      setHeard(await speech.listen());
    } catch {
      setFallback(true);
    } finally {
      setBusy(false);
    }
  };

  const accuracy = heard === null ? 0 : wordAccuracy(item.text, heard);

  return (
    <section className="card">
      <h2>Lis à voix haute</h2>
      <p style={{ fontSize: '1.3em' }}>{item.text}</p>
      {speech.canSpeak && <button className="secondary" onClick={() => speech.speak(item.text).catch(() => {})}>Écouter le modèle</button>}
      {fallback ? (
        <>
          <p className="banner">Micro indisponible : lis la phrase à voix haute, puis évalue-toi honnêtement.</p>
          <button onClick={() => onAnswer(true)}>Je l'ai bien dit</button>{' '}
          <button className="secondary" onClick={() => onAnswer(false)}>J'ai hésité ou buté</button>
        </>
      ) : heard === null ? (
        <button onClick={listen} disabled={busy}>{busy ? 'J\'écoute…' : 'Parler'}</button>
      ) : (
        <>
          <p>Entendu : <em>{heard || '(rien)'}</em></p>
          <p className={accuracy >= PASS_ACCURACY ? 'ok' : 'ko'}>{Math.round(accuracy * 100)} % des mots reconnus</p>
          <button onClick={() => onAnswer(accuracy >= PASS_ACCURACY)}>Suivant</button>{' '}
          <button className="secondary" onClick={() => setHeard(null)}>Réessayer</button>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Relancer les tests des étapes — succès attendu**

Run: `npx vitest run src/ui/placement/steps.test.tsx`
Expected: 8 PASS.

- [ ] **Step 8: Tests `src/ui/placement/PlacementFlow.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlacementFlow from './PlacementFlow';
import { createFakeServices } from '../testing/fakeServices';
import type { AppEvent } from '../../core/events';

function setup(events: AppEvent[] = []) {
  const s = createFakeServices();
  const onDone = vi.fn();
  const view = render(<PlacementFlow services={s} uid="u1" events={events} sessionId="S" onDone={onDone} />);
  return { s, onDone, rerender: (evts: AppEvent[]) => view.rerender(<PlacementFlow services={s} uid="u1" events={evts} sessionId="S" onDone={onDone} />) };
}

test('répondre à la grammaire écrit un événement placement_answer', async () => {
  const { s } = setup();
  await userEvent.click(screen.getByRole('button', { name: 'am' }));
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  expect(s.store.append).toHaveBeenCalledWith('u1', expect.objectContaining({
    type: 'placement_answer',
    deviceId: 'test-device',
    payload: { sessionId: 'S', skill: 'grammarVocab', itemId: 'g1', level: 'A2', correct: true },
  }));
});

test('parcours complet → placement_completed puis onDone', async () => {
  const { s, onDone, rerender } = setup();
  await userEvent.click(screen.getByRole('button', { name: 'am' }));
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  rerender([...s.events]);
  await userEvent.type(screen.getByRole('textbox'), 'I start work at nine');
  await userEvent.click(screen.getByRole('button', { name: /valider/i }));
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  rerender([...s.events]);
  await userEvent.type(screen.getByRole('textbox'), 'I am a developer.');
  await userEvent.click(screen.getByRole('button', { name: /comparer avec le modèle/i }));
  await userEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
  rerender([...s.events]);
  s.speech.listen = vi.fn(async () => 'I work in a team');
  await userEvent.click(screen.getByRole('button', { name: /parler/i }));
  await userEvent.click(await screen.findByRole('button', { name: /suivant/i }));
  rerender([...s.events]);
  await userEvent.click(screen.getByRole('button', { name: /voir mon résultat/i }));
  expect(s.events.at(-1)?.type).toBe('placement_completed');
  expect(onDone).toHaveBeenCalled();
});
```

- [ ] **Step 9: Lancer — échec attendu**

Run: `npx vitest run src/ui/placement/PlacementFlow.test.tsx`
Expected: FAIL (PlacementFlow provisoire).

- [ ] **Step 10: Remplacer `src/ui/placement/PlacementFlow.tsx`**

```tsx
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
```

- [ ] **Step 11: Relancer tous les tests et le typecheck**

Run: `npm test && npm run typecheck`
Expected: tous PASS, aucune erreur TS.

- [ ] **Step 12: Vérification manuelle en local**

Run: `npm run dev` puis ouvrir `http://localhost:5173/eng/` dans Chrome ou Edge.
Vérifier : connexion GitHub, 2 questions de grammaire, « Pause », recharger la page → « Reprendre le test » reprend à la 3e question ; bouton « Écouter » produit du son ; « Parler » demande l'autorisation du micro.

- [ ] **Step 13: Commit**

```bash
git add src/ui
git commit -m "feat(ui): parcours du test de positionnement (grammaire, écoute, écrit, oral)"
```

---

### Task 10: PWA installable et mise en production

**Files:**
- Create: `public/icon.svg`, `pwa-assets.config.ts`
- Modify: `vite.config.ts`, `index.html`, `package.json`

**Interfaces:**
- Consumes: build Vite (Task 1)
- Produces: manifest PWA, service worker (mise à jour automatique), icônes PNG.

- [ ] **Step 1: Créer `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2457d6"/>
  <text x="256" y="330" font-family="system-ui, sans-serif" font-size="230" font-weight="700" text-anchor="middle" fill="#fff">En</text>
</svg>
```

- [ ] **Step 2: Générer les icônes PNG**

Run:
```bash
npm install -D @vite-pwa/assets-generator@0.2.6
```
Créer `pwa-assets.config.ts` :
```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({ preset: minimal2023Preset, images: ['public/icon.svg'] });
```
Ajouter dans `package.json` → `scripts` : `"icons": "pwa-assets-generator"`, puis lancer `npm run icons`.
Expected : `public/pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico` créés.

- [ ] **Step 3: Ajouter le plugin PWA dans `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/eng/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Eng — anglais pro',
        short_name: 'Eng',
        lang: 'fr',
        start_url: '/eng/',
        scope: '/eng/',
        display: 'standalone',
        background_color: '#121212',
        theme_color: '#2457d6',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['@testing-library/jest-dom/vitest'],
  },
});
```

- [ ] **Step 4: Compléter `<head>` dans `index.html`**

Ajouter après la balise `<title>` :
```html
    <link rel="icon" href="/eng/favicon.ico" />
    <link rel="apple-touch-icon" href="/eng/apple-touch-icon-180x180.png" />
    <meta name="theme-color" content="#2457d6" />
```

- [ ] **Step 5: Build et vérification du manifest**

Run: `npm test && npm run build && ls dist`
Expected : tests PASS ; `dist/` contient `manifest.webmanifest`, `sw.js`, les icônes.

- [ ] **Step 6: Commit et push (déclenche le déploiement)**

```bash
git add -A
git commit -m "feat(pwa): manifest, icônes et service worker"
git push
```

- [ ] **Step 7: Vérification en production (utilisateur)**

1. Actions → Deploy : succès.
2. Sur PC (Chrome/Edge) : `https://hacen44800.github.io/eng/` → connexion GitHub → l'icône « Installer » apparaît dans la barre d'adresse.
3. Sur téléphone : même URL → connexion → « Ajouter à l'écran d'accueil ».
4. Synchro : répondre à 2 questions sur PC, ouvrir l'appli sur le téléphone → « Reprendre le test » à la 3e question.
5. Hors ligne : mode avion sur le téléphone, répondre à une question → bannière « Hors ligne » ; réactiver le réseau → la bannière disparaît.
6. Sécurité : après ta première connexion réussie, dans Firebase → Authentication → Paramètres → **Actions des utilisateurs**, décocher **Activer la création (inscription)**. Plus personne d'autre ne pourra créer de compte.
