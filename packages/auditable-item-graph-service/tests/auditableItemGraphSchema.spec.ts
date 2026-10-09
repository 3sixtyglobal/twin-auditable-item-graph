// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Is } from "@3sixty/core";
import { EntitySchemaHelper, SortDirection } from "@3sixty/entity";
import { AuditableItemGraphChangeset } from "../src/entities/auditableItemGraphChangeset.js";
import { AuditableItemGraphVertexIndex } from "../src/entities/auditableItemGraphVertexIndex.js";

/**
 * The longest string length MySQL can index in full, above this the connector falls back to
 * indexing a prefix of the column which cannot be covering or serve an order by.
 */
const MAX_FULLY_INDEXABLE_LENGTH = 255;

describe("AuditableItemGraphChangeset schema", () => {
	test("Declares a composite index covering the changeset filter and sort columns", async () => {
		const schema = EntitySchemaHelper.getSchema(AuditableItemGraphChangeset);

		// getIndexGroups validates the declarations and throws on a malformed group, the
		// connectors which build the index are the only other callers.
		const indexGroups = EntitySchemaHelper.getIndexGroups(schema);

		expect(Object.keys(indexGroups)).toEqual(["vertexDate"]);
		expect(
			indexGroups.vertexDate.map(entry => ({
				property: entry.property.property,
				direction: entry.direction
			}))
		).toEqual([
			{ property: "vertexId", direction: SortDirection.Ascending },
			{ property: "dateCreated", direction: SortDirection.Ascending }
		]);
	});
});

describe("AuditableItemGraphVertexIndex schema", () => {
	test("Declares a composite index covering the type and value lookups", async () => {
		const schema = EntitySchemaHelper.getSchema(AuditableItemGraphVertexIndex);
		const indexGroups = EntitySchemaHelper.getIndexGroups(schema);

		expect(Object.keys(indexGroups)).toEqual(["typeValue"]);
		expect(
			indexGroups.typeValue.map(entry => ({
				property: entry.property.property,
				direction: entry.direction
			}))
		).toEqual([
			{ property: "type", direction: SortDirection.Ascending },
			{ property: "valueHash", direction: SortDirection.Ascending },
			{ property: "dateCreated", direction: SortDirection.Descending }
		]);
	});

	test("Keeps the composite index key within the MySQL key limit", async () => {
		// MySQL leads every index with a 255 character partition key and counts 4 bytes per
		// utf8mb4 character, against a 3072 byte limit on the key.
		const bytesPerChar = 4;
		const schema = EntitySchemaHelper.getSchema(AuditableItemGraphVertexIndex);
		const typeValue = EntitySchemaHelper.getIndexGroups(schema).typeValue;
		const keyChars = typeValue.reduce(
			(total, { property }) =>
				total +
				(property.maxLength ??
					(Is.stringValue(property.format)
						? EntitySchemaHelper.FORMAT_MAX_LENGTHS[property.format]
						: 0)),
			255
		);

		expect(keyChars * bytesPerChar).toBeLessThanOrEqual(3072);
	});

	test("Indexes the vertexId written on every vertex persist", async () => {
		const schema = EntitySchemaHelper.getSchema(AuditableItemGraphVertexIndex);
		const vertexId = schema.properties?.find(p => p.property === "vertexId");

		expect(vertexId?.isSecondary).toEqual(true);
	});

	test("Bounds every indexed string so it is indexed in full rather than by prefix", async () => {
		const schema = EntitySchemaHelper.getSchema(AuditableItemGraphVertexIndex);

		for (const property of schema.properties ?? []) {
			if (property.type === "string") {
				// Mirrors how the connector sizes the column, an explicit maxLength wins and a
				// format supplies the default, anything unbounded becomes LONGTEXT.
				const effectiveLength =
					property.maxLength ??
					(Is.stringValue(property.format)
						? EntitySchemaHelper.FORMAT_MAX_LENGTHS[property.format]
						: undefined);

				expect(effectiveLength).toBeDefined();
				expect(effectiveLength).toBeLessThanOrEqual(MAX_FULLY_INDEXABLE_LENGTH);
			}
		}
	});
});
