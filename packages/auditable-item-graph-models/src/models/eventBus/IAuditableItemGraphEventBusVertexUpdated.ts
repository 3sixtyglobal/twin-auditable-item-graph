// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPatchOperation } from "@3sixty/core";

/**
 * Event bus payload for vertex updated.
 */
export interface IAuditableItemGraphEventBusVertexUpdated {
	/**
	 * The id of the vertex updated.
	 */
	id: string;

	/**
	 * The patches in the changeset.
	 */
	patches: IPatchOperation[];
}
