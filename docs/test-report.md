# ScopeCheck implementation tests

## Result

**62 tests passed, 0 failed, 0 skipped** on October 14, 2026, using Node.js 24.19.0 with jsdom 26.1.0. The final run completed in approximately 1.6 seconds. See `tests/latest-results.txt` for the captured output.

This is a **Node-based unit and simulated-DOM test suite**, not a real-browser end-to-end test. It uses the shipped `dist/core.js`, `dist/app.js`, `dist/index.html`, `dist/style.css`, and `dist/model-worker.js`. The suite does not modify production source.

## Reproduce

From the project root:

```sh
npm ci --prefix tests --cache ./artifacts/npm-cache --ignore-scripts --no-audit --no-fund
npm test
```

The isolated test package pins jsdom 26.1.0 and includes its dependency lockfile. The production app does not depend on jsdom. A clean install using this lockfile, disabled lifecycle scripts, and a writable cache followed by `npm test` was verified in the October 14 audit.

## Coverage

### Core logic: 31 tests

- Empty input, 20-scope/12-request limits, and 2,500-character limits
- Stable three-way softmax without numeric overflow
- Quantity increases for pages, concepts, screens, languages, and the number word “eleven”; equal, reduced, and unrelated-unit quantities
- Explicitly negated quantities do not invent a change
- Conditional and global scope clauses cannot become unconditional coverage from a high model score
- Strong unconditional textual support, weak support, neutral results, and explicit exclusions
- Instruction-like, vague, mixed-deliverable, and history-dependent revision requests
- HTML escaping and initial manual-review state
- Final human decisions controlling estimates, invalid/absent hours, source quotations, review notes, incomplete totals, and non-binding export language
- Replay of previously saved real-WASM scores for conditional and revision-history cases
- Static checks for a pinned runtime/model revision, three-way label validation, single-thread WASM, disabled tokenizer truncation, and the full-pair token limit

### Simulated UI: 20 tests

- No model worker before explicit download confirmation
- Manual decisions, estimated hours, notes, filters, and brief consistency
- Negative/empty hours handling
- Scope or request edits clearing stale decisions, notes, estimates, and model analysis; ordinary title/rate edits preserve review decisions
- User-provided markup rendered as inert text across project fields and notes
- Cancellation, retry, worker failure, and timeout behavior
- Synchronous worker-construction failure clears the busy state, shows an error, and permits retry
- Stale old-run progress, completion, and error events cannot overwrite or abort the active review
- Editing scope during analysis cancels the worker and rejects stale results
- Completed model review preserves human overrides and entered estimates
- Clipboard copy, download contents/filename/type, custom client-response copy, and clipboard-failure fallback
- Brief/back navigation independent of the sidebar
- User-edited response surviving navigation
- Focus returning to a re-rendered review toggle

The harness supplies mock Worker, clipboard, Blob/download, dialog, and timer APIs. These tests establish application-state behavior; they do not establish real browser permissions, focus accessibility quality, OS downloads, rendering, mobile layout, or actual Web Worker support.

### Stylesheet regression: 1 test

- The shipped stylesheet parses in jsdom and retains the intended root color-variable rule

This is a syntax/CSSOM regression check, not a visual rendering or contrast audit.

### Worker orchestration: 10 tests

- Every scope/request pair is compared with complete inputs and truncation disabled
- A 512-token complete pair is accepted; 513 tokens are rejected before inference
- One oversized pair holds the entire request, avoiding a partial-scope result
- Separate short requests can continue when another request is too long
- Instruction-like requests skip tokenization and inference
- Wrong label mappings, runtime failures, and inference failures stop without partial completion
- Logits are mapped to contradiction/entailment/neutral correctly
- The initialized model is reused across serialized runs

These tests execute the shipped worker control flow in Node's VM while replacing the remote model runtime with deterministic test doubles. Token counts in these tests are synthetic boundary inputs. They are **not** new model inference measurements.

## Defects corrected during review

The implementation owner corrected the following and the final suite verifies the regression cases:

1. A negated quantity such as “Keep five pages, not eight pages” could trigger a deterministic change flag
2. The quantity parser omitted “eleven”
3. “Provided payment arrives” and a global condition in a separate scope item could permit a high-confidence coverage label
4. Failed/timed-out runs needed invalidation and worker-identity guards so stale completion/error callbacks could not affect a later review
5. A leftover font-import fragment prevented the stylesheet from parsing in jsdom; removing it restored all 190 stylesheet rules and the root color variables
6. A synchronous `new Worker()` exception left the UI busy without an error or timeout; the existing failure path now handles it and allows retry

The first three were reproduced against the initial core implementation. The stale-handler issue was identified by source inspection; its final behavior was verified with deliberately delivered late callbacks in the UI mock. The stylesheet and worker-construction defects were reproduced and fixed in the October 14 audit. The suite does not imply these events will occur identically in every browser.

## Separate real-model evidence

`docs/REPORT.md`, `docs/wasm-results.json`, and `docs/node-results.json` contain prior real inference evidence: 27 handwritten exploratory cases with matching argmax labels between native CPU and WASM-in-Node. This run reused those artifacts and did not redownload or rerun the model. Those cases are smoke/regression evidence, not an accuracy benchmark or legal-domain validation.

## Remaining release check

Actual deployed-browser loading, worker startup, model download/cache behavior, WASM inference, and mobile rendering still need a browser smoke test. The test environment could not reach the local HTTP server. Public demo access and behavior remain pending final verification.

Recommended browser smoke: open the deployed application, make a manual decision and export a brief, consent to model download, complete a sample analysis, cancel and retry a run, and repeat navigation at narrow viewport width. Treat model labels as review suggestions throughout.
