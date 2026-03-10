// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex.js";

/**
 * Interface describing an auditable item graph vertex list.
 */
export interface IAuditableItemGraphVertexList {
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
	type: [typeof SchemaOrgTypes.ItemList, typeof AuditableItemGraphTypes.VertexList];

	/**
	 * The list of vertices.
	 * @json-ld namespace:sch
	 */
	[SchemaOrgTypes.ItemListElement]: IAuditableItemGraphVertex[];
}
