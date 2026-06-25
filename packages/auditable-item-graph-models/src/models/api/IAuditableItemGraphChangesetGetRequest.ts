// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { VerifyDepth } from "../verifyDepth.js";

/**
 * Get an auditable item graph vertex changeset.
 */
export interface IAuditableItemGraphChangesetGetRequest {
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
		 * The id of the vertex to get the changeset from.
		 */
		id: string;

		/**
		 * The id of the changeset to get.
		 */
		changesetId: string;
	};

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * How many signatures to verify, none, current or all, defaults to "none".
		 */
		verifySignatureDepth?: VerifyDepth;
	};
}
