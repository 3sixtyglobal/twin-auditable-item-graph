// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpContextIdKeys,
	HttpHeaderHelper,
	HttpParameterHelper,
	type ICreatedResponse,
	type IHttpRequestContext,
	type INoContentResponse,
	type IRestRoute,
	type ITag
} from "@twin.org/api-models";
import {
	AuditableItemGraphContexts,
	AuditableItemGraphTypes,
	type IAuditableItemGraphChangesetGetRequest,
	type IAuditableItemGraphChangesetGetResponse,
	type IAuditableItemGraphChangesetListRequest,
	type IAuditableItemGraphChangesetListResponse,
	type IAuditableItemGraphComponent,
	type IAuditableItemGraphCreateRequest,
	type IAuditableItemGraphGetRequest,
	type IAuditableItemGraphGetResponse,
	type IAuditableItemGraphListRequest,
	type IAuditableItemGraphListResponse,
	type IAuditableItemGraphRemoveProofRequest,
	type IAuditableItemGraphUpdatePartialRequest,
	type IAuditableItemGraphUpdateRequest,
	type IAuditableItemGraphVersionGetRequest,
	type IAuditableItemGraphVersionGetResponse,
	type IAuditableItemGraphVersionListRequest,
	type IAuditableItemGraphVersionListResponse
} from "@twin.org/auditable-item-graph-models";
import { ContextIdStore } from "@twin.org/context";
import { Coerce, ComponentFactory, Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import { HeaderTypes, HttpStatusCode, type IHttpHeaders, MimeTypes } from "@twin.org/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "auditableItemGraphRoutes";

/**
 * The tag to associate with the routes.
 */
export const tagsAuditableItemGraph: ITag[] = [
	{
		name: "Auditable Item Graph",
		description: "Endpoints which are modelled to access an auditable item graph contract."
	}
];

/**
 * The REST routes for auditable item graph.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesAuditableItemGraph(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const createRoute: IRestRoute<IAuditableItemGraphCreateRequest, ICreatedResponse> = {
		operationId: "auditableItemGraphCreate",
		summary: "Create a new graph vertex",
		tag: tagsAuditableItemGraph[0].name,
		method: "POST",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphCreate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphCreateRequest>(),
			examples: [
				{
					id: "auditableItemGraphCreateRequestExample",
					request: {
						body: {
							"@context": [
								AuditableItemGraphContexts.Context,
								AuditableItemGraphContexts.ContextCommon
							],
							type: AuditableItemGraphTypes.Vertex,
							annotationObject: {
								"@context": "https://schema.org",
								"@type": "Note",
								content: "This is a simple note"
							},
							aliases: [
								{
									type: AuditableItemGraphTypes.Alias,
									id: "bar456",
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									type: AuditableItemGraphTypes.Alias,
									id: "foo321",
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							resources: [
								{
									type: AuditableItemGraphTypes.Resource,
									id: "resource1",
									resourceObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									type: AuditableItemGraphTypes.Resource,
									id: "resource2",
									resourceObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							edges: [
								{
									type: AuditableItemGraphTypes.Edge,
									targetId: "aig:1234567890",
									edgeRelationships: ["frenemy"],
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									type: AuditableItemGraphTypes.Edge,
									targetId: "aig:45678901234",
									edgeRelationships: ["end"],
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							]
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>(),
				examples: [
					{
						id: "auditableItemGraphCreateResponseExample",
						description: "The response when a new graph vertex is created.",
						response: {
							statusCode: HttpStatusCode.created,
							headers: {
								[HeaderTypes.Location]: "aig%3A1234567890"
							}
						}
					}
				]
			}
		]
	};

	const getRoute: IRestRoute<IAuditableItemGraphGetRequest, IAuditableItemGraphGetResponse> = {
		operationId: "auditableItemGraphGet",
		summary: "Get a graph vertex",
		tag: tagsAuditableItemGraph[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphGetRequest>(),
			examples: [
				{
					id: "auditableItemGraphGetRequestExample",
					request: {
						headers: {
							[HeaderTypes.Accept]: MimeTypes.Json
						},
						pathParams: {
							id: "aig:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemGraphGetResponse>(),
				examples: [
					{
						id: "auditableItemGraphGetResponseExample",
						response: {
							body: {
								"@context": [
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon,
									SchemaOrgContexts.Context
								],
								type: AuditableItemGraphTypes.Vertex,
								id: "aig:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								dateModified: "2024-08-22T11:55:16.271Z",
								annotationObject: {
									"@context": "https://schema.org",
									"@type": "Note",
									content: "This is a simple note"
								},
								aliases: [
									{
										"@context": [
											AuditableItemGraphContexts.Context,
											AuditableItemGraphContexts.ContextCommon,
											SchemaOrgContexts.Context
										],
										type: AuditableItemGraphTypes.Alias,
										id: "tst:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z"
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemGraphGetResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemGraphJsonLdGetResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon,
									SchemaOrgContexts.Context
								],
								type: AuditableItemGraphTypes.Vertex,
								id: "aig:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								dateModified: "2024-08-22T11:55:16.271Z",
								annotationObject: {
									"@context": "https://schema.org",
									"@type": "Note",
									content: "This is a simple note"
								},
								aliases: [
									{
										"@context": [
											AuditableItemGraphContexts.Context,
											AuditableItemGraphContexts.ContextCommon,
											SchemaOrgContexts.Context
										],
										type: AuditableItemGraphTypes.Alias,
										dateCreated: "2024-08-22T11:55:16.271Z",
										id: "tst:1234567890"
									}
								]
							}
						}
					}
				]
			}
		]
	};

	const getChangesetRoute: IRestRoute<
		IAuditableItemGraphChangesetGetRequest,
		IAuditableItemGraphChangesetGetResponse
	> = {
		operationId: "auditableItemGraphChangesetGet",
		summary: "Get a graph vertex changeset",
		tag: tagsAuditableItemGraph[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/changesets/:changesetId`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphChangesetGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphChangesetGetRequest>(),
			examples: [
				{
					id: "auditableItemGraphChangesetGetRequestExample",
					request: {
						headers: {
							[HeaderTypes.Accept]: MimeTypes.Json
						},
						pathParams: {
							id: "aig:1234567890",
							changesetId: "changeset:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemGraphChangesetGetResponse>(),
				examples: [
					{
						id: "auditableItemGraphChangesetGetResponseExample",
						response: {
							body: {
								"@context": [
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon
								],
								type: AuditableItemGraphTypes.Changeset,
								id: "aig:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								patches: [
									{
										type: "AuditableItemGraphPatchOperation",
										patchOperation: "add",
										patchPath: "/annotationObject",
										patchValue: {
											"@context": "https://www.w3.org/ns/activitystreams",
											type: "Create",
											actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
											object: { type: "Note", content: "This is a simple note" },
											published: "2015-01-25T12:34:56Z"
										}
									},
									{
										type: "AuditableItemGraphPatchOperation",
										patchOperation: "add",
										patchPath: "/aliases",
										patchValue: [
											{ id: "foo123", dateCreated: "2015-01-25T12:34:56Z" },
											{ id: "bar456", dateCreated: "2015-01-25T12:34:56Z" }
										]
									}
								],
								verification: {
									"@context": "https://schema.twindev.org/immutable-proof/",
									type: "ImmutableProofVerification",
									verified: true
								}
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemGraphChangesetGetResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemGraphChangesetJsonLdGetResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon,
									SchemaOrgContexts.Context
								],
								type: AuditableItemGraphTypes.Changeset,
								id: "aig:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								patches: [
									{
										type: "AuditableItemGraphPatchOperation",
										patchOperation: "add",
										patchPath: "/annotationObject",
										patchValue: {
											"@context": "https://www.w3.org/ns/activitystreams",
											type: "Create",
											actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
											object: { type: "Note", content: "This is a simple note" },
											published: "2015-01-25T12:34:56Z"
										}
									},
									{
										type: "AuditableItemGraphPatchOperation",
										patchOperation: "add",
										patchPath: "/aliases",
										patchValue: [
											{ id: "foo123", dateCreated: "2015-01-25T12:34:56Z" },
											{ id: "bar456", dateCreated: "2015-01-25T12:34:56Z" }
										]
									}
								],
								verification: {
									"@context": "https://schema.twindev.org/immutable-proof/",
									type: "ImmutableProofVerification",
									verified: true
								}
							}
						}
					}
				]
			}
		]
	};

	const getChangesetListRoute: IRestRoute<
		IAuditableItemGraphChangesetListRequest,
		IAuditableItemGraphChangesetListResponse
	> = {
		operationId: "auditableItemGraphChangesetList",
		summary: "Get a list of graph vertex changesets",
		tag: tagsAuditableItemGraph[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/changesets`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphChangesetList(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphChangesetListRequest>(),
			examples: [
				{
					id: "auditableItemGraphChangesetListRequestExample",
					request: {
						headers: {
							[HeaderTypes.Accept]: MimeTypes.Json
						},
						pathParams: {
							id: "aig:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemGraphChangesetListResponse>(),
				examples: [
					{
						id: "auditableItemGraphChangesetListResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemGraphTypes.ChangesetList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										type: AuditableItemGraphTypes.Changeset,
										id: "aig:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z",
										patches: [
											{
												type: "AuditableItemGraphPatchOperation",
												patchOperation: "add",
												patchPath: "/annotationObject",
												patchValue: {
													"@context": "https://www.w3.org/ns/activitystreams",
													type: "Create",
													actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
													object: { type: "Note", content: "This is a simple note" },
													published: "2015-01-25T12:34:56Z"
												}
											},
											{
												type: "AuditableItemGraphPatchOperation",
												patchOperation: "add",
												patchPath: "/aliases",
												patchValue: [
													{ id: "foo123", dateCreated: "2015-01-25T12:34:56Z" },
													{ id: "bar456", dateCreated: "2015-01-25T12:34:56Z" }
												]
											}
										],
										verification: {
											"@context": "https://schema.twindev.org/immutable-proof/",
											type: "ImmutableProofVerification",
											verified: true
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemGraphChangesetGetResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemGraphChangesetJsonLdGetResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon,
									SchemaOrgContexts.Context
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemGraphTypes.ChangesetList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										type: AuditableItemGraphTypes.Changeset,
										id: "aig:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z",
										patches: [
											{
												type: "AuditableItemGraphPatchOperation",
												patchOperation: "add",
												patchPath: "/annotationObject",
												patchValue: {
													"@context": "https://www.w3.org/ns/activitystreams",
													type: "Create",
													actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
													object: { type: "Note", content: "This is a simple note" },
													published: "2015-01-25T12:34:56Z"
												}
											},
											{
												type: "AuditableItemGraphPatchOperation",
												patchOperation: "add",
												patchPath: "/aliases",
												patchValue: [
													{ id: "foo123", dateCreated: "2015-01-25T12:34:56Z" },
													{ id: "bar456", dateCreated: "2015-01-25T12:34:56Z" }
												]
											}
										],
										verification: {
											"@context": "https://schema.twindev.org/immutable-proof/",
											type: "ImmutableProofVerification",
											verified: true
										}
									}
								]
							}
						}
					}
				]
			}
		]
	};

	const getVersionRoute: IRestRoute<
		IAuditableItemGraphVersionGetRequest,
		IAuditableItemGraphVersionGetResponse
	> = {
		operationId: "auditableItemGraphVersionGet",
		summary: "Get a graph vertex at a specific version",
		tag: tagsAuditableItemGraph[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/versions/:version`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphVersionGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphVersionGetRequest>(),
			examples: [
				{
					id: "auditableItemGraphVersionGetRequestExample",
					request: {
						headers: {
							[HeaderTypes.Accept]: MimeTypes.Json
						},
						pathParams: {
							id: "aig:1234567890",
							version: "1"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemGraphVersionGetResponse>(),
				examples: [
					{
						id: "auditableItemGraphVersionGetResponseExample",
						response: {
							body: {
								"@context": [
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon,
									SchemaOrgContexts.Context
								],
								type: AuditableItemGraphTypes.Vertex,
								id: "aig:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								version: 1
							}
						}
					}
				]
			}
		]
	};

	const getVersionListRoute: IRestRoute<
		IAuditableItemGraphVersionListRequest,
		IAuditableItemGraphVersionListResponse
	> = {
		operationId: "auditableItemGraphVersionList",
		summary: "Get all versions of a graph vertex",
		tag: tagsAuditableItemGraph[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/versions`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphVersionList(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphVersionListRequest>(),
			examples: [
				{
					id: "auditableItemGraphVersionListRequestExample",
					request: {
						headers: {
							[HeaderTypes.Accept]: MimeTypes.Json
						},
						pathParams: {
							id: "aig:1234567890"
						}
					}
				},
				{
					id: "auditableItemGraphVersionListAfterRequestExample",
					request: {
						pathParams: {
							id: "aig:1234567890"
						},
						query: {
							after: "2026-04-03T12:00:00Z"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemGraphVersionListResponse>(),
				examples: [
					{
						id: "auditableItemGraphVersionListResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemGraphTypes.VertexVersionList],
								[SchemaOrgTypes.ItemListElement]: [
									{ version: 0, dateCreated: "2024-08-22T11:55:16.271Z" },
									{ version: 1, dateCreated: "2024-08-22T11:56:00.000Z" },
									{ version: 2, dateCreated: "2024-08-22T11:57:00.000Z" }
								]
							}
						}
					}
				]
			}
		]
	};

	const updateRoute: IRestRoute<IAuditableItemGraphUpdateRequest, INoContentResponse> = {
		operationId: "auditableItemGraphUpdate",
		summary: "Update a graph vertex",
		tag: tagsAuditableItemGraph[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphUpdateRequest>(),
			examples: [
				{
					id: "auditableItemGraphUpdateRequestExample",
					request: {
						pathParams: {
							id: "aig:1234567890"
						},
						body: {
							"@context": [
								AuditableItemGraphContexts.Context,
								AuditableItemGraphContexts.ContextCommon
							],
							type: AuditableItemGraphTypes.Vertex,
							annotationObject: {
								"@context": "https://schema.org",
								"@type": "Note",
								content: "This is a simple note"
							},
							aliases: [
								{
									type: AuditableItemGraphTypes.Alias,
									id: "bar456",
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									type: AuditableItemGraphTypes.Alias,
									id: "foo321",
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							resources: [
								{
									type: AuditableItemGraphTypes.Resource,
									id: "resource1",
									resourceObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									type: AuditableItemGraphTypes.Resource,
									id: "resource2",
									resourceObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							edges: [
								{
									type: AuditableItemGraphTypes.Edge,
									id: "edge1",
									targetId: "aig:1234567890",
									edgeRelationships: ["frenemy"],
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									type: AuditableItemGraphTypes.Edge,
									id: "edge2",
									targetId: "aig:45678901234",
									edgeRelationships: ["end"],
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							]
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			}
		]
	};

	const updatePartialRoute: IRestRoute<
		IAuditableItemGraphUpdatePartialRequest,
		INoContentResponse
	> = {
		operationId: "auditableItemGraphUpdatePartial",
		summary: "Partially update a graph vertex",
		tag: tagsAuditableItemGraph[0].name,
		method: "PATCH",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphUpdatePartial(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphUpdatePartialRequest>(),
			examples: [
				{
					id: "auditableItemGraphUpdatePartialRequestExample",
					request: {
						pathParams: {
							id: "aig:1234567890"
						},
						body: {
							"@context": [
								AuditableItemGraphContexts.Context,
								AuditableItemGraphContexts.ContextCommon
							],
							edgePatches: {
								add: [
									{
										type: AuditableItemGraphTypes.Edge,
										targetId: "aig:45678901234",
										edgeRelationships: ["document"]
									}
								]
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			}
		]
	};

	const listRoute: IRestRoute<IAuditableItemGraphListRequest, IAuditableItemGraphListResponse> = {
		operationId: "auditableItemGraphList",
		summary: "Query graph vertices by id or alias",
		tag: tagsAuditableItemGraph[0].name,
		method: "GET",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphList(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphListRequest>(),
			examples: [
				{
					id: "IAuditableItemGraphListAllRequest",
					request: {}
				},
				{
					id: "IAuditableItemGraphListIdRequest",
					request: {
						query: {
							id: "1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemGraphListResponse>(),
				examples: [
					{
						id: "auditableItemGraphListResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemGraphTypes.VertexList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											AuditableItemGraphContexts.Context,
											AuditableItemGraphContexts.ContextCommon,
											SchemaOrgContexts.Context
										],
										type: AuditableItemGraphTypes.Vertex,
										id: "0101010101010101010101010101010101010101010101010101010101010101",
										dateCreated: "2024-08-22T11:55:16.271Z",
										aliases: [
											{
												"@context": [
													AuditableItemGraphContexts.Context,
													AuditableItemGraphContexts.ContextCommon,
													SchemaOrgContexts.Context
												],
												type: AuditableItemGraphTypes.Alias,
												id: "foo4",
												dateCreated: "2024-08-22T11:55:16.271Z"
											}
										]
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemGraphListResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemGraphJsonLdListResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemGraphContexts.Context,
									AuditableItemGraphContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemGraphTypes.VertexList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											AuditableItemGraphContexts.Context,
											AuditableItemGraphContexts.ContextCommon,
											SchemaOrgContexts.Context
										],
										type: AuditableItemGraphTypes.Vertex,
										id: "0101010101010101010101010101010101010101010101010101010101010101",
										dateCreated: "2024-08-22T11:55:16.271Z",
										aliases: [
											{
												"@context": [
													AuditableItemGraphContexts.Context,
													AuditableItemGraphContexts.ContextCommon,
													SchemaOrgContexts.Context
												],
												type: AuditableItemGraphTypes.Alias,
												id: "foo4",
												dateCreated: "2024-08-22T11:55:16.271Z"
											}
										]
									}
								]
							}
						}
					}
				]
			}
		]
	};

	const removeProofRoute: IRestRoute<IAuditableItemGraphRemoveProofRequest, INoContentResponse> = {
		operationId: "auditableItemGraphRemoveProof",
		summary: "Remove the notarization proof from all changesets of a graph vertex",
		tag: tagsAuditableItemGraph[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id/proof`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphRemoveProof(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphRemoveProofRequest>(),
			examples: [
				{
					id: "auditableItemGraphRemoveProofRequestExample",
					request: {
						pathParams: {
							id: "0101010101010101010101010101010101010101010101010101010101010101"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>(),
				examples: [
					{
						id: "auditableItemGraphRemoveProofResponseExample",
						response: {
							statusCode: HttpStatusCode.noContent
						}
					}
				]
			}
		]
	};

	return [
		createRoute,
		getRoute,
		getVersionRoute,
		getVersionListRoute,
		getChangesetRoute,
		getChangesetListRoute,
		updateRoute,
		updatePartialRoute,
		listRoute,
		removeProofRoute
	];
}

/**
 * Create the graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphCreateRequest
): Promise<ICreatedResponse> {
	Guards.object<IAuditableItemGraphCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphCreateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const id = await component.create(request.body);

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildId(headers, id);

	return {
		statusCode: HttpStatusCode.created,
		headers
	};
}

/**
 * Get the graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphGetRequest
): Promise<IAuditableItemGraphGetResponse> {
	Guards.object<IAuditableItemGraphGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const result = await component.get(request.pathParams.id, {
		includeDeleted: Coerce.boolean(request.query?.includeDeleted),
		verifySignatureDepth: request.query?.verifySignatureDepth
	});

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildJsonContentType(headers, request.headers);

	return {
		headers,
		body: result
	};
}

/**
 * Get the graph vertex changeset list.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphChangesetList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphChangesetListRequest
): Promise<IAuditableItemGraphChangesetListResponse> {
	Guards.object<IAuditableItemGraphChangesetListRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphChangesetListRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const result = await component.getChangesets(
		request.pathParams.id,
		request.query?.cursor,
		Coerce.integer(request.query?.limit),
		{
			verifySignatureDepth: request.query?.verifySignatureDepth
		}
	);

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildJsonContentType(headers, request.headers);

	const contextIds = await ContextIdStore.getContextIds();
	HttpHeaderHelper.buildCursor(
		headers,
		httpRequestContext.serverRequest.url,
		contextIds?.[HttpContextIdKeys.PublicOrigin],
		result.cursor
	);

	return {
		headers,
		body: result.changesets
	};
}

/**
 * Get the graph vertex changeset.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphChangesetGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphChangesetGetRequest
): Promise<IAuditableItemGraphChangesetGetResponse> {
	Guards.object<IAuditableItemGraphChangesetGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphChangesetGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const changesetUrn = `${request.pathParams.id}:changeset:${request.pathParams.changesetId}`;
	const result = await component.getChangeset(changesetUrn, {
		verifySignatureDepth: request.query?.verifySignatureDepth
	});

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildJsonContentType(headers, request.headers);

	return {
		headers,
		body: result
	};
}

/**
 * Update the graph vertex (PUT — full replacement of vertex state).
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphUpdateRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemGraphUpdateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphUpdateRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.object<IAuditableItemGraphUpdateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	await component.update({ ...request.body, id: request.pathParams.id });
	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Partially update the graph vertex (PATCH — optional scalars; list fields use `{ add, remove }`).
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphUpdatePartial(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphUpdatePartialRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemGraphUpdatePartialRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphUpdatePartialRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.object<IAuditableItemGraphUpdatePartialRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	await component.updatePartial({ ...request.body, id: request.pathParams.id });
	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Query the graph vertices.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphListRequest
): Promise<IAuditableItemGraphListResponse> {
	Guards.object<IAuditableItemGraphListRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphListRequest["query"]>(
		ROUTES_SOURCE,
		nameof(request.query),
		request.query
	);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);

	const result = await component.query(
		{
			id: request.query?.id,
			idMode: request.query?.idMode,
			idExact: Coerce.boolean(request.query?.idExact),
			resourceTypes: HttpParameterHelper.arrayFromString(request.query?.resourceTypes)
		},
		HttpParameterHelper.objectFromString(request.query?.conditions),
		request.query?.orderBy,
		request.query?.orderByDirection,
		HttpParameterHelper.arrayFromString(request.query?.properties),
		request.query?.cursor,
		Coerce.integer(request.query?.limit)
	);

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildJsonContentType(headers, request.headers);

	const contextIds = await ContextIdStore.getContextIds();
	HttpHeaderHelper.buildCursor(
		headers,
		httpRequestContext.serverRequest.url,
		contextIds?.[HttpContextIdKeys.PublicOrigin],
		result.cursor
	);

	return {
		headers,
		body: result.entries
	};
}

/**
 * Get the graph vertex at a specific version.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphVersionGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphVersionGetRequest
): Promise<IAuditableItemGraphVersionGetResponse> {
	Guards.object<IAuditableItemGraphVersionGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphVersionGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const version = Coerce.integer(request.pathParams.version);
	Guards.integer(ROUTES_SOURCE, nameof(request.pathParams.version), version);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const result = await component.getVersion(request.pathParams.id, version);

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildJsonContentType(headers, request.headers);

	return {
		headers,
		body: result
	};
}

/**
 * Remove the notarization proof from all changesets of a graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphRemoveProof(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphRemoveProofRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemGraphRemoveProofRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphRemoveProofRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	await component.removeProof(request.pathParams.id);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Get all versions of a graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphVersionList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphVersionListRequest
): Promise<IAuditableItemGraphVersionListResponse> {
	Guards.object<IAuditableItemGraphVersionListRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphVersionListRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const result = await component.getVersions(request.pathParams.id, {
		after: request.query?.after,
		before: request.query?.before
	});

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildJsonContentType(headers, request.headers);

	return {
		headers,
		body: result
	};
}
