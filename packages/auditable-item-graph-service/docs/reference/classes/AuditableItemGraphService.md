# Class: AuditableItemGraphService

Class for performing auditable item graph operations.

## Implements

- `IAuditableItemGraphComponent`

## Constructors

### Constructor

> **new AuditableItemGraphService**(`options?`): `AuditableItemGraphService`

Create a new instance of AuditableItemGraphService.

#### Parameters

##### options?

[`IAuditableItemGraphServiceConstructorOptions`](../interfaces/IAuditableItemGraphServiceConstructorOptions.md)

The dependencies for the auditable item graph connector.

#### Returns

`AuditableItemGraphService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### NAMESPACE\_CHANGESET {#namespace_changeset}

> `readonly` `static` **NAMESPACE\_CHANGESET**: `string` = `"changeset"`

The namespace for the service changeset.

***

### NAMESPACE\_EDGE {#namespace_edge}

> `readonly` `static` **NAMESPACE\_EDGE**: `string` = `"edge"`

The namespace for the service edge.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IAuditableItemGraphComponent.className`

***

### start() {#start}

> **start**(): `Promise`\<`void`\>

Register all AIG metrics with the telemetry component.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all metrics have been registered.

#### Implementation of

`IAuditableItemGraphComponent.start`

***

### create() {#create}

> **create**(`vertex`): `Promise`\<`string`\>

Create a new graph vertex.

#### Parameters

##### vertex

`Omit`\<`IAuditableItemGraphVertex`, `"id"`\>

The vertex to create.

#### Returns

`Promise`\<`string`\>

The id of the new graph item.

#### Implementation of

`IAuditableItemGraphComponent.create`

***

### update() {#update}

> **update**(`vertex`): `Promise`\<`void`\>

Update a graph vertex (PUT — full replacement of vertex state).
Concurrent updates for the same vertex are serialized via `Mutex` on the vertex id.

#### Parameters

##### vertex

`IAuditableItemGraphVertex`

The vertex to update.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the vertex has been updated.

#### Implementation of

`IAuditableItemGraphComponent.update`

***

### updatePartial() {#updatepartial}

> **updatePartial**(`partial`): `Promise`\<`void`\>

Partially update a graph vertex (PATCH — explicit list patches; only defined properties applied).
Serialized with `update` via `Mutex` on the same vertex id within this instance.

#### Parameters

##### partial

`IAuditableItemGraphPartialVertex`

The partial vertex update.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the partial update has been applied.

#### Implementation of

`IAuditableItemGraphComponent.updatePartial`

***

### get() {#get}

> **get**(`id`, `options?`): `Promise`\<`IAuditableItemGraphVertex`\>

Get a graph vertex.

#### Parameters

##### id

`string`

The id of the vertex to get.

##### options?

Additional options for the get operation.

###### includeDeleted?

`boolean`

Whether to include deleted/updated aliases, resource, edges, defaults to false.

###### verifySignatureDepth?

`VerifyDepth`

How many signatures to verify, defaults to "none".

#### Returns

`Promise`\<`IAuditableItemGraphVertex`\>

The vertex if found.

#### Throws

NotFoundError if the vertex is not found.

#### Implementation of

`IAuditableItemGraphComponent.get`

***

### getChangesets() {#getchangesets}

> **getChangesets**(`id`, `cursor?`, `limit?`, `options?`): `Promise`\<\{ `changesets`: `IAuditableItemGraphChangesetList`; `cursor?`: `string`; \}\>

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

`VerifyDepth`

How many signatures to verify, defaults to "none".

#### Returns

`Promise`\<\{ `changesets`: `IAuditableItemGraphChangesetList`; `cursor?`: `string`; \}\>

The vertex if found.

#### Throws

NotFoundError if the vertex is not found.

#### Implementation of

`IAuditableItemGraphComponent.getChangesets`

***

### getChangeset() {#getchangeset}

> **getChangeset**(`id`, `options?`): `Promise`\<`IAuditableItemGraphChangeset`\>

Get a graph vertex changeset.

#### Parameters

##### id

`string`

The id of the vertex to get.

##### options?

Additional options for the get operation.

###### verifySignatureDepth?

`VerifyDepth`

How many signatures to verify, defaults to "none".

#### Returns

`Promise`\<`IAuditableItemGraphChangeset`\>

The vertex if found.

#### Throws

NotFoundError if the vertex is not found.

#### Implementation of

`IAuditableItemGraphComponent.getChangeset`

***

### getVersion() {#getversion}

> **getVersion**(`id`, `version`): `Promise`\<`IAuditableItemGraphVertex`\>

Get a graph vertex at a specific version.

#### Parameters

##### id

`string`

The id of the vertex.

##### version

`number`

The version number to retrieve.

#### Returns

`Promise`\<`IAuditableItemGraphVertex`\>

The vertex reconstructed at that version.

#### Throws

NotFoundError if the vertex or version is not found.

#### Implementation of

`IAuditableItemGraphComponent.getVersion`

***

### getVersions() {#getversions}

> **getVersions**(`id`, `options?`): `Promise`\<`IAuditableItemGraphVertexVersionList`\>

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

`Promise`\<`IAuditableItemGraphVertexVersionList`\>

The list of vertex versions.

#### Throws

NotFoundError if the vertex is not found.

#### Implementation of

`IAuditableItemGraphComponent.getVersions`

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

#### Implementation of

`IAuditableItemGraphComponent.removeProof`

***

### query() {#query}

> **query**(`options?`, `conditions?`, `orderBy?`, `orderByDirection?`, `properties?`, `cursor?`, `limit?`): `Promise`\<\{ `entries`: `IAuditableItemGraphVertexList`; `cursor?`: `string`; \}\>

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

`EntityCondition`\<`IAuditableItemGraphVertex`\>

Conditions to use in the query.

##### orderBy?

`"dateCreated"` \| `"dateModified"`

The order for the results, defaults to created.

##### orderByDirection?

`SortDirection`

The direction for the order, defaults to desc.

##### properties?

keyof `IAuditableItemGraphVertex`[]

The properties to return, if not provided defaults to id, created, aliases and object.

##### cursor?

`string`

The cursor to request the next chunk of entities.

##### limit?

`number`

Limit the number of entities to return.

#### Returns

`Promise`\<\{ `entries`: `IAuditableItemGraphVertexList`; `cursor?`: `string`; \}\>

The entities, which can be partial if a limited keys list was provided.

#### Implementation of

`IAuditableItemGraphComponent.query`
