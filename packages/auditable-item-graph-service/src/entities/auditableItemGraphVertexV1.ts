// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemGraphAuditMode } from "@twin.org/auditable-item-graph-models";
import { JsonLdTypes, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import { entity, property, SortDirection } from "@twin.org/entity";
import type { AuditableItemGraphAlias } from "./auditableItemGraphAlias.js";
import type { AuditableItemGraphEdge } from "./auditableItemGraphEdge.js";
import type { AuditableItemGraphResource } from "./auditableItemGraphResource.js";

/**
 * Class describing the auditable item graph vertex.
 */
@entity({ version: 1 })
export class AuditableItemGraphVertexV1 {
	/**
	 * The id of the vertex.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The identity of the organization which controls the vertex.
	 */
	@property({ type: "string" })
	public organizationIdentity!: string;

	/**
	 * The date/time of when the vertex was created.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Descending })
	public dateCreated!: string;

	/**
	 * The date/time of when the vertex was last modified.
	 */
	@property({
		type: "string",
		format: "date-time",
		sortDirection: SortDirection.Descending,
		optional: true
	})
	public dateModified?: string;

	/**
	 * How the mutations of the vertex are recorded, when absent the vertex behaves as audited.
	 */
	@property({ type: "string", optional: true })
	public auditMode?: AuditableItemGraphAuditMode;

	/**
	 * Combined alias index for the vertex used for querying.
	 */
	@property({ type: "string", isSecondary: true, optional: true })
	public aliasIndex?: string;

	/**
	 * Combined resource type index for the vertex used for querying.
	 */
	@property({ type: "string", isSecondary: true, optional: true })
	public resourceTypeIndex?: string;

	/**
	 * Object to associate with the vertex as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.NodeObject, optional: true })
	public annotationObject?: IJsonLdNodeObject;

	/**
	 * Alternative aliases that can be used to identify the vertex.
	 */
	@property({ type: "array", itemType: "string", optional: true })
	public aliases?: AuditableItemGraphAlias[];

	/**
	 * The resources attached to the vertex.
	 */
	@property({ type: "array", itemTypeRef: "AuditableItemGraphResource", optional: true })
	public resources?: AuditableItemGraphResource[];

	/**
	 * Edges connected to the vertex.
	 */
	@property({ type: "array", itemTypeRef: "AuditableItemGraphEdge", optional: true })
	public edges?: AuditableItemGraphEdge[];

	/**
	 * The current version of the vertex, incremented on each changeset.
	 */
	@property({ type: "integer", optional: true })
	public version?: number;
}
