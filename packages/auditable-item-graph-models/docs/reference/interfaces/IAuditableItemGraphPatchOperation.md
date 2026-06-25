# Interface: IAuditableItemGraphPatchOperation

The patch operation for JSON diffs.

## Properties

### @context? {#context}

> `optional` **@context?**: `"https://schema.twindev.org/aig/"` \| \[`"https://schema.twindev.org/aig/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type {#type}

> **type**: `"AuditableItemGraphPatchOperation"`

JSON-LD Type.

***

### patchOperation {#patchoperation}

> **patchOperation**: `"add"` \| `"remove"` \| `"replace"` \| `"move"` \| `"copy"` \| `"test"`

The operation that was performed on the item.

***

### patchPath {#patchpath}

> **patchPath**: `string`

The path to the object that was changed.

***

### patchFrom? {#patchfrom}

> `optional` **patchFrom?**: `string`

The path the value was copied or moved from.

***

### patchValue? {#patchvalue}

> `optional` **patchValue?**: `unknown`

The value to add.
