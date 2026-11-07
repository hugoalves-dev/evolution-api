import { randomUUID } from 'node:crypto';

/** Stable for supported message upserts; other observations receive a distinct ID per emission. */
export function eventIdFor(event: string, data: object): string {
  if (event.replace(/_/g, '.').toLowerCase() === 'messages.upsert') {
    const key = (data as { key?: unknown } | null)?.key;
    const id = key && typeof key === 'object' ? (key as { id?: unknown }).id : undefined;
    if (typeof id === 'string' && id.trim()) return id;
  }
  return randomUUID();
}
