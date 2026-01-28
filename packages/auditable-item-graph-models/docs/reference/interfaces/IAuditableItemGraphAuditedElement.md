# Interface: IAuditableItemGraphAuditedElement

Interface describing the base properties for auditable elements.

## Extended by

- [`IAuditableItemGraphAlias`](IAuditableItemGraphAlias.md)
- [`IAuditableItemGraphEdge`](IAuditableItemGraphEdge.md)
- [`IAuditableItemGraphResource`](IAuditableItemGraphResource.md)

## Properties

### id?

> `optional` **id**: `string`

The id of the element.

***

### dateCreated?

> `optional` **dateCreated**: `string`

The date/time of when the element was created.
json-ld namespace:schema

***

### dateModified?

> `optional` **dateModified**: `string`

The date/time of when the element was modified.
json-ld namespace:schema

***

### dateDeleted?

> `optional` **dateDeleted**: `string`

The date/time of when the element was deleted, as we never actually remove items.
json-ld namespace:schema
