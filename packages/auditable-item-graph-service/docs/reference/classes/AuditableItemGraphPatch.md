# Class: AuditableItemGraphPatch

Class describing the auditable item graph patches.

## Constructors

### Constructor

> **new AuditableItemGraphPatch**(): `AuditableItemGraphPatch`

#### Returns

`AuditableItemGraphPatch`

## Properties

### op {#op}

> **op**: `"add"` \| `"remove"` \| `"replace"` \| `"move"` \| `"copy"` \| `"test"`

The operation for the patch.

***

### path {#path}

> **path**: `string`

The path for the patch.

***

### from? {#from}

> `optional` **from**: `string`

The from for the patch.

***

### value? {#value}

> `optional` **value**: `unknown`

The value for the patch.
