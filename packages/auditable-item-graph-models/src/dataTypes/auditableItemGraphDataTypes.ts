// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHelper } from "@3sixty/data-core";
import { JsonLdDataTypes } from "@3sixty/data-json-ld";
import { ImmutableProofDataTypes } from "@3sixty/immutable-proof-models";
import * as CompiledValidators from "../compiled/validators.js";
import { AuditableItemGraphContexts } from "../models/auditableItemGraphContexts.js";
import { AuditableItemGraphTypes } from "../models/auditableItemGraphTypes.js";
import AuditableItemGraphAliasSchema from "../schemas/AuditableItemGraphAlias.json" with { type: "json" };
import AuditableItemGraphAuditedElementSchema from "../schemas/AuditableItemGraphAuditedElement.json" with { type: "json" };
import AuditableItemGraphAuditModeSchema from "../schemas/AuditableItemGraphAuditMode.json" with { type: "json" };
import AuditableItemGraphChangesetSchema from "../schemas/AuditableItemGraphChangeset.json" with { type: "json" };
import AuditableItemGraphChangesetListSchema from "../schemas/AuditableItemGraphChangesetList.json" with { type: "json" };
import AuditableItemGraphEdgeSchema from "../schemas/AuditableItemGraphEdge.json" with { type: "json" };
import AuditableItemGraphListPatchSchema from "../schemas/AuditableItemGraphListPatch.json" with { type: "json" };
import AuditableItemGraphPartialVertexSchema from "../schemas/AuditableItemGraphPartialVertex.json" with { type: "json" };
import AuditableItemGraphPatchOperationSchema from "../schemas/AuditableItemGraphPatchOperation.json" with { type: "json" };
import AuditableItemGraphResourceSchema from "../schemas/AuditableItemGraphResource.json" with { type: "json" };
import AuditableItemGraphVertexSchema from "../schemas/AuditableItemGraphVertex.json" with { type: "json" };
import AuditableItemGraphVertexListSchema from "../schemas/AuditableItemGraphVertexList.json" with { type: "json" };
import AuditableItemGraphVertexVersionListSchema from "../schemas/AuditableItemGraphVertexVersionList.json" with { type: "json" };

/**
 * Handle all the data types for auditable item graph.
 */
export class AuditableItemGraphDataTypes {
	/**
	 * Register all the data types.
	 */
	public static registerTypes(): void {
		// Register the types referenced by the schemas, which are only registered once.
		JsonLdDataTypes.registerTypes();
		ImmutableProofDataTypes.registerTypes();

		const types = [
			{
				type: AuditableItemGraphTypes.Vertex,
				schema: AuditableItemGraphVertexSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphVertex
			},
			{
				type: AuditableItemGraphTypes.VertexList,
				schema: AuditableItemGraphVertexListSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphVertexList
			},
			{
				type: AuditableItemGraphTypes.VertexVersionList,
				schema: AuditableItemGraphVertexVersionListSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphVertexVersionList
			},
			{
				type: AuditableItemGraphTypes.Alias,
				schema: AuditableItemGraphAliasSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphAlias
			},
			{
				type: AuditableItemGraphTypes.Resource,
				schema: AuditableItemGraphResourceSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphResource
			},
			{
				type: AuditableItemGraphTypes.Edge,
				schema: AuditableItemGraphEdgeSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphEdge
			},
			{
				type: AuditableItemGraphTypes.Changeset,
				schema: AuditableItemGraphChangesetSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphChangeset
			},
			{
				type: AuditableItemGraphTypes.ChangesetList,
				schema: AuditableItemGraphChangesetListSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphChangesetList
			},
			{
				type: AuditableItemGraphTypes.PatchOperation,
				schema: AuditableItemGraphPatchOperationSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphPatchOperation
			},
			{
				type: "AuditableItemGraphAuditedElement",
				schema: AuditableItemGraphAuditedElementSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphAuditedElement
			},
			{
				type: AuditableItemGraphTypes.ListPatch,
				schema: AuditableItemGraphListPatchSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphListPatch
			},
			{
				type: AuditableItemGraphTypes.PartialVertex,
				schema: AuditableItemGraphPartialVertexSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphPartialVertex
			},
			{
				type: AuditableItemGraphTypes.AuditMode,
				schema: AuditableItemGraphAuditModeSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemGraphAuditMode
			}
		];

		DataTypeHelper.registerTypes(
			AuditableItemGraphContexts.Namespace,
			AuditableItemGraphContexts.JsonLdContext,
			types
		);
	}
}
