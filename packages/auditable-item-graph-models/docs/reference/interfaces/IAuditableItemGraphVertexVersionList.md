# Interface: IAuditableItemGraphVertexVersionList

Interface describing a list of auditable item graph vertex version numbers.

## Properties

### @context {#context}

> **@context**: \[`"https://schema.org"`, `"https://schema.twindev.org/aig/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type {#type}

> **type**: \[`"ItemList"`, `"AuditableItemGraphVertexVersionList"`\]

JSON-LD Type.

***

### itemListElement {#itemlistelement}

> **itemListElement**: `object`[]

The list of versions.

#### version

> **version**: `number`

#### dateCreated

> **dateCreated**: `string`
