# Interface: IAuditableItemGraphVersionGetRequest

Get an auditable item graph vertex at a specific version.

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

#### versionId

> **versionId**: `string`

The id of the version (changeset id) to get.
