# Class: AuditableItemGraphVertexV1

Class describing the auditable item graph vertex.

## Constructors

### Constructor

> **new AuditableItemGraphVertexV1**(): `AuditableItemGraphVertexV1`

#### Returns

`AuditableItemGraphVertexV1`

## Properties

### id {#id}

> **id**: `string`

The id of the vertex.

***

### organizationIdentity {#organizationidentity}

> **organizationIdentity**: `string`

The identity of the organization which controls the vertex.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

The date/time of when the vertex was created.

***

### dateModified? {#datemodified}

> `optional` **dateModified?**: `string`

The date/time of when the vertex was last modified.

***

### auditMode? {#auditmode}

> `optional` **auditMode?**: `AuditableItemGraphAuditMode`

How the mutations of the vertex are recorded, when absent the vertex behaves as audited.

***

### aliasIndex? {#aliasindex}

> `optional` **aliasIndex?**: `string`

Combined alias index for the vertex used for querying.

***

### resourceTypeIndex? {#resourcetypeindex}

> `optional` **resourceTypeIndex?**: `string`

Combined resource type index for the vertex used for querying.

***

### annotationObject? {#annotationobject}

> `optional` **annotationObject?**: `IJsonLdNodeObject`

Object to associate with the vertex as JSON-LD.

***

### aliases? {#aliases}

> `optional` **aliases?**: [`AuditableItemGraphAlias`](AuditableItemGraphAlias.md)[]

Alternative aliases that can be used to identify the vertex.

***

### resources? {#resources}

> `optional` **resources?**: [`AuditableItemGraphResource`](AuditableItemGraphResource.md)[]

The resources attached to the vertex.

***

### edges? {#edges}

> `optional` **edges?**: [`AuditableItemGraphEdge`](AuditableItemGraphEdge.md)[]

Edges connected to the vertex.

***

### version? {#version}

> `optional` **version?**: `number`

The current version of the vertex, incremented on each changeset.
