# Reproducibility and Analysis Audit Pack — illustrative template

**Illustrative structure. No client information. Actual scope and evidence requirements vary by project.**

Published by Gurjas Evidence and Policy Analytics · gurjas.org
Template version 1.0 · 21 July 2026

---

## What this document is for

An audit pack lets someone who was not involved in the analysis — a
supervisor, a co-author, a journal reviewer, or the original analyst
eighteen months later — reproduce the reported result from the raw data,
and understand every material decision made along the way. If a result
cannot be regenerated from what is in the pack, the pack is incomplete,
regardless of how polished the final report looks.

## 1. File manifest

List every file that materially contributes to the result, with a hash so
later readers can confirm they are looking at the exact file used.

| File | Description | SHA-256 (first 12 characters is usually enough to record by hand) | Date added |
|---|---|---|---|
| | | | |

*Generating a SHA-256 hash:* `sha256sum filename` (Linux/macOS) or
`Get-FileHash filename -Algorithm SHA256` (Windows PowerShell).

## 2. Data dictionary completeness check

For the primary analysis dataset, confirm each of the following exists and
is current, or note explicitly that it does not:

- [ ] Every variable has a name, label and coding scheme recorded
- [ ] Missing-value codes are documented and distinguished from true zeros
- [ ] Reverse-coded items are flagged
- [ ] Derived/computed variables document their exact formula
- [ ] Date/time variables record their timezone or collection convention

## 3. Analysis-decision log

A running log of decisions made *during* analysis, in the order they were
made — not reconstructed afterward to match the final narrative.

| Date | Decision | Reason | Alternative considered | Effect on result (if known) |
|---|---|---|---|---|
| | | | | |

## 4. Software and environment

| Component | Version | Notes |
|---|---|---|
| Software / language | | e.g. R 4.x, Python 3.x, Stata, SPSS |
| Key packages/libraries | | pin exact versions, not just major version |
| Random seed(s) used | | record every seed, and where in the pipeline each is set |
| Operating environment | | local machine / HPC cluster / cloud notebook |

## 5. Reproduction confirmation

- [ ] An independent run (same code, same data, same environment) reproduces the reported headline result
- [ ] Reproduced by: _______________ on (date): _______________
- [ ] Any numerical differences from the original run, and their explanation:

## 6. Known deviations from the pre-registered or originally planned analysis

State every deviation explicitly, even minor ones, with the reason. A pack
with no deviations recorded for an exploratory or iteratively developed
analysis is more likely incomplete than unusually clean.

---

*This is a structural template only. It contains no data, code or
information from any Gurjas engagement. Gurjas Evidence and Policy
Analytics · gurjas.org*
