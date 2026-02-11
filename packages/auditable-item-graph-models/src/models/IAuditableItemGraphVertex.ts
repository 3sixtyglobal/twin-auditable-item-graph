// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";
import type { IAuditableItemGraphAlias } from "./IAuditableItemGraphAlias.js";
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement.js";
import type { IAuditableItemGraphEdge } from "./IAuditableItemGraphEdge.js";
import type { IAuditableItemGraphResource } from "./IAuditableItemGraphResource.js";

/**
 * Interface describing an auditable item graph vertex.
 */
export interface IAuditableItemGraphVertex
	extends Omit<IAuditableItemGraphAuditedElement, "deleted"> {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof AuditableItemGraphContexts.Context,
		typeof AuditableItemGraphContexts.ContextCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * The id of the element.
	 */
	id: string;

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Vertex;

	/**
	 * The identity of the organization which controls the vertex.
	 * json-ld namespace:twin-common
	 */
	organizationIdentity?: string;

	/**
	 * The JSON-LD annotation object for the vertex.
	 * json-ld namespace:twin-common
	 */
	annotationObject?: IJsonLdNodeObject;

	/**
	 * Alternative aliases that can be used to identify the vertex.
	 * json-ld container:set
	 */
	aliases?: IAuditableItemGraphAlias[];

	/**
	 * The resources attached to the vertex.
	 * json-ld container:set
	 */
	resources?: IAuditableItemGraphResource[];

	/**
	 * Edges connected to the vertex.
	 * json-ld container:set
	 */
	edges?: IAuditableItemGraphEdge[];

	/**
	 * Is the vertex verified, will only be populated when verification is requested.
	 * json-ld namespace:twin-common
	 */
	verified?: boolean;
}
