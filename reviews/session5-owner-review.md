# Session 5 owner review

Reviewed: 2026-07-15

## One-time contact-form activation

The public form and its AJAX delivery now target `support@gurjas.org`; no public source or generated page contains a Gmail address. FormSubmit normally sends a one-time activation message when a recipient address is first used.

After this change is deployed:

1. submit one clearly labelled internal test through the Gurjas contact form;
2. open the activation message delivered to `support@gurjas.org` and approve the endpoint;
3. submit a second internal test and confirm that the enquiry and automated acknowledgement are delivered; and
4. retain the activation and test messages as operational evidence.

Do not use real client information for either test.

## Evidence-metric review

Homepage, Publications and People metrics now hydrate from `data/site-facts.json` with a no-cache request. CI rejects a facts file that has not been reviewed within 100 days. At each quarterly review, verify the linked public profiles, update the values and advance the top-level `reviewed` date.

Founding dates, policy effective dates, article publication dates, source-edition dates and dataset publication dates remain fixed because they are records, not freshness labels.
