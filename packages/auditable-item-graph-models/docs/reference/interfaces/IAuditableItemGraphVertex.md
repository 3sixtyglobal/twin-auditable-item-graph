# Interface: IAuditableItemGraphVertex

Interface describing an auditable item graph vertex.

## Extends

- `Omit`\<[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md), `"deleted"`\>

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

### @context {#context}

> **@context**: \[`"https://schema.twindev.org/aig/"`, `"https://schema.twindev.org/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### id {#id}

> **id**: `string`

The id of the element.

#### Overrides

[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md).[`id`](IAuditableItemGraphAuditedElement.md#id)

***

### type {#type}

> **type**: `"AuditableItemGraphVertex"`

JSON-LD Type.

***

### organizationIdentity? {#organizationidentity}

> `optional` **organizationIdentity?**: `string`

The identity of the organization which controls the vertex.

***

### annotationObject? {#annotationobject}

> `optional` **annotationObject?**: `IJsonLdNodeObject`

The JSON-LD annotation object for the vertex.

***

### aliases? {#aliases}

> `optional` **aliases?**: [`IAuditableItemGraphAlias`](IAuditableItemGraphAlias.md)[]

Alternative aliases that can be used to identify the vertex.

***

### resources? {#resources}

> `optional` **resources?**: [`IAuditableItemGraphResource`](IAuditableItemGraphResource.md)[]

The resources attached to the vertex.

***

### edges? {#edges}

> `optional` **edges?**: [`IAuditableItemGraphEdge`](IAuditableItemGraphEdge.md)[]

Edges connected to the vertex.

***

### verified? {#verified}

> `optional` **verified?**: `boolean`

Is the vertex verified, will only be populated when verification is requested.

***

### version? {#version}

> `optional` **version?**: `number`

The version of the vertex, populated only when getting a specific version.
Maps to https://schema.org/version.
