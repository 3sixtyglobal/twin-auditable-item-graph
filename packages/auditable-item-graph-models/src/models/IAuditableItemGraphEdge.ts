// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement.js";

/**
 * Interface describing an edge between two vertices in an auditable item graph.
 */
export interface IAuditableItemGraphEdge extends IAuditableItemGraphAuditedElement {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphContexts.Context
		| [typeof AuditableItemGraphContexts.Context, ...IJsonLdContextDefinitionElement[]];

	/**
	 * The id of the element.
	 */
	id?: string;

	/**
	 * The target vertex id the edge connects to.
	 * json-ld type:@id
	 */
	targetId: string;

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Edge;

	/**
	 * The JSON-LD annotation object for the edge.
	 * json-ld namespace:twin-common
	 */
	annotationObject?: IJsonLdNodeObject;

	/**
	 * The relationships between the two vertices.
	 * json-ld container:set
	 */
	edgeRelationships: string[];
}
