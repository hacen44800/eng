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
