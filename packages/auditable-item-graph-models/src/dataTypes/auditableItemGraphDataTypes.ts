// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHelper } from "@twin.org/data-core";
import { AuditableItemGraphContexts } from "../models/auditableItemGraphContexts.js";
import { AuditableItemGraphTypes } from "../models/auditableItemGraphTypes.js";
import AuditableItemGraphAliasSchema from "../schemas/AuditableItemGraphAlias.json" with { type: "json" };
import AuditableItemGraphAuditedElementSchema from "../schemas/AuditableItemGraphAuditedElement.json" with { type: "json" };
import AuditableItemGraphAuditModeSchema from "../schemas/AuditableItemGraphAuditMode.json" with { type: "json" };
import AuditableItemGraphChangesetSchema from "../schemas/AuditableItemGraphChangeset.json" with { type: "json" };
import AuditableItemGraphEdgeSchema from "../schemas/AuditableItemGraphEdge.json" with { type: "json" };
import AuditableItemGraphListPatchSchema from "../schemas/AuditableItemGraphListPatch.json" with { type: "json" };
import AuditableItemGraphPartialVertexSchema from "../schemas/AuditableItemGraphPartialVertex.json" with { type: "json" };
import AuditableItemGraphPatchOperationSchema from "../schemas/AuditableItemGraphPatchOperation.json" with { type: "json" };
import AuditableItemGraphResourceSchema from "../schemas/AuditableItemGraphResource.json" with { type: "json" };
import AuditableItemGraphVertexSchema from "../schemas/AuditableItemGraphVertex.json" with { type: "json" };
import AuditableItemGraphVertexListSchema from "../schemas/AuditableItemGraphVertexList.json" with { type: "json" };

/**
 * Handle all the data types for auditable item graph.
 */
export class AuditableItemGraphDataTypes {
	/**
	 * Register all the data types.
	 */
	public static registerTypes(): void {
		const types = [
			{
				type: AuditableItemGraphTypes.Vertex,
				schema: AuditableItemGraphVertexSchema
			},
			{
				type: AuditableItemGraphTypes.VertexList,
				schema: AuditableItemGraphVertexListSchema
			},
			{
				type: AuditableItemGraphTypes.Alias,
				schema: AuditableItemGraphAliasSchema
			},
			{
				type: AuditableItemGraphTypes.Resource,
				schema: AuditableItemGraphResourceSchema
			},
			{
				type: AuditableItemGraphTypes.Edge,
				schema: AuditableItemGraphEdgeSchema
			},
			{
				type: AuditableItemGraphTypes.Changeset,
				schema: AuditableItemGraphChangesetSchema
			},
			{
				type: AuditableItemGraphTypes.PatchOperation,
				schema: AuditableItemGraphPatchOperationSchema
			},
			{
				type: "AuditableItemGraphAuditedElement",
				schema: AuditableItemGraphAuditedElementSchema
			},
			{
				type: AuditableItemGraphTypes.ListPatch,
				schema: AuditableItemGraphListPatchSchema
			},
			{
				type: AuditableItemGraphTypes.PartialVertex,
				schema: AuditableItemGraphPartialVertexSchema
			},
			{
				type: AuditableItemGraphTypes.AuditMode,
				schema: AuditableItemGraphAuditModeSchema
			}
		];

		DataTypeHelper.registerTypes(
			AuditableItemGraphContexts.Namespace,
			AuditableItemGraphContexts.JsonLdContext,
			types.map(t => ({ type: t.type, schema: t.schema }))
		);
	}
}
