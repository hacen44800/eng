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
