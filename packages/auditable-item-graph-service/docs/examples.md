# Auditable Item Graph Service Examples

Use these examples when you want to run graph operations in process, keep an audit trail, and work with strongly typed entities.

## AuditableItemGraphService

```typescript
import { AuditableItemGraphService } from '@twin.org/auditable-item-graph-service';

const service = new AuditableItemGraphService();

console.log(service.className()); // AuditableItemGraphService
```

```typescript
import { AuditableItemGraphService } from '@twin.org/auditable-item-graph-service';

const service = new AuditableItemGraphService();

const vertexId = await service.create({
  annotationObject: {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Create',
    actor: {
      type: 'Person',
      id: 'did:example:alice',
      name: 'Alice'
    },
    object: {
      type: 'Note',
      content: 'Initial version'
    }
  },
  aliases: [{ id: 'order-2026-0195', aliasFormat: 'orderRef' }],
  resources: [
    { resourceObject: { '@context': 'https://schema.org', type: 'Thing', name: 'Order 2026-0195' } }
  ]
});

await service.update({
  id: vertexId,
  aliases: [{ id: 'order-2026-0195', aliasFormat: 'orderRef' }],
  resources: [
    {
      id: 'resource-order',
      resourceObject: {
        '@context': 'https://schema.org',
        type: 'Thing',
        name: 'Order 2026-0195 (amended)'
      }
    }
  ],
  edges: [{ targetId: 'aig:018f5a6cfd9444d58c7c2d4df1fd0fff', edgeRelationships: ['derivedFrom'] }]
});

console.log(vertexId); // aig:018f5a6cfd9444d58c7c2d4df1fd0a23
```

```typescript
import { VerifyDepth } from '@twin.org/auditable-item-graph-models';
import { AuditableItemGraphService } from '@twin.org/auditable-item-graph-service';

const service = new AuditableItemGraphService();
const vertexId = 'aig:018f5a6cfd9444d58c7c2d4df1fd0a23';

const vertex = await service.get(vertexId, {
  includeDeleted: false,
  verifySignatureDepth: VerifyDepth.Current
});

const changesetChunk = await service.getChangesets(vertexId, undefined, 10, {
  verifySignatureDepth: VerifyDepth.Current
});

const firstChangeset = changesetChunk.changesets.itemListElement?.[0];

if (firstChangeset?.id) {
  const changeset = await service.getChangeset(firstChangeset.id, {
    verifySignatureDepth: VerifyDepth.Current
  });

  console.log(vertex.id); // aig:018f5a6cfd9444d58c7c2d4df1fd0a23
  console.log(changeset.id); // aig:018f5a6cfd9444d58c7c2d4df1fd0a23:changeset:018f5a6cfd9444d58c7c2d4df1fd0b10
}
```

```typescript
import { ComparisonOperator, SortDirection } from '@twin.org/entity';
import { AuditableItemGraphService } from '@twin.org/auditable-item-graph-service';

const service = new AuditableItemGraphService();

const queryResult = await service.query(
  {
    id: 'order-2026',
    idMode: 'alias',
    idExact: false,
    resourceTypes: ['Thing']
  },
  [
    {
      field: 'dateCreated',
      comparison: ComparisonOperator.GreaterThan,
      value: '2026-01-01T00:00:00.000Z'
    }
  ],
  'dateCreated',
  SortDirection.Descending,
  ['id', 'dateCreated', 'aliases'],
  undefined,
  25
);

console.log(queryResult.entries.itemListElement?.length ?? 0); // 3

await service.removeVerifiable('aig:018f5a6cfd9444d58c7c2d4df1fd0a23');
```

Vertices which only need their current state can opt out of versioning with `auditMode`. Bypass is a
terminal mode; switching an audited vertex to bypass compacts its history and removes the associated
proofs, and a bypass vertex can never return to audited.

```typescript
import { AuditableItemGraphAuditMode } from '@twin.org/auditable-item-graph-models';
import { AuditableItemGraphService } from '@twin.org/auditable-item-graph-service';

const service = new AuditableItemGraphService();

const lookupId = await service.create({
  auditMode: AuditableItemGraphAuditMode.Bypass,
  aliases: [{ id: 'currency-rates', aliasFormat: 'lookupRef' }]
});

// Overwrites the stored state in place, no changeset is written.
await service.updatePartial({
  id: lookupId,
  annotationObject: { '@context': 'https://schema.org', type: 'Thing', name: 'Rates 2026-03-10' }
});

const changesets = await service.getChangesets(lookupId);

console.log(changesets.changesets.itemListElement?.length ?? 0); // 0

// Archive an existing audited vertex by compacting it to its current state.
await service.updatePartial({
  id: 'aig:018f5a6cfd9444d58c7c2d4df1fd0a23',
  auditMode: AuditableItemGraphAuditMode.Bypass
});
```

## AuditableItemGraphVertex

```typescript
import {
  AuditableItemGraphAlias,
  AuditableItemGraphEdge,
  AuditableItemGraphResource,
  AuditableItemGraphVertex
} from '@twin.org/auditable-item-graph-service';

const alias = new AuditableItemGraphAlias();
alias.id = 'order-2026-0195';
alias.aliasFormat = 'orderRef';
alias.dateCreated = '2026-03-10T09:30:00.000Z';

const resource = new AuditableItemGraphResource();
resource.id = 'resource-order';
resource.dateCreated = '2026-03-10T09:30:00.000Z';
resource.resourceObject = {
  '@context': 'https://schema.org',
  type: 'Thing',
  name: 'Order 2026-0195'
};

const edge = new AuditableItemGraphEdge();
edge.id = 'edge-1';
edge.dateCreated = '2026-03-10T09:30:00.000Z';
edge.targetId = 'aig:018f5a6cfd9444d58c7c2d4df1fd0fff';
edge.edgeRelationships = ['derivedFrom'];

const vertex = new AuditableItemGraphVertex();
vertex.id = '018f5a6cfd9444d58c7c2d4df1fd0a23';
vertex.organizationIdentity = 'did:web:example.org';
vertex.dateCreated = '2026-03-10T09:30:00.000Z';
vertex.aliases = [alias];
vertex.resources = [resource];
vertex.edges = [edge];

console.log(vertex.aliases?.length ?? 0); // 1
```

## AuditableItemGraphChangeset

```typescript
import {
  AuditableItemGraphChangeset,
  AuditableItemGraphPatch
} from '@twin.org/auditable-item-graph-service';

const patch = new AuditableItemGraphPatch();
patch.op = 'replace';
patch.path = '/resources/0/resourceObject/name';
patch.value = 'Order 2026-0195 (amended)';

const changeset = new AuditableItemGraphChangeset();
changeset.id = '018f5a6cfd9444d58c7c2d4df1fd0b10';
changeset.vertexId = '018f5a6cfd9444d58c7c2d4df1fd0a23';
changeset.dateCreated = '2026-03-10T09:40:00.000Z';
changeset.userIdentity = 'did:web:example.org:users:alice';
changeset.patches = [patch];

console.log(changeset.patches.length); // 1
```

## AuditableItemGraphAlias

```typescript
import { AuditableItemGraphAlias } from '@twin.org/auditable-item-graph-service';

const alias = new AuditableItemGraphAlias();
alias.id = 'order-2026-0195';
alias.aliasFormat = 'orderRef';
alias.dateCreated = '2026-03-10T09:30:00.000Z';

console.log(alias.id); // order-2026-0195
```

## AuditableItemGraphResource

```typescript
import { AuditableItemGraphResource } from '@twin.org/auditable-item-graph-service';

const resource = new AuditableItemGraphResource();
resource.id = 'resource-order';
resource.dateCreated = '2026-03-10T09:30:00.000Z';
resource.resourceObject = {
  '@context': 'https://schema.org',
  type: 'Thing',
  name: 'Order 2026-0195'
};

console.log(resource.id); // resource-order
```

## AuditableItemGraphEdge

```typescript
import { AuditableItemGraphEdge } from '@twin.org/auditable-item-graph-service';

const edge = new AuditableItemGraphEdge();
edge.id = 'edge-1';
edge.dateCreated = '2026-03-10T09:30:00.000Z';
edge.targetId = 'aig:018f5a6cfd9444d58c7c2d4df1fd0fff';
edge.edgeRelationships = ['derivedFrom'];

console.log(edge.edgeRelationships[0]); // derivedFrom
```

## AuditableItemGraphPatch

```typescript
import { AuditableItemGraphPatch } from '@twin.org/auditable-item-graph-service';

const patch = new AuditableItemGraphPatch();
patch.op = 'add';
patch.path = '/aliases/-';
patch.value = {
  id: 'order-2026-0195',
  aliasFormat: 'orderRef'
};

console.log(patch.op); // add
```
