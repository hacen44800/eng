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
