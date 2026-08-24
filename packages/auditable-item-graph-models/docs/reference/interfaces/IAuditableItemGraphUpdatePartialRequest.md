# Interface: IAuditableItemGraphUpdatePartialRequest

Partially update an auditable item graph vertex (PATCH - explicit list patches).

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters.

#### id

> **id**: `string`

The id of the vertex to update.

***

### body {#body}

> **body**: `Omit`\<[`IAuditableItemGraphPartialVertex`](IAuditableItemGraphPartialVertex.md), `"id"`\>

Partial vertex data; only defined properties are applied.
Sub-lists use `{ add, remove }` patch objects.
