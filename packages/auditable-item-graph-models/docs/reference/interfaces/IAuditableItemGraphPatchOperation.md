# Interface: IAuditableItemGraphPatchOperation

The patch operation for JSON diffs.

## Properties

### @context?

> `optional` **@context**: `"https://schema.twindev.org/aig/"` \| \[`"https://schema.twindev.org/aig/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type

> **type**: `"AuditableItemGraphPatchOperation"`

JSON-LD Type.

***

### patchOperation

> **patchOperation**: `"add"` \| `"remove"` \| `"replace"` \| `"move"` \| `"copy"` \| `"test"`

The operation that was performed on the item.
json-ld type:schema:Text

***

### patchPath

> **patchPath**: `string`

The path to the object that was changed.
json-ld type:schema:Text

***

### patchFrom?

> `optional` **patchFrom**: `string`

The path the value was copied or moved from.
json-ld type:schema:Text

***

### patchValue?

> `optional` **patchValue**: `unknown`

The value to add.
json-ld type:json
