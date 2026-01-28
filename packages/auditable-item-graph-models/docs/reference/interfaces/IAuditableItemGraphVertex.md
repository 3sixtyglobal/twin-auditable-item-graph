# Interface: IAuditableItemGraphVertex

Interface describing an auditable item graph vertex.

## Extends

- `Omit`\<[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md), `"deleted"`\>

## Properties

### dateCreated?

> `optional` **dateCreated**: `string`

The date/time of when the element was created.
json-ld namespace:schema

#### Inherited from

[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md).[`dateCreated`](IAuditableItemGraphAuditedElement.md#datecreated)

***

### dateModified?

> `optional` **dateModified**: `string`

The date/time of when the element was modified.
json-ld namespace:schema

#### Inherited from

[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md).[`dateModified`](IAuditableItemGraphAuditedElement.md#datemodified)

***

### dateDeleted?

> `optional` **dateDeleted**: `string`

The date/time of when the element was deleted, as we never actually remove items.
json-ld namespace:schema

#### Inherited from

[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md).[`dateDeleted`](IAuditableItemGraphAuditedElement.md#datedeleted)

***

### @context

> **@context**: \[`"https://schema.twindev.org/aig/"`, `"https://schema.twindev.org/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### id

> **id**: `string`

The id of the element.

#### Overrides

[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md).[`id`](IAuditableItemGraphAuditedElement.md#id)

***

### type

> **type**: `"AuditableItemGraphVertex"`

JSON-LD Type.

***

### organizationIdentity?

> `optional` **organizationIdentity**: `string`

The identity of the organization which controls the vertex.
json-ld namespace:twin-common

***

### annotationObject?

> `optional` **annotationObject**: `IJsonLdNodeObject`

The JSON-LD annotation object for the vertex.
json-ld namespace:twin-common

***

### aliases?

> `optional` **aliases**: [`IAuditableItemGraphAlias`](IAuditableItemGraphAlias.md)[]

Alternative aliases that can be used to identify the vertex.
json-ld container:set

***

### resources?

> `optional` **resources**: [`IAuditableItemGraphResource`](IAuditableItemGraphResource.md)[]

The resources attached to the vertex.
json-ld container:set

***

### edges?

> `optional` **edges**: [`IAuditableItemGraphEdge`](IAuditableItemGraphEdge.md)[]

Edges connected to the vertex.
json-ld container:set

***

### changesets?

> `optional` **changesets**: [`IAuditableItemGraphChangeset`](IAuditableItemGraphChangeset.md)[]

Changesets for the vertex.
json-ld container:set

***

### verified?

> `optional` **verified**: `boolean`

Is the vertex verified, will only be populated when verification is requested.
json-ld namespace:twin-common
