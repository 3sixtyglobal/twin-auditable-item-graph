# Class: AuditableItemGraphVertexIndexHelper

Helper methods for building auditable item graph vertex index entries.

## Constructors

### Constructor

> **new AuditableItemGraphVertexIndexHelper**(): `AuditableItemGraphVertexIndexHelper`

#### Returns

`AuditableItemGraphVertexIndexHelper`

## Methods

### createIndexEntry() {#createindexentry}

> `static` **createIndexEntry**(`vertexId`, `type`, `value`, `dateCreated`, `dateModified?`): [`AuditableItemGraphVertexIndex`](AuditableItemGraphVertexIndex.md)

Create the index entry for one type and value of a vertex. The value is case folded and
hashed, and the id is derived from the content so the same entry always produces the same id.
The modification date is excluded from the id as it is optional and changes over time.

#### Parameters

##### vertexId

`string`

The id of the vertex the entry refers to.

##### type

`string`

The index type.

##### value

`string`

The index value.

##### dateCreated

`string`

The creation date of the vertex.

##### dateModified?

`string`

The modification date of the vertex.

#### Returns

[`AuditableItemGraphVertexIndex`](AuditableItemGraphVertexIndex.md)

The index entry.

***

### hashValue() {#hashvalue}

> `static` **hashValue**(`value?`): `string` \| `undefined`

Hash an index value so the composite index key has a fixed size whatever the value length.
The value is case folded first so lookups are case insensitive.

#### Parameters

##### value?

`string`

The value to hash.

#### Returns

`string` \| `undefined`

The base64 url encoded Blake2b-160 hash, or undefined when there is no value.
