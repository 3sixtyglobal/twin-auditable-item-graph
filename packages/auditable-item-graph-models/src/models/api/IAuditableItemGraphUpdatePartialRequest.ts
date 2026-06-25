// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphPartialVertex } from "../IAuditableItemGraphPartialVertex.js";

/**
 * Partially update an auditable item graph vertex (PATCH — explicit list patches).
 */
export interface IAuditableItemGraphUpdatePartialRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the vertex to update.
		 */
		id: string;
	};

	/**
	 * Partial vertex data; only defined properties are applied.
	 * Sub-lists use `{ add, remove }` patch objects.
	 */
	body: Omit<IAuditableItemGraphPartialVertex, "id">;
}
