// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex.js";

/**
 * Create an auditable item graph vertex.
 */
export interface IAuditableItemGraphCreateRequest {
	/**
	 * The data to be used in the vertex.
	 */
	body: Omit<IAuditableItemGraphVertex, "id">;
}
