<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- src/server.ts imports @tanstack/react-start/server-entry statically, never via lazy import() — the lazy form makes the production bundle split into circular chunks and every request 500s ("__exportAll is not a function").
- Bible passage data is cached in IndexedDB and published offline navigation/assets use vite-plugin-pwa's generated worker behind one guarded registration wrapper; this keeps chapter data structured and prevents stale service workers from breaking previews.
