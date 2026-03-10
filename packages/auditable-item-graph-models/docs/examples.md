# Auditable Item Graph Models Examples

Use these examples to initialise data type handling before interacting with graph APIs and JSON-LD payloads.

## AuditableItemGraphDataTypes

```typescript
import { DataTypeHandlerFactory } from '@twin.org/data-core';
import {
  AuditableItemGraphContexts,
  AuditableItemGraphDataTypes,
  AuditableItemGraphTypes
} from '@twin.org/auditable-item-graph-models';

AuditableItemGraphDataTypes.registerTypes();

const vertexType = `${AuditableItemGraphContexts.Namespace}${AuditableItemGraphTypes.Vertex}`;
const handler = DataTypeHandlerFactory.get(vertexType);

console.log(vertexType); // https://schema.twindev.org/auditable-item-graph/Vertex
console.log(handler.type); // Vertex
```
