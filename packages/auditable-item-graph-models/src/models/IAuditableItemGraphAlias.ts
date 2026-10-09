// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement.js";

/**
 * Interface describing an alias for a vertex.
 */
export interface IAuditableItemGraphAlias extends IAuditableItemGraphAuditedElement {
	/**
	 * JSON-LD Context.
	 */
	"@context"?:
		| typeof AuditableItemGraphContexts.Context
		| [typeof AuditableItemGraphContexts.Context, ...IJsonLdContextDefinitionElement[]];

	/**
	 * The id of the element.
	 */
	id: string;

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Alias;

	/**
	 * The JSON-LD annotation object for the alias.
	 * @json-ld namespace:twin-common
	 */
	annotationObject?: IJsonLdNodeObject;

	/**
	 * The format of the id in the alias.
	 * @json-ld type:sch:Text
	 */
	aliasFormat?: string;

	/**
	 * Whether the alias should be unique across the graph, meaning that no other vertex can have the same alias. Defaults to false.
	 * @json-ld type:sch:Boolean
	 */
	unique?: boolean;
}
