# Interface: IAuditableItemGraphPartialVertex

Partial vertex payload for updatePartial.
Sub-lists use explicit `{ add, remove }` patches; bare arrays are not supported.

## Extends

- `Omit`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md), `"type"` \| `"aliases"` \| `"edges"` \| `"resources"`\>

## Properties

### dateCreated? {#datecreated}

> `optional` **dateCreated?**: `string`

The date/time of when the element was created.

#### Inherited from

[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md).[`dateCreated`](IAuditableItemGraphAuditedElement.md#datecreated)

***

### dateModified? {#datemodified}

> `optional` **dateModified?**: `string`

The date/time of when the element was modified.

#### Inherited from

[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md).[`dateModified`](IAuditableItemGraphAuditedElement.md#datemodified)

***

### dateDeleted? {#datedeleted}

> `optional` **dateDeleted?**: `string`

The date/time of when the element was deleted, as we never actually remove items.

#### Inherited from

[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md).[`dateDeleted`](IAuditableItemGraphAuditedElement.md#datedeleted)

***

### id {#id}

> **id**: `string`

The id of the vertex to update.

#### Overrides

[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md).[`id`](IAuditableItemGraphVertex.md#id)

***

### @context {#context}

> **@context**: \[`"https://schema.twindev.org/aig/"`, `"https://schema.twindev.org/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

#### Overrides

`Omit.@context`

***

### type? {#type}

> `optional` **type?**: `"AuditableItemGraphVertex"`

JSON-LD Type.

***

### aliasPatches? {#aliaspatches}

> `optional` **aliasPatches?**: [`IAuditableItemGraphListPatch`](IAuditableItemGraphListPatch.md)\<[`IAuditableItemGraphAlias`](IAuditableItemGraphAlias.md)\>

Patch operations for aliases.

***

### resourcePatches? {#resourcepatches}

> `optional` **resourcePatches?**: [`IAuditableItemGraphListPatch`](IAuditableItemGraphListPatch.md)\<[`IAuditableItemGraphResource`](IAuditableItemGraphResource.md)\>

Patch operations for resources.

***

### edgePatches? {#edgepatches}

> `optional` **edgePatches?**: [`IAuditableItemGraphListPatch`](IAuditableItemGraphListPatch.md)\<[`IAuditableItemGraphEdge`](IAuditableItemGraphEdge.md)\>

Patch operations for edges.

***

### organizationIdentity? {#organizationidentity}

> `optional` **organizationIdentity?**: `string`

The identity of the organization which controls the vertex.

#### Inherited from

[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md).[`organizationIdentity`](IAuditableItemGraphVertex.md#organizationidentity)

***

### auditMode? {#auditmode}

> `optional` **auditMode?**: [`AuditableItemGraphAuditMode`](../type-aliases/AuditableItemGraphAuditMode.md)

How the mutations of the vertex are recorded, when absent the vertex behaves as audited.
Once a vertex is set to bypass it can not be returned to audited.

#### Inherited from

[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md).[`auditMode`](IAuditableItemGraphVertex.md#auditmode)

***

### annotationObject? {#annotationobject}

> `optional` **annotationObject?**: `IJsonLdNodeObject`

The JSON-LD annotation object for the vertex.

#### Inherited from

[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md).[`annotationObject`](IAuditableItemGraphVertex.md#annotationobject)

***

### verified? {#verified}

> `optional` **verified?**: `boolean`

Is the vertex verified, will only be populated when verification is requested.
Always undefined when the vertex is in bypass mode.

#### Inherited from

[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md).[`verified`](IAuditableItemGraphVertex.md#verified)

***

### version? {#version}

> `optional` **version?**: `number`

The version of the vertex, populated only when getting a specific version.
Always undefined when the vertex is in bypass mode.
Maps to https://schema.org/version.

#### Inherited from

[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md).[`version`](IAuditableItemGraphVertex.md#version)
