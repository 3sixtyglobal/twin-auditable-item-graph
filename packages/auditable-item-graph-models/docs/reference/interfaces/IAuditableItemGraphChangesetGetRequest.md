# Interface: IAuditableItemGraphChangesetGetRequest

Get an auditable item graph vertex changeset.

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

The id of the vertex to get the changeset from.

#### changesetId

> **changesetId**: `string`

The id of the changeset to get.

***

### query? {#query}

> `optional` **query?**: `object`

The query parameters.

#### verifySignatureDepth?

> `optional` **verifySignatureDepth?**: [`VerifyDepth`](../type-aliases/VerifyDepth.md)

How many signatures to verify, none, current or all, defaults to "none".
