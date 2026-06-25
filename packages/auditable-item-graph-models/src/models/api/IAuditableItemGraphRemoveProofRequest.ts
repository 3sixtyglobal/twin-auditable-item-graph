// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Remove the notarization proof from all changesets of a graph vertex.
 */
export interface IAuditableItemGraphRemoveProofRequest {
	/**
	 * The parameters from the path.
	 */
	pathParams: {
		/**
		 * The id of the vertex whose proof should be removed.
		 */
		id: string;
	};
}
