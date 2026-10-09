// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@3sixty/web";
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex.js";

/**
 * Response to getting an auditable item graph vertex at a specific version.
 */
export interface IAuditableItemGraphVersionGetResponse {
	/**
	 * The headers.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response body.
	 */
	body: IAuditableItemGraphVertex;
}
