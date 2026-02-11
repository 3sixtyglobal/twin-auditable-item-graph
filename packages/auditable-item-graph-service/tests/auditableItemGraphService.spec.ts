// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { TenantIdContextIdHandler } from "@twin.org/api-tenant-processor";
import { VerifyDepth } from "@twin.org/auditable-item-graph-models";
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
		const id = await service.create({});
		expect(id.startsWith("aig:")).toEqual(true);

		await waitForProofGeneration();

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: expect.any(String),
			organizationIdentity: TEST_ORGANIZATION_IDENTITY
		});

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [],
				proofId: "immutable-proof:019179f26c5073038303030303030303"
			}
		]);

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z7bUw29CSZ5GUxn9FAnsZ4R7gjjPaX86JEw37SmkdJzgbF6tT79cexKoAaUfiD6HvroWyz9Q5TwpfTXzVm4BmySW",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				creator: TEST_ORGANIZATION_IDENTITY,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				maxAllowListSize: 100
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			created: "2024-08-22T11:56:56.272Z",
			type: "DataIntegrityProof",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z7bUw29CSZ5GUxn9FAnsZ4R7gjjPaX86JEw37SmkdJzgbF6tT79cexKoAaUfiD6HvroWyz9Q5TwpfTXzVm4BmySW",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			id: "0101010101010101010101010101010101010101010101010101010101010101",
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
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
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
				proofId: "immutable-proof:019179f26c5073038303030303030303"
			}
		]);

		await waitForProofGeneration();

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z3ZEE6oZZuyckus3ggD86G36HV7eC6R2RnLw6YJPKYD9JCmECfXfHzuUrjtcdL1DeQQsgqK2gmVuLBx1oZE1hfHEd",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				creator: TEST_ORGANIZATION_IDENTITY,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				maxAllowListSize: 100
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z3ZEE6oZZuyckus3ggD86G36HV7eC6R2RnLw6YJPKYD9JCmECfXfHzuUrjtcdL1DeQQsgqK2gmVuLBx1oZE1hfHEd",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});
	});

	test("Can create a vertex with object", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
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
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			id: "0101010101010101010101010101010101010101010101010101010101010101",
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
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
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
				proofId: "immutable-proof:019179f26c5073038303030303030303"
			}
		]);

		await waitForProofGeneration();

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z2oRQBFp5DEtqtGdakuEmj5APVM6ZHftmrZjYyjfoFQphMH7KE9PH1L3UMkGYRfYqsD6CtqfRq1MapLYegycpeUhL",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				maxAllowListSize: 100
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z2oRQBFp5DEtqtGdakuEmj5APVM6ZHftmrZjYyjfoFQphMH7KE9PH1L3UMkGYRfYqsD6CtqfRq1MapLYegycpeUhL",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});
	});

	test("Can get a vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
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
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id, undefined);

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "AuditableItemGraphVertex",
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
					type: "AuditableItemGraphAlias",
					id: "foo123",
					dateCreated: expect.any(String)
				},
				{
					type: "AuditableItemGraphAlias",
					id: "bar456",
					dateCreated: expect.any(String)
				}
			]
		});
	});

	test("Can get a vertex changesets", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
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
				{ id: "foo123", aliasFormat: "type1" },
				{ id: "bar456", aliasFormat: "type2" }
			]
		});
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.getChangesets(id);

		expect(result.changesets).toEqual({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/"
			],
			type: ["ItemList", "AuditableItemGraphChangesetList"],
			itemListElement: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
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
							type: "AuditableItemGraphPatchOperation",
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
					proofId: "immutable-proof:019179f26c5073038303030303030303",
					userIdentity:
						"did:entity-storage:0x0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				proofId: "immutable-proof:019179f26c5073038303030303030303",
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
			}
		]);
	});

	test("Can get a vertex changeset", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
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
				{ id: "foo123", aliasFormat: "type1" },
				{ id: "bar456", aliasFormat: "type2" }
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
				type: "AuditableItemGraphChangeset",
				id: changesetUrn,
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				proofId: expect.stringMatching(/^immutable-proof:/),
				patches: [
					{
						type: "AuditableItemGraphPatchOperation",
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
						type: "AuditableItemGraphPatchOperation",
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
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});

		await service.update({
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
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [{ id: "foo321" }, { id: "bar456" }]
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
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});

		await service.update({
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
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [{ id: "foo321" }, { id: "bar456" }]
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
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});

		await service.update({
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
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [{ id: "foo321" }, { id: "bar456" }]
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
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});

		expect(id.startsWith("aig:")).toEqual(true);

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
			type: "AuditableItemGraphVertex",
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
				{ type: "AuditableItemGraphAlias", id: "foo123", dateCreated: expect.any(String) },
				{ type: "AuditableItemGraphAlias", id: "bar456", dateCreated: expect.any(String) }
			],
			verified: true
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
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
				proofId: "immutable-proof:019179f26c5073038303030303030303"
			}
		]);

		await waitForProofGeneration();

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z2jazYhLxbsXyzZS2jMBjyHKVXrGr93Y4JRLsTFohMkxuy4Z7SyBYepy94N2UPxv32at5tiKvhJrmHcBTwXZg4ken",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a",
				maxAllowListSize: 100
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z2jazYhLxbsXyzZS2jMBjyHKVXrGr93Y4JRLsTFohMkxuy4Z7SyBYepy94N2UPxv32at5tiKvhJrmHcBTwXZg4ken",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
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
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});

		await service.update({
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
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [{ id: "foo123" }, { id: "bar456" }]
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
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: expect.any(String),
			aliases: [
				{ id: "foo123", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) },
				{ id: "bar456", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) }
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

		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
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
				proofId: "immutable-proof:019179f26c5073038303030303030303"
			}
		]);
	});

	test("Can create and update and verify aliases", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
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
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});

		await service.update({
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
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [{ id: "foo321" }, { id: "bar456" }]
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
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: expect.any(String),
			dateModified: expect.any(String),
			aliases: [
				{
					type: "AuditableItemGraphAlias",
					id: "foo123",
					dateCreated: expect.any(String),
					dateDeleted: expect.any(String)
				},
				{ type: "AuditableItemGraphAlias", id: "bar456", dateCreated: expect.any(String) },
				{ type: "AuditableItemGraphAlias", id: "foo321", dateCreated: expect.any(String) }
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
		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
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
				proofId: "immutable-proof:019179f26c5073038303030303030303"
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{ op: "add", path: "/aliases/0/dateDeleted", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "add",
						path: "/aliases/-",
						value: { id: "foo321", dateCreated: expect.any(String) }
					}
				],
				proofId: "immutable-proof:019179f26c5076068606060606060606"
			}
		]);

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z2jazYhLxbsXyzZS2jMBjyHKVXrGr93Y4JRLsTFohMkxuy4Z7SyBYepy94N2UPxv32at5tiKvhJrmHcBTwXZg4ken",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				maxAllowListSize: 100
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z4hHupwj4yW1xC1TMsgFnPYXzgPA42WFudeXSx7RE1JCJW37sMUpWbB3JAvTPYUwS6y5uvyVFuWQuEgYwWYgYdReP",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
				maxAllowListSize: 100
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z2jazYhLxbsXyzZS2jMBjyHKVXrGr93Y4JRLsTFohMkxuy4Z7SyBYepy94N2UPxv32at5tiKvhJrmHcBTwXZg4ken",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z4hHupwj4yW1xC1TMsgFnPYXzgPA42WFudeXSx7RE1JCJW37sMUpWbB3JAvTPYUwS6y5uvyVFuWQuEgYwWYgYdReP",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
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
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});

		await service.update({
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
			aliases: [{ id: "foo123" }, { id: "bar456" }]
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
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: expect.any(String),
			dateModified: expect.any(String),
			aliases: [
				{ id: "foo123", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) },
				{ id: "bar456", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) }
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

		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
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
				proofId: "immutable-proof:019179f26c5073038303030303030303"
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				proofId: "immutable-proof:019179f26c5076068606060606060606",
				patches: [
					{
						op: "replace",
						path: "/annotationObject/object/content",
						value: "This is a simple note 2"
					}
				]
			}
		]);

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z2jazYhLxbsXyzZS2jMBjyHKVXrGr93Y4JRLsTFohMkxuy4Z7SyBYepy94N2UPxv32at5tiKvhJrmHcBTwXZg4ken",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				maxAllowListSize: 100
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z39apawQDL9Jb6Ca74Jc6sDzevobN2KAXZz2VA1HgkRiurdcanAjPfoUZbvaUvPWLGabt9LqwT1yJuNq9RVyDxMq4",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
				maxAllowListSize: 100
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z2jazYhLxbsXyzZS2jMBjyHKVXrGr93Y4JRLsTFohMkxuy4Z7SyBYepy94N2UPxv32at5tiKvhJrmHcBTwXZg4ken",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z39apawQDL9Jb6Ca74Jc6sDzevobN2KAXZz2VA1HgkRiurdcanAjPfoUZbvaUvPWLGabt9LqwT1yJuNq9RVyDxMq4",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});
	});

	test("Can create and update and verify resources, aliases and object", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
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
			aliases: [{ id: "foo123" }, { id: "bar456" }],
			resources: [
				{
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
			aliases: [{ id: "foo123" }, { id: "bar456" }],
			resources: [
				{
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
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: expect.any(String),
			dateModified: expect.any(String),
			aliases: [
				{ id: "foo123", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) },
				{ id: "bar456", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) }
			],
			resources: [
				{
					id: "resource1",
					type: "AuditableItemGraphResource",
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
					type: "AuditableItemGraphResource",
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
		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
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
				proofId: "immutable-proof:019179f26c5073038303030303030303"
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
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
				proofId: "immutable-proof:019179f26c5076068606060606060606"
			}
		]);

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z4ESEMrWiwgcgNcLAgYwFYEszJyJQTJU9Ajhg46iGkP8W1a4AM3eqRARk7mTfQ4ECBhvd8CgajTfTaaWgh5xi11K8",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				maxAllowListSize: 100
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z4iTFC8qMpBGQ3GXghA9ubqEafJpLtkqmZMBGqJf6AF3YtCNa1syxWXKYqpeXGiVT6MGCj1UzphtRdNuq95Ehbwea",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
				maxAllowListSize: 100
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z4ESEMrWiwgcgNcLAgYwFYEszJyJQTJU9Ajhg46iGkP8W1a4AM3eqRARk7mTfQ4ECBhvd8CgajTfTaaWgh5xi11K8",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z4iTFC8qMpBGQ3GXghA9ubqEafJpLtkqmZMBGqJf6AF3YtCNa1syxWXKYqpeXGiVT6MGCj1UzphtRdNuq95Ehbwea",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});
	});

	test("Can create and update and verify edges", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			edges: [
				{
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

		await service.update({
			id,
			edges: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:edge:0202020202020202020202020202020202020202020202020202020202020202",
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

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: expect.any(String),
			dateModified: expect.any(String),
			edges: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:edge:0202020202020202020202020202020202020202020202020202020202020202",
					targetId: "aig:1010101010101010101010101010101010101010101010101010101010101010",
					type: "AuditableItemGraphEdge",
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note 2" },
						published: "2015-01-25T12:34:56Z"
					},
					edgeRelationships: ["frenemy"]
				}
			],
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			verified: true
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				patches: [
					{
						op: "add",
						path: "/edges",
						value: [
							{
								id: "0202020202020202020202020202020202020202020202020202020202020202",
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
				proofId: "immutable-proof:019179f26c5074048404040404040404"
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				id: "0606060606060606060606060606060606060606060606060606060606060606",
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
				proofId: "immutable-proof:019179f26c5077078707070707070707"
			}
		]);
	});

	test("Can create and update and verify aliases, object, resources and edges", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
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

		await service.update({
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
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:edge:0202020202020202020202020202020202020202020202020202020202020202",
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
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:edge:0303030303030303030303030303030303030303030303030303030303030303",
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

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: expect.any(String),
			dateModified: expect.any(String),
			aliases: [
				{
					id: "foo123",
					type: "AuditableItemGraphAlias",
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note alias 10" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "bar456",
					type: "AuditableItemGraphAlias",
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note alias 20" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			edges: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:edge:0202020202020202020202020202020202020202020202020202020202020202",
					targetId: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphEdge",
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note edge 10" },
						published: "2015-01-25T12:34:56Z"
					},
					edgeRelationships: ["friend"]
				},
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:edge:0303030303030303030303030303030303030303030303030303030303030303",
					targetId: "aig:0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphEdge",
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					annotationObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note edge 20" },
						published: "2015-01-25T12:34:56Z"
					},
					edgeRelationships: ["enemy"]
				}
			],
			resources: [
				{
					id: "resource1",
					type: "AuditableItemGraphResource",
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note resource 10" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					type: "AuditableItemGraphResource",
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note resource 20" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			verified: true
		});

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
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
								id: "0202020202020202020202020202020202020202020202020202020202020202",
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
								id: "0303030303030303030303030303030303030303030303030303030303030303",
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
				proofId: "immutable-proof:019179f26c5075058505050505050505"
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				id: "0707070707070707070707070707070707070707070707070707070707070707",
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
				proofId: "immutable-proof:019179f26c5078088808080808080808"
			}
		]);

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z4MxDt388pL55ac4FJsXKM9MeQAx3h7smVhxCwPaoMqamsizQTeyhR8bVoHkmi9TkTdEki4dzYnVmANHcVfjXahMW",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
				maxAllowListSize: 100
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: "2024-08-22T11:56:56.272Z",
						verificationMethod:
							"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion",
						proofPurpose: "assertionMethod",
						proofValue:
							"z64wtVpy42U1QUCzaqgAD9uher88gDkd5n9Kbv27WZ6TUgFX2BUsd8KZDxiyHzScVtXvJK5xg1JR2zcATkhTe3i9Q",
						"@context": "https://w3id.org/security/data-integrity/v2"
					})
				),
				id: "0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d",
				maxAllowListSize: 100
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z4MxDt388pL55ac4FJsXKM9MeQAx3h7smVhxCwPaoMqamsizQTeyhR8bVoHkmi9TkTdEki4dzYnVmANHcVfjXahMW",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": "https://w3id.org/security/data-integrity/v2",
			type: "DataIntegrityProof",
			created: "2024-08-22T11:56:56.272Z",
			cryptosuite: "eddsa-jcs-2022",
			proofPurpose: "assertionMethod",
			proofValue:
				"z64wtVpy42U1QUCzaqgAD9uher88gDkd5n9Kbv27WZ6TUgFX2BUsd8KZDxiyHzScVtXvJK5xg1JR2zcATkhTe3i9Q",
			verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
		});
	});

	test("Can remove the verifiable storage for a vertex", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			aliases: [{ id: "foo123" }, { id: "bar456" }]
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
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: expect.any(String),
			aliases: [
				{ id: "foo123", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) },
				{ id: "bar456", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) }
			],
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			verified: false
		});

		expect(immutableStore.length).toEqual(0);
	});

	test("Can query for a vertex by id", async () => {
		const service = new AuditableItemGraphService();
		await service.create({});
		await service.create({});

		const resultsAndCursor = await service.query({ id: "0" });

		expect(resultsAndCursor.entries).toEqual({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/"
			],
			type: ["ItemList", "AuditableItemGraphVertexList"],
			itemListElement: [
				{
					type: "AuditableItemGraphVertex",
					id: "aig:0505050505050505050505050505050505050505050505050505050505050505",
					dateCreated: expect.any(String)
				},
				{
					type: "AuditableItemGraphVertex",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					dateCreated: expect.any(String)
				}
			]
		});
	});

	test("Can query for a vertex by alias with partial match", async () => {
		const service = new AuditableItemGraphService();
		await service.create({
			aliases: [{ id: "foo123" }, { id: "bar123" }]
		});
		await service.create({
			aliases: [{ id: "foo456" }, { id: "bar456" }]
		});

		const resultsAndCursor = await service.query({ id: "foo" });
		expect(resultsAndCursor.entries).toEqual({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/"
			],
			type: ["ItemList", "AuditableItemGraphVertexList"],
			itemListElement: [
				{
					type: "AuditableItemGraphVertex",
					id: "aig:0505050505050505050505050505050505050505050505050505050505050505",
					dateCreated: expect.any(String),
					aliases: [
						{
							id: "foo456",
							type: "AuditableItemGraphAlias",
							dateCreated: expect.any(String)
						},
						{
							id: "bar456",
							type: "AuditableItemGraphAlias",
							dateCreated: expect.any(String)
						}
					]
				},
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphVertex",
					dateCreated: expect.any(String),
					aliases: [
						{
							id: "foo123",
							type: "AuditableItemGraphAlias",
							dateCreated: expect.any(String)
						},
						{
							id: "bar123",
							type: "AuditableItemGraphAlias",
							dateCreated: expect.any(String)
						}
					]
				}
			]
		});
	});

	test("Can query for a vertex by id or alias", async () => {
		const service = new AuditableItemGraphService();
		await service.create({
			aliases: [{ id: "foo1" }]
		});
		await service.create({});

		const resultsAndCursor = await service.query({ id: "1" });
		expect(resultsAndCursor.entries).toEqual({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/"
			],
			type: ["ItemList", "AuditableItemGraphVertexList"],
			itemListElement: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphVertex",
					dateCreated: expect.any(String),
					aliases: [
						{ id: "foo1", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) }
					]
				}
			]
		});
	});

	test("Can query for a vertex by mode id", async () => {
		const service = new AuditableItemGraphService();
		await service.create({
			aliases: [{ id: "foo5" }]
		});
		await service.create({});

		const resultsAndCursor = await service.query({ id: "5", idMode: "id" });
		expect(resultsAndCursor.entries).toEqual({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/"
			],
			type: ["ItemList", "AuditableItemGraphVertexList"],
			itemListElement: [
				{
					id: "aig:0505050505050505050505050505050505050505050505050505050505050505",
					type: "AuditableItemGraphVertex",
					dateCreated: expect.any(String)
				}
			]
		});
	});

	test("Can query for a vertex by using mode alias", async () => {
		const service = new AuditableItemGraphService();
		await service.create({
			aliases: [{ id: "foo4" }]
		});
		await service.create({});

		await waitForProofGeneration();

		const resultsAndCursor = await service.query({ id: "4", idMode: "alias" });
		expect(resultsAndCursor.entries).toEqual({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/"
			],
			type: ["ItemList", "AuditableItemGraphVertexList"],
			itemListElement: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphVertex",
					dateCreated: expect.any(String),
					aliases: [
						{ id: "foo4", type: "AuditableItemGraphAlias", dateCreated: expect.any(String) }
					]
				}
			]
		});
	});

	test("Can query for a vertex using resource types", async () => {
		const service = new AuditableItemGraphService();
		await service.create({
			resources: [
				{
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
		await service.create({
			resources: [
				{
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

		const resultsAndCursor = await service.query({ includesResourceTypes: ["Create", "Delete"] });
		expect(resultsAndCursor.entries).toEqual({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/"
			],
			type: ["ItemList", "AuditableItemGraphVertexList"],
			itemListElement: [
				{
					dateCreated: expect.any(String),
					id: "aig:0505050505050505050505050505050505050505050505050505050505050505",
					type: "AuditableItemGraphVertex"
				},
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphVertex",
					dateCreated: expect.any(String)
				}
			]
		});
	});

	test("Can query for a vertex using it's annotation object id", async () => {
		const service = new AuditableItemGraphService();
		await service.create({
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
		expect(resultsAndCursor.entries).toEqual({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/"
			],
			type: ["ItemList", "AuditableItemGraphVertexList"],
			itemListElement: [
				{
					dateCreated: "2024-08-22T11:56:56.272Z",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphVertex",
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
				}
			]
		});
	});

	test("Can fail to create a vertex with an alias that already exists and the unique flag set", async () => {
		const service = new AuditableItemGraphService();
		const id = await service.create({
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});
		expect(id.startsWith("aig:")).toEqual(true);

		await expect(
			service.create({
				aliases: [{ id: "foo123", unique: true }, { id: "bar456" }]
			})
		).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "auditableItemGraphService.aliasNotUnique"
			}
		});
	});
});
