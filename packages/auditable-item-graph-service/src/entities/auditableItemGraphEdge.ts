// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { JsonLdTypes, type IJsonLdNodeObject } from "@3sixty/data-json-ld";
import { entity, property } from "@3sixty/entity";

/**
 * Class describing the auditable item graph edge.
 */
@entity()
export class AuditableItemGraphEdge {
	/**
	 * The id of the edge.
	 */
	@property({ type: "string", maxLength: 255 })
	public id!: string;

	/**
	 * The date/time of when the edge was created.
	 */
	@property({ type: "string", format: "date-time" })
	public dateCreated!: string;

	/**
	 * The date/time of when the edge was last modified.
	 */
	@property({ type: "string", format: "date-time", optional: true })
	public dateModified?: string;

	/**
	 * The timestamp of when the edge was deleted, as we never actually remove items.
	 */
	@property({ type: "string", format: "date-time", optional: true })
	public dateDeleted?: string;

	/**
	 * The target id of the edge.
	 */
	@property({ type: "string", maxLength: 255 })
	public targetId!: string;

	/**
	 * The relationships between the two vertices.
	 */
	@property({ type: "array" })
	public edgeRelationships!: string[];

	/**
	 * Object to associate with the edge as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.NodeObject, optional: true })
	public annotationObject?: IJsonLdNodeObject;
}
