# Interface: IAuditableItemGraphServiceConstructorOptions

Options for the constructor of the auditable item graph service.

## Properties

### immutableProofComponentType? {#immutableproofcomponenttype}

> `optional` **immutableProofComponentType?**: `string`

The immutable proof component type.

#### Default

```ts
immutable-proof
```

***

### vertexEntityStorageType? {#vertexentitystoragetype}

> `optional` **vertexEntityStorageType?**: `string`

The entity storage for vertices.

#### Default

```ts
auditable-item-graph-vertex
```

***

### vertexIndexEntityStorageType? {#vertexindexentitystoragetype}

> `optional` **vertexIndexEntityStorageType?**: `string`

The entity storage for vertex indices.

#### Default

```ts
auditable-item-graph-vertex-index
```

***

### changesetEntityStorageType? {#changesetentitystoragetype}

> `optional` **changesetEntityStorageType?**: `string`

The entity storage for changesets.

#### Default

```ts
auditable-item-graph-changeset
```

***

### eventBusComponentType? {#eventbuscomponenttype}

> `optional` **eventBusComponentType?**: `string`

The event bus component type, defaults to no event bus.

***

### telemetryComponentType? {#telemetrycomponenttype}

> `optional` **telemetryComponentType?**: `string`

The component type for the optional telemetry component used for event metrics, defaults to no telemetry.

***

### config? {#config}

> `optional` **config?**: [`IAuditableItemGraphServiceConfig`](IAuditableItemGraphServiceConfig.md)

The configuration for the service.
