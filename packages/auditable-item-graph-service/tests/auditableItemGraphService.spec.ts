// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { TenantIdContextIdHandler } from "@twin.org/api-tenant-processor";
import {
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
import { ComponentFactory, Converter, Is, ObjectHelper, RandomHelper } from "@twin.org/core";
import { ComparisonOperator } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { DidContextIdHandler } from "@twin.org/identity-models";
import type { IImmutableProof } from "@twin.org/immutable-proof-models";
import {
	type ImmutableProof,
	ImmutableProofService,
	initSchema as initSchemaImmutableProof
} from "@twin.org/immutable-proof-service";
import { ModuleHelper } from "@twin.org/modules";
import { nameof } from "@twin.org/nameof";
import {
	EntityStorageVerifiableStorageConnector,
	initSchema as initSchemaVerifiableStorage,
	type VerifiableItem
} from "@twin.org/verifiable-storage-connector-entity-storage";
import { VerifiableStorageConnectorFactory } from "@twin.org/verifiable-storage-models";
import {
	cleanupTestEnv,
	setupTestEnv,
	TEST_NODE_IDENTITY,
	TEST_ORGANIZATION_IDENTITY,
	TEST_TENANT_IDENTITY,
	TEST_TENANT_IDENTITY_SHORT,
	TEST_USER_IDENTITY
} from "./setupTestEnv.js";
import { AuditableItemGraphService } from "../src/auditableItemGraphService.js";
import type { AuditableItemGraphChangeset } from "../src/entities/auditableItemGraphChangeset.js";
import type { AuditableItemGraphVertex } from "../src/entities/auditableItemGraphVertex.js";
import { initSchema } from "../src/schema.js";

let vertexStorage: MemoryEntityStorageConnector<AuditableItemGraphVertex>;
let changesetStorage: MemoryEntityStorageConnector<AuditableItemGraphChangeset>;
let immutableProofStorage: MemoryEntityStorageConnector<ImmutableProof>;
let verifiableStorage: MemoryEntityStorageConnector<VerifiableItem>;
let backgroundTaskStorage: MemoryEntityStorageConnector<BackgroundTask>;

const FIRST_TICK = 1724327716271;
const SECOND_TICK = 1724327816272;

const HEX_ID_PATTERN = /^[\da-f]+$/;
const AIG_URN_PATTERN = /^aig:[\da-f]+$/;
const IMMUTABLE_PROOF_URN_PATTERN = /^immutable-proof:[\da-f]+$/;
const MULTIBASE_Z_PATTERN = /^z[1-9A-HJ-NP-Za-km-z]+$/;

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
	} while (verifiableStorage.getStore().length < proofCount && count++ < proofCount * 40);
	if (count >= proofCount * 40) {
		throw new Error("Proof generation timed out");
	}
}

describe("AuditableItemGraphService", () => {
	beforeAll(async () => {
		await setupTestEnv();

		initSchema();
		initSchemaVerifiableStorage();
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

		verifiableStorage = new MemoryEntityStorageConnector<VerifiableItem>({
			entitySchema: nameof<VerifiableItem>(),
			partitionContextIds: [ContextIdKeys.Tenant]
		});
		EntityStorageConnectorFactory.register("verifiable-item", () => verifiableStorage);

		VerifiableStorageConnectorFactory.register(
			"verifiable-storage",
			() => new EntityStorageVerifiableStorageConnector()
		);

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
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementation(() => SECOND_TICK);

		let counter = 1;
		RandomHelper.generate = vi
			.fn()
			.mockImplementation(length => new Uint8Array(length).fill(counter++));
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

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];
		const storedVertexId = extractAigId(id);

		expect(vertex).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: expect.stringMatching(HEX_ID_PATTERN),
				dateCreated: expect.any(String),
				organizationIdentity: TEST_ORGANIZATION_IDENTITY
			})
		);
		expect(vertex.id).toEqual(storedVertexId);
		expect(vertex.aliasIndex).toBeUndefined();
		expect(vertex.annotationObject).toBeUndefined();
		expect(vertex.resourceTypeIndex).toBeUndefined();

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: expect.stringMatching(HEX_ID_PATTERN),
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [],
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN)
			})
		);

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toHaveLength(1);
		expect(immutableStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: expect.stringMatching(HEX_ID_PATTERN),
				data: expect.any(String),
				creator: TEST_ORGANIZATION_IDENTITY,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				maxAllowListSize: 100
			})
		);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				created: "2024-08-22T11:56:56.272Z",
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
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

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toHaveLength(1);
		expect(immutableStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: expect.stringMatching(HEX_ID_PATTERN),
				data: expect.any(String),
				creator: TEST_ORGANIZATION_IDENTITY,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				maxAllowListSize: 100
			})
		);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
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

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toHaveLength(1);
		expect(immutableStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
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
		const storedChangesetId = changesetStorage.getStore()[0].id;
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
					userIdentity: TEST_USER_IDENTITY
				}
			]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: storedChangesetId,
				vertexId: storedVertexId,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				proofId: expect.stringMatching(IMMUTABLE_PROOF_URN_PATTERN),
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

		const storedVertexId = vertexStorage.getStore()[0].id;
		const storedChangesetId = changesetStorage.getStore()[0].id;
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

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toHaveLength(1);
		expect(immutableStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
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

		const changesetStore = changesetStorage.getStore();

		const storedVertexId = vertexStorage.getStore()[0].id;
		expect(changesetStore).toHaveLength(1);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const changesetStore = changesetStorage.getStore();
		const storedVertexId = vertexStorage.getStore()[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toHaveLength(2);
		expect(immutableStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);
		expect(immutableStore[1]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
			})
		);

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
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

		const changesetStore = changesetStorage.getStore();
		const storedVertexId = vertexStorage.getStore()[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toHaveLength(2);
		expect(immutableStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);
		expect(immutableStore[1]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
			})
		);

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
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

		const changesetStore = changesetStorage.getStore();
		const storedVertexId = vertexStorage.getStore()[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toHaveLength(2);
		expect(immutableStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);
		expect(immutableStore[1]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
			})
		);

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
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

		const changesetStore = changesetStorage.getStore();

		const storedVertexId = vertexStorage.getStore()[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const changesetStore = changesetStorage.getStore();
		const storedVertexId = vertexStorage.getStore()[0].id;
		expect(changesetStore).toHaveLength(2);
		expect(changesetStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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
				partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toHaveLength(2);
		expect(immutableStore[0]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);
		expect(immutableStore[1]).toEqual(
			expect.objectContaining({
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: expect.any(String),
				id: expect.stringMatching(HEX_ID_PATTERN),
				maxAllowListSize: 100
			})
		);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
			})
		);

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual(
			expect.objectContaining({
				"@context": "https://w3id.org/security/data-integrity/v2",
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue: expect.stringMatching(MULTIBASE_Z_PATTERN)
			})
		);
	});

	test("Can remove the verifiable storage for a vertex", async () => {
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

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore.length).toEqual(1);

		await service.removeVerifiable(id);

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

		expect(immutableStore.length).toEqual(0);
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

		const resultsAndCursor = await service.query(undefined, [
			{
				property: "annotationObject.id",
				value: "http://example.org/notes/1",
				comparison: ComparisonOperator.Equals
			}
		]);
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
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				edges: {
					type: AuditableItemGraphTypes.Edge,
					targetId: "aig:0101010101010101010101010101010101010101010101010101010101010101"
				} as unknown as IAuditableItemGraphEdge[]
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
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				aliases: {
					type: AuditableItemGraphTypes.Alias,
					id: "foo123"
				} as unknown as IAuditableItemGraphAlias[]
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
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				resources: {
					type: AuditableItemGraphTypes.Resource,
					id: "resource1",
					resourceObject: { type: "Note" }
				} as unknown as IAuditableItemGraphResource[]
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
		await expect(
			service.create({
				type: AuditableItemGraphTypes.Vertex
			} as unknown as Omit<IAuditableItemGraphVertex, "id">)
		).rejects.toMatchObject({
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
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon]
			} as unknown as Omit<IAuditableItemGraphVertex, "id">)
		).rejects.toMatchObject({
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
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				aliases: [
					{
						id: "foo123"
					} as unknown as IAuditableItemGraphAlias
				]
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
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				resources: [
					{
						id: "resource1",
						resourceObject: { type: "Note" }
					} as unknown as IAuditableItemGraphResource
				]
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

	test("Validation fails when edge is missing required type property", async () => {
		const service = new AuditableItemGraphService();
		await expect(
			service.create({
				"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
				type: AuditableItemGraphTypes.Vertex,
				edges: [
					{
						targetId: "aig:0101010101010101010101010101010101010101010101010101010101010101"
					} as unknown as IAuditableItemGraphEdge
				]
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
});
