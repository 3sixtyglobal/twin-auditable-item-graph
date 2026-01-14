// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
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
	"@context":
		| typeof AuditableItemGraphContexts.Namespace
		| [typeof AuditableItemGraphContexts.Namespace, ...IJsonLdContextDefinitionElement[]];

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
	 */
	annotationObject?: IJsonLdNodeObject;

	/**
	 * The format of the id in the alias.
	 */
	aliasFormat?: string;
}
