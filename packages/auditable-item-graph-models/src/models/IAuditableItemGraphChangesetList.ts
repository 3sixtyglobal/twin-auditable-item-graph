// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";
import type { IAuditableItemGraphChangeset } from "./IAuditableItemGraphChangeset.js";

/**
 * Interface describing an auditable item graph changeset list.
 */
export interface IAuditableItemGraphChangesetList {
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
	type: [typeof SchemaOrgTypes.ItemList, typeof AuditableItemGraphTypes.ChangesetList];

	/**
	 * The list of changesets.
	 * json-ld namespace:sch
	 */
	[SchemaOrgTypes.ItemListElement]: IAuditableItemGraphChangeset[];
}
