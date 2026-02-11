// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { IAuditableItemGraphChangesetList } from "../IAuditableItemGraphChangesetList.js";

/**
 * Response to getting an auditable item graph changeset list.
 */
export interface IAuditableItemGraphChangesetListResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
		[HeaderTypes.Link]?: string | string[];
	};

	/**
	 * The response body.
	 */
	body: IAuditableItemGraphChangesetList;
}
