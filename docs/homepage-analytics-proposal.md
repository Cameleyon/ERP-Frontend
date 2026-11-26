# Homepage measurement proposal (not implemented)

- Keep the existing first-party visit and signup funnel events. Compare homepage visits, unique browsers, signup arrivals, and backend-confirmed registrations rather than treating form submissions as conversions.
- With separate approval, add one first-party CTA intent event per click, with a fixed placement value (header, hero, offer, Basic, or final CTA) and the page language. Omit URLs with query strings, email addresses, and free text.
- Associate signup journeys with a short-lived first-party journey identifier. Join it to the existing signup attempt and count each successful backend confirmation once. Report unattributed registrations separately; do not use fingerprinting to recover lost attribution.
- Compare conversion by coarse mobile/desktop category and selected homepage language. Avoid small buckets that could identify an individual.
- Measure first product, first recorded stock, and first completed sale with the existing authenticated setup-state milestones, once per business. Keep these operational measures separate from marketing events and never send product or transaction details to ad platforms.

Before enabling any additional collection, approve consent behavior, the attribution window, retention, and access controls. Do not change existing Meta Pixel events as part of this redesign.
