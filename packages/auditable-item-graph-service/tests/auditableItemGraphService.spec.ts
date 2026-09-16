// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HealthCategory, HealthStatus, type IHealth } from "@twin.org/api-models";
import { TenantIdContextIdHandler } from "@twin.org/api-tenant-processor";
import {
	AuditableItemGraphAuditMode,
	AuditableItemGraphContexts,
	AuditableItemGraphTypes,
	type IAuditableItemGraphAlias,
	type IAuditableItemGraphEdge,
	type IAuditableItemGraphResource,
	type IAuditableItemGraphVertex,
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
import { ComponentFactory, Is, RandomHelper, SharedStore } from "@twin.org/core";
import { ComparisonOperator, LogicalOperator } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { DidContextIdHandler } from "@twin.org/identity-models";
import {
	type ImmutableProof,
	ImmutableProofService,
	initSchema as initSchemaImmutableProof
} from "@twin.org/immutable-proof-service";
import { ModuleHelper } from "@twin.org/modules";
import { nameof } from "@twin.org/nameof";
import { NotarizationConnectorFactory, type INotarization } from "@twin.org/notarization-models";
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

let vertexStorage: MemoryEntityStorageConnector<AuditableItemGraphVertex>;
let changesetStorage: MemoryEntityStorageConnector<AuditableItemGraphChangeset>;
let immutableProofStorage: MemoryEntityStorageConnector<ImmutableProof>;
let notarizationStore: Map<string, INotarization>;
let backgroundTaskStorage: MemoryEntityStorageConnector<BackgroundTask>;

const FIRST_TICK = 1724327716271;
const SECOND_TICK = 1724327816272;

const HEX_ID_PATTERN = /^[\da-f]+$/;
const AIG_URN_PATTERN = /^aig:[\da-f]+$/;
const IMMUTABLE_PROOF_URN_PATTERN = /^immutable-proof:[\da-f]+$/;

/**
 * Parallel attach count aligned with supply-chain concurrency repro (issue #69).
 */
const PARALLEL_EDGE_ATTACH_COUNT = 10;

/**
 * Extract the vertex ID from the AIG URN.
 * @param aigUrn The AIG URN to extract the vertex ID from.
 * @returns The extracted vertex ID.
 */
function extractAigId(aigUrn: string): string {
	return aigUrn.replace(/^aig:/, "");
}

/**
 * Wait for the proof to be generated.
 * @param proofCount The number of proofs to wait for.
 */
async function waitForProofGeneration(proofCount: number = 1): Promise<void> {
	let count = 0;
	do {
		await new Promise(resolve => setTimeout(resolve, 200));
	} while (
		(await immutableProofStorage.getStore()).filter(p => p.notarizationId).length < proofCount &&
		count++ < proofCount * 40
	);
	if (count >= proofCount * 40) {
		throw new Error("Proof generation timed out");
	}
}

/**
 * Attach one reverse edge via `updatePartial`, matching document-management connected-vertex attach.
 * @param service The AIG service.
 * @param parentId The parent vertex URN.
 * @param targetId The document (target) vertex URN.
 */
async function attachReverseEdgeViaUpdatePartial(
	service: AuditableItemGraphService,
	parentId: string,
	targetId: string
): Promise<void> {
	const edge: IAuditableItemGraphEdge = {
		"@context": AuditableItemGraphContexts.Context,
		type: AuditableItemGraphTypes.Edge,
		targetId,
		edgeRelationships: ["document"]
	};

	await service.updatePartial({
		"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
		id: parentId,
		edgePatches: { add: [edge] }
	});
}

describe("AuditableItemGraphService", () => {
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

		// Mock the module helper to execute the method in the same thread, so we don't have to create an engine
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
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "auditable-item-graph-vertex" }
		});

		changesetStorage = new MemoryEntityStorageConnector<AuditableItemGraphChangeset>({
			entitySchema: nameof<AuditableItemGraphChangeset>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "auditable-item-graph-changeset" }
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
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "immutable-proof" }
		});
		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofStorage);

		backgroundTaskStorage = new MemoryEntityStorageConnector<BackgroundTask>({
			entitySchema: nameof<BackgroundTask>(),
			config: { storageKey: "background-task" }
		});
		EntityStorageConnectorFactory.register("background-task", () => backgroundTaskStorage);

		ComponentFactory.register("platform", () => ({
			className: () => "MockPlatform",
			isMultiTenant: () => false,
			execute: async (method: () => Promise<void>) => method(),
			getLocalOriginContext: async () => undefined
		}));

		ComponentFactory.register("task-scheduler", () => ({
			className: () => "task-scheduler",
			addTask: async (taskId: string, times: unknown, taskCallback: () => Promise<void>) => {
				await taskCallback();
			},
			removeTask: async () => {},
			tasksInfo: async () => ({ tasks: {} })
		}));

		const backgroundTask = new BackgroundTaskService();
		ComponentFactory.register("background-task", () => backgroundTask);
		await backgroundTask.start();

		const immutableProofService = new ImmutableProofService();
		ComponentFactory.register("immutable-proof", () => immutableProofService);
		await immutableProofService.start();

		Date.now = vi
			.fn()
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementation(() => SECOND_TICK);

		let counter = 1;
		RandomHelper.generate = vi
			.fn()
			.mockImplementation(length => new Uint8Array(length).fill(counter++));
	});

	afterEach(async () => {
		await vertexStorage.teardown();
		await changesetStorage.teardown();
		await immutableProofStorage.teardown();
		await changesetStorage.teardown();
		await backgroundTaskStorage.teardown();
	});

	test("Can create an instance", async () => {
		const service = new AuditableItemGraphService();
		expect(service).toBeDefined();
	});

	test("Can create a vertex with no properties", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});
		expect(id).toMatch(AIG_URN_PATTERN);

		await waitForProofGeneration();

		const vertexStore = await vertexStorage.getStore();
		const vertex = vertexStore[0];
		const storedVertexId = extractAigId(id);

		expect(vertex).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				dateCreated: expect.any(String),
				organizationIdentity: TEST_ORGANIZATION_IDENTITY
			})
		);
		expect(vertex.id).toEqual(storedVertexId);
		expect(vertex.aliasIndex).toBeUndefined();
		expect(vertex.annotationObject).toBeUndefined();
		expect(vertex.resourceTypeIndex).toBeUndefined();

		const changesetStore = await changesetStorage.getStore();
		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);

		const proofStore = await immutableProofStorage.getStore();
		expect(proofStore).toHaveLength(1);
		expect(proofStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});
		expect(id).toMatch(AIG_URN_PATTERN);
		const storedVertexId = extractAigId(id);

		const vertexStore = await vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual(
			expect.objectContaining({
				id: storedVertexId,
				dateCreated: expect.any(String),
				organizationIdentity: TEST_ORGANIZATION_IDENTITY,
				aliasIndex: "||foo123||bar456||",
				aliases: [
					{
						id: "foo123",
						dateCreated: expect.any(String)
					},
					{
						id: "bar456",
						dateCreated: expect.any(String)
					}
				]
			})
		);

		const changesetStore = await changesetStorage.getStore();

		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/aliases",
						value: [
							{
								id: "foo123",
								dateCreated: expect.any(String)
							},
							{
								id: "bar456",
								dateCreated: expect.any(String)
							}
						]
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);

		await waitForProofGeneration();

		const proofStore = await immutableProofStorage.getStore();
		expect(proofStore).toHaveLength(1);
		expect(proofStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
	});

	test("Can create a vertex with object", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			}
		});
		expect(id).toMatch(AIG_URN_PATTERN);
		const storedVertexId = extractAigId(id);

		const vertexStore = await vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual(
			expect.objectContaining({
				id: storedVertexId,
				dateCreated: expect.any(String),
				organizationIdentity: TEST_ORGANIZATION_IDENTITY,
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					type: "Create",
					actor: {
						type: "Person",
						id: "acct:person@example.org",
						name: "Person"
					},
					object: {
						type: "Note",
						content: "This is a simple note"
					},
					published: "2015-01-25T12:34:56Z"
				}
			})
		);
		expect(vertex.aliasIndex).toBeUndefined();
		expect(vertex.resourceTypeIndex).toBeUndefined();

		const changesetStore = await changesetStorage.getStore();

		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/annotationObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: {
								type: "Person",
								id: "acct:person@example.org",
								name: "Person"
							},
							object: {
								type: "Note",
								content: "This is a simple note"
							},
							published: "2015-01-25T12:34:56Z"
						}
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);

		await waitForProofGeneration();

		const proofStore = await immutableProofStorage.getStore();
		expect(proofStore).toHaveLength(1);
		expect(proofStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
	});

	test("Can get a vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});
		expect(id).toMatch(AIG_URN_PATTERN);

		const result = await service.get(id, undefined);

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: AuditableItemGraphTypes.Vertex,
			id,
			dateCreated: expect.any(String),
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{
					type: AuditableItemGraphTypes.Alias,
					id: "foo123",
					dateCreated: expect.any(String)
				},
				{
					type: AuditableItemGraphTypes.Alias,
					id: "bar456",
					dateCreated: expect.any(String)
				}
			]
		});
	});

	test("Can get a vertex changesets", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123", aliasFormat: "type1" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456", aliasFormat: "type2" }
			]
		});
		expect(id).toMatch(AIG_URN_PATTERN);
		const storedVertexId = extractAigId(id);

		const result = await service.getChangesets(id);
		const changesetStore1 = await changesetStorage.getStore();
		const storedChangesetId = changesetStore1[0].id;
		const changesetUrn = `aig:${storedVertexId}:changeset:${storedChangesetId}`;

		expect(result.changesets).toEqual({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/"
			],
			type: ["ItemList", AuditableItemGraphTypes.ChangesetList],
			itemListElement: [
				{
					id: changesetUrn,
					type: AuditableItemGraphTypes.Changeset,
					dateCreated: "2024-08-22T11:56:56.272Z",
					patches: [
						{
							type: AuditableItemGraphTypes.PatchOperation,
							patchOperation: "add",
							patchPath: "/annotationObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: {
									type: "Person",
									id: "acct:person@example.org",
									name: "Person"
								},
								object: {
									type: "Note",
									content: "This is a simple note"
								},
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: AuditableItemGraphTypes.PatchOperation,
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{
									id: "foo123",
									aliasFormat: "type1",
									dateCreated: "2024-08-22T11:56:56.272Z"
								},
								{
									id: "bar456",
									aliasFormat: "type2",
									dateCreated: "2024-08-22T11:56:56.272Z"
								}
							]
						}
					],
					proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN),
					userIdentity: TEST_USER_IDENTITY,
					version: 0
				}
			]
		});

		const changesetStore = await changesetStorage.getStore();

		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: storedChangesetId,
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN),
				version: 0,
				patches: [
					{
						op: "add",
						path: "/annotationObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
							object: { type: "Note", content: "This is a simple note" },
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{ id: "foo123", aliasFormat: "type1", dateCreated: expect.any(String) },
							{ id: "bar456", aliasFormat: "type2", dateCreated: expect.any(String) }
						]
					}
				]
			})
		);
	});

	test("Can get a vertex changeset", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123", aliasFormat: "type1" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456", aliasFormat: "type2" }
			]
		});
		expect(id.startsWith("aig:")).toEqual(true);

		await waitForProofGeneration();

		const vertexStore = await vertexStorage.getStore();
		const changesetStore = await changesetStorage.getStore();
		const storedVertexId = vertexStore[0].id;
		const storedChangesetId = changesetStore[0].id;
		const changesetUrn = `aig:${storedVertexId}:changeset:${storedChangesetId}`;

		const result = await service.getChangeset(changesetUrn, {
			verifySignatureDepth: VerifyDepth.Current
		});

		expect(result).toEqual(
			expect.objectContaining({
				"@context": [
					"https://schema.twindev.org/aig/",
					"https://schema.twindev.org/common/",
					"https://schema.org",
					"https://schema.twindev.org/immutable-proof/"
				],
				type: AuditableItemGraphTypes.Changeset,
				id: changesetUrn,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				proofId: expect.stringMatching(/^immutable-proof:/),
				patches: [
					{
						type: AuditableItemGraphTypes.PatchOperation,
						patchOperation: "add",
						patchPath: "/annotationObject",
						patchValue: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: {
								type: "Person",
								id: "acct:person@example.org",
								name: "Person"
							},
							object: {
								type: "Note",
								content: "This is a simple note"
							},
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						type: AuditableItemGraphTypes.PatchOperation,
						patchOperation: "add",
						patchPath: "/aliases",
						patchValue: [
							{
								id: "foo123",
								aliasFormat: "type1",
								dateCreated: expect.any(String)
							},
							{
								id: "bar456",
								aliasFormat: "type2",
								dateCreated: expect.any(String)
							}
						]
					}
				]
			})
		);

		expect(result.verification?.verified).toEqual(true);
	});

	test("Can get vertex changesets and verify current signature", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo321" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await waitForProofGeneration(2);

		const result = await service.getChangesets(id, undefined, undefined, {
			verifySignatureDepth: VerifyDepth.Current
		});

		expect(Is.array(result.changesets.itemListElement)).toEqual(true);
		expect(result.changesets.itemListElement).toHaveLength(2);

		expect(result.changesets.itemListElement[0].verification).toBeUndefined();
		expect(result.changesets.itemListElement[1].verification?.verified).toEqual(true);
	});

	test("Can get vertex changesets and verify all signatures", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo321" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await waitForProofGeneration(2);

		const result = await service.getChangesets(id, undefined, undefined, {
			verifySignatureDepth: VerifyDepth.All
		});

		expect(Is.array(result.changesets.itemListElement)).toEqual(true);
		expect(result.changesets.itemListElement).toHaveLength(2);

		for (const item of result.changesets.itemListElement) {
			expect(item.verification?.verified).toEqual(true);
		}
	});

	test("Can page vertex changesets using cursor and limit", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo321" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		const firstPage = await service.getChangesets(id, undefined, 1);
		expect(firstPage.changesets.itemListElement).toHaveLength(1);
		expect(firstPage.cursor).toEqual(expect.any(String));

		const secondPage = await service.getChangesets(id, firstPage.cursor, 1);
		expect(secondPage.changesets.itemListElement).toHaveLength(1);
	});

	test("Can get a vertex and verify current signature", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		expect(id).toMatch(AIG_URN_PATTERN);
		const storedVertexId = extractAigId(id);

		await waitForProofGeneration();

		const result = await service.get(id, {
			verifySignatureDepth: VerifyDepth.Current
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			type: AuditableItemGraphTypes.Vertex,
			id,
			dateCreated: expect.any(String),
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123", dateCreated: expect.any(String) },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456", dateCreated: expect.any(String) }
			],
			verified: true
		});

		const changesetStore = await changesetStorage.getStore();

		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/annotationObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: {
								type: "Person",
								id: "acct:person@example.org",
								name: "Person"
							},
							object: {
								type: "Note",
								content: "This is a simple note"
							},
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{
								id: "foo123",
								dateCreated: expect.any(String)
							},
							{
								id: "bar456",
								dateCreated: expect.any(String)
							}
						]
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);

		await waitForProofGeneration();

		const proofStore = await immutableProofStorage.getStore();
		expect(proofStore).toHaveLength(1);
		expect(proofStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await waitForProofGeneration();

		const result = await service.get(id, {
			verifySignatureDepth: VerifyDepth.Current
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id,
			type: AuditableItemGraphTypes.Vertex,
			dateCreated: expect.any(String),
			aliases: [
				{ id: "foo123", type: AuditableItemGraphTypes.Alias, dateCreated: expect.any(String) },
				{ id: "bar456", type: AuditableItemGraphTypes.Alias, dateCreated: expect.any(String) }
			],
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			verified: true
		});

		const changesetStore = await changesetStorage.getStore();

		const storedVertexId = (await vertexStorage.getStore())[0].id;
		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/annotationObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
							object: { type: "Note", content: "This is a simple note" },
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{ id: "foo123", dateCreated: expect.any(String) },
							{ id: "bar456", dateCreated: expect.any(String) }
						]
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);
	});

	test("Can create and update and verify aliases", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo321" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeDeleted: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id,
			type: AuditableItemGraphTypes.Vertex,
			dateCreated: expect.any(String),
			dateModified: expect.any(String),
			aliases: [
				{
					type: AuditableItemGraphTypes.Alias,
					id: "foo123",
					dateCreated: expect.any(String),
					dateDeleted: expect.any(String)
				},
				{ type: AuditableItemGraphTypes.Alias, id: "bar456", dateCreated: expect.any(String) },
				{ type: AuditableItemGraphTypes.Alias, id: "foo321", dateCreated: expect.any(String) }
			],
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			verified: true,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = await changesetStorage.getStore();
		const storedVertexId = (await vertexStorage.getStore())[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/annotationObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
							object: { type: "Note", content: "This is a simple note" },
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{ id: "foo123", dateCreated: expect.any(String) },
							{ id: "bar456", dateCreated: expect.any(String) }
						]
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);
		expect(changesetStore[1]).toEqual(
			expect.objectContaining({
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{ op: "add", path: "/aliases/0/dateDeleted", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "add",
						path: "/aliases/-",
						value: { id: "foo321", dateCreated: expect.any(String) }
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);

		const proofStore = await immutableProofStorage.getStore();
		expect(proofStore).toHaveLength(2);
		expect(proofStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
		expect(proofStore[1]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await service.update({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			id,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id,
			type: AuditableItemGraphTypes.Vertex,
			dateCreated: expect.any(String),
			dateModified: expect.any(String),
			aliases: [
				{ id: "foo123", type: AuditableItemGraphTypes.Alias, dateCreated: expect.any(String) },
				{ id: "bar456", type: AuditableItemGraphTypes.Alias, dateCreated: expect.any(String) }
			],
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			verified: true
		});

		const changesetStore = await changesetStorage.getStore();
		const storedVertexId = (await vertexStorage.getStore())[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/annotationObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
							object: { type: "Note", content: "This is a simple note" },
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{ id: "foo123", dateCreated: expect.any(String) },
							{ id: "bar456", dateCreated: expect.any(String) }
						]
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);
		expect(changesetStore[1]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN),
				patches: [
					{
						op: "replace",
						path: "/annotationObject/object/content",
						value: "This is a simple note 2"
					}
				]
			})
		);

		const proofStore = await immutableProofStorage.getStore();
		expect(proofStore).toHaveLength(2);
		expect(proofStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
		expect(proofStore[1]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
	});

	test("Can create and update and verify resources, aliases and object", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			],
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 2"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			]
		});

		await service.update({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			id,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			],
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 11"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			]
		});

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id,
			type: AuditableItemGraphTypes.Vertex,
			dateCreated: expect.any(String),
			dateModified: expect.any(String),
			aliases: [
				{ id: "foo123", type: AuditableItemGraphTypes.Alias, dateCreated: expect.any(String) },
				{ id: "bar456", type: AuditableItemGraphTypes.Alias, dateCreated: expect.any(String) }
			],
			resources: [
				{
					id: "resource1",
					type: AuditableItemGraphTypes.Resource,
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
						object: { type: "Note", content: "This is a simple note resource 10" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					type: AuditableItemGraphTypes.Resource,
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
						object: { type: "Note", content: "This is a simple note resource 11" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			verified: true
		});

		const changesetStore = await changesetStorage.getStore();
		const storedVertexId = (await vertexStorage.getStore())[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/annotationObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
							object: { type: "Note", content: "This is a simple note" },
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{ id: "foo123", dateCreated: expect.any(String) },
							{ id: "bar456", dateCreated: expect.any(String) }
						]
					},
					{
						op: "add",
						path: "/resources",
						value: [
							{
								id: "resource1",
								dateCreated: expect.any(String),
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
									object: { type: "Note", content: "This is a simple note resource" },
									published: "2015-01-25T12:34:56Z"
								}
							},
							{
								id: "resource2",
								dateCreated: expect.any(String),
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
									object: { type: "Note", content: "This is a simple note resource 2" },
									published: "2015-01-25T12:34:56Z"
								}
							}
						]
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);
		expect(changesetStore[1]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "replace",
						path: "/annotationObject/object/content",
						value: "This is a simple note 2"
					},
					{ op: "add", path: "/resources/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/resources/0/resourceObject/object/content",
						value: "This is a simple note resource 10"
					},
					{ op: "add", path: "/resources/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/resources/1/resourceObject/object/content",
						value: "This is a simple note resource 11"
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);

		const proofStore = await immutableProofStorage.getStore();
		expect(proofStore).toHaveLength(2);
		expect(proofStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
		expect(proofStore[1]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
	});

	test("Can create and update and verify edges", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			edges: [
				{
					type: AuditableItemGraphTypes.Edge,
					targetId: "aig:1010101010101010101010101010101010101010101010101010101010101010",
					edgeRelationships: ["friend"],
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			]
		});

		const created = await service.get(id, undefined);
		const createdEdgeId = created.edges?.[0]?.id;
		expect(createdEdgeId).toBeDefined();

		await service.update({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			id,
			edges: [
				{
					type: AuditableItemGraphTypes.Edge,
					id: createdEdgeId,
					targetId: "aig:1010101010101010101010101010101010101010101010101010101010101010",
					edgeRelationships: ["frenemy"],
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note 2"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			]
		});

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result.id).toEqual(id);
		expect(result.type).toEqual(AuditableItemGraphTypes.Vertex);
		expect(result.dateCreated).toEqual(expect.any(String));
		expect(result.dateModified).toEqual(expect.any(String));
		expect(result.organizationIdentity).toEqual(TEST_ORGANIZATION_IDENTITY);
		expect(result.verified).toEqual(true);
		expect(result.edges).toHaveLength(1);
		expect(result.edges?.[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(/^aig:[\da-f]+:edge:[\da-f]+$/),
				targetId: "aig:1010101010101010101010101010101010101010101010101010101010101010",
				type: AuditableItemGraphTypes.Edge,
				dateCreated: expect.any(String),
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					type: "Create",
					actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
					object: { type: "Note", content: "This is a simple note 2" },
					published: "2015-01-25T12:34:56Z"
				},
				edgeRelationships: ["frenemy"]
			})
		);

		const changesetStore = await changesetStorage.getStore();

		const storedVertexId = (await vertexStorage.getStore())[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/edges",
						value: [
							{
								id: expect.stringMatching(HEX_ID_PATTERN),
								targetId: "aig:1010101010101010101010101010101010101010101010101010101010101010",
								dateCreated: expect.any(String),
								annotationObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple note" },
									published: "2015-01-25T12:34:56Z"
								},
								edgeRelationships: ["friend"]
							}
						]
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);
		expect(changesetStore[1]).toEqual(
			expect.objectContaining({
				vertexId: storedVertexId,
				id: expect.stringMatching(HEX_ID_PATTERN),
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{ op: "add", path: "/edges/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/edges/0/annotationObject/object/content",
						value: "This is a simple note 2"
					},
					{ op: "replace", path: "/edges/0/edgeRelationships/0", value: "frenemy" }
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);
	});

	test("Can create and update and verify aliases, object, resources and edges", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					id: "acct:person@example.org",
					type: "Person",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{
					type: AuditableItemGraphTypes.Alias,
					id: "foo123",
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple alias 1"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					type: AuditableItemGraphTypes.Alias,
					id: "bar456",
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note alias 2"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 1"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple resource 2"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			edges: [
				{
					type: AuditableItemGraphTypes.Edge,
					targetId: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					edgeRelationships: ["friend"],
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple edge 1"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					type: AuditableItemGraphTypes.Edge,
					targetId: "aig:0202020202020202020202020202020202020202020202020202020202020202",
					edgeRelationships: ["enemy"],
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple edge 2"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			]
		});

		const created = await service.get(id, undefined);
		const createdEdgeIds = created.edges?.map(e => e.id) ?? [];
		expect(createdEdgeIds).toHaveLength(2);
		const [createdEdgeId1, createdEdgeId2] = createdEdgeIds;

		await service.update({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			id,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					id: "acct:person@example.org",
					type: "Person",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{
					type: AuditableItemGraphTypes.Alias,
					id: "foo123",
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note alias 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					type: AuditableItemGraphTypes.Alias,
					id: "bar456",
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note alias 20"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 20"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			edges: [
				{
					type: AuditableItemGraphTypes.Edge,
					id: createdEdgeId1,
					targetId: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					edgeRelationships: ["friend"],
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note edge 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					type: AuditableItemGraphTypes.Edge,
					id: createdEdgeId2,
					targetId: "aig:0202020202020202020202020202020202020202020202020202020202020202",
					edgeRelationships: ["enemy"],
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note edge 20"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			]
		});

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result.id).toEqual(id);
		expect(result.type).toEqual(AuditableItemGraphTypes.Vertex);
		expect(result.dateCreated).toEqual(expect.any(String));
		expect(result.dateModified).toEqual(expect.any(String));
		expect(result.organizationIdentity).toEqual(TEST_ORGANIZATION_IDENTITY);
		expect(result.verified).toEqual(true);
		expect(result.aliases).toHaveLength(2);
		expect(result.aliases).toEqual([
			expect.objectContaining({
				id: "foo123",
				type: AuditableItemGraphTypes.Alias,
				dateCreated: expect.any(String),
				dateModified: expect.any(String),
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					type: "Create",
					actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
					object: { type: "Note", content: "This is a simple note alias 10" },
					published: "2015-01-25T12:34:56Z"
				}
			}),
			expect.objectContaining({
				id: "bar456",
				type: AuditableItemGraphTypes.Alias,
				dateCreated: expect.any(String),
				dateModified: expect.any(String),
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					type: "Create",
					actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
					object: { type: "Note", content: "This is a simple note alias 20" },
					published: "2015-01-25T12:34:56Z"
				}
			})
		]);
		expect(result.resources).toHaveLength(2);
		expect(result.resources).toEqual([
			expect.objectContaining({
				id: "resource1",
				type: AuditableItemGraphTypes.Resource,
				dateCreated: expect.any(String),
				dateModified: expect.any(String),
				resourceObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					type: "Create",
					actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
					object: { type: "Note", content: "This is a simple note resource 10" },
					published: "2015-01-25T12:34:56Z"
				}
			}),
			expect.objectContaining({
				id: "resource2",
				type: AuditableItemGraphTypes.Resource,
				dateCreated: expect.any(String),
				dateModified: expect.any(String),
				resourceObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					type: "Create",
					actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
					object: { type: "Note", content: "This is a simple note resource 20" },
					published: "2015-01-25T12:34:56Z"
				}
			})
		]);
		expect(result.annotationObject).toEqual({
			"@context": "https://www.w3.org/ns/activitystreams",
			type: "Create",
			actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
			object: { type: "Note", content: "This is a simple note 2" },
			published: "2015-01-25T12:34:56Z"
		});
		expect(result.edges).toHaveLength(2);
		expect(result.edges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdEdgeId1,
					targetId: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					type: AuditableItemGraphTypes.Edge,
					dateCreated: expect.any(String),
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note edge 10" },
						published: "2015-01-25T12:34:56Z"
					},
					edgeRelationships: ["friend"]
				}),
				expect.objectContaining({
					id: createdEdgeId2,
					targetId: "aig:0202020202020202020202020202020202020202020202020202020202020202",
					type: AuditableItemGraphTypes.Edge,
					dateCreated: expect.any(String),
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note edge 20" },
						published: "2015-01-25T12:34:56Z"
					},
					edgeRelationships: ["enemy"]
				})
			])
		);

		const changesetStore = await changesetStorage.getStore();
		const storedVertexId = (await vertexStorage.getStore())[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/annotationObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
							object: { type: "Note", content: "This is a simple note" },
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{
								id: "foo123",
								dateCreated: expect.any(String),
								annotationObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple alias 1" },
									published: "2015-01-25T12:34:56Z"
								}
							},
							{
								id: "bar456",
								dateCreated: expect.any(String),
								annotationObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple note alias 2" },
									published: "2015-01-25T12:34:56Z"
								}
							}
						]
					},
					{
						op: "add",
						path: "/resources",
						value: [
							{
								id: "resource1",
								dateCreated: expect.any(String),
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple note resource 1" },
									published: "2015-01-25T12:34:56Z"
								}
							},
							{
								id: "resource2",
								dateCreated: expect.any(String),
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple resource 2" },
									published: "2015-01-25T12:34:56Z"
								}
							}
						]
					},
					{
						op: "add",
						path: "/edges",
						value: [
							{
								id: expect.stringMatching(HEX_ID_PATTERN),
								targetId: "aig:0101010101010101010101010101010101010101010101010101010101010101",
								dateCreated: expect.any(String),
								annotationObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple edge 1" },
									published: "2015-01-25T12:34:56Z"
								},
								edgeRelationships: ["friend"]
							},
							{
								id: expect.stringMatching(HEX_ID_PATTERN),
								targetId: "aig:0202020202020202020202020202020202020202020202020202020202020202",
								dateCreated: expect.any(String),
								annotationObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple edge 2" },
									published: "2015-01-25T12:34:56Z"
								},
								edgeRelationships: ["enemy"]
							}
						]
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);
		expect(changesetStore[1]).toEqual(
			expect.objectContaining({
				vertexId: storedVertexId,
				id: expect.stringMatching(HEX_ID_PATTERN),
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "replace",
						path: "/annotationObject/object/content",
						value: "This is a simple note 2"
					},
					{ op: "add", path: "/aliases/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/aliases/0/annotationObject/object/content",
						value: "This is a simple note alias 10"
					},
					{ op: "add", path: "/aliases/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/aliases/1/annotationObject/object/content",
						value: "This is a simple note alias 20"
					},
					{ op: "add", path: "/resources/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/resources/0/resourceObject/object/content",
						value: "This is a simple note resource 10"
					},
					{ op: "add", path: "/resources/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/resources/1/resourceObject/object/content",
						value: "This is a simple note resource 20"
					},
					{ op: "add", path: "/edges/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/edges/0/annotationObject/object/content",
						value: "This is a simple note edge 10"
					},
					{ op: "add", path: "/edges/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/edges/1/annotationObject/object/content",
						value: "This is a simple note edge 20"
					}
				],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);

		const proofStore = await immutableProofStorage.getStore();
		expect(proofStore).toHaveLength(2);
		expect(proofStore[0]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
		expect(proofStore[1]).toEqual(
			expect.objectContaining({
				id: expect.stringMatching(HEX_ID_PATTERN),
				organizationId: TEST_ORGANIZATION_IDENTITY,
				dateCreated: expect.any(String),
				notarizationId: expect.any(String)
			})
		);
	});

	test("Can remove the notarization for a vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await waitForProofGeneration();

		expect((await immutableProofStorage.getStore()).filter(p => p.notarizationId).length).toEqual(
			1
		);

		await service.removeProof(id);

		const result = await service.get(id, {
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id,
			type: AuditableItemGraphTypes.Vertex,
			dateCreated: expect.any(String),
			aliases: [
				{ id: "foo123", type: AuditableItemGraphTypes.Alias, dateCreated: expect.any(String) },
				{ id: "bar456", type: AuditableItemGraphTypes.Alias, dateCreated: expect.any(String) }
			],
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			verified: false
		});

		expect((await immutableProofStorage.getStore()).filter(p => p.notarizationId).length).toEqual(
			0
		);
	});

	test("Can query for a vertex by id", async () => {
		const service = new AuditableItemGraphService();
		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});
		const createdId2 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		const resultsAndCursor = await service.query({ id: "0" });

		expect(resultsAndCursor.entries).toEqual(
			expect.objectContaining({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/aig/",
					"https://schema.twindev.org/common/"
				],
				type: ["ItemList", AuditableItemGraphTypes.VertexList]
			})
		);
		expect(resultsAndCursor.entries.itemListElement).toHaveLength(2);
		expect(resultsAndCursor.entries.itemListElement).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: AuditableItemGraphTypes.Vertex,
					id: createdId1,
					dateCreated: expect.any(String)
				}),
				expect.objectContaining({
					type: AuditableItemGraphTypes.Vertex,
					id: createdId2,
					dateCreated: expect.any(String)
				})
			])
		);
	});

	test("Can query for a vertex by alias with partial match", async () => {
		const service = new AuditableItemGraphService();
		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar123" }
			]
		});
		const createdId2 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo456" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		const resultsAndCursor = await service.query({ id: "foo" });
		expect(resultsAndCursor.entries).toEqual(
			expect.objectContaining({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/aig/",
					"https://schema.twindev.org/common/"
				],
				type: ["ItemList", AuditableItemGraphTypes.VertexList]
			})
		);
		expect(resultsAndCursor.entries.itemListElement).toHaveLength(2);
		expect(resultsAndCursor.entries.itemListElement).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: AuditableItemGraphTypes.Vertex,
					id: createdId2,
					dateCreated: expect.any(String),
					aliases: expect.arrayContaining([
						expect.objectContaining({
							id: "foo456",
							type: AuditableItemGraphTypes.Alias,
							dateCreated: expect.any(String)
						}),
						expect.objectContaining({
							id: "bar456",
							type: AuditableItemGraphTypes.Alias,
							dateCreated: expect.any(String)
						})
					])
				}),
				expect.objectContaining({
					type: AuditableItemGraphTypes.Vertex,
					id: createdId1,
					dateCreated: expect.any(String),
					aliases: expect.arrayContaining([
						expect.objectContaining({
							id: "foo123",
							type: AuditableItemGraphTypes.Alias,
							dateCreated: expect.any(String)
						}),
						expect.objectContaining({
							id: "bar123",
							type: AuditableItemGraphTypes.Alias,
							dateCreated: expect.any(String)
						})
					])
				})
			])
		);
	});

	test("Can query for a vertex by id or alias", async () => {
		const service = new AuditableItemGraphService();
		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo1" }]
		});
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		const resultsAndCursor = await service.query({ id: "foo1" });
		expect(resultsAndCursor.entries).toEqual(
			expect.objectContaining({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/aig/",
					"https://schema.twindev.org/common/"
				],
				type: ["ItemList", AuditableItemGraphTypes.VertexList],
				itemListElement: [
					expect.objectContaining({
						id: createdId1,
						type: AuditableItemGraphTypes.Vertex,
						dateCreated: expect.any(String),
						aliases: [
							expect.objectContaining({
								id: "foo1",
								type: AuditableItemGraphTypes.Alias,
								dateCreated: expect.any(String)
							})
						]
					})
				]
			})
		);
	});

	test("Can query for a vertex by mode id", async () => {
		const service = new AuditableItemGraphService();
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo5" }]
		});
		const createdId2 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		const resultsAndCursor = await service.query({ id: extractAigId(createdId2), idMode: "id" });
		expect(resultsAndCursor.entries).toEqual(
			expect.objectContaining({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/aig/",
					"https://schema.twindev.org/common/"
				],
				type: ["ItemList", AuditableItemGraphTypes.VertexList],
				itemListElement: [
					expect.objectContaining({
						id: createdId2,
						type: AuditableItemGraphTypes.Vertex,
						dateCreated: expect.any(String)
					})
				]
			})
		);
	});

	test("Can query for a vertex by using mode alias", async () => {
		const service = new AuditableItemGraphService();
		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo4" }]
		});
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		await waitForProofGeneration();

		const resultsAndCursor = await service.query({ id: "4", idMode: "alias" });
		expect(resultsAndCursor.entries).toEqual(
			expect.objectContaining({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/aig/",
					"https://schema.twindev.org/common/"
				],
				type: ["ItemList", AuditableItemGraphTypes.VertexList],
				itemListElement: [
					expect.objectContaining({
						id: createdId1,
						type: AuditableItemGraphTypes.Vertex,
						dateCreated: expect.any(String),
						aliases: [
							expect.objectContaining({
								id: "foo4",
								type: AuditableItemGraphTypes.Alias,
								dateCreated: expect.any(String)
							})
						]
					})
				]
			})
		);
	});

	test("Can query for a vertex using resource types", async () => {
		const service = new AuditableItemGraphService();
		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			]
		});
		const createdId2 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			resources: [
				{
					type: AuditableItemGraphTypes.Resource,
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Delete",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			]
		});

		await waitForProofGeneration();

		const resultsAndCursor = await service.query({ resourceTypes: ["Create", "Delete"] });
		expect(resultsAndCursor.entries).toEqual(
			expect.objectContaining({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/aig/",
					"https://schema.twindev.org/common/"
				],
				type: ["ItemList", AuditableItemGraphTypes.VertexList]
			})
		);
		expect(resultsAndCursor.entries.itemListElement).toHaveLength(2);
		expect(resultsAndCursor.entries.itemListElement).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdId1,
					type: AuditableItemGraphTypes.Vertex,
					dateCreated: expect.any(String)
				}),
				expect.objectContaining({
					id: createdId2,
					type: AuditableItemGraphTypes.Vertex,
					dateCreated: expect.any(String)
				})
			])
		);
	});

	test("Can query for a vertex using it's annotation object id", async () => {
		const service = new AuditableItemGraphService();
		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "http://example.org/notes/1",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "John Smith"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			}
		});

		const resultsAndCursor = await service.query(undefined, {
			property: "annotationObject.id",
			value: "http://example.org/notes/1",
			comparison: ComparisonOperator.Equals
		});
		expect(resultsAndCursor.entries).toEqual(
			expect.objectContaining({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/aig/",
					"https://schema.twindev.org/common/"
				],
				type: ["ItemList", AuditableItemGraphTypes.VertexList],
				itemListElement: [
					expect.objectContaining({
						dateCreated: expect.any(String),
						id: createdId1,
						type: AuditableItemGraphTypes.Vertex,
						annotationObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							id: "http://example.org/notes/1",
							type: "Create",
							actor: {
								type: "Person",
								id: "acct:person@example.org",
								name: "John Smith"
							},
							object: {
								type: "Note",
								content: "This is a simple note"
							},
							published: "2015-01-25T12:34:56Z"
						}
					})
				]
			})
		);
	});

	test("Can query using a condition group with AND to match on two properties", async () => {
		const service = new AuditableItemGraphService();
		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "http://example.org/notes/10",
				type: "Create",
				actor: { type: "Person", id: "acct:alice@example.org", name: "Alice" },
				object: { type: "Note", content: "Alpha content" },
				published: "2015-01-25T12:34:56Z"
			}
		});
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "http://example.org/notes/20",
				type: "Delete",
				actor: { type: "Person", id: "acct:bob@example.org", name: "Bob" },
				object: { type: "Note", content: "Beta content" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const resultsAndCursor = await service.query(undefined, {
			logicalOperator: LogicalOperator.And,
			conditions: [
				{
					property: "annotationObject.id",
					value: "http://example.org/notes/10",
					comparison: ComparisonOperator.Equals
				},
				{
					property: "annotationObject.type",
					value: "Create",
					comparison: ComparisonOperator.Equals
				}
			]
		});

		expect(resultsAndCursor.entries.itemListElement).toHaveLength(1);
		expect(resultsAndCursor.entries.itemListElement[0]).toEqual(
			expect.objectContaining({ id: createdId1 })
		);
	});

	test("Can query using a condition group with OR to match either of two annotation object ids", async () => {
		const service = new AuditableItemGraphService();
		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "http://example.org/notes/100",
				type: "Create",
				actor: { type: "Person", id: "acct:alice@example.org", name: "Alice" },
				object: { type: "Note", content: "Note one" },
				published: "2015-01-25T12:34:56Z"
			}
		});
		const createdId2 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "http://example.org/notes/200",
				type: "Create",
				actor: { type: "Person", id: "acct:bob@example.org", name: "Bob" },
				object: { type: "Note", content: "Note two" },
				published: "2015-01-25T12:34:56Z"
			}
		});
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "http://example.org/notes/300",
				type: "Create",
				actor: { type: "Person", id: "acct:carol@example.org", name: "Carol" },
				object: { type: "Note", content: "Note three" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const resultsAndCursor = await service.query(undefined, {
			logicalOperator: LogicalOperator.Or,
			conditions: [
				{
					property: "annotationObject.id",
					value: "http://example.org/notes/100",
					comparison: ComparisonOperator.Equals
				},
				{
					property: "annotationObject.id",
					value: "http://example.org/notes/200",
					comparison: ComparisonOperator.Equals
				}
			]
		});

		expect(resultsAndCursor.entries.itemListElement).toHaveLength(2);
		expect(resultsAndCursor.entries.itemListElement).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: createdId1 }),
				expect.objectContaining({ id: createdId2 })
			])
		);
	});

	test("Can query combining options filter and conditions", async () => {
		const service = new AuditableItemGraphService();
		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "combo-alias" }],
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "http://example.org/notes/combo-1",
				type: "Create",
				actor: { type: "Person", id: "acct:alice@example.org", name: "Alice" },
				object: { type: "Note", content: "Combo match" },
				published: "2015-01-25T12:34:56Z"
			}
		});
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "combo-alias" }],
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "http://example.org/notes/combo-2",
				type: "Delete",
				actor: { type: "Person", id: "acct:bob@example.org", name: "Bob" },
				object: { type: "Note", content: "Combo no-match" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const resultsAndCursor = await service.query(
			{ id: "combo-alias", idMode: "alias" },
			{
				property: "annotationObject.id",
				value: "http://example.org/notes/combo-1",
				comparison: ComparisonOperator.Equals
			}
		);

		expect(resultsAndCursor.entries.itemListElement).toHaveLength(1);
		expect(resultsAndCursor.entries.itemListElement[0]).toEqual(
			expect.objectContaining({ id: createdId1 })
		);
	});

	test("Querying by empty string returns no results, not all elements (issue #99)", async () => {
		const service = new AuditableItemGraphService();
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "1111",
				type: "Create",
				actor: { type: "Person", id: "acct:alice@example.org", name: "Alice" },
				object: { type: "Note", content: "Some note" },
				published: "2015-01-25T12:34:56Z"
			}
		});
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "2222",
				type: "Create",
				actor: { type: "Person", id: "acct:bob@example.org", name: "Bob" },
				object: { type: "Note", content: "Another note" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const emptyStringResult = await service.query(undefined, {
			property: "annotationObject.id",
			value: "",
			comparison: ComparisonOperator.Equals
		});

		expect(emptyStringResult.entries.itemListElement ?? []).toHaveLength(0);
	});

	test("Querying by whitespace-only string returns no results, not all elements (issue #99)", async () => {
		const service = new AuditableItemGraphService();
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "1111",
				type: "Create",
				actor: { type: "Person", id: "acct:alice@example.org", name: "Alice" },
				object: { type: "Note", content: "Some note" },
				published: "2015-01-25T12:34:56Z"
			}
		});
		await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: "2222",
				type: "Create",
				actor: { type: "Person", id: "acct:bob@example.org", name: "Bob" },
				object: { type: "Note", content: "Another note" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const whitespaceResult = await service.query(undefined, {
			property: "annotationObject.id",
			value: "   ",
			comparison: ComparisonOperator.Equals
		});

		expect(whitespaceResult.entries.itemListElement ?? []).toHaveLength(0);
	});

	test("Cursor pagination is stable when all vertices share the same dateCreated", async () => {
		const service = new AuditableItemGraphService();

		Date.now = vi.fn().mockImplementation(() => FIRST_TICK);

		const createdId1 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});
		const createdId2 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});
		const createdId3 = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		const allIds = new Set([createdId1, createdId2, createdId3]);

		const page1 = await service.query(
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			1
		);
		expect(page1.entries.itemListElement).toHaveLength(1);
		expect(page1.cursor).toBeDefined();

		const page2 = await service.query(
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			page1.cursor,
			1
		);
		expect(page2.entries.itemListElement).toHaveLength(1);
		expect(page2.cursor).toBeDefined();

		const page3 = await service.query(
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			page2.cursor,
			1
		);
		expect(page3.entries.itemListElement).toHaveLength(1);

		const collectedIds = [
			page1.entries.itemListElement[0].id,
			page2.entries.itemListElement[0].id,
			page3.entries.itemListElement[0].id
		];

		expect(new Set(collectedIds).size).toEqual(3);
		for (const id of collectedIds) {
			expect(allIds.has(id)).toEqual(true);
		}
	});

	test("Can fail to create a vertex with an alias that already exists and the unique flag set", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});
		expect(id.startsWith("aig:")).toEqual(true);

		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				aliases: [
					{ type: AuditableItemGraphTypes.Alias, id: "foo123", unique: true },
					{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
				]
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "auditableItemGraphService.aliasNotUnique"
			}
		});
	});

	test("Validation fails when passing edges as a single object instead of array", async () => {
		const service = new AuditableItemGraphService();
		const edges = {
			type: AuditableItemGraphTypes.Edge,
			targetId: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			edgeRelationships: ["friend"]
		} as unknown as IAuditableItemGraphEdge[];
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				edges
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "common.validation",
				properties: {
					validationFailures: expect.arrayContaining([
						expect.objectContaining({
							property: "vertex.edges",
							properties: expect.objectContaining({
								keyword: "type",
								message: "must be array"
							})
						})
					])
				}
			}
		});
	});

	test("Validation fails when passing aliases as a single object instead of array", async () => {
		const service = new AuditableItemGraphService();
		const aliases = {
			type: AuditableItemGraphTypes.Alias,
			id: "foo123"
		} as unknown as IAuditableItemGraphAlias[];
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				aliases
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "common.validation",
				properties: {
					validationFailures: expect.arrayContaining([
						expect.objectContaining({
							property: "vertex.aliases",
							properties: expect.objectContaining({
								keyword: "type",
								message: "must be array"
							})
						})
					])
				}
			}
		});
	});

	test("Validation fails when passing resources as a single object instead of array", async () => {
		const service = new AuditableItemGraphService();
		const resources = {
			type: AuditableItemGraphTypes.Resource,
			id: "resource1",
			resourceObject: { type: "Note" }
		} as unknown as IAuditableItemGraphResource[];
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				resources
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "common.validation",
				properties: {
					validationFailures: expect.arrayContaining([
						expect.objectContaining({
							property: "vertex.resources",
							properties: expect.objectContaining({
								keyword: "type",
								message: "must be array"
							})
						})
					])
				}
			}
		});
	});

	test("Validation fails when @context is a string instead of array", async () => {
		const service = new AuditableItemGraphService();
		const invalidVertex = {
			"@context": "https://schema.twindev.org/aig/",
			type: AuditableItemGraphTypes.Vertex
		} as unknown as Omit<IAuditableItemGraphVertex, "id">;
		await expect(service.create(invalidVertex)).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "common.validation",
				properties: {
					validationFailures: expect.arrayContaining([
						expect.objectContaining({
							property: "vertex.@context",
							properties: expect.objectContaining({
								keyword: "type",
								message: "must be array"
							})
						})
					])
				}
			}
		});
	});

	test("Validation fails when @context is missing", async () => {
		const service = new AuditableItemGraphService();
		const missingContextVertex = {
			type: AuditableItemGraphTypes.Vertex
		} as unknown as Omit<IAuditableItemGraphVertex, "id">;
		await expect(service.create(missingContextVertex)).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "common.validation",
				properties: {
					validationFailures: expect.arrayContaining([
						expect.objectContaining({
							property: "vertex",
							properties: expect.objectContaining({
								keyword: "required"
							})
						})
					])
				}
			}
		});
	});

	test("Validation fails when type is missing", async () => {
		const service = new AuditableItemGraphService();
		const missingTypeVertex = {
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon]
		} as unknown as Omit<IAuditableItemGraphVertex, "id">;
		await expect(service.create(missingTypeVertex)).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "common.validation",
				properties: {
					validationFailures: expect.arrayContaining([
						expect.objectContaining({
							property: "vertex",
							properties: expect.objectContaining({
								keyword: "required"
							})
						})
					])
				}
			}
		});
	});

	test("Validation fails when alias is missing required type property", async () => {
		const service = new AuditableItemGraphService();
		const invalidAlias = {
			id: "foo123"
		} as unknown as IAuditableItemGraphAlias;
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				aliases: [invalidAlias]
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "common.validation",
				properties: {
					validationFailures: expect.arrayContaining([
						expect.objectContaining({
							property: expect.stringContaining("alias"),
							properties: expect.objectContaining({
								keyword: "required",
								params: expect.objectContaining({
									missingProperty: "type"
								})
							})
						})
					])
				}
			}
		});
	});

	test("Validation fails when resource is missing required type property", async () => {
		const service = new AuditableItemGraphService();
		const invalidResource = {
			id: "resource1",
			resourceObject: { type: "Note" }
		} as unknown as IAuditableItemGraphResource;
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				resources: [invalidResource]
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "common.validation",
				properties: {
					validationFailures: expect.arrayContaining([
						expect.objectContaining({
							property: expect.stringContaining("resource"),
							properties: expect.objectContaining({
								keyword: "required",
								params: expect.objectContaining({
									missingProperty: "type"
								})
							})
						})
					])
				}
			}
		});
	});

	test("Can get a vertex at version 0", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		const result = await service.getVersion(id, 0);

		expect(result).toEqual(
			expect.objectContaining({
				"@context": expect.arrayContaining(["https://schema.twindev.org/aig/"]),
				type: AuditableItemGraphTypes.Vertex,
				id,
				dateCreated: expect.any(String),
				organizationIdentity: TEST_ORGANIZATION_IDENTITY,
				aliases: expect.arrayContaining([
					expect.objectContaining({
						type: AuditableItemGraphTypes.Alias,
						id: "foo123",
						dateCreated: expect.any(String)
					})
				]),
				version: 0
			})
		);
	});

	test("Can get vertex at version 0 and version 1 after update", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "bar456" }]
		});

		const changesets = await changesetStorage.getStore();
		expect(changesets).toHaveLength(2);

		const v1 = await service.getVersion(id, 0);
		expect(v1.version).toEqual(0);
		expect(v1.aliases).toEqual(expect.arrayContaining([expect.objectContaining({ id: "foo123" })]));
		expect(v1.aliases?.find(a => a.id === "bar456")).toBeUndefined();

		const v2 = await service.getVersion(id, 1);
		expect(v2.version).toEqual(1);
		expect(v2.aliases).toEqual(expect.arrayContaining([expect.objectContaining({ id: "bar456" })]));
	});

	test("Throws not found when getting a version from an unknown vertex", async () => {
		const service = new AuditableItemGraphService();
		await expect(
			service.getVersion("aig:00000000000000000000000000000000", 1000)
		).rejects.toMatchObject({
			message: "auditableItemGraphService.getVersionFailed"
		});
	});

	test("Throws not found when getting an unknown version id", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex
		});

		await expect(service.getVersion(id, 1000)).rejects.toMatchObject({
			message: "auditableItemGraphService.getVersionFailed"
		});
	});

	test("Can get all versions of a vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "bar456" }]
		});

		const result = await service.getVersions(id);

		expect(result).toEqual(
			expect.objectContaining({
				"@context": expect.arrayContaining(["https://schema.org"]),
				type: expect.arrayContaining([AuditableItemGraphTypes.VertexVersionList])
			})
		);
		expect(result.itemListElement).toHaveLength(2);
		expect(result.itemListElement[0]).toEqual({ version: 0, dateCreated: expect.any(String) });
		expect(result.itemListElement[1]).toEqual({ version: 1, dateCreated: expect.any(String) });
	});

	test("Can get versions after a timestamp", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		// Using a date well before all changesets - all versions should be included.
		const allIncluded = await service.getVersions(id, { after: "2024-01-01T00:00:00.000Z" });
		expect(allIncluded.itemListElement).toHaveLength(1);

		// Using a date well after all changesets - no versions should be included.
		const noneIncluded = await service.getVersions(id, { after: "2025-01-01T00:00:00.000Z" });
		expect(noneIncluded.itemListElement).toHaveLength(0);
	});

	test("Can get versions before a timestamp", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		// Using a date well after all changesets - all versions should be included.
		const allIncluded = await service.getVersions(id, { before: "2025-01-01T00:00:00.000Z" });
		expect(allIncluded.itemListElement).toHaveLength(1);

		// Using a date well before all changesets - no versions should be included.
		const noneIncluded = await service.getVersions(id, { before: "2024-01-01T00:00:00.000Z" });
		expect(noneIncluded.itemListElement).toHaveLength(0);
	});

	test("Can get versions between two timestamps", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		// Range that spans the changeset timestamp - version is included.
		const included = await service.getVersions(id, {
			after: "2024-01-01T00:00:00.000Z",
			before: "2025-01-01T00:00:00.000Z"
		});
		expect(included.itemListElement).toHaveLength(1);

		// Range entirely before all changesets - no versions included.
		const excluded = await service.getVersions(id, {
			after: "2023-01-01T00:00:00.000Z",
			before: "2024-01-01T00:00:00.000Z"
		});
		expect(excluded.itemListElement).toHaveLength(0);
	});

	test("Can create a vertex in bypass mode with no changeset or version", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		expect(await changesetStorage.getStore()).toHaveLength(0);

		const vertexStore = await vertexStorage.getStore();
		expect(vertexStore).toHaveLength(1);
		expect(vertexStore[0].auditMode).toEqual(AuditableItemGraphAuditMode.Bypass);
		expect(vertexStore[0].version).toBeUndefined();

		const result = await service.get(id);
		expect(result.auditMode).toEqual(AuditableItemGraphAuditMode.Bypass);
		expect(result.version).toBeUndefined();
		expect(result.verified).toBeUndefined();
	});

	test("Can update a bypass vertex in place with no changeset or version", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		const createdVertex = (await vertexStorage.getStore())[0];
		expect(createdVertex.dateModified).toBeUndefined();

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "bar456" }]
		});

		expect(await changesetStorage.getStore()).toHaveLength(0);

		const vertexStore = await vertexStorage.getStore();
		expect(vertexStore).toHaveLength(1);
		expect(vertexStore[0].auditMode).toEqual(AuditableItemGraphAuditMode.Bypass);
		expect(vertexStore[0].version).toBeUndefined();
		expect(vertexStore[0].dateCreated).toEqual(createdVertex.dateCreated);
		expect(vertexStore[0].dateModified).toEqual(new Date(SECOND_TICK).toISOString());

		const result = await service.get(id);
		expect(result.aliases).toEqual([
			expect.objectContaining({ id: "bar456", type: AuditableItemGraphTypes.Alias })
		]);
	});

	test("Can update a bypass vertex without repeating the audit mode", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		await service.updatePartial({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			aliasPatches: { add: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }] }
		});

		expect(await changesetStorage.getStore()).toHaveLength(0);

		const result = await service.get(id);
		expect(result.auditMode).toEqual(AuditableItemGraphAuditMode.Bypass);
		expect(result.version).toBeUndefined();
	});

	test("Can switch a vertex from audited to bypass which compacts the history", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		await waitForProofGeneration();

		expect(await changesetStorage.getStore()).toHaveLength(1);
		expect(await immutableProofStorage.getStore()).toHaveLength(1);
		expect(notarizationStore.size).toEqual(1);

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		expect(await changesetStorage.getStore()).toHaveLength(0);
		expect(await immutableProofStorage.getStore()).toHaveLength(0);
		expect(notarizationStore.size).toEqual(0);

		const vertexStore = await vertexStorage.getStore();
		expect(vertexStore[0].auditMode).toEqual(AuditableItemGraphAuditMode.Bypass);
		expect(vertexStore[0].version).toBeUndefined();

		const changesets = await service.getChangesets(id);
		expect(changesets.changesets.itemListElement).toHaveLength(0);
	});

	test("Can switch a vertex from audited to bypass with updatePartial", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		await waitForProofGeneration();

		await service.updatePartial({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		expect(await changesetStorage.getStore()).toHaveLength(0);
		expect(await immutableProofStorage.getStore()).toHaveLength(0);
		expect(notarizationStore.size).toEqual(0);

		const result = await service.get(id);
		expect(result.auditMode).toEqual(AuditableItemGraphAuditMode.Bypass);
		expect(result.aliases).toEqual([
			expect.objectContaining({ id: "foo123", type: AuditableItemGraphTypes.Alias })
		]);
	});

	test("Can switch a vertex with multiple changesets from audited to bypass", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }]
		});

		await service.update({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			aliases: [
				{ type: AuditableItemGraphTypes.Alias, id: "foo123" },
				{ type: AuditableItemGraphTypes.Alias, id: "bar456" }
			]
		});

		await waitForProofGeneration(2);

		expect(await changesetStorage.getStore()).toHaveLength(2);
		expect(await immutableProofStorage.getStore()).toHaveLength(2);
		expect(notarizationStore.size).toEqual(2);

		await service.updatePartial({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		expect(await changesetStorage.getStore()).toHaveLength(0);
		expect(await immutableProofStorage.getStore()).toHaveLength(0);
		expect(notarizationStore.size).toEqual(0);

		const vertexStore = await vertexStorage.getStore();
		expect(vertexStore[0].auditMode).toEqual(AuditableItemGraphAuditMode.Bypass);
		expect(vertexStore[0].version).toBeUndefined();

		const changesets = await service.getChangesets(id);
		expect(changesets.changesets.itemListElement).toHaveLength(0);
	});

	test("Throws when switching a bypass vertex back to audited with update", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		await expect(
			service.update({
				id,
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				auditMode: AuditableItemGraphAuditMode.Audited
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.updatingFailed",
			cause: {
				message: "auditableItemGraphService.auditModeTransitionNotAllowed",
				properties: {
					currentMode: AuditableItemGraphAuditMode.Bypass,
					requestedMode: AuditableItemGraphAuditMode.Audited
				}
			}
		});
	});

	test("Throws when switching a bypass vertex back to audited with updatePartial", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		await expect(
			service.updatePartial({
				id,
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				auditMode: AuditableItemGraphAuditMode.Audited
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.updatingFailed",
			cause: {
				message: "auditableItemGraphService.auditModeTransitionNotAllowed"
			}
		});
	});

	test("Does not verify a bypass vertex when verification is requested", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		const result = await service.get(id, { verifySignatureDepth: VerifyDepth.All });

		expect(result.verified).toBeUndefined();
		expect(result["@context"]).not.toContain("https://schema.twindev.org/immutable-proof/");
	});

	test("Returns an empty changeset list for a bypass vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		const result = await service.getChangesets(id, undefined, undefined, {
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result.changesets.itemListElement).toHaveLength(0);
		expect(result.cursor).toBeUndefined();
	});

	test("Throws not found when getting a changeset for a bypass vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		await expect(
			service.getChangeset(`${id}:changeset:00000000000000000000000000000000`)
		).rejects.toMatchObject({
			message: "auditableItemGraphService.getFailed",
			cause: {
				message: "auditableItemGraphService.changesetNotFound"
			}
		});
	});

	test("Throws not found when getting a version of a bypass vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		await expect(service.getVersion(id, 0)).rejects.toMatchObject({
			message: "auditableItemGraphService.getVersionFailed",
			cause: {
				message: "auditableItemGraphService.versionNotFound"
			}
		});
	});

	test("Returns the current state as a single version entry for a bypass vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		const createdVertex = (await vertexStorage.getStore())[0];

		const all = await service.getVersions(id);
		expect(all.itemListElement).toEqual([{ version: 0, dateCreated: createdVertex.dateCreated }]);

		const included = await service.getVersions(id, {
			after: "2024-01-01T00:00:00.000Z",
			before: "2025-01-01T00:00:00.000Z"
		});
		expect(included.itemListElement).toHaveLength(1);

		const excludedAfter = await service.getVersions(id, { after: "2025-01-01T00:00:00.000Z" });
		expect(excludedAfter.itemListElement).toHaveLength(0);

		const excludedBefore = await service.getVersions(id, { before: "2024-01-01T00:00:00.000Z" });
		expect(excludedBefore.itemListElement).toHaveLength(0);
	});

	test("Returns the modified date as the version entry for an updated bypass vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			type: AuditableItemGraphTypes.Vertex,
			auditMode: AuditableItemGraphAuditMode.Bypass
		});

		await service.updatePartial({
			id,
			"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
			aliasPatches: { add: [{ type: AuditableItemGraphTypes.Alias, id: "foo123" }] }
		});

		const result = await service.getVersions(id);
		expect(result.itemListElement).toEqual([
			{ version: 0, dateCreated: new Date(SECOND_TICK).toISOString() }
		]);
	});

	test("Throws when an unknown audit mode is supplied", async () => {
		const service = new AuditableItemGraphService();

		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				auditMode: "sometimes" as AuditableItemGraphAuditMode
			})
		).rejects.toMatchObject({
			message: "guard.arrayOneOf"
		});
	});

	test("Validation fails when edge is missing required type property", async () => {
		const service = new AuditableItemGraphService();
		const invalidEdge = {
			targetId: "aig:0101010101010101010101010101010101010101010101010101010101010101"
		} as unknown as IAuditableItemGraphEdge;
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				edges: [invalidEdge]
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "common.validation",
				properties: {
					validationFailures: expect.arrayContaining([
						expect.objectContaining({
							property: expect.stringContaining("edge"),
							properties: expect.objectContaining({
								keyword: "required",
								params: expect.objectContaining({
									missingProperty: "type"
								})
							})
						})
					])
				}
			}
		});
	});

	/**
	 * PATCH merge vs PUT full-replace semantics for edges (issue #69 implementation).
	 */
	describe("updatePartial", () => {
		test("merges new edges without removing existing active edges", async () => {
			const service = new AuditableItemGraphService();

			const targetA = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});
			const targetB = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});

			const id = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				edges: [
					{
						type: AuditableItemGraphTypes.Edge,
						targetId: targetA,
						edgeRelationships: ["document"]
					}
				]
			});

			await service.updatePartial({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				id,
				edgePatches: {
					add: [
						{
							type: AuditableItemGraphTypes.Edge,
							targetId: targetB,
							edgeRelationships: ["document"]
						}
					]
				}
			});

			const vertex = await service.get(id);
			const activeTargetIds = new Set(vertex.edges?.map(e => e.targetId));

			expect(vertex.edges).toHaveLength(2);
			expect(activeTargetIds.has(targetA)).toBe(true);
			expect(activeTargetIds.has(targetB)).toBe(true);
		});

		test("does not delete edges omitted from the partial payload", async () => {
			const service = new AuditableItemGraphService();

			const targetA = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});
			const targetB = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});
			const targetC = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});

			const id = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				edges: [
					{
						type: AuditableItemGraphTypes.Edge,
						targetId: targetA,
						edgeRelationships: ["document"]
					},
					{
						type: AuditableItemGraphTypes.Edge,
						targetId: targetB,
						edgeRelationships: ["document"]
					}
				]
			});

			await service.updatePartial({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				id,
				edgePatches: {
					add: [
						{
							type: AuditableItemGraphTypes.Edge,
							targetId: targetC,
							edgeRelationships: ["document"]
						}
					]
				}
			});

			const vertex = await service.get(id);
			const activeTargetIds = new Set(vertex.edges?.map(e => e.targetId));

			expect(vertex.edges).toHaveLength(3);
			expect(activeTargetIds.has(targetA)).toBe(true);
			expect(activeTargetIds.has(targetB)).toBe(true);
			expect(activeTargetIds.has(targetC)).toBe(true);
		});

		test("leaves edges unchanged when only other properties are provided", async () => {
			const service = new AuditableItemGraphService();

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
						edgeRelationships: ["document"]
					}
				]
			});

			await service.updatePartial({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				id,
				annotationObject: {
					"@context": "https://schema.org",
					"@type": "Note",
					content: "Updated via PATCH"
				}
			});

			const vertex = await service.get(id);

			expect(vertex.edges).toHaveLength(1);
			expect(vertex.edges?.[0].targetId).toBe(targetId);
			expect(vertex.annotationObject).toEqual({
				"@context": "https://schema.org",
				"@type": "Note",
				content: "Updated via PATCH"
			});
		});

		test("update PUT replaces the active edge list when edges are provided", async () => {
			const service = new AuditableItemGraphService();

			const targetA = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});
			const targetB = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});
			const targetC = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});

			const id = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				edges: [
					{
						type: AuditableItemGraphTypes.Edge,
						targetId: targetA,
						edgeRelationships: ["document"]
					},
					{
						type: AuditableItemGraphTypes.Edge,
						targetId: targetB,
						edgeRelationships: ["document"]
					}
				]
			});

			await service.update({
				id,
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				edges: [
					{
						type: AuditableItemGraphTypes.Edge,
						targetId: targetC,
						edgeRelationships: ["related"]
					}
				]
			});

			const vertex = await service.get(id);

			expect(vertex.edges).toHaveLength(1);
			expect(vertex.edges?.[0].targetId).toBe(targetC);
		});

		test("update PUT without edges clears the active edge list", async () => {
			const service = new AuditableItemGraphService();

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
						edgeRelationships: ["document"]
					}
				]
			});

			await service.update({
				id,
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				annotationObject: {
					"@context": "https://schema.org",
					"@type": "Note",
					content: "Updated via PUT"
				}
			});

			const vertex = await service.get(id);

			expect(vertex.edges ?? []).toHaveLength(0);
		});

		test("rejects bare array for edges patch", async () => {
			const service = new AuditableItemGraphService();

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
						edgeRelationships: ["document"]
					}
				]
			});

			await expect(
				service.updatePartial({
					"@context": [
						AuditableItemGraphContexts.Context,
						AuditableItemGraphContexts.ContextCommon
					],
					id,
					edgePatches: [
						{
							type: AuditableItemGraphTypes.Edge,
							targetId,
							edgeRelationships: ["related"]
						}
					] as unknown as { add?: IAuditableItemGraphEdge[]; remove?: string[] }
				})
			).rejects.toMatchObject({
				message: "auditableItemGraphService.updatingFailed",
				cause: {
					message: "auditableItemGraphService.listPatchInvalidFormat",
					properties: {
						property: "partial.edgePatches"
					}
				}
			});
		});

		test("remove deletes edges by id; unknown ids are no-op", async () => {
			const service = new AuditableItemGraphService();

			const targetA = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});
			const targetB = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});

			const id = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				edges: [
					{
						type: AuditableItemGraphTypes.Edge,
						targetId: targetA,
						edgeRelationships: ["document"]
					},
					{
						type: AuditableItemGraphTypes.Edge,
						targetId: targetB,
						edgeRelationships: ["document"]
					}
				]
			});

			const before = await service.get(id);
			const edgeToRemoveId = before.edges?.find(e => e.targetId === targetA)?.id;
			expect(edgeToRemoveId).toBeDefined();
			if (!Is.stringValue(edgeToRemoveId)) {
				throw new Error("Expected edge id for targetA");
			}

			await service.updatePartial({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				id,
				edgePatches: {
					remove: [edgeToRemoveId, "unknown-edge-id"]
				}
			});

			const vertex = await service.get(id);
			const activeTargetIds = new Set(vertex.edges?.map(e => e.targetId));

			expect(vertex.edges).toHaveLength(1);
			expect(activeTargetIds.has(targetA)).toBe(false);
			expect(activeTargetIds.has(targetB)).toBe(true);
		});
	});

	/**
	 * Regression for issue #69 (parallel id-less edge attach on one vertex).
	 * Uses a single service instance; `Mutex` on the vertex id serializes locally only.
	 * Multi-replica deployments are not coordinated.
	 */
	describe("concurrent edge attach", () => {
		beforeEach(() => {
			// Same reasoning as concurrent resource attach: clear the Mutex registry so
			// the vertex key is fresh and the TOCTOU window in getOrFetchLock is exercised.
			SharedStore.set("mutexLocks", {});
		});

		test("parallel updatePartial attach with id-less edges retains all active edges", async () => {
			const service = new AuditableItemGraphService();

			const parentId = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});

			const targetIds = await Promise.all(
				Array.from({ length: PARALLEL_EDGE_ATTACH_COUNT }, async () =>
					service.create({
						"@context": [
							AuditableItemGraphContexts.Context,
							AuditableItemGraphContexts.ContextCommon
						],
						type: AuditableItemGraphTypes.Vertex
					})
				)
			);

			await Promise.all(
				targetIds.map(async targetId =>
					attachReverseEdgeViaUpdatePartial(service, parentId, targetId)
				)
			);

			const parent = await service.get(parentId);
			const activeEdges = parent.edges ?? [];

			expect(activeEdges).toHaveLength(PARALLEL_EDGE_ATTACH_COUNT);

			const activeTargetIds = new Set(activeEdges.map(e => e.targetId));
			for (const targetId of targetIds) {
				expect(activeTargetIds.has(targetId)).toBe(true);
			}
		});
	});

	/**
	 * Regression for issue #76 (parallel updatePartial resourcePatches.add on one vertex).
	 * Mirrors the supply-chain scenario: N concurrent consignmentAddEvent calls each create
	 * an AIS stream and then PATCH that stream as a resource onto the same consignment vertex.
	 * The per-vertex Mutex must serialise each read-modify-write so no resource is lost.
	 */
	describe("concurrent resource attach", () => {
		beforeEach(() => {
			// RandomHelper is deterministic across tests so vertex IDs repeat, which means the
			// Mutex registry already holds a key for the vertex from a previous test run.
			// Clear the registry so every test in this suite starts with a brand-new key,
			// ensuring the getOrFetchLock TOCTOU window actually opens and proves the fix.
			SharedStore.set("mutexLocks", {});
		});

		test("parallel updatePartial resourcePatches.add retains all added resources", async () => {
			const service = new AuditableItemGraphService();

			const vertexId = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});

			// Each resource simulates a distinct AIS stream URN attached by a parallel consignmentAddEvent.
			const resourceIds = Array.from(
				{ length: PARALLEL_EDGE_ATTACH_COUNT },
				(unused, i) => `ais:stream-${i + 1}`
			);

			await Promise.all(
				resourceIds.map(async streamId => {
					const resource: IAuditableItemGraphResource = {
						"@context": [
							AuditableItemGraphContexts.Context,
							AuditableItemGraphContexts.ContextCommon
						],
						type: AuditableItemGraphTypes.Resource,
						id: streamId,
						resourceObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Link",
							href: streamId
						}
					};

					await service.updatePartial({
						"@context": [
							AuditableItemGraphContexts.Context,
							AuditableItemGraphContexts.ContextCommon
						],
						id: vertexId,
						resourcePatches: { add: [resource] }
					});
				})
			);

			const vertex = await service.get(vertexId);
			const activeResources = vertex.resources ?? [];

			expect(activeResources).toHaveLength(PARALLEL_EDGE_ATTACH_COUNT);

			const activeResourceIds = new Set(activeResources.map(r => r.id));
			for (const streamId of resourceIds) {
				expect(activeResourceIds.has(streamId)).toBe(true);
			}
		});

		test("parallel updatePartial resourcePatches.add produces one changeset per add", async () => {
			const service = new AuditableItemGraphService();

			const vertexId = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});

			const resourceIds = Array.from(
				{ length: PARALLEL_EDGE_ATTACH_COUNT },
				(unused, i) => `ais:stream-${i + 1}`
			);

			await Promise.all(
				resourceIds.map(async streamId =>
					service.updatePartial({
						"@context": [
							AuditableItemGraphContexts.Context,
							AuditableItemGraphContexts.ContextCommon
						],
						id: vertexId,
						resourcePatches: {
							add: [
								{
									"@context": [
										AuditableItemGraphContexts.Context,
										AuditableItemGraphContexts.ContextCommon
									],
									type: AuditableItemGraphTypes.Resource,
									id: streamId,
									resourceObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Link",
										href: streamId
									}
								}
							]
						}
					})
				)
			);

			// The creation changeset (version 0) plus one changeset per resource add.
			const { changesets } = await service.getChangesets(vertexId);

			expect(changesets.itemListElement).toHaveLength(PARALLEL_EDGE_ATTACH_COUNT + 1);
		});
	});

	describe("Organization context requirements", () => {
		beforeEach(() => {
			ContextIdStore.getContextIds = vi.fn().mockReturnValue({
				[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
				[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY,
				[ContextIdKeys.Organization]: TEST_ORGANIZATION_IDENTITY,
				[ContextIdKeys.User]: TEST_USER_IDENTITY
			});
		});

		test("create() throws contextIdMissing when org is absent from context", async () => {
			ContextIdStore.getContextIds = vi.fn().mockReturnValue({
				[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
				[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY
			});

			const service = new AuditableItemGraphService();
			await expect(
				service.create({
					"@context": [
						AuditableItemGraphContexts.Context,
						AuditableItemGraphContexts.ContextCommon
					],
					type: AuditableItemGraphTypes.Vertex
				})
			).rejects.toMatchObject({
				message: "contextIdHelper.contextIdMissing"
			});
		});

		test("update() with changes and no org in context throws - proof service also requires org", async () => {
			const service = new AuditableItemGraphService();

			const id = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});

			ContextIdStore.getContextIds = vi.fn().mockReturnValue({
				[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
				[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY
			});

			await expect(
				service.update({
					"@context": [
						AuditableItemGraphContexts.Context,
						AuditableItemGraphContexts.ContextCommon
					],
					id,
					type: AuditableItemGraphTypes.Vertex,
					annotationObject: {
						"@context": "https://schema.org/",
						type: "Thing",
						name: "updated-without-org-in-context"
					}
				})
			).rejects.toMatchObject({
				message: "auditableItemGraphService.updatingFailed"
			});
		});

		test("update() with no changes and no org in context succeeds - no proof created", async () => {
			const service = new AuditableItemGraphService();

			const id = await service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex
			});

			await waitForProofGeneration(1);

			ContextIdStore.getContextIds = vi.fn().mockReturnValue({
				[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
				[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY
			});

			await service.update({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				id,
				type: AuditableItemGraphTypes.Vertex
			});

			expect(await changesetStorage.getStore()).toHaveLength(1);
			expect(await immutableProofStorage.getStore()).toHaveLength(1);
		});
	});

	describe("AuditableItemGraphService health checks", () => {
		beforeEach(() => {
			ContextIdStore.getContextIds = vi.fn().mockReturnValue({
				[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
				[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY,
				[ContextIdKeys.Organization]: TEST_ORGANIZATION_IDENTITY,
				[ContextIdKeys.User]: TEST_USER_IDENTITY
			});
		});

		test("health check returns ok status when vertex storage is accessible", async () => {
			const service = new AuditableItemGraphService();
			const results = await service.healthApplication(async () => {});
			expect(results).toHaveLength(1);
			const result = (results as IHealth[])[0];
			expect(result.category).toBe(HealthCategory.Application);
			expect(result.status).toBe(HealthStatus.Ok);
		});

		test("health check returns empty results without org context", async () => {
			ContextIdStore.getContextIds = vi.fn().mockReturnValue({
				[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
				[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY
			});
			const service = new AuditableItemGraphService();
			const results = await service.healthApplication(async () => {});
			expect(results).toHaveLength(0);
		});
	});
});
