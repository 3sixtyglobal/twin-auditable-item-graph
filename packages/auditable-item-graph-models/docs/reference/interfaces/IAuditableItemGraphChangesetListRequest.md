# Interface: IAuditableItemGraphChangesetListRequest

Get an auditable item graph changeset.

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

The id of the changeset to get.

***

### query? {#query}

> `optional` **query?**: `object`

The query parameters.

#### cursor?

> `optional` **cursor?**: `string`

The optional cursor to get next chunk.

#### limit?

> `optional` **limit?**: `string`

Limit the number of entities to return.

#### verifySignatureDepth?

> `optional` **verifySignatureDepth?**: [`VerifyDepth`](../type-aliases/VerifyDepth.md)

How many signatures to verify, none, current or all, defaults to "none".
