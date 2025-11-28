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
import { ComponentFactory, Converter, ObjectHelper, RandomHelper } from "@twin.org/core";
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
		const service = new AuditableItemGraphService({ config: {} });
		expect(service).toBeDefined();
	});

	test("Can create a vertex with no properties", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			}
		]);

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z3TxTRDH1E3rVn9cFZ2TutkKfc4dYkaXAYc3U53EQJQxTKYuoywnF2L5JQo2m29dt2MmFGW6DFFeUagjHN8C8Whdp",
							verificationMethod:
								"did:entity-storage:0x0202020202020202020202020202020202020202020202020202020202020202#immutable-proof-assertion"
						},
						proofObjectHash: "sha256:1Ea3MQ0UnhtyFIq10K89+/dFgXf/ogIub+VfHyFqkWs=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202"
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
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:1Ea3MQ0UnhtyFIq10K89+/dFgXf/ogIub+VfHyFqkWs=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			proof: {
				created: "2024-08-22T11:56:56.272Z",
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z3TxTRDH1E3rVn9cFZ2TutkKfc4dYkaXAYc3U53EQJQxTKYuoywnF2L5JQo2m29dt2MmFGW6DFFeUagjHN8C8Whdp",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z4f6EnLgAqWn6CjtDw62xvg5EvqwEDwaHyerYKK6U5NLWzzkAzS75nSprX69pnz4zayiAE9Hg8woq838dbgv7h6fq",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:0vr65OmnppFAbPHWGkfGuL0bQbGxWBRlAekqpHGiDVs=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202"
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
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:0vr65OmnppFAbPHWGkfGuL0bQbGxWBRlAekqpHGiDVs=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z4f6EnLgAqWn6CjtDw62xvg5EvqwEDwaHyerYKK6U5NLWzzkAzS75nSprX69pnz4zayiAE9Hg8woq838dbgv7h6fq",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});
	});

	test("Can create a vertex with object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z42TYDoA1qFTm7ihkHSLiHkqU83avEojymr9qSzt7dgKFQU8F9NjgjnAJtfF72jKd7J6uGNSZLzwKUj6yoc5bDcka",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:P07nfXL6Pr7eC9p7GQ93lp58SeMef2NB6jxgODtK/oI=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202"
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
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:P07nfXL6Pr7eC9p7GQ93lp58SeMef2NB6jxgODtK/oI=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z42TYDoA1qFTm7ihkHSLiHkqU83avEojymr9qSzt7dgKFQU8F9NjgjnAJtfF72jKd7J6uGNSZLzwKUj6yoc5bDcka",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});
	});

	test("Can get a vertex", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

	test("Can get a vertex include changesets", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		const result = await service.get(id, { includeChangesets: true });

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
				{
					type: "AuditableItemGraphAlias",
					id: "foo123",
					aliasFormat: "type1",
					dateCreated: expect.any(String)
				},
				{
					type: "AuditableItemGraphAlias",
					id: "bar456",
					aliasFormat: "type2",
					dateCreated: expect.any(String)
				}
			],
			changesets: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: expect.any(String),
					userIdentity: TEST_USER_IDENTITY,
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/annotationObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", aliasFormat: "type1", dateCreated: expect.any(String) },
								{ id: "bar456", aliasFormat: "type2", dateCreated: expect.any(String) }
							]
						}
					]
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
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

		await waitForProofGeneration();

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				allowList: [TEST_ORGANIZATION_IDENTITY],
				creator: TEST_ORGANIZATION_IDENTITY,
				data: Converter.bytesToBase64(
					ObjectHelper.toBytes({
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"zZ5Kmnk9Kzsiq2qQ8iVeY1PpKncTtP48RcmWeXR3nuCwwstCjfLasFnDgBLUdLg2cSkpCPUeoooBG2bA8Qv1dSee",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:FuzaGUfcEi/fWWVKm9RuirYVS+3s6pyVxqSgDQpIzKM=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202"
					})
				),
				id: "0808080808080808080808080808080808080808080808080808080808080808",
				maxAllowListSize: 100
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:FuzaGUfcEi/fWWVKm9RuirYVS+3s6pyVxqSgDQpIzKM=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"zZ5Kmnk9Kzsiq2qQ8iVeY1PpKncTtP48RcmWeXR3nuCwwstCjfLasFnDgBLUdLg2cSkpCPUeoooBG2bA8Qv1dSee",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});
	});

	test("Can get a vertex include changesets and verify current signature", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			includeChangesets: true,
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
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
					dateCreated: expect.any(String),
					userIdentity: TEST_USER_IDENTITY,
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/annotationObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: expect.any(String) },
								{ id: "bar456", dateCreated: expect.any(String) }
							]
						}
					],
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					}
				}
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z2d3Q8JHYM57mgA4FcHfjRexMqjiRsu6ZJAi4oyprzWqwiUm3kveyY2ZKWzki2qVXTe1hEv9RBVj785iUJ4J3XYgf",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:gX9h4U7REAqb7Z2j6uMog9tJ/KzFBm8V0Kbft9mAGTU=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202"
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
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:gX9h4U7REAqb7Z2j6uMog9tJ/KzFBm8V0Kbft9mAGTU=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2d3Q8JHYM57mgA4FcHfjRexMqjiRsu6ZJAi4oyprzWqwiUm3kveyY2ZKWzki2qVXTe1hEv9RBVj785iUJ4J3XYgf",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			includeChangesets: true,
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
			changesets: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: expect.any(String),
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/annotationObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: expect.any(String) },
								{ id: "bar456", dateCreated: expect.any(String) }
							]
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity: TEST_USER_IDENTITY
				}
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			}
		]);
	});

	test("Can create and update and verify aliases", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			includeChangesets: true,
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
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
					dateCreated: expect.any(String),
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/annotationObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: expect.any(String) },
								{ id: "bar456", dateCreated: expect.any(String) }
							]
						}
					],
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
					userIdentity: TEST_USER_IDENTITY,
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					}
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: expect.any(String),
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases/0/dateDeleted",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases/-",
							patchValue: { id: "foo321", dateCreated: expect.any(String) }
						}
					],
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					},
					userIdentity: TEST_USER_IDENTITY,
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505",
					proofId:
						"immutable-proof:0606060606060606060606060606060606060606060606060606060606060606"
				}
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
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
				proofId: "immutable-proof:0606060606060606060606060606060606060606060606060606060606060606"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z2d3Q8JHYM57mgA4FcHfjRexMqjiRsu6ZJAi4oyprzWqwiUm3kveyY2ZKWzki2qVXTe1hEv9RBVj785iUJ4J3XYgf",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:gX9h4U7REAqb7Z2j6uMog9tJ/KzFBm8V0Kbft9mAGTU=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0606060606060606060606060606060606060606060606060606060606060606",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z4fsyJnVkrNB3TYXNLgkAZjjXPdSkWuyRikRVYRbj3zmVtGdFTLUbMFTSdKXpdjuzQfXjjNQrWFVLi7gFyu6esiqf",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:k+tAz9FlYZNmjJPjtqHEgH42X6yM8kPdri7U7eeqwj0=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505"
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
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:gX9h4U7REAqb7Z2j6uMog9tJ/KzFBm8V0Kbft9mAGTU=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2d3Q8JHYM57mgA4FcHfjRexMqjiRsu6ZJAi4oyprzWqwiUm3kveyY2ZKWzki2qVXTe1hEv9RBVj785iUJ4J3XYgf",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			id: "0606060606060606060606060606060606060606060606060606060606060606",
			proofObjectHash: "sha256:k+tAz9FlYZNmjJPjtqHEgH42X6yM8kPdri7U7eeqwj0=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z4fsyJnVkrNB3TYXNLgkAZjjXPdSkWuyRikRVYRbj3zmVtGdFTLUbMFTSdKXpdjuzQfXjjNQrWFVLi7gFyu6esiqf",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			includeChangesets: true,
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
			changesets: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: expect.any(String),
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/annotationObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: expect.any(String) },
								{ id: "bar456", dateCreated: expect.any(String) }
							]
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity: TEST_USER_IDENTITY
				},
				{
					type: "AuditableItemGraphChangeset",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505",
					dateCreated: expect.any(String),
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/annotationObject/object/content",
							patchValue: "This is a simple note 2"
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					proofId:
						"immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
					userIdentity: TEST_USER_IDENTITY
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
					}
				],
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			},
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity: TEST_USER_IDENTITY,
				proofId: "immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z2d3Q8JHYM57mgA4FcHfjRexMqjiRsu6ZJAi4oyprzWqwiUm3kveyY2ZKWzki2qVXTe1hEv9RBVj785iUJ4J3XYgf",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:gX9h4U7REAqb7Z2j6uMog9tJ/KzFBm8V0Kbft9mAGTU=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0606060606060606060606060606060606060606060606060606060606060606",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z3pxrZfh4YZ8HghDzDanDWzL26i3JnSbJCvtgp8UeYBvsFHLEr912KLfq2zQ96xMYfkwUDgNi1p3kwJNZyuuPf9YG",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:GdJftySbnRvQC0EJTcmPK+niuepCkW21MOxbzgVt8XM=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505"
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
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:gX9h4U7REAqb7Z2j6uMog9tJ/KzFBm8V0Kbft9mAGTU=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2d3Q8JHYM57mgA4FcHfjRexMqjiRsu6ZJAi4oyprzWqwiUm3kveyY2ZKWzki2qVXTe1hEv9RBVj785iUJ4J3XYgf",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			proofObjectHash: "sha256:GdJftySbnRvQC0EJTcmPK+niuepCkW21MOxbzgVt8XM=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505",
			id: "0606060606060606060606060606060606060606060606060606060606060606",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z3pxrZfh4YZ8HghDzDanDWzL26i3JnSbJCvtgp8UeYBvsFHLEr912KLfq2zQ96xMYfkwUDgNi1p3kwJNZyuuPf9YG",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});
	});

	test("Can create and update and verify resources, aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			includeChangesets: true,
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
			changesets: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: expect.any(String),
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/annotationObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: expect.any(String) },
								{ id: "bar456", dateCreated: expect.any(String) }
							]
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources",
							patchValue: [
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
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity: TEST_USER_IDENTITY
				},
				{
					type: "AuditableItemGraphChangeset",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505",
					dateCreated: expect.any(String),
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/annotationObject/object/content",
							patchValue: "This is a simple note 2"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/resources/0/resourceObject/object/content",
							patchValue: "This is a simple note resource 10"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources/1/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/resources/1/resourceObject/object/content",
							patchValue: "This is a simple note resource 11"
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					proofId:
						"immutable-proof:0606060606060606060606060606060606060606060606060606060606060606",
					userIdentity: TEST_USER_IDENTITY
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
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
				proofId: "immutable-proof:0606060606060606060606060606060606060606060606060606060606060606"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0303030303030303030303030303030303030303030303030303030303030303",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z2BsGKYCYuD4HorZPecZi1ArrJYHHWGVV23cP2WPE5wuVb6ctdDFCznhTvCryTtpFkoFbeMY3Vp2pn8dYf1p86oqJ",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:WpNOK53PxKywgrgPviMpn2VEH1vkSAHKeznc0yk4h04=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0606060606060606060606060606060606060606060606060606060606060606",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z2Ygi8g6ypVv6vHwt8oNdr1fBqowafq9u78aC7ANkKwFhdyZHHpP4nMPakkRPDMVBD2CCooziVaxeXcsR68Xabz8K",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:0D1vOPN2z9A+vPYR3177lkN6SGuwbjHyx1nw/lZGECE=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505"
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
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:WpNOK53PxKywgrgPviMpn2VEH1vkSAHKeznc0yk4h04=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2BsGKYCYuD4HorZPecZi1ArrJYHHWGVV23cP2WPE5wuVb6ctdDFCznhTvCryTtpFkoFbeMY3Vp2pn8dYf1p86oqJ",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			id: "0606060606060606060606060606060606060606060606060606060606060606",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2Ygi8g6ypVv6vHwt8oNdr1fBqowafq9u78aC7ANkKwFhdyZHHpP4nMPakkRPDMVBD2CCooziVaxeXcsR68Xabz8K",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			},
			proofObjectHash: "sha256:0D1vOPN2z9A+vPYR3177lkN6SGuwbjHyx1nw/lZGECE=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505"
		});
	});

	test("Can create and update and verify edges", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			includeChangesets: true,
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
			changesets: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0303030303030303030303030303030303030303030303030303030303030303",
					type: "AuditableItemGraphChangeset",
					dateCreated: expect.any(String),
					proofId:
						"immutable-proof:0404040404040404040404040404040404040404040404040404040404040404",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges",
							patchValue: {
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
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity: TEST_USER_IDENTITY
				},
				{
					type: "AuditableItemGraphChangeset",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0606060606060606060606060606060606060606060606060606060606060606",
					dateCreated: expect.any(String),
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/edges/0/annotationObject/object/content",
							patchValue: "This is a simple note 2"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/edges/0/edgeRelationships/0",
							patchValue: "frenemy"
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					proofId:
						"immutable-proof:0707070707070707070707070707070707070707070707070707070707070707",
					userIdentity: TEST_USER_IDENTITY
				}
			],
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
				proofId: "immutable-proof:0404040404040404040404040404040404040404040404040404040404040404"
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
				proofId: "immutable-proof:0707070707070707070707070707070707070707070707070707070707070707"
			}
		]);
	});

	test("Can create and update and verify aliases, object, resources and edges", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			includeChangesets: true,
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
			changesets: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0404040404040404040404040404040404040404040404040404040404040404",
					type: "AuditableItemGraphChangeset",
					dateCreated: expect.any(String),
					proofId:
						"immutable-proof:0505050505050505050505050505050505050505050505050505050505050505",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/annotationObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
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
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources",
							patchValue: [
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
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges",
							patchValue: [
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
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity: TEST_USER_IDENTITY
				},
				{
					type: "AuditableItemGraphChangeset",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0707070707070707070707070707070707070707070707070707070707070707",
					dateCreated: expect.any(String),
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/annotationObject/object/content",
							patchValue: "This is a simple note 2"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/aliases/0/annotationObject/object/content",
							patchValue: "This is a simple note alias 10"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases/1/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/aliases/1/annotationObject/object/content",
							patchValue: "This is a simple note alias 20"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/resources/0/resourceObject/object/content",
							patchValue: "This is a simple note resource 10"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources/1/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/resources/1/resourceObject/object/content",
							patchValue: "This is a simple note resource 20"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/edges/0/annotationObject/object/content",
							patchValue: "This is a simple note edge 10"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges/1/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/edges/1/annotationObject/object/content",
							patchValue: "This is a simple note edge 20"
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					proofId:
						"immutable-proof:0808080808080808080808080808080808080808080808080808080808080808",
					userIdentity: TEST_USER_IDENTITY
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
				proofId: "immutable-proof:0505050505050505050505050505050505050505050505050505050505050505"
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
				proofId: "immutable-proof:0808080808080808080808080808080808080808080808080808080808080808"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0505050505050505050505050505050505050505050505050505050505050505",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"zFHmZjeHe3B1Mm8de9qRtM5hBTUsAHF2rCpAe8y9CYRZHHWMcrcyXn2JQ58FNwbG74JtggGRybdkaGST6p9XXxRC",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:SgQ71b8Kz9Z1IA7sqG5Y12Db31G0qCXz9Efu0fRf/WQ=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0404040404040404040404040404040404040404040404040404040404040404"
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
						"@context": [
							"https://schema.twindev.org/immutable-proof/",
							"https://schema.twindev.org/common/",
							"https://www.w3.org/ns/credentials/v2"
						],
						id: "0808080808080808080808080808080808080808080808080808080808080808",
						type: "ImmutableProof",
						proof: {
							type: "DataIntegrityProof",
							created: "2024-08-22T11:56:56.272Z",
							cryptosuite: "eddsa-jcs-2022",
							proofPurpose: "assertionMethod",
							proofValue:
								"z215w26Mca1DdVNzRPbpqeLfGFhDTz1hG4RWV45bUD55s29bdL4HDk7KbFAZ4P6zWfHMKzNcXKDaoWXZGuJcFroT7",
							verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
						},
						proofObjectHash: "sha256:Lay6UzXNshiB2hgWfjNiu85qU8N0xQSHpCx5wy94FjQ=",
						proofObjectId:
							"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0707070707070707070707070707070707070707070707070707070707070707"
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
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0505050505050505050505050505050505050505050505050505050505050505",
			type: "ImmutableProof",
			proofObjectHash: "sha256:SgQ71b8Kz9Z1IA7sqG5Y12Db31G0qCXz9Efu0fRf/WQ=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0404040404040404040404040404040404040404040404040404040404040404",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"zFHmZjeHe3B1Mm8de9qRtM5hBTUsAHF2rCpAe8y9CYRZHHWMcrcyXn2JQ58FNwbG74JtggGRybdkaGST6p9XXxRC",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			proofObjectHash: "sha256:Lay6UzXNshiB2hgWfjNiu85qU8N0xQSHpCx5wy94FjQ=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0707070707070707070707070707070707070707070707070707070707070707",
			id: "0808080808080808080808080808080808080808080808080808080808080808",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z215w26Mca1DdVNzRPbpqeLfGFhDTz1hG4RWV45bUD55s29bdL4HDk7KbFAZ4P6zWfHMKzNcXKDaoWXZGuJcFroT7",
				verificationMethod: `${TEST_ORGANIZATION_IDENTITY}#immutable-proof-assertion`
			}
		});
	});

	test("Can remove the verifiable storage for a vertex", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create({
			aliases: [{ id: "foo123" }, { id: "bar456" }]
		});

		await waitForProofGeneration();

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore.length).toEqual(1);

		await service.removeVerifiable(id);

		const result = await service.get(id, {
			includeChangesets: true,
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
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
					dateCreated: expect.any(String),
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: expect.any(String) },
								{ id: "bar456", dateCreated: expect.any(String) }
							]
						}
					],
					verification: {
						type: "ImmutableProofVerification",
						verified: false,
						failure: "proofMissing"
					},
					userIdentity: TEST_USER_IDENTITY
				}
			],
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			verified: false
		});

		expect(immutableStore.length).toEqual(0);
	});

	test("Can query for a vertex by id", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		await service.create({});
		await service.create({});

		const results = await service.query({ id: "0" });

		expect(results).toEqual({
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
		const service = new AuditableItemGraphService({ config: {} });
		await service.create({
			aliases: [{ id: "foo123" }, { id: "bar123" }]
		});
		await service.create({
			aliases: [{ id: "foo456" }, { id: "bar456" }]
		});

		const results = await service.query({ id: "foo" });
		expect(results).toEqual({
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
		const service = new AuditableItemGraphService({ config: {} });
		await service.create({
			aliases: [{ id: "foo1" }]
		});
		await service.create({});

		const results = await service.query({ id: "1" });
		expect(results).toEqual({
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
		const service = new AuditableItemGraphService({ config: {} });
		await service.create({
			aliases: [{ id: "foo5" }]
		});
		await service.create({});

		const results = await service.query({ id: "5", idMode: "id" });
		expect(results).toEqual({
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
		const service = new AuditableItemGraphService({ config: {} });
		await service.create({
			aliases: [{ id: "foo4" }]
		});
		await service.create({});

		await waitForProofGeneration();

		const results = await service.query({ id: "4", idMode: "alias" });
		expect(results).toEqual({
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
		const service = new AuditableItemGraphService({ config: {} });
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

		const results = await service.query({ includesResourceTypes: ["Create", "Delete"] });
		expect(results).toEqual({
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
		const service = new AuditableItemGraphService({ config: {} });
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

		const results = await service.query(undefined, [
			{
				property: "annotationObject.id",
				value: "http://example.org/notes/1",
				comparison: ComparisonOperator.Equals
			}
		]);
		expect(results).toEqual({
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
		const service = new AuditableItemGraphService({ config: {} });
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
