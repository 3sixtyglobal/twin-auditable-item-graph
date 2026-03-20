# Class: AuditableItemGraphChangeset

Class describing a set of updates to the vertex.

## Constructors

### Constructor

> **new AuditableItemGraphChangeset**(): `AuditableItemGraphChangeset`

#### Returns

`AuditableItemGraphChangeset`

## Properties

### id {#id}

> **id**: `string`

The id of the changeset.

***

### vertexId {#vertexid}

> **vertexId**: `string`

The vertex the changeset belongs to.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

The date/time of when the changeset was created.

***

### userIdentity? {#useridentity}

> `optional` **userIdentity?**: `string`

The identity of the user who made the changeset.

***

### patches {#patches}

> **patches**: [`AuditableItemGraphPatch`](AuditableItemGraphPatch.md)[]

The patches in the changeset.

***

### proofId? {#proofid}

> `optional` **proofId?**: `string`

The immutable proof id which contains the signature for this changeset.
