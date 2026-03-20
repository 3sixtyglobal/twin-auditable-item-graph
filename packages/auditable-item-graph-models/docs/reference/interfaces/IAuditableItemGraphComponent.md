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

The vertex to create.

###### annotationObject?

`IJsonLdNodeObject`

The annotation object for the vertex as JSON-LD.

###### aliases?

`object`[]

Alternative aliases that can be used to identify the vertex.

###### resources?

`object`[]

The resources attached to the vertex.

###### edges?

`object`[]

The edges connected to the vertex.

#### Returns

`Promise`\<`string`\>

The id of the new graph item.

***

### update() {#update}

> **update**(`vertex`): `Promise`\<`void`\>

Update a graph vertex.

#### Parameters

##### vertex

The vertex to update.

###### id

`string`

The id of the vertex to update.

###### annotationObject?

`IJsonLdNodeObject`

The annotation object for the vertex as JSON-LD.

###### aliases?

`object`[]

Alternative aliases that can be used to identify the vertex.

###### resources?

`object`[]

The resources attached to the vertex.

###### edges?

`object`[]

The edges connected to the vertex.

#### Returns

`Promise`\<`void`\>

Nothing.

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

### removeVerifiable() {#removeverifiable}

> **removeVerifiable**(`id`): `Promise`\<`void`\>

Remove the verifiable storage for an item.

#### Parameters

##### id

`string`

The id of the vertex to remove the storage from.

#### Returns

`Promise`\<`void`\>

Nothing.

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

`IComparator`[]

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
