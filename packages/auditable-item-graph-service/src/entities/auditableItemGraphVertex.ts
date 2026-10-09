// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemGraphAuditMode } from "@3sixty/auditable-item-graph-models";
import { JsonLdTypes, type IJsonLdNodeObject } from "@3sixty/data-json-ld";
import { entity, property, SortDirection } from "@3sixty/entity";
import type { AuditableItemGraphAlias } from "./auditableItemGraphAlias.js";
import type { AuditableItemGraphEdge } from "./auditableItemGraphEdge.js";
import type { AuditableItemGraphResource } from "./auditableItemGraphResource.js";

/**
 * Class describing the auditable item graph vertex.
 */
@entity({ version: 2 })
export class AuditableItemGraphVertex {
	/**
	 * The id of the vertex.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The identity of the organization which controls the vertex.
	 */
	@property({ type: "string", maxLength: 255 })
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
	@property({ type: "string", maxLength: 10, optional: true })
	public auditMode?: AuditableItemGraphAuditMode;

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
