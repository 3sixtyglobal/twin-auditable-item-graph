// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphComponent } from "@twin.org/auditable-item-graph-models";
import { AuditableItemGraphRestClient } from "../src/auditableItemGraphRestClient.js";

const fetchMock = vi.fn();

describe("AuditableItemGraphRestClient", () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock;
	});

	afterEach(() => {
		fetchMock.mockReset();
		globalThis.fetch = originalFetch;
	});

	test("Can create an instance", async () => {
		const client = new AuditableItemGraphRestClient({ endpoint: "http://localhost:8080" });
		expect(client).toBeDefined();
	});

	test("Satisfies full IAuditableItemGraphComponent contract — removeProof exists", () => {
		const client = new AuditableItemGraphRestClient({ endpoint: "http://localhost:8080" });
		expect(typeof (client as unknown as IAuditableItemGraphComponent).removeProof).toBe("function");
	});

	test("removeProof sends DELETE /:id/proof to the server", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 204,
			headers: new Headers()
		});

		const client = new AuditableItemGraphRestClient({ endpoint: "http://localhost:8080" });
		await client.removeProof("0101010101010101010101010101010101010101010101010101010101010101");

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(
			"http://localhost:8080/auditable-item-graph/0101010101010101010101010101010101010101010101010101010101010101/proof"
		);
		expect(options.method).toBe("DELETE");
	});
});
