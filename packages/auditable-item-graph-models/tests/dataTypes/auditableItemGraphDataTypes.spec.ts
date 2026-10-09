// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IValidationFailure } from "@3sixty/core";
import { DataTypeHelper } from "@3sixty/data-core";
import { JsonLdDataTypes } from "@3sixty/data-json-ld";
import { AuditableItemGraphDataTypes } from "../../src/dataTypes/auditableItemGraphDataTypes.js";
import { AuditableItemGraphAuditMode } from "../../src/models/auditableItemGraphAuditMode.js";
import { AuditableItemGraphContexts } from "../../src/models/auditableItemGraphContexts.js";
import { AuditableItemGraphTypes } from "../../src/models/auditableItemGraphTypes.js";

describe("AuditableItemGraphDataTypes", () => {
	beforeAll(async () => {
		JsonLdDataTypes.registerTypes();
		AuditableItemGraphDataTypes.registerTypes();
	});

	test("Can fail to validate an empty vertex", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			`${AuditableItemGraphContexts.Namespace}${AuditableItemGraphTypes.Vertex}`,
			{},
			validationFailures
		);
		expect(validationFailures.length).toEqual(3);
		expect(isValid).toEqual(false);
	});

	test("Can validate an empty vertex", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			`${AuditableItemGraphContexts.Namespace}${AuditableItemGraphTypes.Vertex}`,
			{
				"@context": [
					AuditableItemGraphContexts.Namespace,
					AuditableItemGraphContexts.NamespaceCommon
				],
				type: AuditableItemGraphTypes.Vertex,
				dateCreated: new Date().toISOString(),
				id: "1111"
			},
			validationFailures
		);
		expect(validationFailures.length).toEqual(0);
		expect(isValid).toEqual(true);
	});

	test("Can validate a bypass vertex", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			`${AuditableItemGraphContexts.Namespace}${AuditableItemGraphTypes.Vertex}`,
			{
				"@context": [
					AuditableItemGraphContexts.Namespace,
					AuditableItemGraphContexts.NamespaceCommon
				],
				type: AuditableItemGraphTypes.Vertex,
				dateCreated: new Date().toISOString(),
				id: "1111",
				auditMode: AuditableItemGraphAuditMode.Bypass
			},
			validationFailures
		);
		expect(validationFailures.length).toEqual(0);
		expect(isValid).toEqual(true);
	});

	test("Can fail to validate a vertex with an unknown audit mode", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			`${AuditableItemGraphContexts.Namespace}${AuditableItemGraphTypes.Vertex}`,
			{
				"@context": [
					AuditableItemGraphContexts.Namespace,
					AuditableItemGraphContexts.NamespaceCommon
				],
				type: AuditableItemGraphTypes.Vertex,
				dateCreated: new Date().toISOString(),
				id: "1111",
				auditMode: "sometimes"
			},
			validationFailures
		);
		expect(validationFailures.length).toBeGreaterThan(0);
		expect(isValid).toEqual(false);
	});
});
