# Interface: IAuditableItemGraphComponent

Interface describing an auditable item graph contract.

## Extends

- `IComponent`

## Methods

### create() {#create}

> **create**(`vertex`): `Promise`\<`string`\>

Create a new graph vertex.

#### Parameters

##### vertex

`Omit`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md), `"id"`\>

The vertex to create.

#### Returns

`Promise`\<`string`\>

The id of the new graph item.

***

### update() {#update}

> **update**(`vertex`): `Promise`\<`void`\>

Update a graph vertex (PUT - full replacement of vertex state).
Concurrent updates for the same vertex are serialized via `Mutex` on the vertex id.
Multi-replica deployments are not coordinated.

#### Parameters

##### vertex

[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)

The vertex to update.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the vertex has been updated.

***

### updatePartial() {#updatepartial}

> **updatePartial**(`partial`): `Promise`\<`void`\>

Partially update a graph vertex (PATCH); only properties that are not undefined are applied.
Sub-lists use explicit `{ add, remove }` patch objects. Serialized with `update()` via `Mutex`
on the same vertex id.

#### Parameters

##### partial

[`IAuditableItemGraphPartialVertex`](IAuditableItemGraphPartialVertex.md)

The partial vertex update (must include `id`).

#### Returns

`Promise`\<`void`\>

A promise that resolves when the partial update has been applied.

***

### get() {#get}

> **get**(`id`, `options?`): `Promise`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)\>

Get a graph vertex.

#### Parameters

##### id

`string`

The id of the vertex to get.

##### options?

Additional options for the get operation.

###### includeDeleted?

`boolean`

Whether to include deleted aliases, resource, edges, defaults to false.

###### verifySignatureDepth?

[`VerifyDepth`](../type-aliases/VerifyDepth.md)

How many signatures to verify, defaults to "none".

#### Returns

`Promise`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)\>

The vertex if found.

#### Throws

NotFoundError if the vertex is not found.

***

### getChangesets() {#getchangesets}

> **getChangesets**(`id`, `cursor?`, `limit?`, `options?`): `Promise`\<\{ `changesets`: [`IAuditableItemGraphChangesetList`](IAuditableItemGraphChangesetList.md); `cursor?`: `string`; \}\>

Get a graph vertex changeset list.

#### Parameters

##### id

`string`

The id of the vertex to get.

##### cursor?

`string`

The optional cursor to get next chunk.

##### limit?

`number`

Limit the number of entities to return.

##### options?

Additional options for the get operation.

###### verifySignatureDepth?

[`VerifyDepth`](../type-aliases/VerifyDepth.md)

How many signatures to verify, defaults to "none".

#### Returns

`Promise`\<\{ `changesets`: [`IAuditableItemGraphChangesetList`](IAuditableItemGraphChangesetList.md); `cursor?`: `string`; \}\>

The changeset if found.

#### Throws

NotFoundError if the vertex is not found.

***

### getChangeset() {#getchangeset}

> **getChangeset**(`id`, `options?`): `Promise`\<[`IAuditableItemGraphChangeset`](IAuditableItemGraphChangeset.md)\>

Get a graph vertex changeset.

#### Parameters

##### id

`string`

The id of the vertex to get.

##### options?

Additional options for the get operation.

###### verifySignatureDepth?

[`VerifyDepth`](../type-aliases/VerifyDepth.md)

How many signatures to verify, defaults to "none".

#### Returns

`Promise`\<[`IAuditableItemGraphChangeset`](IAuditableItemGraphChangeset.md)\>

The changeset if found.

#### Throws

NotFoundError if the vertex or changeset is not found.

***

### getVersion() {#getversion}

> **getVersion**(`id`, `version`): `Promise`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)\>

Get a graph vertex at a specific version.

#### Parameters

##### id

`string`

The id of the vertex.

##### version

`number`

The version number to retrieve.

#### Returns

`Promise`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)\>

The vertex reconstructed at that version.

#### Throws

NotFoundError if the vertex or version is not found.

***

### getVersions() {#getversions}

> **getVersions**(`id`, `options?`): `Promise`\<[`IAuditableItemGraphVertexVersionList`](IAuditableItemGraphVertexVersionList.md)\>

Get all versions of a graph vertex.

#### Parameters

##### id

`string`

The id of the vertex.

##### options?

Additional options for the operation.

###### after?

`string`

Only return versions created after this ISO 8601 timestamp (exclusive).

###### before?

`string`

Only return versions created before this ISO 8601 timestamp (exclusive).

#### Returns

`Promise`\<[`IAuditableItemGraphVertexVersionList`](IAuditableItemGraphVertexVersionList.md)\>

The list of vertex versions.

#### Throws

NotFoundError if the vertex is not found.

***

### removeProof() {#removeproof}

> **removeProof**(`id`): `Promise`\<`void`\>

Remove the proof for an item.

#### Parameters

##### id

`string`

The id of the vertex to remove the proof from.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the proof has been removed from all changesets.

#### Throws

NotFoundError if the vertex is not found.

***

### query() {#query}

> **query**(`options?`, `conditions?`, `orderBy?`, `orderByDirection?`, `properties?`, `cursor?`, `limit?`): `Promise`\<\{ `entries`: [`IAuditableItemGraphVertexList`](IAuditableItemGraphVertexList.md); `cursor?`: `string`; \}\>

Query the graph for vertices.

#### Parameters

##### options?

The query options.

###### id?

`string`

The optional id to look for.

###### idMode?

`"id"` \| `"alias"` \| `"both"`

Look in id, alias or both, defaults to both.

###### idExact?

`boolean`

Find only exact matches, default to false meaning partial matching.

###### resourceTypes?

`string`[]

Include vertices with specific resource types.

##### conditions?

`EntityCondition`\<[`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)\>

Conditions to use in the query.

##### orderBy?

`"dateCreated"` \| `"dateModified"`

The order for the results, defaults to dateCreated.

##### orderByDirection?

`SortDirection`

The direction for the order, defaults to descending.

##### properties?

keyof [`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)[]

The properties to return, if not provided defaults to id, dateCreated, aliases and object.

##### cursor?

`string`

The cursor to request the next chunk of entities.

##### limit?

`number`

Limit the number of entities to return.

#### Returns

`Promise`\<\{ `entries`: [`IAuditableItemGraphVertexList`](IAuditableItemGraphVertexList.md); `cursor?`: `string`; \}\>

The entities, which can be partial if a limited keys list was provided.
