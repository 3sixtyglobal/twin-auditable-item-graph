// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";

/**
 * Interface describing a list of auditable item graph vertex version numbers.
 */
export interface IAuditableItemGraphVertexVersionList {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof SchemaOrgContexts.Context,
		typeof AuditableItemGraphContexts.Context,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: [typeof SchemaOrgTypes.ItemList, typeof AuditableItemGraphTypes.VertexVersionList];

	/**
	 * The list of versions.
	 * @json-ld namespace:sch
	 */
	[SchemaOrgTypes.ItemListElement]: { version: number; dateCreated: string }[];
}
