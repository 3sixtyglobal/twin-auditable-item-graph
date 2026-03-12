# Interface: IAuditableItemGraphVertexList

Interface describing an auditable item graph vertex list.

## Properties

### @context {#context}

> **@context**: \[`"https://schema.org"`, `"https://schema.twindev.org/aig/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type {#type}

> **type**: \[`"ItemList"`, `"AuditableItemGraphVertexList"`\]

JSON-LD Type.

***

### itemListElement {#itemlistelement}

> **itemListElement**: [`IAuditableItemGraphVertex`](IAuditableItemGraphVertex.md)[]

The list of vertices.
