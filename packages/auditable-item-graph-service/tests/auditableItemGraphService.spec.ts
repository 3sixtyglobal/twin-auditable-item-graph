// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { VerifyDepth } from "@twin.org/auditable-item-graph-models";
import {
	type BackgroundTask,
	EntityStorageBackgroundTaskConnector,
	initSchema as initSchemaBackgroundTask
} from "@twin.org/background-task-connector-entity-storage";
import { BackgroundTaskConnectorFactory } from "@twin.org/background-task-models";
import { ComponentFactory, Converter, ObjectHelper, RandomHelper } from "@twin.org/core";
import { ComparisonOperator } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
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
	TEST_USER_IDENTITY
} from "./setupTestEnv";
import { AuditableItemGraphService } from "../src/auditableItemGraphService";
import type { AuditableItemGraphChangeset } from "../src/entities/auditableItemGraphChangeset";
import type { AuditableItemGraphVertex } from "../src/entities/auditableItemGraphVertex";
import { initSchema } from "../src/schema";

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

		// Mock the module helper to execute the method in the same thread, so we don't have to create an engine
		ModuleHelper.execModuleMethodThread = vi
			.fn()
			.mockImplementation(async (module, method, args) =>
				ModuleHelper.execModuleMethod(module, method, args)
			);
	});

	afterAll(async () => {
		await cleanupTestEnv();
	});

	beforeEach(async () => {
		vertexStorage = new MemoryEntityStorageConnector<AuditableItemGraphVertex>({
			entitySchema: nameof<AuditableItemGraphVertex>()
		});

		changesetStorage = new MemoryEntityStorageConnector<AuditableItemGraphChangeset>({
			entitySchema: nameof<AuditableItemGraphChangeset>()
		});

		EntityStorageConnectorFactory.register("auditable-item-graph-vertex", () => vertexStorage);
		EntityStorageConnectorFactory.register(
			"auditable-item-graph-changeset",
			() => changesetStorage
		);

		verifiableStorage = new MemoryEntityStorageConnector<VerifiableItem>({
			entitySchema: nameof<VerifiableItem>()
		});
		EntityStorageConnectorFactory.register("verifiable-item", () => verifiableStorage);

		VerifiableStorageConnectorFactory.register(
			"verifiable-storage",
			() => new EntityStorageVerifiableStorageConnector()
		);

		immutableProofStorage = new MemoryEntityStorageConnector<ImmutableProof>({
			entitySchema: nameof<ImmutableProof>()
		});
		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofStorage);

		backgroundTaskStorage = new MemoryEntityStorageConnector<BackgroundTask>({
			entitySchema: nameof<BackgroundTask>()
		});
		EntityStorageConnectorFactory.register("background-task", () => backgroundTaskStorage);

		const backgroundTask = new EntityStorageBackgroundTaskConnector();
		BackgroundTaskConnectorFactory.register("background-task", () => backgroundTask);
		await backgroundTask.start(TEST_NODE_IDENTITY);

		const immutableProofService = new ImmutableProofService();
		ComponentFactory.register("immutable-proof", () => immutableProofService);

		Date.now = vi
			.fn()
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementation(() => SECOND_TICK);
		RandomHelper.generate = vi
			.fn()
			.mockImplementationOnce(length => new Uint8Array(length).fill(1))
			.mockImplementationOnce(length => new Uint8Array(length).fill(2))
			.mockImplementationOnce(length => new Uint8Array(length).fill(3))
			.mockImplementationOnce(length => new Uint8Array(length).fill(4))
			.mockImplementationOnce(length => new Uint8Array(length).fill(5))
			.mockImplementationOnce(length => new Uint8Array(length).fill(6))
			.mockImplementationOnce(length => new Uint8Array(length).fill(7))
			.mockImplementationOnce(length => new Uint8Array(length).fill(8))
			.mockImplementationOnce(length => new Uint8Array(length).fill(9))
			.mockImplementationOnce(length => new Uint8Array(length).fill(10))
			.mockImplementation(length => new Uint8Array(length).fill(11));
	});

	test("Can create an instance", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		expect(service).toBeDefined();
	});

	test("Can create a vertex with no properties", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);
		expect(id.startsWith("aig:")).toEqual(true);

		await waitForProofGeneration();

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: expect.any(String),
			nodeIdentity: TEST_NODE_IDENTITY
		});

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toEqual([
			{
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
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6M1ZjdWgyQlA5U2hDNFVFSjN5UlpnY1RKNmdtUnR5ZERyaDZBbVkxekVjaVFxRVdUdlhmQlpOeHhqVHpkSmpUNDRjbW45VkRXYkJIcXhGc1g5ZmpzZlh6SyIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6VlBzSHFnaWdFSVB0QlptWEtzQ2VnU2Q4K25EaWxRcThnbzkrTGtkWWR1Yz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIifQ==",
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
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
			proofObjectHash: "sha256:VPsHqgigEIPtBZmXKsCegSd8+nDilQq8go9+LkdYduc=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				created: "2024-08-22T11:56:56.272Z",
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z3Vcuh2BP9ShC4UEJ3yRZgcTJ6gmRtydDrh6AmY1zEciQqEWTvXfBZNxxjTzdJjT44cmn9VDWbBHqxFsX9fjsfXzK",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: expect.any(String),
			nodeIdentity: TEST_NODE_IDENTITY,
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
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6MzZoMmtRdThFWHpNWVNXdGtaZ3ZjVmpZZXVSVG03OVlyOWRQelZHOGpBU05jakZYUWhlVGU2R1RHYmdvYTNxUGhuZVlyOUdCWGhkQXJqcEY1ZUM3dnB0VSIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6aktVdkhIWjlrcE5DNXVmZ1lwRFY1ZjF0amt6L0pEbExDbW91L3g5OVhQbz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIifQ==",
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
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
			proofObjectHash: "sha256:jKUvHHZ9kpNC5ufgYpDV5f1tjkz/JDlLCmou/x99XPo=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z36h2kQu8EXzMYSWtkZgvcVjYeuRTm79Yr9dPzVG8jASNcjFXQheTe6GTGbgoa3qPhneYr9GBXhdArjpF5eC7vptU",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create a vertex with object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: expect.any(String),
			nodeIdentity: TEST_NODE_IDENTITY,
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
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6Rnlid0FOcmRNbThzampmelBGeGh5WVllN0tZRXJzSkNLQWV1blBFRFp1N3d2RXVoS0xpWHlyTWNhUVY3V1hOR2JIUHNzdFVSd1FmdnE0Q041c2k2b0JvIiwidmVyaWZpY2F0aW9uTWV0aG9kIjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MyNpbW11dGFibGUtcHJvb2YtYXNzZXJ0aW9uIn0sInByb29mT2JqZWN0SGFzaCI6InNoYTI1NjpROFFlZ1o3VkRZenl0MHdnZmRYS0lnUW1rZmZQQ2czZTR6Y3djNW1wcEpNPSIsInByb29mT2JqZWN0SWQiOiJhaWc6MDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTpjaGFuZ2VzZXQ6MDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMiJ9",
				id: "0505050505050505050505050505050505050505050505050505050505050505",
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
			proofObjectHash: "sha256:Q8QegZ7VDYzyt0wgfdXKIgQmkffPCg3e4zcwc5mppJM=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"zFybwANrdMm8sjjfzPFxhyYYe7KYErsJCKAeunPEDZu7wvEuhKLiXyrMcaQV7WXNGbHPsstURwQfvq4CN5si6oBo",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can get a vertex", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id);

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "AuditableItemGraphVertex",
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: expect.any(String),
			nodeIdentity: TEST_NODE_IDENTITY,
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
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
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
			nodeIdentity: TEST_NODE_IDENTITY,
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
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6M3ZnZGhxZXRKVVU2WjlEYXJkTms2eXF4U3ZIQVBqUm5KR2pEdXZzRDl4TkZFM1pmaVVQNGJTVldGTTFoVnJ4OTRzNGkyUVBCQ0Myd2JBUlVHRDJEZEhuSiIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6UWVhb2xYakcwQ1ZDUnpkRzkydnB3a28wL0EwV1c2dVRYQzZwT29pdVBoOD0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIifQ==",
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
			proofObjectHash: "sha256:QeaolXjG0CVCRzdG92vpwko0/A0WW6uTXC6pOoiuPh8=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z3vgdhqetJUU6Z9DardNk6yqxSvHAPjRnJGjDuvsD9xNFE3ZfiUP4bSVWFM1hVrx94s4i2QPBCC2wbARUGD2DdHnJ",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can get a vertex include changesets and verify current signature", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
			nodeIdentity: TEST_NODE_IDENTITY,
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
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6MnJONEs2elpTaVpXell1cHV1U05Oc29UNFl3cnBLb0JEZFQ3ZDFQeDlDbnVLRHd1eEVVUWpqbmlhNktwalgyQ3BMWHBVbUNjTmJvR3ZMY1RKbTNncFNnaSIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6ZllVUFEyY1BTZnJkZXgvc0hzNytUN3k5aDVvSHRGVlhIajV0RmxqUXlkZz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIifQ==",
				id: "0505050505050505050505050505050505050505050505050505050505050505",
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
			proofObjectHash: "sha256:fYUPQ2cPSfrdex/sHs7+T7y9h5oHtFVXHj5tFljQydg=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2rN4K6zZSiZWzYupuuSNNsoT4YwrpKoBDdT7d1Px9CnuKDwuxEUQjjnia6KpjX2CpLXpUmCcNboGvLcTJm3gpSgi",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505",
					proofId:
						"immutable-proof:0606060606060606060606060606060606060606060606060606060606060606"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
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
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6MnJONEs2elpTaVpXell1cHV1U05Oc29UNFl3cnBLb0JEZFQ3ZDFQeDlDbnVLRHd1eEVVUWpqbmlhNktwalgyQ3BMWHBVbUNjTmJvR3ZMY1RKbTNncFNnaSIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6ZllVUFEyY1BTZnJkZXgvc0hzNytUN3k5aDVvSHRGVlhIajV0RmxqUXlkZz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIifQ==",
				id: "0808080808080808080808080808080808080808080808080808080808080808",
				maxAllowListSize: 100
			},
			{
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NHBvSGlvNFNLdVZ4OFBUNDlwcm9XNXRVYU1IZ0FYN2VlYndzenhWcVZLa242TVdWeno5RnRaWUZydTh3R1liVU51TlVKNloyczJxQzRtalBIZEo3V2FnNCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6MGpFRXk5S1Y0L0UzT3BkZkdJNW8wUHZYRzRjaWp0TVRleDJ1R1B5TDZiZz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUifQ==",
				id: "0909090909090909090909090909090909090909090909090909090909090909",
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
			proofObjectHash: "sha256:fYUPQ2cPSfrdex/sHs7+T7y9h5oHtFVXHj5tFljQydg=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2rN4K6zZSiZWzYupuuSNNsoT4YwrpKoBDdT7d1Px9CnuKDwuxEUQjjnia6KpjX2CpLXpUmCcNboGvLcTJm3gpSgi",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
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
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			proofObjectHash: "sha256:0jEEy9KV4/E3OpdfGI5o0PvXG4cijtMTex2uGPyL6bg=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z4poHio4SKuVx8PT49proW5tUaMHgAX7eebwszxVqVKkn6MWVzz9FtZYFru8wGYbUNuNUJ6Z2s2qC4mjPHdJ7Wag4",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6MnJONEs2elpTaVpXell1cHV1U05Oc29UNFl3cnBLb0JEZFQ3ZDFQeDlDbnVLRHd1eEVVUWpqbmlhNktwalgyQ3BMWHBVbUNjTmJvR3ZMY1RKbTNncFNnaSIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6ZllVUFEyY1BTZnJkZXgvc0hzNytUN3k5aDVvSHRGVlhIajV0RmxqUXlkZz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIifQ==",
				id: "0808080808080808080808080808080808080808080808080808080808080808",
				maxAllowListSize: 100
			},
			{
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NGd0bTM5OU50dnEyTXpTdTd4UWgyWTJKcjF6MWNKYVphaHZwR1Y2VTJodDduZ3BQellHdFN1empuaUtQdkRjRjUyOVozZnV1YkFaUGtXZXVvcUx3eWVTcCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6SWIrS3U5bk1XYkhrWG9oMWxhb05tZjBLUFZ4dkpmcG4vMGZIc05oYUxkQT0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUifQ==",
				id: "0909090909090909090909090909090909090909090909090909090909090909",
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
			proofObjectHash: "sha256:fYUPQ2cPSfrdex/sHs7+T7y9h5oHtFVXHj5tFljQydg=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2rN4K6zZSiZWzYupuuSNNsoT4YwrpKoBDdT7d1Px9CnuKDwuxEUQjjnia6KpjX2CpLXpUmCcNboGvLcTJm3gpSgi",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
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
			proofObjectHash: "sha256:Ib+Ku9nMWbHkXoh1laoNmf0KPVxvJfpn/0fHsNhaLdA=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505",
			id: "0606060606060606060606060606060606060606060606060606060606060606",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z4gtm399Ntvq2MzSu7xQh2Y2Jr1z1cJaZahvpGV6U2ht7ngpPzYGtSuzjniKPvDcF529Z3fuubAZPkWeuoqLwyeSp",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update and verify resources, aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
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
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NFZpR0U2MjIyN2lmbmZCY1phMmJKUDhxd3RWNUxqRDNINzJnM2FkQ2tkQTFQQ2JUSDlxbjdEdExHSGlHV0NjUVRaYVpqN1ZiWWJpTUs2dkNkYW1Bd1lUQyIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6d3R2aFVyL3FEcFFUcTBVaDhVZld0MzVZMjE5OFgyY2hxdFNlVDFqK1BSQT0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIifQ==",
				id: "0808080808080808080808080808080808080808080808080808080808080808",
				maxAllowListSize: 100
			},
			{
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYwNjA2MDYiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NTkxVnFITDFHR0dBeFZ0aDFxVHdSa05GRVNwQjhNemNUaXdRMkxxdVVoNDlmUDh0cVdZQVRTNDZUZ2lYcHNrdHZoWTQ3OWF4TU5jMkE5Q0NXYzRZQUpkQyIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6VHJZOUUyS3IrU1lyY0VwU1p6UjNaRWg0VHBRUksyOU5Ob05Pa3JsUU11bz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUifQ==",
				id: "0909090909090909090909090909090909090909090909090909090909090909",
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
			proofObjectHash: "sha256:wtvhUr/qDpQTq0Uh8UfWt35Y2198X2chqtSeT1j+PRA=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z4ViGE62227ifnfBcZa2bJP8qwtV5LjD3H72g3adCkdA1PCbTH9qn7DtLGHiGWCcQTZaZj7VbYbiMK6vCdamAwYTC",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
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
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z591VqHL1GGGAxVth1qTwRkNFESpB8MzcTiwQ2LquUh49fP8tqWYATS46TgiXpsktvhY479axMNc2A9CCWc4YAJdC",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			},
			proofObjectHash: "sha256:TrY9E2Kr+SYrcEpSZzR3ZEh4TpQRK29NNoNOkrlQMuo=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0505050505050505050505050505050505050505050505050505050505050505"
		});
	});

	test("Can create and update and verify edges", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
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
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
		const id = await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
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
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				id: "0707070707070707070707070707070707070707070707070707070707070707",
				dateCreated: expect.any(String),
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6NUg0amE4TUVhWDVhMzRWVWdvendldzZpeUVRRUVBVzVXc0ZDQTlVQkZqVEpXbVFRUGFSZTczTmp4bkhjQ25KeFJIcHZtQXozbjdYbXNqeHp6eTFQa3VtaCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6SEpHVlhXOXhNblFtR2w0SGx3TnNrekNSNFJPRlp4K3A4eWZ5WlY5UElXOD0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQifQ==",
				id: "0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a",
				maxAllowListSize: 100
			},
			{
				allowList: [
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
				],
				creator:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEudHdpbmRldi5vcmcvY29tbW9uLyIsImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiJdLCJpZCI6IjA4MDgwODA4MDgwODA4MDgwODA4MDgwODA4MDgwODA4MDgwODA4MDgwODA4MDgwODA4MDgwODA4MDgwODA4MDgiLCJ0eXBlIjoiSW1tdXRhYmxlUHJvb2YiLCJub2RlSWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzIiwidXNlcklkZW50aXR5IjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1OCIsInByb29mIjp7InR5cGUiOiJEYXRhSW50ZWdyaXR5UHJvb2YiLCJjcmVhdGVkIjoiMjAyNC0wOC0yMlQxMTo1Njo1Ni4yNzJaIiwiY3J5cHRvc3VpdGUiOiJlZGRzYS1qY3MtMjAyMiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInByb29mVmFsdWUiOiJ6M3draE5qNjV0UEdNUWo1ZGl5cnNFNDRUdk1wQUw4aHZBNW02SE5VazZXTGhSc1h4TGVFSGpVQnlHbUdpcG9WdWoybTJwVlJEY1BxY01iVnV3dzFka3lXZCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mLWFzc2VydGlvbiJ9LCJwcm9vZk9iamVjdEhhc2giOiJzaGEyNTY6YkYzc2hHd2cycERGWlBmUjE1UFVkZjRaNzFwTkJhVVdzd1puNmFIMVFRcz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjA3MDcwNzA3MDcwNzA3MDcwNzA3MDcwNzA3MDcwNzA3MDcwNzA3MDcwNzA3MDcwNzA3MDcwNzA3MDcwNzA3MDcifQ==",
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
			id: "0505050505050505050505050505050505050505050505050505050505050505",
			type: "ImmutableProof",
			proofObjectHash: "sha256:HJGVXW9xMnQmGl4HlwNskzCR4ROFZx+p8yfyZV9PIW8=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0404040404040404040404040404040404040404040404040404040404040404",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z5H4ja8MEaX5a34VUgozwew6iyEQEEAW5WsFCA9UBFjTJWmQQPaRe73NjxnHcCnJxRHpvmAz3n7Xmsjxzzy1Pkumh",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
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
			proofObjectHash: "sha256:bF3shGwg2pDFZPfR15PUdf4Z71pNBaUWswZn6aH1QQs=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0707070707070707070707070707070707070707070707070707070707070707",
			id: "0808080808080808080808080808080808080808080808080808080808080808",
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z3wkhNj65tPGMQj5diyrsE44TvMpAL8hvA5m6HNUk6WLhRsXxLeEHjUByGmGipoVuj2m2pVRDcPqcMbVuww1dkyWd",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can remove the verifiable storage for a vertex", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration();

		const immutableStore = verifiableStorage.getStore();
		expect(immutableStore.length).toEqual(1);

		await service.removeVerifiable(id, TEST_NODE_IDENTITY);

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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: false
		});

		expect(immutableStore.length).toEqual(0);
	});

	test("Can query for a vertex by id", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);

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
		await service.create(
			{
				aliases: [{ id: "foo123" }, { id: "bar123" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			{
				aliases: [{ id: "foo456" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
		await service.create(
			{
				aliases: [{ id: "foo1" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);

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
		await service.create(
			{
				aliases: [{ id: "foo5" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);

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
		await service.create(
			{
				aliases: [{ id: "foo4" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);

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
		await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
		await service.create(
			{
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
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

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
		const id = await service.create(
			{
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		await expect(
			service.create(
				{
					aliases: [{ id: "foo123", unique: true }, { id: "bar456" }]
				},
				TEST_USER_IDENTITY,
				TEST_NODE_IDENTITY
			)
		).rejects.toMatchObject({
			message: "auditableItemGraphService.createFailed",
			cause: {
				message: "auditableItemGraphService.aliasNotUnique"
			}
		});
	});
});
