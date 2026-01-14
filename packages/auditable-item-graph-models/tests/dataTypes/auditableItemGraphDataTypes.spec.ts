// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IValidationFailure } from "@twin.org/core";
import { DataTypeHelper } from "@twin.org/data-core";
import { JsonLdDataTypes } from "@twin.org/data-json-ld";
import { AuditableItemGraphDataTypes } from "../../src/dataTypes/auditableItemGraphDataTypes.js";
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
		expect(validationFailures.length).toEqual(1);
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
});
