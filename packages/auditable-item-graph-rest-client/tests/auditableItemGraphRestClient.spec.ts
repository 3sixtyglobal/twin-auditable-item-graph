// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { AuditableItemGraphRestClient } from "../src/auditableItemGraphRestClient";

describe("AuditableItemGraphRestClient", () => {
	test("Can create an instance", async () => {
		const client = new AuditableItemGraphRestClient({ endpoint: "http://localhost:8080" });
		expect(client).toBeDefined();
	});
});
