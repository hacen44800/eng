export {};

const signInWithPopup = vi.fn();
const signInWithRedirect = vi.fn(async (..._a: unknown[]) => {});
vi.mock('../firebase/app', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  GithubAuthProvider: class {},
  onAuthStateChanged: () => () => {},
  signOut: vi.fn(),
  signInWithPopup: (...a: unknown[]) => signInWithPopup(...a),
  signInWithRedirect: (...a: unknown[]) => signInWithRedirect(...a),
  getRedirectResult: vi.fn(async () => null),
}));

const { createGithubAuth } = await import('./githubAuth');

test('popup bloquée ou non supportée (iPhone, PWA installée) → repli sur la redirection', async () => {
  signInWithPopup.mockRejectedValueOnce(Object.assign(new Error('blocked'), { code: 'auth/popup-blocked' }));
  await createGithubAuth().signIn();
  expect(signInWithRedirect).toHaveBeenCalled();
});

test('autre erreur (réseau) → propagée, pas de redirection', async () => {
  signInWithRedirect.mockClear();
  signInWithPopup.mockRejectedValueOnce(Object.assign(new Error('net'), { code: 'auth/network-request-failed' }));
  await expect(createGithubAuth().signIn()).rejects.toThrow('net');
  expect(signInWithRedirect).not.toHaveBeenCalled();
});
