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
