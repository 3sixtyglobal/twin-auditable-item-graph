// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphAlias } from "./IAuditableItemGraphAlias.js";
import type { IAuditableItemGraphEdge } from "./IAuditableItemGraphEdge.js";
import type { IAuditableItemGraphResource } from "./IAuditableItemGraphResource.js";

/**
 * PATCH operations for a sub-list on a vertex.
 */
export interface IAuditableItemGraphListPatch<
	TItem = IAuditableItemGraphEdge | IAuditableItemGraphAlias | IAuditableItemGraphResource
> {
	/**
	 * Items to add or update in the active set.
	 * @json-ld container:set
	 */
	add?: TItem[];

	/**
	 * Identifiers of items to remove from the active set (soft-delete).
	 * @json-ld container:set
	 */
	remove?: string[];
}
