# Interface: IAuditableItemGraphUpdatePartialRequest

Partially update an auditable item graph vertex (PATCH — merge provided sub-lists).

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters.

#### id

> **id**: `string`

The id of the vertex to update.

***

### body {#body}

> **body**: `Partial`\<`Omit`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md), `"id"`\>\>

Partial vertex data; only defined properties are applied.
When a sub-list is provided, incoming items are merged (not full replacement).
