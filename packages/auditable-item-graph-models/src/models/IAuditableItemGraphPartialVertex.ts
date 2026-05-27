// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";
import type { IAuditableItemGraphAlias } from "./IAuditableItemGraphAlias.js";
import type { IAuditableItemGraphEdge } from "./IAuditableItemGraphEdge.js";
import type { IAuditableItemGraphListPatch } from "./IAuditableItemGraphListPatch.js";
import type { IAuditableItemGraphResource } from "./IAuditableItemGraphResource.js";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex.js";

/**
 * Partial vertex payload for updatePartial (PATCH — requires id).
 * Sub-lists use explicit `{ add, remove }` patches; bare arrays are not supported.
 */
export interface IAuditableItemGraphPartialVertex extends Omit<
	IAuditableItemGraphVertex,
	"type" | "aliases" | "edges" | "resources"
> {
	/**
	 * The id of the vertex to update.
	 */
	id: string;

	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof AuditableItemGraphContexts.Context,
		typeof AuditableItemGraphContexts.ContextCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type?: typeof AuditableItemGraphTypes.Vertex;

	/**
	 * Patch operations for aliases.
	 * @json-ld id
	 */
	aliasPatches?: IAuditableItemGraphListPatch<IAuditableItemGraphAlias>;

	/**
	 * Patch operations for resources.
	 * @json-ld id
	 */
	resourcePatches?: IAuditableItemGraphListPatch<IAuditableItemGraphResource>;

	/**
	 * Patch operations for edges.
	 * @json-ld id
	 */
	edgePatches?: IAuditableItemGraphListPatch<IAuditableItemGraphEdge>;
}
