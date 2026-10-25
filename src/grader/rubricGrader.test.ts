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
