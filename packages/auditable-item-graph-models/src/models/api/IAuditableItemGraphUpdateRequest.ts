// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex.js";

/**
 * Update an auditable item graph vertex.
 */
export interface IAuditableItemGraphUpdateRequest {
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
	 * The data to be used in the vertex.
	 */
	body: Omit<IAuditableItemGraphVertex, "id">;
}
