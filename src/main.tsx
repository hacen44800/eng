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
