// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";

/**
 * The patch operation for JSON diffs.
 */
export interface IAuditableItemGraphPatchOperation {
	/**
	 * JSON-LD Context.
	 */
	"@context"?:
		| typeof AuditableItemGraphContexts.Context
		| [typeof AuditableItemGraphContexts.Context, ...IJsonLdContextDefinitionElement[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.PatchOperation;

	/**
	 * The operation that was performed on the item.
	 * json-ld type:schema:Text
	 */
	patchOperation: "add" | "remove" | "replace" | "move" | "copy" | "test";

	/**
	 * The path to the object that was changed.
	 * json-ld type:schema:Text
	 */
	patchPath: string;

	/**
	 * The path the value was copied or moved from.
	 * json-ld type:schema:Text
	 */
	patchFrom?: string;

	/**
	 * The value to add.
	 * json-ld type:json
	 */
	patchValue?: unknown;
}
