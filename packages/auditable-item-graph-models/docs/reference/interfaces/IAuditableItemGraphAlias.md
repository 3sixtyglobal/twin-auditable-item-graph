# Interface: IAuditableItemGraphAlias

Interface describing an alias for a vertex.

## Extends

- [`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md)

## Properties

### @context? {#context}

> `optional` **@context?**: `"https://schema.twindev.org/aig/"` \| \[`"https://schema.twindev.org/aig/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### id {#id}

> **id**: `string`

The id of the element.

#### Overrides

[`IAuditableItemGraphAuditedElement`](IAuditableItemGraphAuditedElement.md).[`id`](IAuditableItemGraphAuditedElement.md#id)

***

### type {#type}

> **type**: `"AuditableItemGraphAlias"`

JSON-LD Type.

***

### annotationObject? {#annotationobject}

> `optional` **annotationObject?**: `IJsonLdNodeObject`

The JSON-LD annotation object for the alias.

***

### aliasFormat? {#aliasformat}

> `optional` **aliasFormat?**: `string`

The format of the id in the alias.

***

### unique? {#unique}

> `optional` **unique?**: `boolean`

Whether the alias should be unique across the graph, meaning that no other vertex can have the same alias. Defaults to false.

***

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
