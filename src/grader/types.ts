export type GradeTask = { kind: 'writing'; promptId: string; prompt: string; rubric: string[]; modelAnswer: string };
export type GradeAnswer = { text: string; rubricChecks?: boolean[] };
export type GradeResult = { score: number; feedback: string[] };

/** Point d'extension : un futur LlmGrader implémente cette interface (needsSelfAssessment = false). */
export interface Grader {
  readonly needsSelfAssessment: boolean;
  grade(task: GradeTask, answer: GradeAnswer): Promise<GradeResult>;
}
