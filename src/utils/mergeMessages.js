/** Merge message lists by id, sorted oldest → newest. */
export function mergeMessages(existing, incoming) {
  if (!incoming?.length) return existing || [];
  if (!existing?.length) return [...incoming];

  const byId = new Map();
  existing.forEach((m) => byId.set(m.id, m));
  incoming.forEach((m) => {
    const prev = byId.get(m.id);
    byId.set(m.id, prev ? { ...prev, ...m } : m);
  });

  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
}
