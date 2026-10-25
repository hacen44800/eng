import type { AppEvent } from '../../core/events';
import type { Services } from '../../services';

export type PlacementFlowProps = { services: Services; uid: string; events: AppEvent[]; sessionId: string; onDone: () => void };

export default function PlacementFlow({ onDone }: PlacementFlowProps) {
  return <main><button onClick={onDone}>Retour</button></main>;
}
