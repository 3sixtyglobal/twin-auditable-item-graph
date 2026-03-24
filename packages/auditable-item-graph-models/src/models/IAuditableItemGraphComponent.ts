// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IComparator, SortDirection } from "@twin.org/entity";
import type { IAuditableItemGraphChangeset } from "./IAuditableItemGraphChangeset.js";
import type { IAuditableItemGraphChangesetList } from "./IAuditableItemGraphChangesetList.js";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex.js";
import type { IAuditableItemGraphVertexList } from "./IAuditableItemGraphVertexList.js";
import type { VerifyDepth } from "./verifyDepth.js";

/**
 * Interface describing an auditable item graph contract.
 */
export interface IAuditableItemGraphComponent extends IComponent {
	/**
	 * Create a new graph vertex.
	 * @param vertex The vertex to create.
	 * @param vertex.annotationObject The annotation object for the vertex as JSON-LD.
	 * @param vertex.aliases Alternative aliases that can be used to identify the vertex.
	 * @param vertex.resources The resources attached to the vertex.
	 * @param vertex.edges The edges connected to the vertex.
	 * @returns The id of the new graph item.
	 */
	create(vertex: Omit<IAuditableItemGraphVertex, "id">): Promise<string>;

	/**
	 * Update a graph vertex.
	 * @param vertex The vertex to update.
	 * @param vertex.id The id of the vertex to update.
	 * @param vertex.annotationObject The annotation object for the vertex as JSON-LD.
	 * @param vertex.aliases Alternative aliases that can be used to identify the vertex.
	 * @param vertex.resources The resources attached to the vertex.
	 * @param vertex.edges The edges connected to the vertex.
	 * @returns Nothing.
	 */
	update(vertex: IAuditableItemGraphVertex): Promise<void>;

	/**
	 * Get a graph vertex.
	 * @param id The id of the vertex to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeDeleted Whether to include deleted aliases, resource, edges, defaults to false.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The vertex if found.
	 * @throws NotFoundError if the vertex is not found.
	 */
	get(
		id: string,
		options?: {
			includeDeleted?: boolean;
			verifySignatureDepth?: VerifyDepth;
		}
	): Promise<IAuditableItemGraphVertex>;

	/**
	 * Get a graph vertex changeset list.
	 * @param id The id of the vertex to get.
	 * @param cursor The optional cursor to get next chunk.
	 * @param limit Limit the number of entities to return.
	 * @param options Additional options for the get operation.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The changeset if found.
	 * @throws NotFoundError if the vertex is not found.
	 */
	getChangesets(
		id: string,
		cursor?: string,
		limit?: number,
		options?: {
			verifySignatureDepth?: VerifyDepth;
		}
	): Promise<{
		changesets: IAuditableItemGraphChangesetList;
		cursor?: string;
	}>;

	/**
	 * Get a graph vertex changeset.
	 * @param id The id of the vertex to get.
	 * @param options Additional options for the get operation.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The changeset if found.
	 * @throws NotFoundError if the vertex or changeset is not found.
	 */
	getChangeset(
		id: string,
		options?: { verifySignatureDepth?: VerifyDepth }
	): Promise<IAuditableItemGraphChangeset>;

	/**
	 * Remove the verifiable storage for an item.
	 * @param id The id of the vertex to remove the storage from.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 */
	removeVerifiable(id: string): Promise<void>;

	/**
	 * Query the graph for vertices.
	 * @param options The query options.
	 * @param options.id The optional id to look for.
	 * @param options.idMode Look in id, alias or both, defaults to both.
	 * @param options.idExact Find only exact matches, default to false meaning partial matching.
	 * @param options.resourceTypes Include vertices with specific resource types.
	 * @param conditions Conditions to use in the query.
	 * @param orderBy The order for the results, defaults to dateCreated.
	 * @param orderByDirection The direction for the order, defaults to descending.
	 * @param properties The properties to return, if not provided defaults to id, dateCreated, aliases and object.
	 * @param cursor The cursor to request the next chunk of entities.
	 * @param limit Limit the number of entities to return.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	query(
		options?: {
			id?: string;
			idMode?: "id" | "alias" | "both";
			idExact?: boolean;
			resourceTypes?: string[];
		},
		conditions?: IComparator[],
		orderBy?: keyof Pick<IAuditableItemGraphVertex, "dateCreated" | "dateModified">,
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemGraphVertex)[],
		cursor?: string,
		limit?: number
	): Promise<{
		entries: IAuditableItemGraphVertexList;
		cursor?: string;
	}>;
}
