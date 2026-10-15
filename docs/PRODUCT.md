# ScopeCheck

ScopeCheck is a private scope-change desk for independent developers and designers. It makes client requests reviewable next to the original agreement, then helps prepare a clear conversation. It does not determine legal scope, calculate deserved compensation, or send client messages.

## Product hypothesis

Freelancers often need to compare informal client requests with a scattered agreed scope before discussing cost. A browser-local NLI model can surface relevant wording without asking them to upload commercially sensitive documents to an inference API. The useful outcome is a reviewed change brief, not an AI verdict.

An unvalidated monetization hypothesis is a $29 one-time desktop/local-first tool purchase. No payment flow, customers, sales, or proven willingness to pay are claimed in this prototype. Customer discovery and observed task completion are next validation steps.

## Prototype decisions

- Original agreed-scope items and one client request per line
- Fictional Northstar Studio example, visibly marked as sample input
- Every valid scope/request pair is analyzed by a real quantized NLI model
- All three label scores retained, with exact original wording shown
- No chat model, generative explanation, inferred hours, or remote inference
- Strong entailment plus guardrails can suggest Likely covered
- An explicit quantity discrepancy or strong model contradiction against restrictive wording can suggest Possible change
- Neutral and unclear comparisons remain Needs clarification
- Conditions, vague/mixed requests, instruction-like text and 512-token limits cause conservative handling
- Users own the final label, hours, rate, notes and client communication
- Deterministic grounded review brief and editable response template; copy and text export
- Memory-only project content; model cache may persist but document text does not

## Boundaries

NLI is trained on general English, not contracts. Scores are not calibrated to scope coverage. Text is compared as written, without a potentially misleading actor or obligation rewrite. Cross-clause dependencies, project history, legal context, units, negation and intent can be missed. One line must retain its own conditions. All suggestions require review. The handwritten test set is an exploratory regression suite, not measured general accuracy.
