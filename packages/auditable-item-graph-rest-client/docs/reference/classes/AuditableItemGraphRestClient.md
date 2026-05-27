# Class: AuditableItemGraphRestClient

Client for performing auditable item graph through to REST endpoints.

## Extends

- `BaseRestClient`

## Implements

- `IAuditableItemGraphComponent`

## Constructors

### Constructor

> **new AuditableItemGraphRestClient**(`config`): `AuditableItemGraphRestClient`

Create a new instance of AuditableItemGraphRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`AuditableItemGraphRestClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

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

The changesets if found.

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

The changeset if found.

#### Throws

NotFoundError if the vertex or changeset is not found.

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

### update() {#update}

> **update**(`vertex`): `Promise`\<`void`\>

Update a graph vertex (PUT — full replacement of vertex state).
The server serializes concurrent updates for the same vertex via `Mutex` on the vertex id;
requests load-balanced across replicas can still race.

#### Parameters

##### vertex

`IAuditableItemGraphVertex`

The vertex to update.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemGraphComponent.update`

***

### updatePartial() {#updatepartial}

> **updatePartial**(`partial`): `Promise`\<`void`\>

Partially update a graph vertex (PATCH — optional scalars; list fields use `{ add, remove }`).

#### Parameters

##### partial

`IAuditableItemGraphPartialVertex`

The partial vertex update (must include `id`).

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemGraphComponent.updatePartial`

***

### removeVerifiable() {#removeverifiable}

> **removeVerifiable**(`id`): `Promise`\<`void`\>

Remove the verifiable storage for an item, not supported on client.

#### Parameters

##### id

`string`

The id of the vertex to get.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Throws

NotFoundError if the vertex is not found.

#### Implementation of

`IAuditableItemGraphComponent.removeVerifiable`

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

`IComparator`[]

Conditions to use in the query.

##### orderBy?

`"dateCreated"` \| `"dateModified"`

The order for the results, defaults to created.

##### orderByDirection?

`SortDirection`

The direction for the order, defaults to descending.

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
