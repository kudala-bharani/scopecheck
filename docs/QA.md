# Verification record

## Verified

- Fresh project created after the October 12, 2026 19:00 UTC launch boundary
- Source files pass JavaScript syntax checking
- Real quantized model inference on 27 handwritten exploratory premise/hypothesis pairs using native ONNX CPU
- Real quantized model inference on those same 27 pairs using single-thread onnxruntime-web WASM in Node
- All 27 argmax labels match across native CPU and WASM; full scores, mistakes and limitations are retained in REPORT.md, node-results.json and wasm-results.json
- Model identity, immutable revision, q8 artifact size, three-label mapping and 512-token limit verified
- A synthetic 715-token pair confirmed truncation:false preserves length before explicit rejection
- No runtime API key or paid service is required; app uses no analytics and holds project data in tab memory
- Fonts are self-hosted, avoiding third-party font requests at page load
- October 14 source audit: all JavaScript and model-harness files pass Node syntax checking; 62 local tests pass (31 core, 20 simulated UI, 10 mocked-worker orchestration, 1 stylesheet regression)
- The recovered stylesheet's stray font-import fragment was removed; jsdom now parses 190 rules and the intended root colors
- A synchronous worker-construction failure now clears the busy state, reports the problem, and permits retry; a simulated-UI regression covers this path

Current local results are recorded in test-report.md and tests/latest-results.txt. These are not a substitute for a real browser test. The 27-pair model results are retained historical evidence; the October 14 audit verified consistency between the saved result files but did not rerun real inference.

## Not verified / blocked

- Full deployed browser module-worker/CDN/CORS/model-download path
- Real browser visual/responsive/accessibility QA and screenshot capture
- Mobile memory/performance and Safari/Firefox support
- Browser cached reload/offline behavior; no offline guarantee is made
- Real browser clipboard/download behavior

The original validation environment could not launch Chromium due to OS socket restrictions. Browser access to the local server was also unavailable during the October 14 audit. Public demo access and deployed-browser QA are pending final verification. Deployment-specific findings should be recorded here after they are observed.

## Important measured model failures

Conditional Stripe integration produced ~99% entailment for an unconditional integration request. Usage-dependent revision wording produced ~97% contradiction despite missing prior-use information. An excluded CRM integration phrased as HubSpot contact creation produced mostly neutral output. These findings rule out treating raw scores as contractual coverage or billability probabilities.

The application therefore keeps conservative labels, explicit conditions/ambiguity checks, original evidence, user overrides and user-supplied estimates. It makes no legal conclusion, obligation or schedule promise.
