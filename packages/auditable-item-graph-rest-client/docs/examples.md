# Auditable Item Graph REST Client Examples

These snippets show practical request flows for creating, reading, updating, and querying graph items through HTTP endpoints.

## AuditableItemGraphRestClient

```typescript
import { AuditableItemGraphRestClient } from '@3sixty/auditable-item-graph-rest-client';

const client = new AuditableItemGraphRestClient({ endpoint: 'http://localhost:8080' });

console.log(client.className()); // AuditableItemGraphRestClient
```

```typescript
import { VerifyDepth } from '@3sixty/auditable-item-graph-models';
import { AuditableItemGraphRestClient } from '@3sixty/auditable-item-graph-rest-client';

const client = new AuditableItemGraphRestClient({ endpoint: 'http://localhost:8080' });

const id = await client.create({
  annotationObject: {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Create',
    actor: {
      type: 'Person',
      id: 'acct:alex@example.org',
      name: 'Alex'
    },
    object: {
      type: 'Note',
      content: 'Created through the REST client'
    }
  },
  aliases: [{ id: 'ticket-2026-0007', aliasFormat: 'externalRef', unique: true }],
  resources: [
    { resourceObject: { '@context': 'https://schema.org', type: 'Thing', name: 'Asset A' } }
  ]
});

const vertex = await client.get(id, {
  includeDeleted: false,
  verifySignatureDepth: VerifyDepth.Current
});

console.log(id); // aig:018f5a6cfd9444d58c7c2d4df1fd0a23
console.log(vertex.id); // aig:018f5a6cfd9444d58c7c2d4df1fd0a23
```

```typescript
import { VerifyDepth } from '@3sixty/auditable-item-graph-models';
import { AuditableItemGraphRestClient } from '@3sixty/auditable-item-graph-rest-client';

const client = new AuditableItemGraphRestClient({ endpoint: 'http://localhost:8080' });

const id = 'aig:018f5a6cfd9444d58c7c2d4df1fd0a23';

await client.update({
  id,
  aliases: [{ id: 'ticket-2026-0007', aliasFormat: 'externalRef' }],
  resources: [
    {
      id: 'resource-1',
      resourceObject: { '@context': 'https://schema.org', type: 'Thing', name: 'Asset A v2' }
    }
  ],
  edges: [{ targetId: 'aig:018f5a6cfd9444d58c7c2d4df1fd0999', edgeRelationships: ['dependsOn'] }]
});

const changesetChunk = await client.getChangesets(id, undefined, 20, {
  verifySignatureDepth: VerifyDepth.Current
});

const firstChangeset = changesetChunk.changesets.itemListElement?.[0];

if (firstChangeset?.id) {
  const changeset = await client.getChangeset(firstChangeset.id, {
    verifySignatureDepth: VerifyDepth.Current
  });

  console.log(changeset.id); // aig:018f5a6cfd9444d58c7c2d4df1fd0a23:changeset:018f5a6cfd9444d58c7c2d4df1fd0b10
}
```

```typescript
import { AuditableItemGraphRestClient } from '@3sixty/auditable-item-graph-rest-client';
import { ComparisonOperator, SortDirection } from '@3sixty/entity';

const client = new AuditableItemGraphRestClient({ endpoint: 'http://localhost:8080' });

const result = await client.query(
  {
    id: 'ticket-2026',
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
  10
);

console.log(result.entries.itemListElement?.length ?? 0); // 2

try {
  await client.removeVerifiable('aig:018f5a6cfd9444d58c7c2d4df1fd0a23');
} catch (error) {
  console.log(error instanceof Error ? error.message : 'Unknown error'); // Not supported on client
}
```
