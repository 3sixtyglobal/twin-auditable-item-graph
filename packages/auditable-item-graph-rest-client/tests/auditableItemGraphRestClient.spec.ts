// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuditableItemGraphContexts,
	AuditableItemGraphTypes,
	type IAuditableItemGraphVertex
} from "@twin.org/auditable-item-graph-models";
import { GuardError, ObjectHelper } from "@twin.org/core";
import { HttpMethod } from "@twin.org/web";
import { AuditableItemGraphRestClient } from "../src/auditableItemGraphRestClient.js";
import {
	createdResponse,
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

const ENDPOINT = "http://localhost:8080";
const PREFIX = "auditable-item-graph";

// Plain vertex id used for routes that do not require URN parsing.
const VERTEX_ID = "vertex001";

// URN whose NSS resolves to a single segment — used by getVersion (namespaceSpecific(0)).
const VERTEX_URN = "urn:aig:vertex001";

// URN with three colon-delimited NSS segments — used by getChangeset.
// namespaceSpecificParts()[0] = "vertex001", [2] = "changeset001".
const CHANGESET_URN = "urn:aig:vertex001:cs:changeset001";

const LOCATION = `${ENDPOINT}/${PREFIX}/${VERTEX_URN}`;

const TEST_VERTEX: IAuditableItemGraphVertex = {
	"@context": [AuditableItemGraphContexts.Context, AuditableItemGraphContexts.ContextCommon],
	id: VERTEX_ID,
	type: AuditableItemGraphTypes.Vertex,
	dateCreated: "2024-01-01T00:00:00Z",
	dateModified: "2024-01-01T00:00:00Z",
	annotationObject: { "@type": "https://schema.org/Thing", name: "Test vertex" }
};

const TEST_VERTEX_CREATE = ObjectHelper.omit(TEST_VERTEX, ["id"]);

const TEST_CHANGESET = {
	type: AuditableItemGraphTypes.Changeset,
	id: CHANGESET_URN,
	dateCreated: "2024-01-01T00:00:00Z",
	patches: []
};

const TEST_CHANGESET_LIST = {
	"@context": ["https://schema.twindev.org/aig/"],
	type: AuditableItemGraphTypes.ChangesetList,
	changesets: [TEST_CHANGESET]
};

const TEST_VERTEX_LIST = {
	"@context": ["https://schema.twindev.org/aig/"],
	type: AuditableItemGraphTypes.VertexList,
	vertices: [TEST_VERTEX]
};

const TEST_VERSION_LIST = {
	"@context": ["https://schema.twindev.org/aig/"],
	type: AuditableItemGraphTypes.VertexVersionList,
	versions: [{ version: 1, dateCreated: "2024-01-01T00:00:00Z" }]
};

const fetchMock = vi.fn();

describe("AuditableItemGraphRestClient", () => {
	let client: AuditableItemGraphRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new AuditableItemGraphRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	describe("create", () => {
		test("sends POST to /{prefix}", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(LOCATION));

			await client.create(TEST_VERTEX_CREATE);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}`);
			expect(options.method).toBe(HttpMethod.POST);
		});

		test("sends the vertex as the request body", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(LOCATION));

			await client.create(TEST_VERTEX_CREATE);

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.type).toBe(AuditableItemGraphTypes.Vertex);
			expect(body.annotationObject).toEqual(TEST_VERTEX_CREATE.annotationObject);
		});

		test("returns the Location header value as the new vertex id", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(LOCATION));

			const id = await client.create(TEST_VERTEX_CREATE);

			expect(id).toBe(VERTEX_URN);
		});
	});

	describe("get", () => {
		test("throws when id is empty", async () => {
			await expect(client.get("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /{prefix}/:id", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX));

			await client.get(VERTEX_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${VERTEX_ID}`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the vertex from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX));

			const result = await client.get(VERTEX_ID);

			expect(result).toEqual(TEST_VERTEX);
		});

		test("includes includeDeleted as a query parameter when true", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX));

			await client.get(VERTEX_ID, { includeDeleted: true });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("includeDeleted=true");
		});

		test("includes verifySignatureDepth as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX));

			await client.get(VERTEX_ID, { verifySignatureDepth: "all" });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("verifySignatureDepth=all");
		});
	});

	describe("getChangesets", () => {
		test("throws when id is empty", async () => {
			await expect(client.getChangesets("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /{prefix}/:id/changesets", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_CHANGESET_LIST));

			await client.getChangesets(VERTEX_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${VERTEX_ID}/changesets`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns changesets from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_CHANGESET_LIST));

			const result = await client.getChangesets(VERTEX_ID);

			expect(result.changesets).toEqual(TEST_CHANGESET_LIST);
		});

		test("returns undefined cursor when no Link header is present", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_CHANGESET_LIST));

			const result = await client.getChangesets(VERTEX_ID);

			expect(result.cursor).toBeUndefined();
		});

		test("extracts cursor from the Link next relation header", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"content-type": "application/json",
					link: `<${ENDPOINT}/${PREFIX}/${VERTEX_ID}/changesets?cursor=page2>; rel="next"`
				}),
				json: async () => TEST_CHANGESET_LIST
			});

			const result = await client.getChangesets(VERTEX_ID);

			expect(result.cursor).toBe("page2");
		});

		test("includes cursor as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_CHANGESET_LIST));

			await client.getChangesets(VERTEX_ID, "page1");

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("cursor=page1");
		});

		test("includes limit as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_CHANGESET_LIST));

			await client.getChangesets(VERTEX_ID, undefined, 10);

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("limit=10");
		});
	});

	describe("getChangeset", () => {
		test("throws when id is empty", async () => {
			await expect(client.getChangeset("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /{prefix}/:vertexId/changesets/:changesetId parsed from the URN", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_CHANGESET));

			await client.getChangeset(CHANGESET_URN);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/vertex001/changesets/changeset001`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the changeset from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_CHANGESET));

			const result = await client.getChangeset(CHANGESET_URN);

			expect(result).toEqual(TEST_CHANGESET);
		});

		test("includes verifySignatureDepth as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_CHANGESET));

			await client.getChangeset(CHANGESET_URN, { verifySignatureDepth: "current" });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("verifySignatureDepth=current");
		});
	});

	describe("getVersion", () => {
		test("throws when id is empty", async () => {
			await expect(client.getVersion("", 1)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when version is not an integer", async () => {
			await expect(client.getVersion(VERTEX_URN, 1.5)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME
			});
		});

		test("sends GET to /{prefix}/:vertexId/versions/:version parsed from the URN", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX));

			await client.getVersion(VERTEX_URN, 1);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/vertex001/versions/1`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the vertex at the requested version from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX));

			const result = await client.getVersion(VERTEX_URN, 1);

			expect(result).toEqual(TEST_VERTEX);
		});
	});

	describe("getVersions", () => {
		test("throws when id is empty", async () => {
			await expect(client.getVersions("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /{prefix}/:id/versions", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERSION_LIST));

			await client.getVersions(VERTEX_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${VERTEX_ID}/versions`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the version list from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERSION_LIST));

			const result = await client.getVersions(VERTEX_ID);

			expect(result).toEqual(TEST_VERSION_LIST);
		});

		test("includes after as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERSION_LIST));

			await client.getVersions(VERTEX_ID, { after: "2024-01-01T00:00:00Z" });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("after=");
		});

		test("includes before as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERSION_LIST));

			await client.getVersions(VERTEX_ID, { before: "2024-12-31T23:59:59Z" });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("before=");
		});
	});

	describe("update", () => {
		test("throws when vertex.id is empty", async () => {
			await expect(client.update({ ...TEST_VERTEX, id: "" })).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PUT to /{prefix}/:id", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.update({ ...TEST_VERTEX, id: VERTEX_ID });

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${VERTEX_ID}`);
			expect(options.method).toBe(HttpMethod.PUT);
		});

		test("sends the vertex properties without id in the request body", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.update({ ...TEST_VERTEX, id: VERTEX_ID });

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.id).toBeUndefined();
			expect(body.type).toBe(AuditableItemGraphTypes.Vertex);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await expect(client.update({ ...TEST_VERTEX, id: VERTEX_ID })).resolves.toBeUndefined();
		});
	});

	describe("updatePartial", () => {
		test("throws when partial.id is empty", async () => {
			await expect(client.updatePartial({ ...TEST_VERTEX, id: "" })).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PATCH to /{prefix}/:id", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updatePartial(TEST_VERTEX);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${VERTEX_ID}`);
			expect(options.method).toBe(HttpMethod.PATCH);
		});

		test("sends the partial properties without id in the request body", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updatePartial({
				...TEST_VERTEX,
				annotationObject: { "@type": "https://schema.org/Thing" }
			});

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.id).toBeUndefined();
			expect(body.annotationObject).toEqual({ "@type": "https://schema.org/Thing" });
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await expect(client.updatePartial(TEST_VERTEX)).resolves.toBeUndefined();
		});
	});

	describe("removeProof", () => {
		test("throws when id is empty", async () => {
			await expect(client.removeProof("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends DELETE to /{prefix}/:id/proof", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.removeProof(VERTEX_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${VERTEX_ID}/proof`);
			expect(options.method).toBe(HttpMethod.DELETE);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await expect(client.removeProof(VERTEX_ID)).resolves.toBeUndefined();
		});
	});

	describe("query", () => {
		test("sends GET to /{prefix}", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX_LIST));

			await client.query();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns entries from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX_LIST));

			const result = await client.query();

			expect(result.entries).toEqual(TEST_VERTEX_LIST);
		});

		test("returns undefined cursor when no Link header is present", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX_LIST));

			const result = await client.query();

			expect(result.cursor).toBeUndefined();
		});

		test("extracts cursor from the Link next relation header", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"content-type": "application/json",
					link: `<${ENDPOINT}/${PREFIX}?cursor=page2>; rel="next"`
				}),
				json: async () => TEST_VERTEX_LIST
			});

			const result = await client.query();

			expect(result.cursor).toBe("page2");
		});

		test("includes id in query parameters when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX_LIST));

			await client.query({ id: "search-term" });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("id=search-term");
		});

		test("includes idMode in query parameters when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX_LIST));

			await client.query({ idMode: "alias" });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("idMode=alias");
		});

		test("includes cursor as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX_LIST));

			await client.query(undefined, undefined, undefined, undefined, undefined, "page1");

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("cursor=page1");
		});

		test("includes limit as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_VERTEX_LIST));

			await client.query(undefined, undefined, undefined, undefined, undefined, undefined, 25);

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("limit=25");
		});
	});
});
