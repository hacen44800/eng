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
