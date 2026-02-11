# Interface: IAuditableItemGraphChangeset

Interface describing a set of changes to the vertex.

## Properties

### @context?

> `optional` **@context**: \[`"https://schema.twindev.org/aig/"`, `"https://schema.twindev.org/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type

> **type**: `"AuditableItemGraphChangeset"`

JSON-LD Type.

***

### id

> **id**: `string`

The id of the changeset.

***

### dateCreated

> **dateCreated**: `string`

The date/time of when the changeset was created.
json-ld namespace:schema

***

### userIdentity?

> `optional` **userIdentity**: `string`

The user identity that created the changes.
json-ld namespace:twin-common

***

### patches

> **patches**: [`IAuditableItemGraphPatchOperation`](IAuditableItemGraphPatchOperation.md)[]

The patches in the changeset.
json-ld container:set

***

### proofId?

> `optional` **proofId**: `string`

The immutable proof id which contains the signature for this changeset.
json-ld type:schema:identifier

***

### verification?

> `optional` **verification**: `IImmutableProofVerification`

The verification for the changeset.
json-ld id
