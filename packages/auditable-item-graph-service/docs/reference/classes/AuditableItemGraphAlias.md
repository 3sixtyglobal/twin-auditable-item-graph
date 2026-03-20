# Class: AuditableItemGraphAlias

Class describing the auditable item graph alias.

## Constructors

### Constructor

> **new AuditableItemGraphAlias**(): `AuditableItemGraphAlias`

#### Returns

`AuditableItemGraphAlias`

## Properties

### id {#id}

> **id**: `string`

The alternative alias for the vertex.

***

### aliasFormat? {#aliasformat}

> `optional` **aliasFormat?**: `string`

The format of the alias for the vertex.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

The date/time of when the alias was created.

***

### dateModified? {#datemodified}

> `optional` **dateModified?**: `string`

The date/time of when the alias was last modified.

***

### dateDeleted? {#datedeleted}

> `optional` **dateDeleted?**: `string`

The timestamp of when the alias was deleted, as we never actually remove items.

***

### annotationObject? {#annotationobject}

> `optional` **annotationObject?**: `IJsonLdNodeObject`

Object to associate with the alias as JSON-LD.
