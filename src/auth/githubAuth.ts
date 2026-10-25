import { GithubAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth } from '../firebase/app';
import type { AuthService } from '../services';

// Erreurs typiques de la popup sur iPhone / PWA installée : on bascule sur la redirection.
const POPUP_UNSUPPORTED = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
  'auth/cancelled-popup-request',
]);

export function createGithubAuth(): AuthService {
  return {
    onUser(cb) {
      return onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, name: u.displayName ?? u.email ?? 'moi' } : null));
    },
    async signIn() {
      const provider = new GithubAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        if (POPUP_UNSUPPORTED.has((err as { code?: string }).code ?? '')) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw err;
      }
    },
    async signOut() {
      await signOut(auth);
    },
  };
}
