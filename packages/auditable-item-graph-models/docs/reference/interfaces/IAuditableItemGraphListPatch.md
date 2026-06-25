# Interface: IAuditableItemGraphListPatch\<TItem\>

PATCH operations for a sub-list on a vertex.

## Type Parameters

### TItem

`TItem` = [`IAuditableItemGraphEdge`](IAuditableItemGraphEdge.md) \| [`IAuditableItemGraphAlias`](IAuditableItemGraphAlias.md) \| [`IAuditableItemGraphResource`](IAuditableItemGraphResource.md)

## Properties

### add? {#add}

> `optional` **add?**: `TItem`[]

Items to add or update in the active set.

***

### remove? {#remove}

> `optional` **remove?**: `string`[]

Identifiers of items to remove from the active set (soft-delete).
