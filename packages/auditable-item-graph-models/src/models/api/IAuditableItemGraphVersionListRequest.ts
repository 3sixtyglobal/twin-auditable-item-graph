// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Get all versions of an auditable item graph vertex.
 */
export interface IAuditableItemGraphVersionListRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.Accept]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The parameters from the path.
	 */
	pathParams: {
		/**
		 * The id of the vertex.
		 */
		id: string;
	};

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * Only return versions created after this ISO 8601 timestamp (exclusive).
		 */
		after?: string;

		/**
		 * Only return versions created before this ISO 8601 timestamp (exclusive).
		 */
		before?: string;
	};
}
