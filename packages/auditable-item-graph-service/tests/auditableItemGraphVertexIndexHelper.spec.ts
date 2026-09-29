// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Converter } from "@twin.org/core";
import { Blake2b } from "@twin.org/crypto";
import { AuditableItemGraphVertexIndexHelper } from "../src/utils/auditableItemGraphVertexIndexHelper.js";

const VERTEX_ID = "0101010101010101010101010101010101010101010101010101010101010101";
const DATE_CREATED = "2026-01-01T00:00:00.000Z";
const DATE_MODIFIED = "2026-01-02T00:00:00.000Z";

/**
 * Hash a value independently of the helper.
 * @param value The value to hash.
 * @returns The base64 url encoded Blake2b-160 hash.
 */
function expectedHash(value: string): string {
	return Converter.bytesToBase64Url(Blake2b.sum160(Converter.utf8ToBytes(value)));
}

describe("AuditableItemGraphVertexIndexHelper", () => {
	test("should hash a value as base64 url encoded Blake2b-160", () => {
		const hash = AuditableItemGraphVertexIndexHelper.hashValue("urn:alias:foo");

		expect(hash).toEqual(expectedHash("urn:alias:foo"));
		expect(hash).toHaveLength(27);
	});

	test("should hash a value case insensitively", () => {
		expect(AuditableItemGraphVertexIndexHelper.hashValue("URN:Alias:Foo")).toEqual(
			AuditableItemGraphVertexIndexHelper.hashValue("urn:alias:foo")
		);
	});

	test("should not hash an absent or empty value", () => {
		expect(AuditableItemGraphVertexIndexHelper.hashValue()).toBeUndefined();
		expect(AuditableItemGraphVertexIndexHelper.hashValue("")).toBeUndefined();
	});

	test("should create an index entry with a case folded value and its hash", () => {
		const entry = AuditableItemGraphVertexIndexHelper.createIndexEntry(
			VERTEX_ID,
			"alias",
			"MixedCaseAlias",
			DATE_CREATED,
			DATE_MODIFIED
		);

		expect(entry).toEqual({
			id: expect.stringMatching(/^[\da-f]{64}$/),
			vertexId: VERTEX_ID,
			type: "alias",
			value: "mixedcasealias",
			valueHash: expectedHash("mixedcasealias"),
			dateCreated: DATE_CREATED,
			dateModified: DATE_MODIFIED
		});
	});

	test("should derive the same id for the same entry regardless of case", () => {
		const lower = AuditableItemGraphVertexIndexHelper.createIndexEntry(
			VERTEX_ID,
			"alias",
			"foo",
			DATE_CREATED,
			DATE_MODIFIED
		);
		const upper = AuditableItemGraphVertexIndexHelper.createIndexEntry(
			VERTEX_ID,
			"alias",
			"FOO",
			DATE_CREATED,
			DATE_MODIFIED
		);

		expect(upper.id).toEqual(lower.id);
	});

	test("should derive a different id when any field differs", () => {
		const base = AuditableItemGraphVertexIndexHelper.createIndexEntry(
			VERTEX_ID,
			"alias",
			"foo",
			DATE_CREATED,
			DATE_MODIFIED
		);
		const variants = [
			AuditableItemGraphVertexIndexHelper.createIndexEntry(
				"0202020202020202020202020202020202020202020202020202020202020202",
				"alias",
				"foo",
				DATE_CREATED,
				DATE_MODIFIED
			),
			AuditableItemGraphVertexIndexHelper.createIndexEntry(
				VERTEX_ID,
				"resourceType",
				"foo",
				DATE_CREATED,
				DATE_MODIFIED
			),
			AuditableItemGraphVertexIndexHelper.createIndexEntry(
				VERTEX_ID,
				"alias",
				"bar",
				DATE_CREATED,
				DATE_MODIFIED
			),
			AuditableItemGraphVertexIndexHelper.createIndexEntry(
				VERTEX_ID,
				"alias",
				"foo",
				DATE_MODIFIED,
				DATE_MODIFIED
			)
		];

		for (const variant of variants) {
			expect(variant.id).not.toEqual(base.id);
		}
	});

	test("should derive the same id regardless of the modification date", () => {
		const base = AuditableItemGraphVertexIndexHelper.createIndexEntry(
			VERTEX_ID,
			"alias",
			"foo",
			DATE_CREATED,
			DATE_MODIFIED
		);
		const modified = AuditableItemGraphVertexIndexHelper.createIndexEntry(
			VERTEX_ID,
			"alias",
			"foo",
			DATE_CREATED,
			DATE_CREATED
		);
		const unmodified = AuditableItemGraphVertexIndexHelper.createIndexEntry(
			VERTEX_ID,
			"alias",
			"foo",
			DATE_CREATED
		);

		expect(modified.id).toEqual(base.id);
		expect(unmodified.id).toEqual(base.id);
		expect(modified.dateModified).toEqual(DATE_CREATED);
		expect(unmodified.dateModified).toBeUndefined();
	});
});
