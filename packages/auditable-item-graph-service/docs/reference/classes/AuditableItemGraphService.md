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

### CLASS\_NAME

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### NAMESPACE\_CHANGESET

> `readonly` `static` **NAMESPACE\_CHANGESET**: `string` = `"changeset"`

The namespace for the service changeset.

***

### NAMESPACE\_EDGE

> `readonly` `static` **NAMESPACE\_EDGE**: `string` = `"edge"`

The namespace for the service edge.

## Methods

### className()

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IAuditableItemGraphComponent.className`

***

### create()

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

#### Implementation of

`IAuditableItemGraphComponent.create`

***

### get()

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

### getChangesets()

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

### getChangeset()

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

### update()

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

#### Implementation of

`IAuditableItemGraphComponent.update`

***

### removeVerifiable()

> **removeVerifiable**(`id`): `Promise`\<`void`\>

Remove the verifiable storage for an item.

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

### query()

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

###### includesResourceTypes?

`string`[]

Include vertices with specific resource types.

##### conditions?

`IComparator`[]

Conditions to use in the query.

##### orderBy?

The order for the results, defaults to created.

`"dateCreated"` | `"dateModified"`

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
