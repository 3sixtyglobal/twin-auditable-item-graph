# Interface: IAuditableItemGraphVersionListRequest

Get all versions of an auditable item graph vertex.

## Properties

### headers? {#headers}

> `optional` **headers?**: `object`

The headers which can be used to determine the response data type.

#### accept

> **accept**: `"application/json"` \| `"application/ld+json"`

***

### pathParams {#pathparams}

> **pathParams**: `object`

The parameters from the path.

#### id

> **id**: `string`

The id of the vertex.

***

### query? {#query}

> `optional` **query?**: `object`

The query parameters.

#### after?

> `optional` **after?**: `string`

Only return versions created after this ISO 8601 timestamp (exclusive).

#### before?

> `optional` **before?**: `string`

Only return versions created before this ISO 8601 timestamp (exclusive).
