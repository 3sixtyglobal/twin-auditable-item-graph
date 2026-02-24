# Interface: IAuditableItemGraphChangesetList

Interface describing an auditable item graph changeset list.

## Properties

### @context

> **@context**: \[`"https://schema.org"`, `"https://schema.twindev.org/aig/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type

> **type**: \[`"ItemList"`, `"AuditableItemGraphChangesetList"`\]

JSON-LD Type.

***

### itemListElement

> **itemListElement**: [`IAuditableItemGraphChangeset`](IAuditableItemGraphChangeset.md)[]

The list of changesets.
json-ld namespace:sch
