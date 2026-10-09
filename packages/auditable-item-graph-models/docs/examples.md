# Auditable Item Graph Models Examples

Use these examples to initialise data type handling before interacting with graph APIs and JSON-LD payloads.

## AuditableItemGraphDataTypes

```typescript
import { DataTypeHandlerFactory } from '@3sixty/data-core';
import {
  AuditableItemGraphContexts,
  AuditableItemGraphDataTypes,
  AuditableItemGraphTypes
} from '@3sixty/auditable-item-graph-models';

AuditableItemGraphDataTypes.registerTypes();

const vertexType = `${AuditableItemGraphContexts.Namespace}${AuditableItemGraphTypes.Vertex}`;
const handler = DataTypeHandlerFactory.get(vertexType);

console.log(vertexType); // https://schema.3sixty.global/auditable-item-graph/Vertex
console.log(handler.type); // Vertex
```
