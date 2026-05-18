# Interface: IAuditableItemGraphChangeset

Interface describing a set of changes to the vertex.

## Properties

### @context? {#context}

> `optional` **@context?**: \[`"https://schema.twindev.org/aig/"`, `"https://schema.twindev.org/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type {#type}

> **type**: `"AuditableItemGraphChangeset"`

JSON-LD Type.

***

### id {#id}

> **id**: `string`

The id of the changeset.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

The date/time of when the changeset was created.

***

### userIdentity? {#useridentity}

> `optional` **userIdentity?**: `string`

The user identity that created the changes.

***

### patches {#patches}

> **patches**: [`IAuditableItemGraphPatchOperation`](IAuditableItemGraphPatchOperation.md)[]

The patches in the changeset.

***

### proofId? {#proofid}

> `optional` **proofId?**: `string`

The immutable proof id which contains the signature for this changeset.

***

### verification? {#verification}

> `optional` **verification?**: `IImmutableProofVerification`

The verification for the changeset.

***

### version? {#version}

> `optional` **version?**: `number`

The version number of the vertex after this changeset was applied.
Maps to https://schema.org/version.
