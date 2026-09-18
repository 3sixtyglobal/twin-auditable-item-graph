// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@twin.org/api-core";
import {
	HttpHeaderHelper,
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
	IAuditableItemGraphPartialVertex,
	IAuditableItemGraphRemoveProofRequest,
	IAuditableItemGraphUpdatePartialRequest,
	IAuditableItemGraphUpdateRequest,
	IAuditableItemGraphVersionGetRequest,
	IAuditableItemGraphVersionGetResponse,
	IAuditableItemGraphVersionListRequest,
	IAuditableItemGraphVersionListResponse,
	IAuditableItemGraphVertex,
	IAuditableItemGraphVertexList,
	IAuditableItemGraphVertexVersionList,
	VerifyDepth
} from "@twin.org/auditable-item-graph-models";
import { Coerce, Guards, Urn } from "@twin.org/core";
import type { EntityCondition, SortDirection } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { HeaderTypes, HttpMethod, MimeTypes } from "@twin.org/web";

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
			HttpMethod.POST,
			{
				body: vertex
			}
		);

		return HttpHeaderHelper.extractId(response.headers, `${this.getPathPrefix()}/:id`);
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
		>("/:id", HttpMethod.GET, {
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
		>("/:id/changesets", HttpMethod.GET, {
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
			cursor: HttpHeaderHelper.extractCursor(response.headers)
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
		>("/:id/changesets/:changesetId", HttpMethod.GET, {
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
	 * Get a graph vertex at a specific version.
	 * @param id The id of the vertex.
	 * @param version The version number to retrieve.
	 * @returns The vertex reconstructed at that version.
	 * @throws NotFoundError if the vertex or version is not found.
	 */
	public async getVersion(id: string, version: number): Promise<IAuditableItemGraphVertex> {
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, nameof(id), id);
		Guards.integer(AuditableItemGraphRestClient.CLASS_NAME, nameof(version), version);

		const urnParsed = Urn.fromValidString(id);
		const vertexId = urnParsed.namespaceSpecific(0);

		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, "vertexId", vertexId);

		const response = await this.fetch<
			IAuditableItemGraphVersionGetRequest,
			IAuditableItemGraphVersionGetResponse
		>("/:id/versions/:version", HttpMethod.GET, {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id: vertexId,
				version: version.toString()
			}
		});

		return response.body;
	}

	/**
	 * Get all versions of a graph vertex.
	 * @param id The id of the vertex.
	 * @param options Additional options for the operation.
	 * @param options.after Only return versions created after this ISO 8601 timestamp (exclusive).
	 * @param options.before Only return versions created before this ISO 8601 timestamp (exclusive).
	 * @returns The list of vertex versions.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async getVersions(
		id: string,
		options?: {
			after?: string;
			before?: string;
		}
	): Promise<IAuditableItemGraphVertexVersionList> {
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IAuditableItemGraphVersionListRequest,
			IAuditableItemGraphVersionListResponse
		>("/:id/versions", HttpMethod.GET, {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id
			},
			query: {
				after: options?.after,
				before: options?.before
			}
		});

		return response.body;
	}

	/**
	 * Update a graph vertex (PUT - full replacement of vertex state).
	 * The server serializes concurrent updates for the same vertex via `Mutex` on the vertex id;
	 * requests load-balanced across replicas can still race.
	 * @param vertex The vertex to update.
	 * @param vertex.id The id of the vertex to update.
	 * @param vertex.annotationObject The annotation object for the vertex as JSON-LD.
	 * @param vertex.aliases Alternative aliases that can be used to identify the vertex.
	 * @param vertex.resources The resources attached to the vertex.
	 * @param vertex.edges The edges connected to the vertex.
	 * @returns A promise that resolves when the vertex has been updated.
	 */
	public async update(vertex: IAuditableItemGraphVertex): Promise<void> {
		Guards.object(AuditableItemGraphRestClient.CLASS_NAME, nameof(vertex), vertex);
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, nameof(vertex.id), vertex.id);

		const { id, ...rest } = vertex;

		await this.fetch<IAuditableItemGraphUpdateRequest, INoContentResponse>("/:id", HttpMethod.PUT, {
			pathParams: {
				id
			},
			body: rest
		});
	}

	/**
	 * Partially update a graph vertex (PATCH - optional scalars; list fields use `{ add, remove }`).
	 * @param partial The partial vertex update (must include `id`).
	 * @returns A promise that resolves when the partial update has been applied.
	 */
	public async updatePartial(partial: IAuditableItemGraphPartialVertex): Promise<void> {
		Guards.object(AuditableItemGraphRestClient.CLASS_NAME, nameof(partial), partial);
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, nameof(partial.id), partial.id);

		const { id, ...body } = partial;

		await this.fetch<IAuditableItemGraphUpdatePartialRequest, INoContentResponse>(
			"/:id",
			HttpMethod.PATCH,
			{
				pathParams: {
					id
				},
				body
			}
		);
	}

	/**
	 * Remove the notarization proof from all changesets of a graph vertex.
	 * @param id The id of the vertex.
	 * @returns A promise that resolves when the proof has been removed.
	 */
	public async removeProof(id: string): Promise<void> {
		Guards.stringValue(AuditableItemGraphRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IAuditableItemGraphRemoveProofRequest, INoContentResponse>(
			"/:id/proof",
			HttpMethod.DELETE,
			{
				pathParams: { id }
			}
		);
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
	 * @param limit The maximum number of entities to return, a page can contain fewer so follow
	 * the cursor until it is absent to read them all.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	public async query(
		options?: {
			id?: string;
			idMode?: "id" | "alias" | "both";
			idExact?: boolean;
			resourceTypes?: string[];
		},
		conditions?: EntityCondition<IAuditableItemGraphVertex>,
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
		>("/", HttpMethod.GET, {
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
			cursor: HttpHeaderHelper.extractCursor(response.headers)
		};
	}
}
