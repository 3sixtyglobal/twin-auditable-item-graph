// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property, SortDirection } from "@3sixty/entity";

/**
 * Class describing the auditable item graph vertex index.
 *
 * The composite index is built on a fixed length hash of the value rather than the value itself,
 * so its key stays within the size limit some databases place on an index key however long the
 * value is.
 */
@entity()
export class AuditableItemGraphVertexIndex {
	/**
	 * The id of the index.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The id of the vertex this index refers to.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true })
	public vertexId!: string;

	/**
	 * Index type.
	 */
	@property({
		type: "string",
		maxLength: 32,
		isSecondary: true,
		indexGroup: [{ name: "typeValue", direction: SortDirection.Ascending, index: 0 }]
	})
	public type!: string;

	/**
	 * Index value, case folded so lookups do not depend on the column collation.
	 */
	@property({ type: "string", maxLength: 255 })
	public value!: string;

	/**
	 * The hash of the value, used for exact lookups.
	 */
	@property({
		type: "string",
		maxLength: 27,
		isSecondary: true,
		indexGroup: [{ name: "typeValue", direction: SortDirection.Ascending, index: 1 }]
	})
	public valueHash!: string;

	/**
	 * The date/time of when the vertex was created, copied so the index can order and page its
	 * own matches without reading the vertex.
	 */
	@property({
		type: "string",
		format: "date-time",
		sortDirection: SortDirection.Descending,
		indexGroup: [{ name: "typeValue", direction: SortDirection.Descending, index: 2 }]
	})
	public dateCreated!: string;

	/**
	 * The date/time of when the vertex was last modified, copied so a query ordered by the
	 * modified date can also be paged from the index.
	 */
	@property({
		type: "string",
		format: "date-time",
		sortDirection: SortDirection.Descending,
		optional: true
	})
	public dateModified?: string;
}
