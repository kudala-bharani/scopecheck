# ScopeCheck NLI runtime validation

## Verified result

Real inference completed on 27 handwritten exploratory cases using both Transformers.js 3.8.1 with native ONNX CPU and onnxruntime-web WASM (one thread) in Node. All 27 argmax labels matched across those two runtimes. This is a smoke/regression audit, not an accuracy benchmark or contract-domain validation.

Actual browser dedicated-worker execution was not established in that validation run. The validation environment could not launch Chromium because of OS socket restrictions and could not complete a browser check against the localhost server. A deployed-app browser smoke is still required. The included application is the browser test target: serve `dist/` from the repository root and open it in a supported browser, as described in README.md. Its worker is `dist/model-worker.js`; there is no separate browser harness in this repository. Its initial bare-import path was corrected to the bundled browser distribution.

Important: an unbundled browser worker must import `dist/transformers.min.js`. `dist/transformers.web.min.js` starts with unresolved bare imports from `onnxruntime-common` and `onnxruntime-web`. The package's `jsdelivr` and `unpkg` entries point to `dist/transformers.min.js`.

## Reproducibility

Included files:

- `docs/cases.json`: 27 original pairs
- `docs/node-results.json`: historical native CPU logits, normalized model scores, timings
- `docs/wasm-results.json`: historical WASM logits, normalized model scores, timings
- `docs/test-node.mjs`: native CPU inference harness
- `docs/test-wasm.mjs`: actual onnxruntime-web WASM inference harness
- `dist/model-worker.js`: application worker with pinned assets and explicit length rejection

To rerun the included Node harnesses from the repository root, use an isolated working directory. The harnesses resolve `cases.json` and `models/` relative to their working directory and write results there; this preserves the historical evidence in `docs/`.

```sh
mkdir -p artifacts/model-check
cp docs/cases.json docs/test-node.mjs docs/test-wasm.mjs artifacts/model-check/
cd artifacts/model-check
npm install --cache ./.npm \
  --ignore-scripts --no-audit --no-fund \
  @huggingface/transformers@3.8.1 \
  onnxruntime-web@1.22.0-dev.20250409-89f8206ba4

mkdir -p models/Xenova/nli-deberta-v3-xsmall/onnx
for file in config.json tokenizer_config.json tokenizer.json onnx/model_quantized.onnx; do
  curl -fL --retry 2 --max-time 180 \
    "https://huggingface.co/Xenova/nli-deberta-v3-xsmall/resolve/2a4f614a701367a02d51389039afc998faeda637/$file" \
    -o "models/Xenova/nli-deberta-v3-xsmall/$file"
done
node test-node.mjs
node test-wasm.mjs
```

This requires network access and downloads the dependencies and model assets. These portable commands were adapted for the supplied files during the October 14 source audit; real inference was not rerun in that audit. The stored results above are evidence from the earlier run.

Historical runtime: Node 24.19.0; Transformers.js 3.8.1; its onnxruntime-web dependency 1.22.0-dev.20250409-89f8206ba4. WASM session provider was explicitly `wasm`, not native CPU. WASM load from local disk took 1.59 s; short-pair median 51.7 ms, range 33.6–106.4 ms in that environment. These are not client-browser performance promises.

## Model and assets

Model ID: `Xenova/nli-deberta-v3-xsmall`

Immutable revision: `2a4f614a701367a02d51389039afc998faeda637`

Labels: 0 contradiction; 1 entailment; 2 neutral. Read/assert mapping from config rather than assume generic MNLI order.

- q8 asset: `onnx/model_quantized.onnx`, 87,246,587 bytes
- q8 SHA-256: `3fac2500c45c75af42c7711de0d1b93d59577456100208be0dc1f9e8811946b6`
- tokenizer.json: 8,656,551 bytes
- tokenizer SHA-256: `a86f883318afa11c8c10466f1bf4efaeb6ded28a52cbe57217a8fa0d0a2a87df`
- config.json: 1,038 bytes
- tokenizer_config.json: 384 bytes
- Transformers.js bundled browser WASM: 21,596,019 bytes

Model and tokenizer alone are approximately 95.9 MB decimal. First load also needs runtime JS/WASM, making a blanket 87 MB total download claim inaccurate. q8 maps to `_quantized`, not `_int8` or `_uint8`.

The original `cross-encoder/nli-deberta-v3-xsmall` model card explicitly declares Apache-2.0. Transformers.js is Apache-2.0. Xenova's conversion README links the base model but contains no independent license field or LICENSE file. Attribute both base model and conversion; describe it as an ONNX conversion of the Apache-2.0 base model rather than invent an explicit separate declaration.

Transformers.js 3.8.1 is intentionally pinned to the version used in the recorded validation. This project makes no claim that it is the latest release.

## Pair/token API

Use premise as the first tokenizer argument and hypothesis via `text_pair`:

```js
const inputs = tokenizer(premise, {
  text_pair: hypothesis,
  truncation: false,
  padding: false,
});
const tokenCount = inputs.input_ids.dims.at(-1);
if (tokenCount > 512) return { rejected: true, tokenCount };
const { logits } = await model(inputs);
```

Both tokenizer config and model config specify 512 tokens; this covers the complete encoded pair including special tokens. A synthetic long pair measured 715 tokens with truncation false, demonstrating that no truncation happened in this API route. Reject it before inference. Do not silently segment, drop exclusions, or infer coverage from partial text.

Both zero-shot and text-classification pipeline internals in 3.8.1 enable truncation. The zero-shot pipeline also rewrites hypotheses and normalizes entailment against other labels or against contradiction, excluding neutral in the latter case. Use low-level model logits and three-way softmax instead.

Single-thread WASM avoids dependence on cross-origin-isolation headers needed for multithreading. Keep one initialized model in a dedicated worker; serialize inference and guard UI results against stale requests. Browser memory limits, fetch/cache availability and CDN access still need end-to-end testing.

## Highest-value semantic findings (WASM)

- Responsive landing-page promise → exact imperative request: entailment 99.50%
- Same promise → polite responsive request: entailment 77.75%
- Same promise → inserted actor “The freelancer”: neutral 97.92%; templates can change meaning
- Conditional Stripe integration → unconditional integration: entailment 99.12%; declarative form 99.29%. A high score does not verify the condition has been met
- Two revision rounds → “One more round”: contradiction 96.98%, despite missing history about rounds already used
- CRM integration excluded → HubSpot contact creation: neutral 98.57%, despite a substantively relevant exclusion
- Client writes copy → freelancer writes copy: contradiction 99.49%, but the product must clarify responsibility rather than automatically declare billable work
- Responsive homepage → responsive homepage plus blog: neutral 99.86%; split mixed requests explicitly
- Design only/no implementation → ship production page: contradiction 99.53%

Normalized scores are uncalibrated model scores, not a probability that a request is in scope, excluded, billable or legally agreed. These examples support displaying source evidence and conditional/quantity/actor/mixed-request warnings even at high model scores. Generic neutral is not proof of an approved change.

## Primary sources

- Base model card and license: https://huggingface.co/cross-encoder/nli-deberta-v3-xsmall
- ONNX conversion: https://huggingface.co/Xenova/nli-deberta-v3-xsmall
- Pinned label/model config: https://huggingface.co/Xenova/nli-deberta-v3-xsmall/blob/2a4f614a701367a02d51389039afc998faeda637/config.json
- Pinned tokenizer config: https://huggingface.co/Xenova/nli-deberta-v3-xsmall/blob/2a4f614a701367a02d51389039afc998faeda637/tokenizer_config.json
- Pinned asset tree: https://huggingface.co/Xenova/nli-deberta-v3-xsmall/tree/2a4f614a701367a02d51389039afc998faeda637/onnx
- Quantization API: https://huggingface.co/docs/transformers.js/v3.8.1/en/guides/dtypes
- Model API: https://huggingface.co/docs/transformers.js/v3.8.1/en/api/models
- Tokenizer implementation: https://github.com/huggingface/transformers.js/blob/3.8.1/src/tokenizers.js
- Pipeline implementation: https://github.com/huggingface/transformers.js/blob/3.8.1/src/pipelines.js
- CDN package declaration: https://github.com/huggingface/transformers.js/blob/3.8.1/package.json
