# G3 Cold-Read Notes

Per PRD-000 § 3 G3 — a named cold-reader reads only the README and reports whether they can:

1. Understand the pattern
2. Identify the two swap-points (EntitlementStore + PaymentProvider)
3. Describe what they'd change for their own app

**Pass criteria:** Yes to all three.

---

## Cold-reader

- **Name:** <to be filled in by operator>
- **Context:** <colleague / contractor / LLM in clean context>
- **Date read:** <YYYY-MM-DD>

## Outcome

- **(1) Understands the pattern:** <yes/no — one-line summary of their description>
- **(2) Identifies swap-points:** <yes/no — did they name EntitlementStore AND PaymentProvider?>
- **(3) Describes their app change:** <yes/no — one-line summary of what they said>

## Pass / fail

**PASS** | **FAIL** (operator strikes one)

## Notes

<any operator observations about what made the README easy or hard to grok>

---

## Instructions for the operator

1. Send the cold-reader ONLY the README (paste the content or share the repo URL once
   public — do not share this file, the task breakdown, or any other planning artifacts).
2. Ask them these three questions verbatim:
   - "After reading the README, can you explain in one sentence what the Paywall Blueprint
     pattern does?"
   - "Can you name the two swap-points — the interfaces an adopter would replace to bring
     their own backend or payment provider?"
   - "Can you describe one specific thing you would change or replace to use this in your
     own Sitecore Marketplace App?"
3. Record their responses (paraphrased is fine) in the Outcome section above.
4. If the cold-reader FAILS any criterion: revise the README (T047) and repeat with a
   fresh reader. Do not re-test the same person — they are no longer cold.
5. Commit this file once the outcome is recorded. G3 PASS is required before T055/T056
   (repo public flip).
