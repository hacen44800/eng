import { placementContentSchema, type PlacementContent } from '../schemas';
import grammar from './grammar.json';
import listening from './listening.json';
import writing from './writing.json';
import speaking from './speaking.json';

export const placementContent: PlacementContent = placementContentSchema.parse({ grammar, listening, writing, speaking });
