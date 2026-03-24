// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@twin.org/api-core";
import {
	HttpParameterHelper,
	type IBaseRestClientConfig,
	type ICreatedResponse,
	type INoContentResponse
} from "@twin.org/api-models";
import type {
	IAuditableItemGraphChangeset,
	IAuditableItemGraphChangesetGetRequest,
	IAuditableItemGraphChangesetGetResponse,
	IAuditableItemGraphChangesetList,
	IAuditableItemGraphChangesetListRequest,
	IAuditableItemGraphChangesetListResponse,
	IAuditableItemGraphComponent,
	IAuditableItemGraphCreateRequest,
	IAuditableItemGraphGetRequest,
	IAuditableItemGraphGetResponse,
	IAuditableItemGraphListRequest,
	IAuditableItemGraphListResponse,
	IAuditableItemGraphUpdateRequest,
	IAuditableItemGraphVertex,
	IAuditableItemGraphVertexList,
	VerifyDepth
} from "@twin.org/auditable-item-graph-models";
import { Coerce, Guards, NotSupportedError, Urn } from "@twin.org/core";
import type { IComparator, SortDirection } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { HeaderHelper, HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Client for performing auditable item graph through to REST endpoints.
 */
export class AuditableItemGraphRestClient
	extends BaseRestClient
	implements IAuditableItemGraphComponent
{
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuditableItemGraphRestClient>();

	/**
	 * Create a new instance of AuditableItemGraphRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<AuditableItemGraphRestClient>(), config, "auditable-item-graph");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return AuditableItemGraphRestClient.CLASS_NAME;
	}

	/**
	 * Create a new graph vertex.
	 * @param vertex The vertex to create.
	 * @param vertex.annotationObject The annotation object for the vertex as JSON-LD.
	 * @param vertex.aliases Alternative aliases that can be used to identify the vertex.
	 * @param vertex.resources The resources attached to the vertex.
	 * @param vertex.edges The edges connected to the vertex.
	 * @returns The id of the new graph item.
	 */
	public async create(vertex: Omit<IAuditableItemGraphVertex, "id">): Promise<string> {
		const response = await this.fetch<IAuditableItemGraphCreateRequest, ICreatedResponse>(
			"/",
			"POST",
			{
				body: vertex
			}
		);

		return response.headers[HeaderTypes.Location];
	}

	/**
	 * Get a graph vertex.
	 * @param id The id of the vertex to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeDeleted Whether to include deleted/updated aliases, resource, edges, defaults to false.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The vertex if found.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async get(
		id: string,
		options?: {
			includeDeleted?: boolean;
			verifySignatureDepth?: VerifyDepth;
		}
	): Promise<IAuditableItemGraphVertex> {
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IAuditableItemGraphGetRequest,
			IAuditableItemGraphGetResponse
		>("/:id", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id
			},
			query: {
				includeDeleted: Coerce.string(options?.includeDeleted),
				verifySignatureDepth: options?.verifySignatureDepth
			}
		});

		return response.body;
	}

	/**
	 * Get a graph vertex changeset list.
	 * @param id The id of the vertex to get.
	 * @param cursor The optional cursor to get next chunk.
	 * @param limit Limit the number of entities to return.
	 * @param options Additional options for the get operation.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The changesets if found.
	 */
	public async getChangesets(
		id: string,
		cursor?: string,
		limit?: number,
		options?: {
			verifySignatureDepth?: VerifyDepth;
		}
	): Promise<{
		changesets: IAuditableItemGraphChangesetList;
		cursor?: string;
	}> {
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IAuditableItemGraphChangesetListRequest,
			IAuditableItemGraphChangesetListResponse
		>("/:id/changesets", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id
			},
			query: {
				cursor,
				limit: Coerce.string(limit),
				verifySignatureDepth: options?.verifySignatureDepth
			}
		});

		return {
			changesets: response.body,
			cursor: HeaderHelper.extractLinkHeaderRelation(response.headers?.[HeaderTypes.Link], "next")
				?.urlQueryParams?.cursor
		};
	}

	/**
	 * Get a graph vertex changeset.
	 * @param id The id of the vertex to get.
	 * @param options Additional options for the get operation.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The changeset if found.
	 * @throws NotFoundError if the vertex or changeset is not found.
	 */
	public async getChangeset(
		id: string,
		options?: { verifySignatureDepth?: VerifyDepth }
	): Promise<IAuditableItemGraphChangeset> {
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, nameof(id), id);

		const urnParsed = Urn.fromValidString(id);
		const namespaceSpecificParts = urnParsed.namespaceSpecificParts();
		const vertexId = namespaceSpecificParts[0];
		const changesetId = namespaceSpecificParts[2];

		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, "vertexId", vertexId);
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, "changesetId", changesetId);

		const response = await this.fetch<
			IAuditableItemGraphChangesetGetRequest,
			IAuditableItemGraphChangesetGetResponse
		>("/:id/changesets/:changesetId", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id: vertexId,
				changesetId
			},
			query: {
				verifySignatureDepth: options?.verifySignatureDepth
			}
		});

		return response.body;
	}

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
	public async update(vertex: IAuditableItemGraphVertex): Promise<void> {
		Guards.object(AuditableItemGraphRestClient.CLASS_NAME, nameof(vertex), vertex);
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, nameof(vertex.id), vertex.id);

		const { id, ...rest } = vertex;

		await this.fetch<IAuditableItemGraphUpdateRequest, INoContentResponse>("/:id", "PUT", {
			pathParams: {
				id
			},
			body: rest
		});
	}

	/**
	 * Remove the verifiable storage for an item, not supported on client.
	 * @param id The id of the vertex to get.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async removeVerifiable(id: string): Promise<void> {
		throw new NotSupportedError(AuditableItemGraphRestClient.CLASS_NAME, "notSupportedOnClient", {
			methodName: "removeVerifiable"
		});
	}

	/**
	 * Query the graph for vertices.
	 * @param options The query options.
	 * @param options.id The optional id to look for.
	 * @param options.idMode Look in id, alias or both, defaults to both.
	 * @param options.idExact Find only exact matches, default to false meaning partial matching.
	 * @param options.resourceTypes Include vertices with specific resource types.
	 * @param conditions Conditions to use in the query.
	 * @param orderBy The order for the results, defaults to created.
	 * @param orderByDirection The direction for the order, defaults to descending.
	 * @param properties The properties to return, if not provided defaults to id, created, aliases and object.
	 * @param cursor The cursor to request the next chunk of entities.
	 * @param limit Limit the number of entities to return.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	public async query(
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
	}> {
		const response = await this.fetch<
			IAuditableItemGraphListRequest,
			IAuditableItemGraphListResponse
		>("/", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			query: {
				id: options?.id,
				idMode: options?.idMode,
				idExact: Coerce.string(options?.idExact),
				resourceTypes: HttpParameterHelper.arrayToString(options?.resourceTypes),
				conditions: HttpParameterHelper.objectToString(conditions),
				orderBy,
				orderByDirection,
				properties: HttpParameterHelper.arrayToString(properties),
				cursor,
				limit: Coerce.string(limit)
			}
		});

		return {
			entries: response.body,
			cursor: HeaderHelper.extractLinkHeaderRelation(response.headers?.[HeaderTypes.Link], "next")
				?.urlQueryParams?.cursor
		};
	}
}
