# Interface: IAuditableItemGraphUpdateRequest

Update an auditable item graph vertex (PUT — full replacement for each provided sub-list).

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters.

#### id

> **id**: `string`

The id of the vertex to update.

***

### body {#body}

> **body**: `Omit`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md), `"id"`\>

The vertex payload. Provided sub-lists replace the active set; omitted top-level fields are unchanged.
