# Conversation reader SDK

This is a local ESM bundle of the official Firebase JavaScript SDK **10.12.2** (npm `firebase@10.12.2`). It supplies the authenticated Firestore reader used by the Fromm Chat protocol. It does not replace Viewer authentication, playback, or the Liquid Glass engine.

Exports: `initializeApp`, `deleteApp`, `initializeAuth`, `inMemoryPersistence`, `signInWithCustomToken`, `signOut`, `getIdTokenResult`, `initializeFirestore`, `collection`, `query`, `where`, `onSnapshot`, `terminate`.

Built with esbuild **0.25.12**, browser ESM, target ES2020, minification and linked legal comments. The entry only re-exports the named functions from `firebase/app`, `firebase/auth`, and `firebase/firestore`. No runtime CDN or npm installation is needed. `LICENSE` and the generated `.LEGAL.txt` preserve Apache 2.0 and bundled third-party notices. Upstream: <https://github.com/firebase/firebase-js-sdk>.

Rebuild with those exact tool versions and flags:

`entry.mjs`:

```js
export {initializeApp,deleteApp} from 'firebase/app';
export {initializeAuth,inMemoryPersistence,signInWithCustomToken,signOut,getIdTokenResult} from 'firebase/auth';
export {initializeFirestore,collection,query,where,onSnapshot,terminate} from 'firebase/firestore';
```

```sh
esbuild entry.mjs --bundle --format=esm --platform=browser --target=es2020 --minify --legal-comments=linked --outfile=conversation-10.12.2.js
```

The SDK is imported only for a visible, authenticated conversation with loaded history. Auth uses **in-memory persistence**; only the application's account-scoped conversation cache stores messages/drafts. Firestore documents are notification hints: canonical messages continue to come from the existing authenticated Fromm REST endpoint. Server reader claims must include the selected host room. A failed or unsupported push connection falls back to serialized incremental REST reads.
