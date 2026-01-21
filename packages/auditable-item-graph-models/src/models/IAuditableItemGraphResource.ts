// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement.js";

/**
 * Interface describing an auditable item graph vertex resource.
 */
export interface IAuditableItemGraphResource extends IAuditableItemGraphAuditedElement {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphContexts.Context
		| [typeof AuditableItemGraphContexts.Context, ...IJsonLdContextDefinitionElement[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Resource;

	/**
	 * The JSON-LD object for the resource.
	 */
	resourceObject?: IJsonLdNodeObject;
}
