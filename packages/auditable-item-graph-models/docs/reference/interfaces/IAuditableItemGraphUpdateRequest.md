# Interface: IAuditableItemGraphUpdateRequest

Update an auditable item graph vertex.

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

The data to be used in the vertex.
