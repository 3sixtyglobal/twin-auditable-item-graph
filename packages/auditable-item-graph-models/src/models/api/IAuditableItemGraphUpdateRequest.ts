// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex.js";

/**
 * Update an auditable item graph vertex (PUT - full replacement of vertex state).
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
	 * The full vertex payload. Replaces annotation and active sub-lists; omitted collections are cleared.
	 */
	body: Omit<IAuditableItemGraphVertex, "id">;
}
