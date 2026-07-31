# Gurjas analytics event taxonomy

**Reviewed:** 1 August 2026  
**Scope:** consent-based website measurement only

## Measurement rule

No analytics event is emitted by the Gurjas event layers unless the visitor has granted analytics consent. Event parameters must be bounded identifiers derived from a route, static control or allowlisted campaign parameter. Names, email addresses, organisations, free-text enquiries, research descriptions, datasets, tool inputs, submitted search text, calculated results and copied report text are prohibited.

## Business outcomes

| Event | Meaning | GA4 key event? | Permitted parameters |
|---|---|---:|---|
| `contact_form_success` | FormSubmit returned a successful delivery response | **Yes** | `service_slug`, `origin_path`, `handoff_kind`, `campaign_source`, `campaign_medium`, `campaign_name` |
| `clinic_enquiry_success` | A successfully delivered enquiry originated from the institutional clinic pathway | **Yes** | same bounded context as `contact_form_success` |
| `contact_form_failure` | The delivery service returned or produced a delivery failure | No | `service_slug`, `origin_path`, `handoff_kind` |
| `service_handoff` | A visitor moved from a service or clinic page to the contact route | No | `service_slug`, `origin_path`, `handoff_kind` |
| `clinic_request` | The institutional clinic CTA was selected | No | `service_slug`, `origin_path` |
| `contact_channel_click` | A phone, email or WhatsApp route was selected | No | `channel`, `origin_path` |
| `phone_click` | A telephone link was selected | No | `origin_path` |
| `tool_export` | A tool report or record was copied, downloaded, exported, saved or printed | No | `tool_slug`, `export_type` |
| `campaign_landing` | A consented session began with allowlisted campaign or external-referrer context | No | `campaign_source`, `campaign_medium`, `campaign_name`, `campaign_content`, `campaign_term`, `referrer_host`, `landing_path` |

## Existing engagement events

The restrained baseline layer in `script.js` also records `service_view`, `service_cta_click`, `contact_form_start`, `contact_form_submit`, `tool_start`, `tool_complete`, `email_click`, `whatsapp_click` and `proof_source_click` after consent.

`contact_form_submit` is a submit **attempt**, not proof of delivery. It must not be configured as a key event. `contact_form_success` is the authoritative delivered-enquiry outcome.

## Attribution controls

Only `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, the landing pathname and an external referring hostname are retained by the Gurjas attribution layer. The record is created only after consent, is held in `sessionStorage`, and expires with the browser session. Unknown query parameters and full referring URLs are ignored.

## GA4 configuration after deployment

1. Confirm the new events in Realtime or DebugView using a consented test session.
2. Mark `contact_form_success` and `clinic_enquiry_success` as key events.
3. Do **not** mark `contact_form_submit`, `contact_form_start`, `service_handoff`, `tool_start` or `tool_complete` as key events.
4. Register event-scoped custom dimensions only where reporting requires them: `service_slug`, `origin_path`, `handoff_kind`, `tool_slug`, `export_type` and `channel`.
5. Compare successful delivery counts with the FormSubmit inbox before using the data for business decisions.
6. Exclude verified internal traffic in GA4 only after testing the filter configuration.

## Release verification

The browser fixture must prove that:

- declined consent stores and sends no campaign attribution;
- first-visit campaign context is emitted only after explicit acceptance;
- only allowlisted query parameters are retained;
- a successful FormSubmit response produces one `contact_form_success` event;
- a failed response never produces a success event;
- form names, emails and message text are absent from event parameters;
- clinic handoffs and phone actions are distinguishable;
- tool exports are attributed to the current tool without reading the exported content.
