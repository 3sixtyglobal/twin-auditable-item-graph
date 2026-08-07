# Interface: IAuditableItemGraphUpdateRequest

Update an auditable item graph vertex (PUT - full replacement of vertex state).

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

The full vertex payload. Replaces annotation and active sub-lists; omitted collections are cleared.
