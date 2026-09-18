# Class: AuditableItemGraphVertexIndex

Class describing the auditable item graph vertex index.

## Constructors

### Constructor

> **new AuditableItemGraphVertexIndex**(): `AuditableItemGraphVertexIndex`

#### Returns

`AuditableItemGraphVertexIndex`

## Properties

### id {#id}

> **id**: `string`

The id of the index.

***

### vertexId {#vertexid}

> **vertexId**: `string`

The id of the vertex this index refers to.

***

### type {#type}

> **type**: `string`

Index type.

***

### value {#value}

> **value**: `string`

Index value, case folded so lookups do not depend on the column collation.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

The date/time of when the vertex was created, copied so the index can order and page its
own matches without reading the vertex.

***

### dateModified? {#datemodified}

> `optional` **dateModified?**: `string`

The date/time of when the vertex was last modified, copied so a query ordered by the
modified date can also be paged from the index.
