// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Converter, RandomHelper } from "@twin.org/core";
import { Bip39 } from "@twin.org/crypto";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import {
	EntityStorageIdentityConnector,
	type IdentityDocument,
	initSchema as initSchemaIdentity
} from "@twin.org/identity-connector-entity-storage";
import { IdentityConnectorFactory } from "@twin.org/identity-models";
import { nameof } from "@twin.org/nameof";
import {
	EntityStorageVaultConnector,
	initSchema as initSchemaVault,
	type VaultKey,
	type VaultSecret
} from "@twin.org/vault-connector-entity-storage";
import { VaultConnectorFactory, VaultKeyType } from "@twin.org/vault-models";
import * as dotenv from "dotenv";

console.debug("Setting up test environment from .env and .env.dev files");

dotenv.config({
	path: [path.join(__dirname, ".env.dev"), path.join(__dirname, ".env")],
	quiet: true
});

const TEST_FOLDER = "./tests/.tmp";

initSchemaVault();
initSchemaIdentity();

EntityStorageConnectorFactory.register(
	"vault-key",
	() =>
		new MemoryEntityStorageConnector<VaultKey>({
			entitySchema: nameof<VaultKey>(),
			config: { storageKey: "vault-key" }
		})
);
const secretEntityStorage = new MemoryEntityStorageConnector<VaultSecret>({
	entitySchema: nameof<VaultSecret>(),
	config: { storageKey: "vault-secret" }
});
EntityStorageConnectorFactory.register("vault-secret", () => secretEntityStorage);

const identityDocumentEntityStorage = new MemoryEntityStorageConnector<IdentityDocument>({
	entitySchema: nameof<IdentityDocument>(),
	config: { storageKey: "identity-document" }
});
EntityStorageConnectorFactory.register("identity-document", () => identityDocumentEntityStorage);

const TEST_VAULT_CONNECTOR = new EntityStorageVaultConnector();
VaultConnectorFactory.register("vault", () => TEST_VAULT_CONNECTOR);

export const TEST_IDENTITY_CONNECTOR = new EntityStorageIdentityConnector();
IdentityConnectorFactory.register("identity", () => TEST_IDENTITY_CONNECTOR);

export let TEST_NODE_IDENTITY: string;
export let TEST_TENANT_IDENTITY: string;
export let TEST_TENANT_IDENTITY_SHORT: string;
export let TEST_ORGANIZATION_IDENTITY: string;
export let TEST_USER_IDENTITY: string;
export let TEST_VAULT_KEY: string;

/**
 * Setup the test environment.
 */
export async function setupTestEnv(): Promise<void> {
	await cleanupTestEnv();
	await mkdir(TEST_FOLDER, { recursive: true });

	let counter = 1;
	RandomHelper.generate = vi
		.fn()
		.mockImplementation(length => new Uint8Array(length).fill(counter++));
	Bip39.randomMnemonic = vi
		.fn()
		.mockImplementation(
			() =>
				"elder blur tip exact organ pipe other same minute grace conduct father brother prosper tide icon pony suggest joy provide dignity domain nominee liquid"
		);

	const testIdentityConnector = IdentityConnectorFactory.get("identity");
	const testVaultConnector = VaultConnectorFactory.get("vault");

	const didNode = await testIdentityConnector.createDocument("test-node-identity");
	const didOrganisation = await testIdentityConnector.createDocument("test-organisation-identity");
	const didUser = await testIdentityConnector.createDocument("test-user-identity");

	await testIdentityConnector.addVerificationMethod(
		"test-organisation-identity",
		didOrganisation.id,
		"assertionMethod",
		"immutable-proof-assertion"
	);

	TEST_NODE_IDENTITY = didNode.id;
	TEST_ORGANIZATION_IDENTITY = didOrganisation.id;
	TEST_TENANT_IDENTITY = "a".repeat(32);
	TEST_TENANT_IDENTITY_SHORT = Converter.bytesToBase64Url(
		Converter.hexToBytes(TEST_TENANT_IDENTITY)
	);
	TEST_USER_IDENTITY = didUser.id;
	TEST_VAULT_KEY = `${TEST_NODE_IDENTITY}/immutable-proof-hash`;

	await testVaultConnector.addKey(
		TEST_VAULT_KEY,
		VaultKeyType.Ed25519,
		Converter.base64ToBytes("p519gRazpBYvzqviRrFRBUT+ZNRZ24FYgOLcGO+Nj4Q="),
		Converter.base64ToBytes("DzFGb9pwkyom+MGrKeVCAV2CMEiy04z9bJLj48XGjWw=")
	);
}

/**
 * Cleanup the test environment.
 */
export async function cleanupTestEnv(): Promise<void> {
	try {
		await rm(TEST_FOLDER, { recursive: true });
	} catch {}
}
