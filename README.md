# ScopeCheck

Your work. Clearly scoped.

[Public source repository](https://github.com/kudala-bharani/scopecheck)

A browser-local scope-change desk for independent developers and designers, built as a new Hacktoberfest 2026 Week 2: Side Hustle project. It compares client requests with original agreed-scope items using a genuine open-weight NLI model, then helps a human prepare a clear change conversation.

## Run locally

No build, backend, API key, or app account is needed. Serve the static directory over localhost or HTTPS:

```sh
python3 -m http.server 4173 --directory dist
# open http://localhost:4173
```

Opening index.html as a file URL will not support module workers. The first AI review requires a network connection for approximately 120 MB of model, tokenizer, and runtime assets. Desktop Chromium is the initial target; other browsers and mobile devices remain unverified. The public hosted demo route is pending final verification.

## Test

```sh
npm ci --prefix tests --ignore-scripts --no-audit --no-fund
npm test
```

The core test runner is built into Node 20+. The UI simulation suite uses the pinned lockfile in tests/ (jsdom 26.1.0). No test sends real client information.

The October 14, 2026 local audit passed 62 tests, including simulated UI, worker orchestration and a stylesheet parsing regression. These checks do not establish real-browser model loading, rendering or accessibility; see [docs/test-report.md](docs/test-report.md).

Actual exploratory model results and reproduction instructions: [docs/REPORT.md](docs/REPORT.md). Native ONNX and actual WASM both ran 27 pairs; this is not a domain accuracy benchmark. See [docs/QA.md](docs/QA.md) for explicitly verified versus blocked stages.

## Features

- Original agreement items and client requests, with a clearly labeled fictional sample
- Explicit model download with progress, cancel, retry, timeout and honest failure states
- Single-thread WASM inference in a module Web Worker
- All three NLI scores; exact source excerpts; no invented rationale
- Conservative Likely covered / Possible change / Needs clarification suggestions
- Separate deterministic quantity checks, ambiguity/instruction checks, and no silent token truncation
- Human override, optional hours, your rate/currency, and notes
- Grounded review brief and editable client response; copy or plain-text download
- Memory-only content, no analytics, no document upload, no remote inference
- Responsive, keyboard-accessible interface, native dialog focus handling and reduced-motion support

## Model

- Base: `cross-encoder/nli-deberta-v3-xsmall`, Apache-2.0 model card
- ONNX: `Xenova/nli-deberta-v3-xsmall`
- Pinned revision: `2a4f614a701367a02d51389039afc998faeda637`
- q8 artifact: `onnx/model_quantized.onnx`, 87,246,587 bytes
- Runtime: deliberately pinned Transformers.js 3.8.1, bundled browser module
- Labels asserted from config: 0 contradiction, 1 entailment, 2 neutral
- Input: original scope premise + original request hypothesis, no rewriting
- Length: tokenize with `truncation:false`; reject the entire request if any scope pair exceeds 512 tokens

The model plays a material role: each request is compared against every scope item and the scores select related evidence and support conservative suggestions. It is not a mock, keyword-only classifier, or generative API wrapper. Deterministic safety checks are labeled separately.

## Privacy and trust boundary

Project text lives in the browser tab and is lost on refresh/close. Asset requests to the app host, jsDelivr and Hugging Face carry ordinary request metadata (such as IP address), not project text. Fonts are self-hosted. Browser model caches can persist; offline execution is not guaranteed. Exports and clipboard writes occur only on user action. Browser extensions and shared-device security are outside the app boundary.

## Limitations

This model was trained on general English NLI, not freelance agreements. It misses scope nuances, can be confidently wrong, and is sensitive to phrasing. These scores are not probabilities of legal coverage. Missing support is not proof of extra work. Estimates are user-entered, exclude taxes, and require mutual approval. The app makes no commitments, sends no messages, and does not replace professional advice.

Conditional work, actor reversals, usage-dependent revision counts and multi-clause dependencies need human judgment. A 20-scope/12-request cap bounds the workload. Preserve conditions and exclusions when splitting larger inputs. No arbitrary input text is executed as HTML or code.

## Layout

- `dist/`: complete static application; source modules are readable and unbundled
- `tests/`: core and UI-simulation regression tests
- `docs/`: product assumptions, exploratory model evidence, and QA

## Contest status

Created October 12, 2026 after 19:00 UTC. This is a new project, not a modification of an earlier entry. This repository publishes the Apache-2.0 source for the Hacktoberfest 2026 Week 2: Side Hustle entry. The public demo route and deployed-browser behavior are pending final verification. A source release alone does not establish that the demo is accessible or that the DEV submission is complete.

Source: Apache-2.0. Third-party notices: [NOTICE](NOTICE).
