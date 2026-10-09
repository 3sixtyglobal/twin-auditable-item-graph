// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property, SortDirection } from "@3sixty/entity";
import type { AuditableItemGraphPatch } from "./auditableItemGraphPatch.js";

/**
 * Class describing a set of updates to the vertex.
 */
@entity()
export class AuditableItemGraphChangeset {
	/**
	 * The id of the changeset.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The vertex the changeset belongs to.
	 */
	@property({
		type: "string",
		maxLength: 255,
		isSecondary: true,
		indexGroup: [{ name: "vertexDate", direction: SortDirection.Ascending, index: 0 }]
	})
	public vertexId!: string;

	/**
	 * The date/time of when the changeset was created.
	 */
	@property({
		type: "string",
		format: "date-time",
		sortDirection: SortDirection.Descending,
		indexGroup: [{ name: "vertexDate", direction: SortDirection.Ascending, index: 1 }]
	})
	public dateCreated!: string;

	/**
	 * The identity of the user who made the changeset.
	 */
	@property({ type: "string", maxLength: 255, optional: true })
	public userIdentity?: string;

	/**
	 * The patches in the changeset.
	 */
	@property({ type: "array", itemTypeRef: "AuditableItemGraphPatch" })
	public patches!: AuditableItemGraphPatch[];

	/**
	 * The immutable proof id which contains the signature for this changeset.
	 */
	@property({ type: "string", maxLength: 255, optional: true })
	public proofId?: string;

	/**
	 * The version number of the vertex after this changeset was applied.
	 */
	@property({ type: "integer", optional: true, isSecondary: true })
	public version?: number;
}
