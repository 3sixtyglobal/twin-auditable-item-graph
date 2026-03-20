# Interface: IAuditableItemGraphAuditedElement

Interface describing the base properties for auditable elements.

## Extended by

- [`IAuditableItemGraphAlias`](IAuditableItemGraphAlias.md)
- [`IAuditableItemGraphEdge`](IAuditableItemGraphEdge.md)
- [`IAuditableItemGraphResource`](IAuditableItemGraphResource.md)

## Properties

### id? {#id}

> `optional` **id?**: `string`

The id of the element.

***

### dateCreated? {#datecreated}

> `optional` **dateCreated?**: `string`

The date/time of when the element was created.

***

### dateModified? {#datemodified}

> `optional` **dateModified?**: `string`

The date/time of when the element was modified.

***

### dateDeleted? {#datedeleted}

> `optional` **dateDeleted?**: `string`

The date/time of when the element was deleted, as we never actually remove items.
