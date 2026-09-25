// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Converter, Is, JsonHelper, ObjectHelper } from "@twin.org/core";
import { Blake2b } from "@twin.org/crypto";
import type { AuditableItemGraphVertexIndex } from "../entities/auditableItemGraphVertexIndex.js";

/**
 * Helper methods for building auditable item graph vertex index entries.
 */
export class AuditableItemGraphVertexIndexHelper {
	/**
	 * Create the index entry for one type and value of a vertex. The value is case folded and
	 * hashed, and the id is derived from the content so the same entry always produces the same id.
	 * The modification date is excluded from the id as it is optional and changes over time.
	 * @param vertexId The id of the vertex the entry refers to.
	 * @param type The index type.
	 * @param value The index value.
	 * @param dateCreated The creation date of the vertex.
	 * @param dateModified The modification date of the vertex.
	 * @returns The index entry.
	 */
	public static createIndexEntry(
		vertexId: string,
		type: string,
		value: string,
		dateCreated: string,
		dateModified?: string
	): AuditableItemGraphVertexIndex {
		const foldedValue = AuditableItemGraphVertexIndexHelper.foldValue(value);

		const entry: Omit<AuditableItemGraphVertexIndex, "id" | "dateModified"> = {
			vertexId,
			type,
			value: foldedValue ?? value,
			valueHash: AuditableItemGraphVertexIndexHelper.hashValue(foldedValue) ?? "",
			dateCreated
		};

		return {
			id: Converter.bytesToHex(
				Blake2b.sum256(ObjectHelper.toBytes(JsonHelper.canonicalize(entry)))
			),
			...entry,
			dateModified
		};
	}

	/**
	 * Hash an index value so the composite index key has a fixed size whatever the value length.
	 * The value is case folded first so lookups are case insensitive.
	 * @param value The value to hash.
	 * @returns The base64 url encoded Blake2b-160 hash, or undefined when there is no value.
	 */
	public static hashValue(value?: string): string | undefined {
		const folded = AuditableItemGraphVertexIndexHelper.foldValue(value);
		return Is.stringValue(folded)
			? Converter.bytesToBase64Url(Blake2b.sum160(Converter.utf8ToBytes(folded)))
			: undefined;
	}

	/**
	 * Case fold an index value.
	 * @param value The value to fold.
	 * @returns The lower cased value, or undefined when there is no value.
	 * @internal
	 */
	private static foldValue(value?: string): string | undefined {
		return Is.stringValue(value) ? value.toLowerCase() : undefined;
	}
}
