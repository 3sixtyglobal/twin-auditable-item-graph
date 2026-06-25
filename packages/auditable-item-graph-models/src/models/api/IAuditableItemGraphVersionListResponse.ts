// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { IAuditableItemGraphVertexVersionList } from "../IAuditableItemGraphVertexVersionList.js";

/**
 * Response to getting all versions of an auditable item graph vertex.
 */
export interface IAuditableItemGraphVersionListResponse {
	/**
	 * The headers.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response body.
	 */
	body: IAuditableItemGraphVertexVersionList;
}
