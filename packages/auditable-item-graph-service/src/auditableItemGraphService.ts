// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuditableItemGraphContexts,
	AuditableItemGraphDataTypes,
	AuditableItemGraphMetricIds,
	AuditableItemGraphMetrics,
	AuditableItemGraphTopics,
	AuditableItemGraphTypes,
	VerifyDepth,
	type IAuditableItemGraphAlias,
	type IAuditableItemGraphChangeset,
	type IAuditableItemGraphChangesetList,
	type IAuditableItemGraphComponent,
	type IAuditableItemGraphEdge,
	type IAuditableItemGraphEventBusVertexCreated,
	type IAuditableItemGraphEventBusVertexUpdated,
	type IAuditableItemGraphListPatch,
	type IAuditableItemGraphPartialVertex,
	type IAuditableItemGraphResource,
	type IAuditableItemGraphVertex,
	type IAuditableItemGraphVertexList,
	type IAuditableItemGraphVertexVersionList
} from "@twin.org/auditable-item-graph-models";
import { ContextIdHelper, ContextIdKeys, ContextIdStore } from "@twin.org/context";
import {
	ArrayHelper,
	Coerce,
	ComponentFactory,
	GeneralError,
	Guards,
	Is,
	JsonHelper,
	Mutex,
	NotFoundError,
	ObjectHelper,
	RandomHelper,
	StringHelper,
	Urn,
	Validation,
	type IPatchOperation,
	type IValidationFailure
} from "@twin.org/core";
import { DataTypeHelper } from "@twin.org/data-core";
import {
	JsonLdDataTypes,
	JsonLdHelper,
	JsonLdProcessor,
	type IJsonLdNodeObject
} from "@twin.org/data-json-ld";
import {
	ComparisonOperator,
	LogicalOperator,
	SortDirection,
	type IComparator
} from "@twin.org/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import type { IEventBusComponent } from "@twin.org/event-bus-models";
import {
	ImmutableProofContexts,
	ImmutableProofFailure,
	ImmutableProofTypes,
	type IImmutableProofComponent,
	type IImmutableProofVerification
} from "@twin.org/immutable-proof-models";
import { nameof, nameofKebabCase } from "@twin.org/nameof";
import {
	SchemaOrgContexts,
	SchemaOrgDataTypes,
	SchemaOrgTypes
} from "@twin.org/standards-schema-org";
import { MetricHelper, type ITelemetryComponent } from "@twin.org/telemetry-models";
import type { AuditableItemGraphAlias } from "./entities/auditableItemGraphAlias.js";
import type { AuditableItemGraphChangeset } from "./entities/auditableItemGraphChangeset.js";
import type { AuditableItemGraphEdge } from "./entities/auditableItemGraphEdge.js";
import type { AuditableItemGraphResource } from "./entities/auditableItemGraphResource.js";
import type { AuditableItemGraphVertex } from "./entities/auditableItemGraphVertex.js";
import type { IAuditableItemGraphServiceConstructorOptions } from "./models/IAuditableItemGraphServiceConstructorOptions.js";
import type { IAuditableItemGraphServiceContext } from "./models/IAuditableItemGraphServiceContext.js";

/**
 * Class for performing auditable item graph operations.
 */
export class AuditableItemGraphService implements IAuditableItemGraphComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuditableItemGraphService>();

	/**
	 * The namespace for the service.
	 * @internal
	 */
	public static readonly NAMESPACE: string = "aig";

	/**
	 * The namespace for the service changeset.
	 */
	public static readonly NAMESPACE_CHANGESET: string = "changeset";

	/**
	 * The namespace for the service edge.
	 */
	public static readonly NAMESPACE_EDGE: string = "edge";

	/**
	 * The keys to pick when creating the proof for the stream.
	 * @internal
	 */
	private static readonly _PROOF_KEYS_CHANGESET: (keyof AuditableItemGraphChangeset)[] = [
		"id",
		"vertexId",
		"userIdentity",
		"dateCreated",
		"patches"
	];

	/**
	 * The immutable proof component.
	 * @internal
	 */
	private readonly _immutableProofComponent: IImmutableProofComponent;

	/**
	 * The entity storage for vertices.
	 * @internal
	 */
	private readonly _vertexStorage: IEntityStorageConnector<AuditableItemGraphVertex>;

	/**
	 * The entity storage for changesets.
	 * @internal
	 */
	private readonly _changesetStorage: IEntityStorageConnector<AuditableItemGraphChangeset>;

	/**
	 * The event bus component.
	 * @internal
	 */
	private readonly _eventBusComponent?: IEventBusComponent;

	/**
	 * The telemetry component.
	 * @internal
	 */
	private readonly _telemetryComponent?: ITelemetryComponent;

	/**
	 * The timeout in milliseconds when acquiring a mutex lock.
	 * @internal
	 */
	private readonly _mutexTimeoutMs?: number;

	/**
	 * Create a new instance of AuditableItemGraphService.
	 * @param options The dependencies for the auditable item graph connector.
	 */
	constructor(options?: IAuditableItemGraphServiceConstructorOptions) {
		this._immutableProofComponent = ComponentFactory.get(
			options?.immutableProofComponentType ?? "immutable-proof"
		);

		this._vertexStorage = EntityStorageConnectorFactory.get(
			options?.vertexEntityStorageType ?? nameofKebabCase<AuditableItemGraphVertex>()
		);

		this._changesetStorage = EntityStorageConnectorFactory.get(
			options?.changesetEntityStorageType ?? nameofKebabCase<AuditableItemGraphChangeset>()
		);

		this._eventBusComponent = ComponentFactory.getIfExists<IEventBusComponent>(
			options?.eventBusComponentType
		);

		this._telemetryComponent = ComponentFactory.getIfExists<ITelemetryComponent>(
			options?.telemetryComponentType
		);

		this._mutexTimeoutMs = Coerce.integer(options?.config?.mutexTimeoutMs);

		SchemaOrgDataTypes.registerRedirects();
		AuditableItemGraphDataTypes.registerTypes();
		JsonLdDataTypes.registerTypes();
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return AuditableItemGraphService.CLASS_NAME;
	}

	/**
	 * Register all AIG metrics with the telemetry component.
	 * @returns A promise that resolves when all metrics have been registered.
	 */
	public async start(): Promise<void> {
		if (Is.undefined(this._telemetryComponent)) {
			return;
		}

		await MetricHelper.createMetrics(this._telemetryComponent, AuditableItemGraphMetrics);
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
		Guards.object(AuditableItemGraphService.CLASS_NAME, nameof(vertex), vertex);

		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Organization);

		try {
			const id = RandomHelper.generateUuidV7("compact");

			const schemaValidationFailures: IValidationFailure[] = [];
			await DataTypeHelper.validate(
				nameof(vertex),
				`${AuditableItemGraphContexts.Namespace}${AuditableItemGraphTypes.Vertex}`,
				{
					...vertex,
					id
				},
				schemaValidationFailures
			);
			Validation.asValidationError(
				AuditableItemGraphService.CLASS_NAME,
				nameof(vertex),
				schemaValidationFailures
			);

			if (Is.object(vertex.annotationObject)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(vertex.annotationObject, validationFailures);
				Validation.asValidationError(
					AuditableItemGraphService.CLASS_NAME,
					nameof(vertex.annotationObject),
					validationFailures
				);
			}

			const ownerOrganizationId =
				contextIds?.[ContextIdKeys.UserOrganization] ?? contextIds?.[ContextIdKeys.Organization];

			const context: IAuditableItemGraphServiceContext = {
				now: new Date(Date.now()).toISOString(),
				organizationIdentity: ownerOrganizationId,
				userIdentity: contextIds?.[ContextIdKeys.User]
			};

			const vertexModel: AuditableItemGraphVertex = {
				id,
				organizationIdentity: contextIds[ContextIdKeys.Organization],
				dateCreated: context.now
			};
			const originalEntity = ObjectHelper.clone(vertexModel);

			vertexModel.annotationObject = vertex.annotationObject;

			await this.updateAliasList(context, vertexModel, vertex.aliases);
			await this.updateResourceList(context, vertexModel, vertex.resources);
			await this.updateEdgeList(context, vertexModel, vertex.edges);

			delete originalEntity.aliasIndex;
			delete originalEntity.resourceTypeIndex;
			await this.addChangeset(context, originalEntity, vertexModel, true, 0);

			vertexModel.version = 0;

			await this._vertexStorage.set({
				...vertexModel,
				...this.buildIndexes(vertexModel)
			});

			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.VerticesCreated
			);

			const fullId = new Urn(AuditableItemGraphService.NAMESPACE, id).toString();

			await this._eventBusComponent?.publish<IAuditableItemGraphEventBusVertexCreated>(
				AuditableItemGraphTopics.VertexCreated,
				{ id: fullId }
			);

			return fullId;
		} catch (error) {
			throw new GeneralError(
				AuditableItemGraphService.CLASS_NAME,
				"createFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Update a graph vertex (PUT — full replacement of vertex state).
	 * Concurrent updates for the same vertex are serialized via `Mutex` on the vertex id.
	 * @param vertex The vertex to update.
	 * @returns A promise that resolves when the vertex has been updated.
	 */
	public async update(vertex: IAuditableItemGraphVertex): Promise<void> {
		Guards.object(AuditableItemGraphService.CLASS_NAME, nameof(vertex), vertex);
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(vertex.id), vertex.id);

		const vertexId = this.parseVertexId(vertex.id);

		await Mutex.lock(vertexId, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });
		try {
			try {
				const schemaValidationFailures: IValidationFailure[] = [];
				await DataTypeHelper.validate(
					nameof(vertex),
					`${AuditableItemGraphContexts.Namespace}${AuditableItemGraphTypes.Vertex}`,
					vertex,
					schemaValidationFailures
				);
				Validation.asValidationError(
					AuditableItemGraphService.CLASS_NAME,
					nameof(vertex),
					schemaValidationFailures
				);

				const vertexEntity = await this._vertexStorage.get(vertexId);

				if (Is.empty(vertexEntity)) {
					throw new NotFoundError(
						AuditableItemGraphService.CLASS_NAME,
						"vertexNotFound",
						vertex.id
					);
				}

				if (Is.object(vertex.annotationObject)) {
					const validationFailures: IValidationFailure[] = [];
					await JsonLdHelper.validate(vertex.annotationObject, validationFailures);
					Validation.asValidationError(
						AuditableItemGraphService.CLASS_NAME,
						nameof(vertex.annotationObject),
						validationFailures
					);
				}

				const contextIds = await ContextIdStore.getContextIds();
				const ownerOrganizationId =
					vertexEntity.organizationIdentity ??
					contextIds?.[ContextIdKeys.UserOrganization] ??
					contextIds?.[ContextIdKeys.Organization];

				const context: IAuditableItemGraphServiceContext = {
					now: new Date(Date.now()).toISOString(),
					organizationIdentity: ownerOrganizationId,
					userIdentity: contextIds?.[ContextIdKeys.User]
				};

				delete vertexEntity.aliasIndex;
				const originalEntity = ObjectHelper.clone(vertexEntity);
				const newEntity = ObjectHelper.clone(vertexEntity);

				newEntity.annotationObject = vertex.annotationObject;
				await this.updateAliasList(context, newEntity, vertex.aliases);
				await this.updateResourceList(context, newEntity, vertex.resources);
				await this.updateEdgeList(context, newEntity, vertex.edges);

				await this.persistVertexChanges(context, vertexId, vertex.id, originalEntity, newEntity);
			} catch (error) {
				throw new GeneralError(
					AuditableItemGraphService.CLASS_NAME,
					"updatingFailed",
					undefined,
					error
				);
			}
		} finally {
			Mutex.unlock(vertexId);
		}
	}

	/**
	 * Partially update a graph vertex (PATCH — explicit list patches; only defined properties applied).
	 * Serialized with `update` via `Mutex` on the same vertex id within this instance.
	 * @param partial The partial vertex update.
	 * @returns A promise that resolves when the partial update has been applied.
	 */
	public async updatePartial(partial: IAuditableItemGraphPartialVertex): Promise<void> {
		Guards.object<IAuditableItemGraphPartialVertex>(
			AuditableItemGraphService.CLASS_NAME,
			nameof(partial),
			partial
		);
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(partial.id), partial.id);

		const vertexId = this.parseVertexId(partial.id);

		await Mutex.lock(vertexId, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });

		try {
			try {
				const vertexEntity = await this._vertexStorage.get(vertexId);

				if (Is.empty(vertexEntity)) {
					throw new NotFoundError(
						AuditableItemGraphService.CLASS_NAME,
						"vertexNotFound",
						partial.id
					);
				}

				if (partial.annotationObject !== undefined && Is.object(partial.annotationObject)) {
					const validationFailures: IValidationFailure[] = [];
					await JsonLdHelper.validate(partial.annotationObject, validationFailures);
					Validation.asValidationError(
						AuditableItemGraphService.CLASS_NAME,
						nameof(partial.annotationObject),
						validationFailures
					);
				}

				const contextIds = await ContextIdStore.getContextIds();

				const ownerOrganizationId =
					vertexEntity.organizationIdentity ??
					contextIds?.[ContextIdKeys.UserOrganization] ??
					contextIds?.[ContextIdKeys.Organization];

				const context: IAuditableItemGraphServiceContext = {
					now: new Date(Date.now()).toISOString(),
					organizationIdentity: ownerOrganizationId,
					userIdentity: contextIds?.[ContextIdKeys.User]
				};

				delete vertexEntity.aliasIndex;
				const originalEntity = ObjectHelper.clone(vertexEntity);
				const newEntity = ObjectHelper.clone(vertexEntity);

				if (partial.annotationObject !== undefined) {
					newEntity.annotationObject = partial.annotationObject;
				}
				if (partial.aliasPatches !== undefined) {
					const aliasPatch = this.validateListPatch<IAuditableItemGraphAlias>(
						nameof(partial.aliasPatches),
						partial.aliasPatches
					);
					await this.applyAliasPatch(context, newEntity, aliasPatch);
				}
				if (partial.resourcePatches !== undefined) {
					const resourcePatch = this.validateListPatch<IAuditableItemGraphResource>(
						nameof(partial.resourcePatches),
						partial.resourcePatches
					);
					await this.applyResourcePatch(context, newEntity, resourcePatch);
				}
				if (partial.edgePatches !== undefined) {
					const edgePatch = this.validateListPatch<IAuditableItemGraphEdge>(
						nameof(partial.edgePatches),
						partial.edgePatches
					);
					await this.applyEdgePatch(context, newEntity, edgePatch);
				}

				await this.persistVertexChanges(context, vertexId, partial.id, originalEntity, newEntity);
			} catch (error) {
				throw new GeneralError(
					AuditableItemGraphService.CLASS_NAME,
					"updatingFailed",
					undefined,
					error
				);
			}
		} finally {
			Mutex.unlock(vertexId);
		}
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
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(id), id);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id
			});
		}

		try {
			const vertexId = urnParsed.namespaceSpecific(0);

			const vertexEntity = await this._vertexStorage.get(vertexId);

			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(AuditableItemGraphService.CLASS_NAME, "vertexNotFound", id);
			}

			const vertexModel = this.vertexEntityToJsonLd(vertexEntity);

			const verifySignatureDepth = options?.verifySignatureDepth ?? VerifyDepth.None;

			let verified: boolean | undefined;

			if (
				verifySignatureDepth === VerifyDepth.Current ||
				verifySignatureDepth === VerifyDepth.All
			) {
				const verifyResult = await this.verifyChangesets(vertexModel, verifySignatureDepth);
				verified = verifyResult.verified;
				vertexModel["@context"].push(ImmutableProofContexts.Context);
			}

			if (!(options?.includeDeleted ?? false)) {
				if (Is.arrayValue(vertexModel.aliases)) {
					vertexModel.aliases = vertexModel.aliases.filter(a => Is.undefined(a.dateDeleted));
					if (vertexModel.aliases.length === 0) {
						delete vertexModel.aliases;
					}
				}
				if (Is.arrayValue(vertexModel.resources)) {
					vertexModel.resources = vertexModel.resources.filter(r => Is.undefined(r.dateDeleted));
					if (vertexModel.resources.length === 0) {
						delete vertexModel.resources;
					}
				}
				if (Is.arrayValue(vertexModel.edges)) {
					vertexModel.edges = vertexModel.edges.filter(r => Is.undefined(r.dateDeleted));
					if (vertexModel.edges.length === 0) {
						delete vertexModel.edges;
					}
				}
			}

			if (verifySignatureDepth !== VerifyDepth.None) {
				vertexModel.verified = verified;
			}

			const result = await JsonLdProcessor.compact(vertexModel, vertexModel["@context"]);
			return result;
		} catch (error) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Get a graph vertex changeset list.
	 * @param id The id of the vertex to get.
	 * @param cursor The optional cursor to get next chunk.
	 * @param limit Limit the number of entities to return.
	 * @param options Additional options for the get operation.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The vertex if found.
	 * @throws NotFoundError if the vertex is not found.
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
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(id), id);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id
			});
		}

		try {
			const vertexId = urnParsed.namespaceSpecific(0);

			const vertexEntity = await this._vertexStorage.get(vertexId);

			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(AuditableItemGraphService.CLASS_NAME, "vertexNotFound", id);
			}

			const chunk = await this.verifyChangesetChunk(
				vertexId,
				options?.verifySignatureDepth ?? VerifyDepth.None,
				cursor,
				limit
			);

			if ((options?.verifySignatureDepth ?? VerifyDepth.None) !== VerifyDepth.None) {
				if (chunk.verified) {
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.VerificationsSucceeded
					);
				} else {
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.VerificationsFailed
					);
				}
			}

			const changesetList: IAuditableItemGraphChangesetList = {
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemGraphContexts.Context,
					AuditableItemGraphContexts.ContextCommon
				],
				type: [SchemaOrgTypes.ItemList, AuditableItemGraphTypes.ChangesetList],
				[SchemaOrgTypes.ItemListElement]: chunk.changesets
			};

			const result = await JsonLdProcessor.compact(changesetList, changesetList["@context"]);
			return {
				changesets: result,
				cursor: chunk.cursor
			};
		} catch (error) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Get a graph vertex changeset.
	 * @param id The id of the vertex to get.
	 * @param options Additional options for the get operation.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The vertex if found.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async getChangeset(
		id: string,
		options?: {
			verifySignatureDepth?: VerifyDepth;
		}
	): Promise<IAuditableItemGraphChangeset> {
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(id), id);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id
			});
		}

		try {
			const namespaceSpecificParts = urnParsed.namespaceSpecificParts();
			const vertexId = namespaceSpecificParts[0];
			const changesetId = namespaceSpecificParts[2];

			const vertexEntity = await this._vertexStorage.get(vertexId);
			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(AuditableItemGraphService.CLASS_NAME, "vertexNotFound", id);
			}

			const changesetEntity = await this._changesetStorage.get(changesetId);
			if (Is.empty(changesetEntity)) {
				throw new NotFoundError(AuditableItemGraphService.CLASS_NAME, "changesetNotFound", id);
			}

			const changesetModel = this.changesetEntityToJsonLd(vertexId, changesetEntity);

			const verifySignatureDepth = options?.verifySignatureDepth ?? VerifyDepth.None;
			if (verifySignatureDepth !== VerifyDepth.None) {
				changesetModel["@context"]?.push(ImmutableProofContexts.Context);
				changesetModel.verification = await this.verifyChangesetSignature(changesetModel);
				if (changesetModel.verification?.verified) {
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.VerificationsSucceeded
					);
				} else {
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.VerificationsFailed,
						{
							failureReason: changesetModel.verification?.failure
						}
					);
				}
			}

			const result = await JsonLdProcessor.compact(changesetModel, changesetModel["@context"]);
			return result;
		} catch (error) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Get a graph vertex at a specific version.
	 * @param id The id of the vertex.
	 * @param version The version number to retrieve.
	 * @returns The vertex reconstructed at that version.
	 * @throws NotFoundError if the vertex or version is not found.
	 */
	public async getVersion(id: string, version: number): Promise<IAuditableItemGraphVertex> {
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(id), id);
		Guards.integer(AuditableItemGraphService.CLASS_NAME, nameof(version), version);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id
			});
		}

		try {
			const vertexId = urnParsed.namespaceSpecific(0);

			const vertexEntity = await this._vertexStorage.get(vertexId);
			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(AuditableItemGraphService.CLASS_NAME, "vertexNotFound", id);
			}

			const currentVersion = vertexEntity.version ?? 0;
			if (version > currentVersion || version < 0) {
				throw new NotFoundError(
					AuditableItemGraphService.CLASS_NAME,
					"versionNotFound",
					version.toString()
				);
			}

			// Short circuit if requesting the current version to avoid unnecessary changeset retrieval and patching
			if (version === currentVersion) {
				const vertexModel = this.vertexEntityToJsonLd(vertexEntity);
				vertexModel.version = version;
				return await JsonLdProcessor.compact(vertexModel, vertexModel["@context"]);
			}

			const changesets = await this.internalGetChangesets(vertexId, {
				maxVersion: version
			});

			let entityState: AuditableItemGraphVertex = {
				id: vertexEntity.id,
				dateCreated: vertexEntity.dateCreated,
				organizationIdentity: vertexEntity.organizationIdentity
			};
			for (const changeset of changesets) {
				entityState = JsonHelper.patch(entityState, changeset.patches);
			}

			const vertexModel = this.vertexEntityToJsonLd(entityState);
			vertexModel.version = version;

			const result = await JsonLdProcessor.compact(vertexModel, vertexModel["@context"]);
			return result;
		} catch (error) {
			throw new GeneralError(
				AuditableItemGraphService.CLASS_NAME,
				"getVersionFailed",
				undefined,
				error
			);
		}
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
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(id), id);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id
			});
		}

		try {
			const vertexId = urnParsed.namespaceSpecific(0);

			const vertexEntity = await this._vertexStorage.get(vertexId);
			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(AuditableItemGraphService.CLASS_NAME, "vertexNotFound", id);
			}

			const beforeDate = Coerce.dateTime(options?.before);
			const afterDate = Coerce.dateTime(options?.after);

			const allChangesets = await this.internalGetChangesets(vertexId, {
				before: beforeDate?.toISOString()
			});

			const versions: { version: number; dateCreated: string }[] = [];
			for (const changeset of allChangesets) {
				const changesetDate = Coerce.dateTime(changeset.dateCreated);
				const afterExcluded =
					!Is.empty(afterDate) && !Is.empty(changesetDate) && changesetDate <= afterDate;

				if (!afterExcluded) {
					versions.push({
						version: changeset.version ?? 0,
						dateCreated: changeset.dateCreated
					});
				}
			}

			const versionList: IAuditableItemGraphVertexVersionList = {
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemGraphContexts.Context,
					AuditableItemGraphContexts.ContextCommon
				],
				type: [SchemaOrgTypes.ItemList, AuditableItemGraphTypes.VertexVersionList],
				[SchemaOrgTypes.ItemListElement]: versions
			};

			return await JsonLdProcessor.compact(versionList, versionList["@context"]);
		} catch (error) {
			throw new GeneralError(
				AuditableItemGraphService.CLASS_NAME,
				"getVersionsFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Remove the proof for an item.
	 * @param id The id of the vertex to remove the proof from.
	 * @returns A promise that resolves when the proof has been removed from all changesets.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async removeProof(id: string): Promise<void> {
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(id), id);

		const vertexId = this.parseVertexId(id);

		await Mutex.lock(vertexId, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });

		try {
			const vertexEntity = await this._vertexStorage.get(vertexId);

			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(AuditableItemGraphService.CLASS_NAME, "vertexNotFound", id);
			}

			let changesetsResult;
			do {
				changesetsResult = await this._changesetStorage.query(
					{
						property: "vertexId",
						value: vertexId,
						comparison: ComparisonOperator.Equals
					},
					[
						{
							property: "dateCreated",
							sortDirection: SortDirection.Ascending
						}
					],
					undefined,
					changesetsResult?.cursor
				);

				for (const changeset of changesetsResult.entities) {
					if (Is.stringValue(changeset.proofId)) {
						await this._immutableProofComponent.removeNotarization(changeset.proofId);
						delete changeset.proofId;
						await this._changesetStorage.set(changeset as AuditableItemGraphChangeset);
					}
				}
			} while (Is.stringValue(changesetsResult.cursor));
		} catch (error) {
			throw new GeneralError(
				AuditableItemGraphService.CLASS_NAME,
				"removeProofFailed",
				undefined,
				error
			);
		} finally {
			Mutex.unlock(vertexId);
		}
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
	 * @param orderByDirection The direction for the order, defaults to desc.
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
		try {
			const propertiesToReturn: (keyof IAuditableItemGraphVertex)[] = properties ?? [
				"id",
				"dateCreated",
				"dateModified",
				"aliases",
				"annotationObject"
			];
			const combinedConditions = conditions ?? [];
			const orderProperty = orderBy ?? "dateCreated";
			const orderDirection = orderByDirection ?? SortDirection.Descending;
			const idExact = options?.idExact ?? false;

			const idOrAlias = options?.id;
			if (Is.stringValue(idOrAlias)) {
				const idMode = options?.idMode ?? "both";
				if (idMode === "id" || idMode === "both") {
					combinedConditions.push({
						property: "id",
						comparison: idExact ? ComparisonOperator.Equals : ComparisonOperator.Includes,
						value: idOrAlias
					});
				}
				if (idMode === "alias" || idMode === "both") {
					combinedConditions.push({
						property: "aliasIndex",
						comparison: ComparisonOperator.Includes,
						value: idExact ? `||${idOrAlias.toLowerCase()}||` : idOrAlias.toLowerCase()
					});
				}
			}

			if (Is.arrayValue(options?.resourceTypes)) {
				for (const resourceType of options.resourceTypes) {
					combinedConditions.push({
						property: "resourceTypeIndex",
						comparison: ComparisonOperator.Includes,
						value: `||${resourceType.toLowerCase()}||`
					});
				}
			}

			if (!propertiesToReturn.includes("id")) {
				propertiesToReturn.unshift("id");
			}

			const results = await this._vertexStorage.query(
				combinedConditions.length > 0
					? {
							conditions: combinedConditions,
							logicalOperator: LogicalOperator.Or
						}
					: undefined,
				[
					{
						property: orderProperty,
						sortDirection: orderDirection
					}
				],
				propertiesToReturn as (keyof AuditableItemGraphVertex)[],
				cursor,
				limit
			);

			const models: IAuditableItemGraphVertex[] = results.entities.map(e =>
				this.vertexEntityToJsonLd(e as AuditableItemGraphVertex)
			);

			const vertexList: IAuditableItemGraphVertexList = {
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemGraphContexts.Context,
					AuditableItemGraphContexts.ContextCommon
				],
				type: [SchemaOrgTypes.ItemList, AuditableItemGraphTypes.VertexList],
				[SchemaOrgTypes.ItemListElement]: models
			};

			const result = await JsonLdProcessor.compact(vertexList, vertexList["@context"]);

			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.QueriesExecuted,
				{
					resultCount: models.length,
					hasMore: Is.stringValue(results.cursor)
				}
			);

			return {
				entries: result,
				cursor: results.cursor
			};
		} catch (error) {
			throw new GeneralError(
				AuditableItemGraphService.CLASS_NAME,
				"queryingFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Parse and validate a vertex URN; return the compact storage id.
	 * @param id The vertex URN.
	 * @returns The compact vertex id.
	 * @throws {GeneralError} If the namespace does not match the expected namespace.
	 * @internal
	 */
	private parseVertexId(id: string): string {
		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id
			});
		}

		return urnParsed.namespaceSpecific(0);
	}

	/**
	 * Validate that a PATCH sub-list value is a list patch object, not a bare array.
	 * @param propertyName The property name for error reporting.
	 * @param patch The patch value.
	 * @returns The validated list patch.
	 * @throws {GeneralError} If the patch value is a bare array instead of a list patch object.
	 * @internal
	 */
	private validateListPatch<TItem>(
		propertyName: string,
		patch: unknown
	): IAuditableItemGraphListPatch<TItem> {
		if (Is.array(patch)) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "listPatchInvalidFormat", {
				property: propertyName
			});
		}

		Guards.object<IAuditableItemGraphListPatch<TItem>>(
			AuditableItemGraphService.CLASS_NAME,
			propertyName,
			patch
		);

		return patch;
	}

	/**
	 * Persist vertex changes after update or partial update.
	 * @param context The context for the operation.
	 * @param vertexId The compact vertex id.
	 * @param vertexUrn The vertex URN for events.
	 * @param originalEntity The entity before changes.
	 * @param newEntity The entity after changes.
	 * @returns A promise that resolves when the changes have been persisted and events published.
	 * @internal
	 */
	private async persistVertexChanges(
		context: IAuditableItemGraphServiceContext,
		vertexId: string,
		vertexUrn: string,
		originalEntity: AuditableItemGraphVertex,
		newEntity: AuditableItemGraphVertex
	): Promise<void> {
		const nextVersion = Is.empty(originalEntity.version)
			? (await this.internalGetChangesets(vertexId)).length
			: originalEntity.version + 1;
		const patches = await this.addChangeset(context, originalEntity, newEntity, false, nextVersion);
		if (patches.length > 0) {
			newEntity.dateModified = context.now;
			newEntity.version = nextVersion;

			const indexes = this.buildIndexes(newEntity);

			await this._vertexStorage.set({
				...newEntity,
				...indexes
			});

			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.VerticesUpdated,
				{
					patchCount: patches.length
				}
			);

			await this._eventBusComponent?.publish<IAuditableItemGraphEventBusVertexUpdated>(
				AuditableItemGraphTopics.VertexUpdated,
				{ id: vertexUrn, patches }
			);
		}
	}

	/**
	 * Map the vertex entity to JSON-LD.
	 * @param vertexEntity The vertex entity.
	 * @returns The model.
	 * @internal
	 */
	private vertexEntityToJsonLd(vertexEntity: AuditableItemGraphVertex): IAuditableItemGraphVertex {
		const model: IAuditableItemGraphVertex = {
			"@context": [
				AuditableItemGraphContexts.Context,
				AuditableItemGraphContexts.ContextCommon,
				SchemaOrgContexts.Context
			],
			type: AuditableItemGraphTypes.Vertex,
			id: new Urn(AuditableItemGraphService.NAMESPACE, vertexEntity.id).toString(),
			dateCreated: vertexEntity.dateCreated,
			dateModified: vertexEntity.dateModified,
			organizationIdentity: vertexEntity.organizationIdentity,
			annotationObject: vertexEntity.annotationObject
		};

		if (Is.arrayValue(vertexEntity.aliases)) {
			model.aliases ??= [];
			for (const aliasEntity of vertexEntity.aliases) {
				const aliasModel: IAuditableItemGraphAlias = {
					"@context": [
						AuditableItemGraphContexts.Context,
						AuditableItemGraphContexts.ContextCommon,
						SchemaOrgContexts.Context
					],
					type: AuditableItemGraphTypes.Alias,
					id: aliasEntity.id,
					aliasFormat: aliasEntity.aliasFormat,
					dateCreated: aliasEntity.dateCreated,
					dateModified: aliasEntity.dateModified,
					dateDeleted: aliasEntity.dateDeleted,
					annotationObject: aliasEntity.annotationObject
				};
				model.aliases.push(aliasModel);
			}
		}

		if (Is.arrayValue(vertexEntity.resources)) {
			model.resources ??= [];
			for (const resourceEntity of vertexEntity.resources) {
				const resourceModel: IAuditableItemGraphResource = {
					"@context": [
						AuditableItemGraphContexts.Context,
						AuditableItemGraphContexts.ContextCommon,
						SchemaOrgContexts.Context
					],
					type: AuditableItemGraphTypes.Resource,
					id: resourceEntity.id,
					dateCreated: resourceEntity.dateCreated,
					dateModified: resourceEntity.dateModified,
					dateDeleted: resourceEntity.dateDeleted,
					resourceObject: resourceEntity.resourceObject
				};
				model.resources.push(resourceModel);
			}
		}

		if (Is.arrayValue(vertexEntity.edges)) {
			model.edges ??= [];
			for (const edgeEntity of vertexEntity.edges) {
				const edgeModel: IAuditableItemGraphEdge = {
					"@context": [
						AuditableItemGraphContexts.Context,
						AuditableItemGraphContexts.ContextCommon,
						SchemaOrgContexts.Context
					],
					type: AuditableItemGraphTypes.Edge,
					id: this.fullEdgeId(vertexEntity.id, edgeEntity.id),
					targetId: edgeEntity.targetId,
					dateCreated: edgeEntity.dateCreated,
					dateModified: edgeEntity.dateModified,
					dateDeleted: edgeEntity.dateDeleted,
					edgeRelationships: edgeEntity.edgeRelationships,
					annotationObject: edgeEntity.annotationObject
				};
				model.edges.push(edgeModel);
			}
		}

		return model;
	}

	/**
	 * Map the changeset entity to a JSON-LD.
	 * @param vertexId The id of the vertex the changeset belongs to.
	 * @param changesetEntity The changeset entity.
	 * @returns The model.
	 * @internal
	 */
	private changesetEntityToJsonLd(
		vertexId: string,
		changesetEntity: AuditableItemGraphChangeset
	): IAuditableItemGraphChangeset {
		const model: IAuditableItemGraphChangeset = {
			"@context": [
				AuditableItemGraphContexts.Context,
				AuditableItemGraphContexts.ContextCommon,
				SchemaOrgContexts.Context
			],
			type: AuditableItemGraphTypes.Changeset,
			id: new Urn(AuditableItemGraphService.NAMESPACE, [
				vertexId,
				AuditableItemGraphService.NAMESPACE_CHANGESET,
				changesetEntity.id
			]).toString(),
			dateCreated: changesetEntity.dateCreated,
			userIdentity: changesetEntity.userIdentity,
			patches: changesetEntity.patches.map(p => ({
				"@context": [
					AuditableItemGraphContexts.Context,
					AuditableItemGraphContexts.ContextCommon,
					SchemaOrgContexts.Context
				],
				type: AuditableItemGraphTypes.PatchOperation,
				patchOperation: p.op,
				patchPath: p.path,
				patchFrom: p.from,
				patchValue: p.value
			})),
			proofId: changesetEntity.proofId,
			version: changesetEntity.version
		};

		return model;
	}

	/**
	 * Fetch all changesets for a vertex in ascending date order.
	 * @param vertexId The internal vertex id.
	 * @param options Optional filtering options.
	 * @param options.before Only fetch changesets created strictly before this ISO 8601 timestamp.
	 * @param options.maxVersion Only fetch changesets with version <= this value.
	 * @returns All changeset entities sorted ascending by dateCreated.
	 * @internal
	 */
	private async internalGetChangesets(
		vertexId: string,
		options?: { before?: string; maxVersion?: number }
	): Promise<AuditableItemGraphChangeset[]> {
		const all: AuditableItemGraphChangeset[] = [];
		let cursor: string | undefined;

		const conditions: IComparator[] = [
			{ property: "vertexId", value: vertexId, comparison: ComparisonOperator.Equals }
		];
		if (Is.stringValue(options?.before)) {
			conditions.push({
				property: "dateCreated",
				value: options.before,
				comparison: ComparisonOperator.LessThan
			});
		}
		if (!Is.empty(options?.maxVersion)) {
			conditions.push({
				property: "version",
				value: options.maxVersion,
				comparison: ComparisonOperator.LessThanOrEqual
			});
		}

		do {
			const result = await this._changesetStorage.query(
				{ conditions, logicalOperator: LogicalOperator.And },
				[{ property: "dateCreated", sortDirection: SortDirection.Ascending }],
				undefined,
				cursor
			);
			all.push(...(result.entities as AuditableItemGraphChangeset[]));
			cursor = result.cursor;
		} while (Is.stringValue(cursor));

		return all;
	}

	/**
	 * Replace the aliases of a vertex model (PUT).
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param aliases The new active alias set.
	 * @returns A promise that resolves when the alias list has been replaced.
	 * @internal
	 */
	private async updateAliasList(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		aliases?: IAuditableItemGraphAlias[]
	): Promise<void> {
		const active = vertex.aliases?.filter(a => Is.empty(a.dateDeleted)) ?? [];

		if (Is.arrayValue(active)) {
			for (const alias of active) {
				if (!aliases?.find(a => a.id === alias.id)) {
					alias.dateDeleted = context.now;
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.AliasesDeleted
					);
				}
			}
		}

		if (Is.arrayValue(aliases)) {
			for (const alias of aliases) {
				await this.updateAlias(context, vertex, alias);
			}
		}
	}

	/**
	 * Apply alias patch operations (PATCH).
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param patch The alias patch.
	 * @returns A promise that resolves when the alias patch has been applied.
	 * @internal
	 */
	private async applyAliasPatch(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		patch: IAuditableItemGraphListPatch<IAuditableItemGraphAlias>
	): Promise<void> {
		if (Is.arrayValue(patch.remove)) {
			for (const removeId of patch.remove) {
				Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(removeId), removeId);
				const alias = vertex.aliases?.find(a => a.id === removeId && Is.empty(a.dateDeleted));
				if (!Is.empty(alias)) {
					alias.dateDeleted = context.now;
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.AliasesDeleted
					);
				}
			}
		}

		if (Is.arrayValue(patch.add)) {
			for (const alias of patch.add) {
				await this.updateAlias(context, vertex, alias);
			}
		}
	}

	/**
	 * Update an alias in the vertex.
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param alias The alias.
	 * @returns A promise that resolves when the alias has been added or updated.
	 * @internal
	 */
	private async updateAlias(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		alias: IAuditableItemGraphAlias
	): Promise<void> {
		Guards.object(AuditableItemGraphService.CLASS_NAME, nameof(alias), alias);
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(alias.id), alias.id);

		if (alias.unique ?? false) {
			const existingVertices = await this.findMatchingVertices(vertex.id, alias.id);
			if (existingVertices) {
				throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "aliasNotUnique", {
					aliasId: alias.id
				});
			}
		}

		if (Is.object(alias.annotationObject)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(alias.annotationObject, validationFailures);
			Validation.asValidationError(
				AuditableItemGraphService.CLASS_NAME,
				nameof(alias.annotationObject),
				validationFailures
			);
		}

		// Try to find an existing alias with the same id.
		const existing = vertex.aliases?.find(a => a.id === alias.id);

		if (Is.empty(existing) || !Is.empty(existing?.dateDeleted)) {
			// Did not find a matching item, or found one which is deleted.
			vertex.aliases ??= [];

			const model: AuditableItemGraphAlias = {
				id: alias.id,
				aliasFormat: alias.aliasFormat,
				dateCreated: context.now,
				annotationObject: alias.annotationObject,
				unique: alias.unique
			};

			vertex.aliases.push(model);
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.AliasesAdded
			);
		} else if (
			existing.aliasFormat !== alias.aliasFormat ||
			!ObjectHelper.equal(existing.annotationObject, alias.annotationObject, false) ||
			existing.unique !== alias.unique
		) {
			// Existing alias found, update the annotationObject.
			existing.dateModified = context.now;
			existing.aliasFormat = alias.aliasFormat;
			existing.annotationObject = alias.annotationObject;
			existing.unique = alias.unique;
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.AliasesModified
			);
		}
	}

	/**
	 * Replace the resources of a vertex (PUT).
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param resources The new active resource set.
	 * @returns A promise that resolves when the resource list has been replaced.
	 * @internal
	 */
	private async updateResourceList(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		resources?: IAuditableItemGraphResource[]
	): Promise<void> {
		if (Is.arrayValue(resources)) {
			for (let i = 0; i < resources.length; i++) {
				const id = this.getResourceId(resources[i]);
				if (Is.empty(id)) {
					throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "resourceIdMissing", {
						index: i
					});
				}
			}
		}

		const active = vertex.resources?.filter(r => Is.empty(r.dateDeleted)) ?? [];

		if (Is.arrayValue(active)) {
			for (const resource of active) {
				if (!resources?.find(a => this.getResourceId(a) === this.getResourceId(resource))) {
					resource.dateDeleted = context.now;
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.ResourcesDeleted
					);
				}
			}
		}

		if (Is.arrayValue(resources)) {
			for (const resource of resources) {
				await this.updateResource(context, vertex, resource);
			}
		}
	}

	/**
	 * Apply resource patch operations (PATCH).
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param patch The resource patch.
	 * @returns A promise that resolves when the resource patch has been applied.
	 * @internal
	 */
	private async applyResourcePatch(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		patch: IAuditableItemGraphListPatch<IAuditableItemGraphResource>
	): Promise<void> {
		if (Is.arrayValue(patch.remove)) {
			for (const removeId of patch.remove) {
				Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(removeId), removeId);
				const resource = vertex.resources?.find(
					r => this.getResourceId(r) === removeId && Is.empty(r.dateDeleted)
				);
				if (!Is.empty(resource)) {
					resource.dateDeleted = context.now;
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.ResourcesDeleted
					);
				}
			}
		}

		if (Is.arrayValue(patch.add)) {
			for (const resource of patch.add) {
				await this.updateResource(context, vertex, resource);
			}
		}
	}

	/**
	 * Add a resource to the vertex.
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param resource The resource.
	 * @returns A promise that resolves when the resource has been added or updated.
	 * @internal
	 */
	private async updateResource(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		resource: IAuditableItemGraphResource
	): Promise<void> {
		Guards.object(AuditableItemGraphService.CLASS_NAME, nameof(resource), resource);

		if (Is.object(resource.resourceObject)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(resource.resourceObject, validationFailures);
			Validation.asValidationError(
				AuditableItemGraphService.CLASS_NAME,
				nameof(resource.resourceObject),
				validationFailures
			);
		}

		// Try to find an existing resource with the same id.
		const existing = vertex.resources?.find(
			r => this.getResourceId(r) === this.getResourceId(resource)
		);

		if (Is.empty(existing) || !Is.empty(existing?.dateDeleted)) {
			// Did not find a matching item, or found one which is deleted.
			vertex.resources ??= [];

			const model: AuditableItemGraphResource = {
				id: resource.id,
				dateCreated: context.now,
				resourceObject: resource.resourceObject
			};

			vertex.resources.push(model);
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.ResourcesAdded
			);
		} else if (!ObjectHelper.equal(existing.resourceObject, resource.resourceObject, false)) {
			// Existing resource found, update the resourceObject.
			existing.dateModified = context.now;
			existing.resourceObject = resource.resourceObject;
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.ResourcesModified
			);
		}
	}

	/**
	 * Replace the edges of a vertex (PUT).
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param edges The new active edge set.
	 * @returns A promise that resolves when the edge list has been replaced.
	 * @internal
	 */
	private async updateEdgeList(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		edges?: IAuditableItemGraphEdge[]
	): Promise<void> {
		// `active` shares element refs with `vertex.edges` (the cloned newEntity); mutating `edge` below is intended.
		const active = vertex.edges?.filter(e => Is.empty(e.dateDeleted)) ?? [];

		if (Is.arrayValue(active)) {
			for (const edge of active) {
				if (
					!edges?.find(
						e =>
							this.edgeMatchesStoredEdge(e, edge.id) ||
							this.edgeMatchesActiveEdgeByRelationship(e, edge)
					)
				) {
					edge.dateDeleted = context.now;
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.EdgesDeleted
					);
				}
			}
		}

		if (Is.arrayValue(edges)) {
			for (const edge of edges) {
				await this.updateEdge(context, vertex, edge);
			}
		}
	}

	/**
	 * Apply edge patch operations (PATCH).
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param patch The edge patch.
	 * @returns A promise that resolves when the edge patch has been applied.
	 * @internal
	 */
	private async applyEdgePatch(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		patch: IAuditableItemGraphListPatch<IAuditableItemGraphEdge>
	): Promise<void> {
		if (Is.arrayValue(patch.remove)) {
			for (const removeId of patch.remove) {
				Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(removeId), removeId);
				const edge = vertex.edges?.find(
					e => Is.empty(e.dateDeleted) && this.edgeRemoveIdMatches(e.id, removeId)
				);
				if (!Is.empty(edge)) {
					edge.dateDeleted = context.now;
					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemGraphMetricIds.EdgesDeleted
					);
				}
			}
		}

		if (Is.arrayValue(patch.add)) {
			for (const edge of patch.add) {
				await this.updateEdge(context, vertex, edge);
			}
		}
	}

	/**
	 * Add an edge to the vertex.
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param edge The edge.
	 * @returns A promise that resolves when the edge has been added or updated.
	 * @internal
	 */
	private async updateEdge(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		edge: IAuditableItemGraphEdge
	): Promise<void> {
		Guards.object(AuditableItemGraphService.CLASS_NAME, nameof(edge), edge);
		Guards.stringValue(AuditableItemGraphService.CLASS_NAME, nameof(edge.targetId), edge.targetId);
		Guards.arrayValue(
			AuditableItemGraphService.CLASS_NAME,
			nameof(edge.edgeRelationships),
			edge.edgeRelationships
		);

		const validationFailures: IValidationFailure[] = [];
		if (edge.targetId === vertex.id) {
			validationFailures.push({
				property: "id",
				reason: `validation.${StringHelper.camelCase(AuditableItemGraphService.CLASS_NAME)}.edgeIdSameAsVertexId`,
				properties: {
					targetId: edge.targetId
				}
			});
		}
		if (Is.object(edge.annotationObject)) {
			await JsonLdHelper.validate(edge.annotationObject, validationFailures);
		}
		Validation.asValidationError(
			AuditableItemGraphService.CLASS_NAME,
			nameof(edge.annotationObject),
			validationFailures
		);

		let findId = Is.stringValue(edge.id) ? this.reduceEdgeId(edge.id) : undefined;
		if (Is.empty(findId)) {
			const existingActive = vertex.edges?.find(
				e =>
					Is.empty(e.dateDeleted) &&
					e.targetId === edge.targetId &&
					ArrayHelper.matches(e.edgeRelationships, edge.edgeRelationships)
			);
			findId = existingActive?.id ?? RandomHelper.generateUuidV7("compact");
		}

		// Try to find an existing edge with the same id.
		const existing = vertex.edges?.find(r => r.id === findId);

		if (Is.empty(existing) || !Is.empty(existing?.dateDeleted)) {
			// Did not find a matching item, or found one which is deleted.
			vertex.edges ??= [];

			const model: AuditableItemGraphEdge = {
				id: findId,
				targetId: edge.targetId,
				dateCreated: context.now,
				annotationObject: edge.annotationObject,
				edgeRelationships: edge.edgeRelationships
			};

			vertex.edges.push(model);
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.EdgesAdded
			);
		} else if (
			existing.targetId !== edge.targetId ||
			!ArrayHelper.matches(existing.edgeRelationships, edge.edgeRelationships) ||
			!ObjectHelper.equal(existing.annotationObject, edge.annotationObject, false)
		) {
			// Existing edge found, update the properties.
			existing.targetId = edge.targetId;
			existing.dateModified = context.now;
			existing.edgeRelationships = edge.edgeRelationships;
			existing.annotationObject = edge.annotationObject;
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.EdgesModified
			);
		}
	}

	/**
	 * Add a changeset to the vertex and generate the associated verifications.
	 * @param context The context for the operation.
	 * @param original The original vertex.
	 * @param updated The updated vertex.
	 * @param isNew Whether this is a new item.
	 * @param version The version number of the vertex after this changeset.
	 * @returns True if there were changes.
	 * @internal
	 */
	private async addChangeset(
		context: IAuditableItemGraphServiceContext,
		original: AuditableItemGraphVertex,
		updated: AuditableItemGraphVertex,
		isNew: boolean,
		version: number
	): Promise<IPatchOperation[]> {
		const patches = JsonHelper.diff(original, updated);

		// If there is a diff set or this is the first time the item is created.
		if (patches.length > 0 || isNew) {
			const changesetEntity: AuditableItemGraphChangeset = {
				id: RandomHelper.generateUuidV7("compact"),
				vertexId: updated.id,
				dateCreated: context.now,
				userIdentity: context.userIdentity,
				patches,
				version
			};

			// Create the JSON-LD object we want to use for the proof
			// this is a subset of fixed properties from the changeset object.
			const reducedChangesetJsonLd = this.changesetEntityToJsonLd(
				original.id,
				ObjectHelper.pick(changesetEntity, AuditableItemGraphService._PROOF_KEYS_CHANGESET)
			);

			// Create the proof for the changeset object only when the vertex has
			// an owning organisation. Vertices created by inbound unauthenticated
			// activities (e.g. DSP push via skipAuth inbox) have no org context at
			// creation time and must not require a proof until a local org claims
			// ownership through an authenticated interaction.
			if (Is.stringValue(updated.organizationIdentity)) {
				changesetEntity.proofId = await this._immutableProofComponent.create(
					JsonLdHelper.toNodeObject(reducedChangesetJsonLd)
				);
			}

			// Link the storage id to the changeset
			await this._changesetStorage.set(changesetEntity);
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.ChangesetsCreated
			);

			return patches;
		}

		return [];
	}

	/**
	 * Verify the changesets of a vertex.
	 * @param vertex The vertex to verify.
	 * @param verifySignatureDepth How many signatures to verify.
	 * @returns The verified flag and list of changesets.
	 * @internal
	 */
	private async verifyChangesets(
		vertex: IAuditableItemGraphVertex,
		verifySignatureDepth: VerifyDepth
	): Promise<{
		verified: boolean;
		changesets: IAuditableItemGraphChangeset[];
	}> {
		const changesets: IAuditableItemGraphChangeset[] = [];

		let verified = true;

		const vertexIdUrn = Urn.fromValidString(vertex.id);
		const vertexId = vertexIdUrn.namespaceSpecific();
		let cursor;

		do {
			const chunk = await this.verifyChangesetChunk(vertexId, verifySignatureDepth, cursor);
			cursor = chunk.cursor;
			if (!chunk.verified) {
				verified = false;
			}
			changesets.push(...chunk.changesets);
		} while (Is.stringValue(cursor));

		if (verified) {
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.VerificationsSucceeded
			);
		} else {
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemGraphMetricIds.VerificationsFailed
			);
		}

		return {
			verified,
			changesets
		};
	}

	/**
	 * Verify a chunk of changesets for a vertex.
	 * @param vertexId The id of the vertex to verify the changesets for.
	 * @param verifySignatureDepth How many signatures to verify.
	 * @param cursor The cursor to request the next chunk of changesets.
	 * @param limit The maximum number of changesets to verify in this chunk.
	 * @returns The changesets and whether they were verified.
	 * @internal
	 */
	private async verifyChangesetChunk(
		vertexId: string,
		verifySignatureDepth: string,
		cursor?: string,
		limit?: number
	): Promise<{
		changesets: IAuditableItemGraphChangeset[];
		verified: boolean;
		cursor?: string;
	}> {
		const changesets: IAuditableItemGraphChangeset[] = [];
		let verified = true;

		const changesetsResult = await this._changesetStorage.query(
			{
				property: "vertexId",
				value: vertexId,
				comparison: ComparisonOperator.Equals
			},
			[
				{
					property: "dateCreated",
					sortDirection: SortDirection.Ascending
				}
			],
			undefined,
			cursor,
			limit
		);

		const storedChangesets = changesetsResult.entities as AuditableItemGraphChangeset[];
		if (Is.arrayValue(storedChangesets)) {
			for (let i = 0; i < storedChangesets.length; i++) {
				const storedChangeset = storedChangesets[i];

				const storedChangesetJsonLd = this.changesetEntityToJsonLd(vertexId, storedChangeset);
				changesets.push(storedChangesetJsonLd);

				// If we are verifying all signatures
				// or this is the last changeset (cursor is empty)
				// and the changeset has a proofId, then verify the proof.
				if (
					verifySignatureDepth === VerifyDepth.All ||
					(verifySignatureDepth === VerifyDepth.Current &&
						!Is.stringValue(changesetsResult.cursor) &&
						i === storedChangesets.length - 1)
				) {
					storedChangesetJsonLd.verification =
						await this.verifyChangesetSignature(storedChangesetJsonLd);
					if (storedChangesetJsonLd.verification?.verified !== true) {
						verified = false;
					}
				}
			}
		}
		return { changesets, verified, cursor: changesetsResult.cursor };
	}

	/**
	 * Verify the signature of a changeset and add the verification result to the changeset JSON-LD.
	 * @param storedChangeset The changeset to verify.
	 * @returns Whether the changeset is verified.
	 * @internal
	 */
	private async verifyChangesetSignature(
		storedChangeset: IAuditableItemGraphChangeset
	): Promise<IImmutableProofVerification | undefined> {
		let verification: IImmutableProofVerification | undefined;
		if (!Is.stringValue(storedChangeset.proofId)) {
			verification = {
				"@context": ImmutableProofContexts.Context,
				type: ImmutableProofTypes.ImmutableProofVerification,
				verified: false,
				failure: ImmutableProofFailure.ProofMissing
			};
		} else {
			// Verify the proof for the changeset object
			verification = await this._immutableProofComponent.verify(storedChangeset.proofId);
		}
		return verification;
	}

	/**
	 * Get the resource id from a resource object.
	 * @param resource The resource.
	 * @param resource.id The id of the resource.
	 * @param resource.resourceObject The resource object.
	 * @returns The resource id if it can find one.
	 * @internal
	 */
	private getResourceId(resource: {
		id?: string;
		resourceObject?: IJsonLdNodeObject;
	}): string | undefined {
		return (
			resource.id ??
			ObjectHelper.extractProperty<string>(resource.resourceObject, ["id", "@id"], false)
		);
	}

	/**
	 * Build the indexes for the vertex.
	 * @param vertex The vertex to build the indexes for.
	 * @returns The indexes.
	 * @internal
	 */
	private buildIndexes(vertex: AuditableItemGraphVertex): {
		aliasIndex?: string;
		resourceTypeIndex?: string;
	} {
		const aliasIndex = vertex.aliases
			?.filter(a => Is.empty(a.dateDeleted))
			.map(a => a.id)
			.join("||")
			.toLowerCase();

		const resourceTypes: string[] = [];
		if (Is.arrayValue(vertex.resources)) {
			for (const resource of vertex.resources) {
				const resourceType = ObjectHelper.extractProperty<string>(
					resource.resourceObject,
					["@type", "type"],
					false
				);

				if (Is.stringValue(resourceType) && !resourceTypes.includes(resourceType)) {
					resourceTypes.push(resourceType);
				}
			}
		}

		const resourceTypeIndex = resourceTypes.join("||").toLowerCase();

		return {
			aliasIndex: Is.stringValue(aliasIndex) ? `||${aliasIndex}||` : undefined,
			resourceTypeIndex: Is.stringValue(resourceTypeIndex) ? `||${resourceTypeIndex}||` : undefined
		};
	}

	/**
	 * Find vertices with matching aliases.
	 * @param vertexId The id of the vertex to exclude from the search.
	 * @param aliasId The alias id to try and find.
	 * @returns True if any other vertices have matching aliases.
	 * @internal
	 */
	private async findMatchingVertices(vertexId: string, aliasId: string): Promise<boolean> {
		const results = await this._vertexStorage.query({
			conditions: [
				{
					property: "aliasIndex",
					comparison: ComparisonOperator.Includes,
					value: `||${aliasId.toLowerCase()}||`
				},
				{
					property: "id",
					value: vertexId,
					comparison: ComparisonOperator.NotEquals
				}
			],
			logicalOperator: LogicalOperator.And
		});

		return results.entities.length > 0;
	}

	/**
	 * Whether an incoming edge matches a stored edge id.
	 * @param incoming The incoming edge.
	 * @param storedEdgeId The compact stored edge id.
	 * @returns True if the incoming edge matches the stored edge id.
	 * @internal
	 */
	private edgeMatchesStoredEdge(incoming: IAuditableItemGraphEdge, storedEdgeId: string): boolean {
		return Is.stringValue(incoming.id) && this.reduceEdgeId(incoming.id) === storedEdgeId;
	}

	/**
	 * Whether a PATCH remove id matches a stored compact edge id (full URN or compact).
	 * @param storedEdgeId The compact stored edge id.
	 * @param removeId The id from the patch remove list.
	 * @returns True if the remove id identifies the stored edge.
	 * @internal
	 */
	private edgeRemoveIdMatches(storedEdgeId: string, removeId: string): boolean {
		if (storedEdgeId === removeId) {
			return true;
		}

		try {
			return this.reduceEdgeId(removeId) === storedEdgeId;
		} catch {
			return false;
		}
	}

	/**
	 * Whether an incoming id-less edge matches an active stored edge by target and relationships.
	 * @param incoming The incoming edge.
	 * @param stored The stored edge.
	 * @returns True if they match.
	 * @internal
	 */
	private edgeMatchesActiveEdgeByRelationship(
		incoming: IAuditableItemGraphEdge,
		stored: AuditableItemGraphEdge
	): boolean {
		return (
			Is.empty(incoming.id) &&
			Is.empty(stored.dateDeleted) &&
			incoming.targetId === stored.targetId &&
			ArrayHelper.matches(incoming.edgeRelationships, stored.edgeRelationships)
		);
	}

	/**
	 * Reduce the edge ID from a URN.
	 * @param urn The URN to reduce.
	 * @returns The edge ID.
	 * @throws GeneralError if the URN is not valid or not an edge URN.
	 * @internal
	 */
	private reduceEdgeId(urn: string): string {
		const urnParsed = Urn.fromValidString(urn);
		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id: urn
			});
		}
		if (urnParsed.namespaceSpecificParts().length !== 3) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "invalidEdgeId", {
				edgeId: urn
			});
		}
		if (urnParsed.namespaceSpecificParts()[1] !== AuditableItemGraphService.NAMESPACE_EDGE) {
			throw new GeneralError(AuditableItemGraphService.CLASS_NAME, "invalidEdgeId", {
				edgeId: urn
			});
		}
		return urnParsed.namespaceSpecificParts()[2];
	}

	/**
	 * Create a full edge ID URN from a vertex ID and edge ID.
	 * @param vertexId The vertex id the edge belongs to.
	 * @param edgeId The edge id.
	 * @returns The full edge ID URN.
	 * @internal
	 */
	private fullEdgeId(vertexId: string, edgeId: string): string {
		return new Urn(AuditableItemGraphService.NAMESPACE, [
			vertexId,
			AuditableItemGraphService.NAMESPACE_EDGE,
			edgeId
		]).toString();
	}
}
