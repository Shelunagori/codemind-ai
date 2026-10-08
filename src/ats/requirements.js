// The requirements a posting is judged on: read from it once and cached for every resume
// scored against it (workspace/service.js anchoredJob), so the list judged never changes.

/** How many of a posting's requirements beyond its named skills are read and judged. */
export const MAX_REQUIREMENT_ITEMS = 20;

/**
 * The requirements to keep of the ones read from a posting, most important first, when there are
 * more than `max`. Each kind the posting has keeps its first `reserve` items before the rest fill
 * by rank, so a posting with many experience lines does not push every responsibility out and
 * leave that category of the score unjudged.
 */
export function pickRequirementItems(items, max = MAX_REQUIREMENT_ITEMS, reserve = 4) {
  if (items.length <= max) return items;
  const chosen = new Set();
  for (const kind of new Set(items.map((i) => i.kind))) items.filter((i) => i.kind === kind).slice(0, reserve).forEach((i) => chosen.add(i));
  for (const item of items) {
    if (chosen.size >= max) break;
    chosen.add(item);
  }
  return items.filter((i) => chosen.has(i)).slice(0, max);
}
