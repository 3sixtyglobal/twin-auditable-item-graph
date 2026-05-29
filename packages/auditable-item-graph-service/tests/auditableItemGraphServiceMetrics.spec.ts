// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { TenantIdContextIdHandler } from "@twin.org/api-tenant-processor";
import {
	AuditableItemGraphContexts,
	AuditableItemGraphTypes,
	VerifyDepth
} from "@twin.org/auditable-item-graph-models";
import {
	type BackgroundTask,
	BackgroundTaskService,
	initSchema as initSchemaBackgroundTask
} from "@twin.org/background-task-service";
import {
	ContextIdHandlerFactory,
	ContextIdKeys,
	ContextIdStore,
	type IContextIds
} from "@twin.org/context";
import { AlreadyExistsError, ComponentFactory } from "@twin.org/core";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { DidContextIdHandler } from "@twin.org/identity-models";
import { ImmutableProofFailure } from "@twin.org/immutable-proof-models";
import {
	type ImmutableProof,
	ImmutableProofService,
	initSchema as initSchemaImmutableProof
} from "@twin.org/immutable-proof-service";
import { ModuleHelper } from "@twin.org/modules";
import { nameof } from "@twin.org/nameof";
import { NotarizationConnectorFactory, type INotarization } from "@twin.org/notarization-models";
import {
	MetricType,
	type ITelemetryComponent,
	type ITelemetryMetric
} from "@twin.org/telemetry-models";
import {
	cleanupTestEnv,
	setupTestEnv,
	TEST_NODE_IDENTITY,
	TEST_ORGANIZATION_IDENTITY,
	TEST_TENANT_IDENTITY,
	TEST_USER_IDENTITY
} from "./setupTestEnv.js";
import { AuditableItemGraphService } from "../src/auditableItemGraphService.js";
import type { AuditableItemGraphChangeset } from "../src/entities/auditableItemGraphChangeset.js";
import type { AuditableItemGraphVertex } from "../src/entities/auditableItemGraphVertex.js";
import { initSchema } from "../src/schema.js";

const FIRST_TICK = 1724327716271;
const SECOND_TICK = 1724327816272;
const THIRD_TICK = 1724327916273;

interface MetricValueEntry {
	id: string;
	value: "inc" | "dec" | number;
	customData?: { [key: string]: unknown };
}

function makeMockTelemetry(): {
	component: ITelemetryComponent;
	created: ITelemetryMetric[];
	values: MetricValueEntry[];
} {
	const created: ITelemetryMetric[] = [];
	const values: MetricValueEntry[] = [];
	const component: ITelemetryComponent = {
		className: () => "MockTelemetry",
		start: async () => {},
		stop: async () => {},
		createMetric: async m => {
			created.push({ ...m });
		},
		getMetric: async () => ({ metric: {} as never, value: {} as never }),
		updateMetric: async () => {},
		addMetricValue: async (id, value, customData) => {
			values.push({ id, value, customData });
			return "v";
		},
		removeMetric: async () => {},
		query: async () => ({ entities: [] }),
		queryValues: async () => ({ metric: {} as never, entities: [] })
	};
	return { component, created, values };
}

let vertexStorage: MemoryEntityStorageConnector<AuditableItemGraphVertex>;
let changesetStorage: MemoryEntityStorageConnector<AuditableItemGraphChangeset>;
let immutableProofStorage: MemoryEntityStorageConnector<ImmutableProof>;
let notarizationStore: Map<string, INotarization>;
let backgroundTaskStorage: MemoryEntityStorageConnector<BackgroundTask>;

async function waitForProofGeneration(proofCount: number = 1): Promise<void> {
	let count = 0;
	do {
		await new Promise(resolve => setTimeout(resolve, 200));
	} while (
		immutableProofStorage.getStore().filter(p => p.notarizationId).length < proofCount &&
		count++ < proofCount * 40
	);
}

describe("AuditableItemGraphService — metrics", () => {
	beforeAll(async () => {
		await setupTestEnv();

		initSchema();
		initSchemaImmutableProof();
		initSchemaBackgroundTask();

		ContextIdHandlerFactory.register(ContextIdKeys.Node, () => new DidContextIdHandler());
		ContextIdHandlerFactory.register(ContextIdKeys.Tenant, () => new TenantIdContextIdHandler());
		ContextIdHandlerFactory.register(ContextIdKeys.Organization, () => new DidContextIdHandler());
		ContextIdHandlerFactory.register(ContextIdKeys.User, () => new DidContextIdHandler());

		ContextIdStore.getContextIds = vi.fn().mockImplementation(() => ({
			[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
			[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY,
			[ContextIdKeys.Organization]: TEST_ORGANIZATION_IDENTITY,
			[ContextIdKeys.User]: TEST_USER_IDENTITY
		}));

		ModuleHelper.execModuleMethodThreadMessage = vi
			.fn()
			.mockImplementation((module, completed) => ({
				executeMethod: async (method: string, args?: unknown, contextIds?: IContextIds) => {
					const res = await ModuleHelper.execModuleMethod(module, method, args as unknown[]);
					completed(method, res);
				}
			}));
	});

	afterAll(async () => {
		await cleanupTestEnv();
	});

	beforeEach(async () => {
		vertexStorage = new MemoryEntityStorageConnector<AuditableItemGraphVertex>({
			entitySchema: nameof<AuditableItemGraphVertex>(),
			partitionContextIds: [ContextIdKeys.Tenant]
		});
		changesetStorage = new MemoryEntityStorageConnector<AuditableItemGraphChangeset>({
			entitySchema: nameof<AuditableItemGraphChangeset>(),
			partitionContextIds: [ContextIdKeys.Tenant]
		});
		EntityStorageConnectorFactory.register("auditable-item-graph-vertex", () => vertexStorage);
		EntityStorageConnectorFactory.register(
			"auditable-item-graph-changeset",
			() => changesetStorage
		);

		notarizationStore = new Map<string, INotarization>();
		let notarizationIdCounter = 0;
		NotarizationConnectorFactory.register("notarization", () => ({
			className: () => "MockNotarizationConnector",
			create: async (
				controllerIdentity: string,
				notarization: Omit<INotarization, "id" | "dateCreated">
			) => {
				const id = (++notarizationIdCounter).toString(16).padStart(32, "0");
				notarizationStore.set(id, {
					...notarization,
					id,
					dateCreated: new Date(Date.now()).toISOString()
				});
				return id;
			},
			get: async (id: string) => {
				const entry = notarizationStore.get(id);
				if (!entry) {
					throw new Error(`Notarization not found: ${id}`);
				}
				return entry;
			},
			remove: async (controllerIdentity: string, id: string) => {
				notarizationStore.delete(id);
			},
			update: async (controllerIdentity: string, notarization: INotarization) => {
				notarizationStore.set(notarization.id, notarization);
			},
			transfer: async () => {}
		}));

		immutableProofStorage = new MemoryEntityStorageConnector<ImmutableProof>({
			entitySchema: nameof<ImmutableProof>(),
			partitionContextIds: [ContextIdKeys.Tenant]
		});
		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofStorage);

		backgroundTaskStorage = new MemoryEntityStorageConnector<BackgroundTask>({
			entitySchema: nameof<BackgroundTask>()
		});
		EntityStorageConnectorFactory.register("background-task", () => backgroundTaskStorage);

		const backgroundTask = new BackgroundTaskService();
		ComponentFactory.register("background-task", () => backgroundTask);
		await backgroundTask.start();

		const immutableProofService = new ImmutableProofService();
		ComponentFactory.register("immutable-proof", () => immutableProofService);
		await immutableProofService.start();

		Date.now = vi
			.fn()
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementationOnce(() => SECOND_TICK)
			.mockImplementation(() => THIRD_TICK);
	});

	test("start() registers all 16 counters", async () => {
		const { component, created } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});
		await service.start();

		expect(created).toHaveLength(15);
		for (const m of created) {
			expect(m.type).toBe(MetricType.Counter);
		}
		const ids = created.map(m => m.id);
		expect(ids).toContain("aig_vertices_created");
		expect(ids).toContain("aig_vertices_updated");
		expect(ids).toContain("aig_changesets_created");
		expect(ids).toContain("aig_aliases_added");
		expect(ids).toContain("aig_aliases_modified");
		expect(ids).toContain("aig_aliases_deleted");
		expect(ids).toContain("aig_resources_added");
		expect(ids).toContain("aig_resources_modified");
		expect(ids).toContain("aig_resources_deleted");
		expect(ids).toContain("aig_edges_added");
		expect(ids).toContain("aig_edges_modified");
		expect(ids).toContain("aig_edges_deleted");
		expect(ids).toContain("aig_queries_executed");
		expect(ids).toContain("aig_verifications_succeeded");
		expect(ids).toContain("aig_verifications_failed");
	});

	test("start() is idempotent — AlreadyExistsError is swallowed", async () => {
		let callCount = 0;
		const component: ITelemetryComponent = {
			...makeMockTelemetry().component,
			createMetric: async () => {
				if (callCount++ > 0) {
					throw new AlreadyExistsError("test", "metric", "id");
				}
			}
		};
		ComponentFactory.register("test-telemetry-idempotent", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry-idempotent"
		});
		await service.start();
		await expect(service.start()).resolves.toBeUndefined();
	});

	test("create() emits aig_vertices_created and aig_changesets_created", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		const created = values.filter(v => v.id === "aig_vertices_created");
		expect(created).toHaveLength(1);
		expect(created[0].value).toBe("inc");

		const changesets = values.filter(v => v.id === "aig_changesets_created");
		expect(changesets).toHaveLength(1);

		expect(values.filter(v => v.id === "aig_queries_executed")).toHaveLength(0);
	});

	test("update() with patches emits aig_vertices_updated with patchCount", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "alias-1" }]
		});

		const updated = values.filter(v => v.id === "aig_vertices_updated");
		expect(updated).toHaveLength(1);
		expect(updated[0].value).toBe("inc");
		expect(updated[0].customData?.patchCount).toBeGreaterThan(0);
	});

	test("update() with no changes does NOT emit aig_vertices_updated", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		expect(values.filter(v => v.id === "aig_vertices_updated")).toHaveLength(0);
	});

	test("adding an alias emits aig_aliases_added", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "alias-1" }]
		});

		expect(values.filter(v => v.id === "aig_aliases_added")).toHaveLength(1);
	});

	test("modifying an alias emits aig_aliases_modified", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "alias-1", aliasFormat: "format-a" }]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "alias-1", aliasFormat: "format-b" }]
		});

		expect(values.filter(v => v.id === "aig_aliases_modified")).toHaveLength(1);
	});

	test("removing an alias emits aig_aliases_deleted", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "alias-1" }]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: []
		});

		expect(values.filter(v => v.id === "aig_aliases_deleted")).toHaveLength(1);
	});

	test("adding a resource emits aig_resources_added", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "res-1"
				}
			]
		});

		expect(values.filter(v => v.id === "aig_resources_added")).toHaveLength(1);
	});

	test("modifying a resource emits aig_resources_modified", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "res-1",
					resourceObject: { "@context": "https://schema.org", "@type": "Thing", name: "v1" }
				}
			]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "res-1",
					resourceObject: { "@context": "https://schema.org", "@type": "Thing", name: "v2" }
				}
			]
		});

		expect(values.filter(v => v.id === "aig_resources_modified")).toHaveLength(1);
	});

	test("removing a resource emits aig_resources_deleted", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "res-1"
				}
			]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			resources: []
		});

		expect(values.filter(v => v.id === "aig_resources_deleted")).toHaveLength(1);
	});

	test("adding an edge emits aig_edges_added", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const targetId = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			edges: [
				{
					type: AuditableItemGraphTypes.Edge,
					targetId,
					edgeRelationships: ["related"]
				}
			]
		});

		expect(values.filter(v => v.id === "aig_edges_added")).toHaveLength(1);
	});

	test("modifying an edge emits aig_edges_modified", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const targetId = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			edges: [
				{
					type: AuditableItemGraphTypes.Edge,
					targetId,
					edgeRelationships: ["related"]
				}
			]
		});

		const vertex = await service.get(id, { includeDeleted: true });
		const edgeId = vertex.edges?.[0].id;

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			edges: [
				{
					id: edgeId,
					type: AuditableItemGraphTypes.Edge,
					targetId,
					edgeRelationships: ["related", "depends-on"]
				}
			]
		});

		expect(values.filter(v => v.id === "aig_edges_modified")).toHaveLength(1);
	});

	test("removing an edge emits aig_edges_deleted", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const targetId = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			edges: [
				{
					type: AuditableItemGraphTypes.Edge,
					targetId,
					edgeRelationships: ["related"]
				}
			]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			edges: []
		});

		expect(values.filter(v => v.id === "aig_edges_deleted")).toHaveLength(1);
	});

	test("query() emits aig_queries_executed with resultCount and hasMore", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		await service.query();

		const queries = values.filter(v => v.id === "aig_queries_executed");
		expect(queries).toHaveLength(1);
		expect(queries[0].customData?.resultCount).toBe(2);
		expect(typeof queries[0].customData?.hasMore).toBe("boolean");
	});

	test("verification success emits aig_verifications_succeeded", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		await waitForProofGeneration(1);

		await service.get(id, { verifySignatureDepth: VerifyDepth.Current });

		expect(values.filter(v => v.id === "aig_verifications_succeeded")).toHaveLength(1);
		expect(values.filter(v => v.id === "aig_verifications_failed")).toHaveLength(0);
	});

	test("verification failure emits aig_verifications_failed with failureReason", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemGraphService({
			telemetryComponentType: "test-telemetry"
		});

		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		// Strip proofId to trigger ProofMissing failure.
		// Also strip partitionId (internal storage field not in the entity schema).
		const rawCs = changesetStorage.getStore()[0] as unknown as { [key: string]: unknown };
		const cs = { ...rawCs } as unknown as AuditableItemGraphChangeset;
		delete (cs as unknown as { [key: string]: unknown }).proofId;
		delete (cs as unknown as { [key: string]: unknown }).partitionId;
		await changesetStorage.set(cs);

		const vertexId = (vertexStorage.getStore()[0] as unknown as { [key: string]: unknown })
			.id as string;
		const csId = cs.id;
		const changesetFullId = `aig:${vertexId}:changeset:${csId}`;

		await service.getChangeset(changesetFullId, { verifySignatureDepth: VerifyDepth.All });

		const failures = values.filter(v => v.id === "aig_verifications_failed");
		expect(failures).toHaveLength(1);
		expect(failures[0].customData?.failureReason).toBe(ImmutableProofFailure.ProofMissing);
		expect(values.filter(v => v.id === "aig_verifications_succeeded")).toHaveLength(0);
	});

	test("service works without telemetry component — no errors", async () => {
		const service = new AuditableItemGraphService();

		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		expect(id).toMatch(/^aig:/);

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "alias-1" }]
		});

		const result = await service.query();
		expect(result.entries).toBeDefined();
	});
});
