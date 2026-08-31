# Vendored Stockfish engine (lite, single-threaded)

`stockfish-18-lite-single.js` + `.wasm` — Stockfish 18, the "lite single-threaded"
build from the [`stockfish`](https://www.npmjs.com/package/stockfish) npm package
(v18.0.8, by Nathan Rugg / Chess.com — https://github.com/nmrugg/stockfish.js).

**Why this build and not another:** the full NNUE engine is >100MB and the
multi-threaded builds require `Cross-Origin-Opener-Policy` /
`Cross-Origin-Embedder-Policy` headers (for `SharedArrayBuffer`) that this app
doesn't set. The lite single-threaded build is ~7MB, runs as a plain Web
Worker with no special headers, and is still far stronger than any of the
four difficulty tiers ever ask it to play — see `lib/chess/engine.ts`.

**Why vendored here instead of a dependency:** the app only ever loads these
two files as a Worker script by URL (`new Worker("/stockfish/stockfish-18-lite-single.js")`);
nothing imports the `stockfish` npm package from JS. Keeping it as a
`package.json` dependency would re-run its postinstall (which downloads
*every* build variant, ~250MB) on every install. Committing just the two
files this app actually uses avoids that.

**License:** Stockfish is GPLv3 (`Copying.txt` in the npm package). It is
invoked here as a separate engine process over the UCI protocol (the same
architecture lichess.org and chess.com use for in-browser analysis), never
statically linked into this app's own code.

**Updating:** `npm pack stockfish@<version>` in a scratch dir, or trigger its
postinstall, then re-copy `bin/stockfish-18-lite-single.{js,wasm}` here.
