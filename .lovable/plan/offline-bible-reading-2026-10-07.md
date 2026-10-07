# Offline Bible Reading

## Goal
Make chapters from a reader-selected translation available offline, while keeping Search, Events, Reminders, Profile, saved-item sync, and Auth online-only.

## Implementation
- Add a small IndexedDB cache for plain chapter data, with a last-used-version limit and least-recently-used cleanup.
- Update the reader to check that cache before calling the existing secure API.Bible function; render a clear offline-not-downloaded message when no cached chapter is available.
- Start a low-priority, one-chapter-at-a-time download of the selected translation’s remaining chapters after a successful online read. Persist progress so it can resume later, avoid downloading unselected translations, and continue when connectivity returns.
- Queue bookmark/note/highlight changes made offline and retry their existing save path when connectivity returns, without changing online-only profile synchronization.
- Replace the hand-written app worker with the required generated worker for published offline navigation/assets. Add one guarded registration wrapper, disable it in development/preview, support `?sw=off`, and replace the old `/service-worker.js` with a one-release cleanup worker for returning visitors.
- Keep Search, Events, Reminders, Profile and Auth network-dependent; do not add offline caching for their data.

## Verification
- Check TypeScript and the current preview build diagnostics.
- Exercise cached chapter, uncached offline chapter, and reconnection/download behavior in the reader; verify unrelated routes are not cached as offline data.
- Note that generated service-worker offline behavior is available in the published app, not the Lovable preview.

## Technical details
- Cache keys include API.Bible translation ID, book code, and chapter number; store the existing parsed verse DTO, not page HTML.
- Background requests are sequential and idle-prioritized to limit load on API.Bible; the existing Bible catalog/filter rules remain unchanged.
- Retain at most two recently used translation caches, with chapter-level LRU eviction when the browser storage budget is approached.
