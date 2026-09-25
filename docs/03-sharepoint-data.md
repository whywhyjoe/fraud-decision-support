# SharePoint data

Seeded from the `sp-app` family's paid-for gotchas in projects-standard.
This app reads two things once hosted, the page's binding properties and
the content file, and writes nothing today. The write rules are here for
the day feedback or events go to a list.

## Reads

The binding is one item read on the Site Pages library:

```
GET <web>/_api/web/lists/getbytitle('Site Pages')/items(<pageItemId>)
    ?$select=<ContentFile>,<ContentVersion>,<Status>
```

with `credentials: 'same-origin'` and `Accept: application/json;odata=nometadata`.
The column internal names are set when the site is built and recorded in
`docs/02-hosting-and-deploy.md` then.

The content file is a plain same-origin fetch of the library file URL.

- Prefer explicit `$select`. Any query that expands a field must name the
  expanded target in `$select` too, or SharePoint quietly returns less than
  you asked for.
- Never trust `BaseTemplate` as proof of schema. Probe the fields. When a
  query shape is rejected on schema grounds (400, never a 403 or 404), step
  down to a simpler shape rather than failing.
- A missing binding column or an unreadable content file degrades to the
  next source in the boot order, and logs to `console.debug`. Nothing red
  for the rep.

## Digest and writes

```
POST <web>/_api/contextinfo        → FormDigestValue, FormDigestTimeoutSeconds
```

Cache it in memory until shortly before expiry. Every write carries it as
`X-RequestDigest`.

- `credentials: 'same-origin'` and `application/json;odata=nometadata`.
- `keepalive: true` on writes that may race a navigation. `sendBeacon`
  cannot carry the digest header, which is why.
- A 403 gets exactly one retry with a forced-fresh digest. More than one is
  a bug, not resilience.

## Throttling and dedupe

If feedback or the event log ever go to a list, decide the throttle
explicitly and record accepted events, not attempted ones; a transient
failure must not create a silent gap. Mark a once-only action as fired
before the write so a slow network cannot double-fire it.

## Permissions

Reps need read on the page, the player library and the content library, and
nothing else. Behaviour under Add-Only, ReadSecurity and item-level
permissions can only be verified in a real tenant. Those checks are a manual
gate in `STATE.md`, not a test.
