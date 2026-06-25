// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { IImmutableProofVerification } from "@twin.org/immutable-proof-models";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts.js";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes.js";
import type { IAuditableItemGraphPatchOperation } from "./IAuditableItemGraphPatchOperation.js";

/**
 * Interface describing a set of changes to the vertex.
 */
export interface IAuditableItemGraphChangeset {
	/**
	 * JSON-LD Context.
	 */
	"@context"?: [
		typeof AuditableItemGraphContexts.Context,
		typeof AuditableItemGraphContexts.ContextCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Changeset;

	/**
	 * The id of the changeset.
	 */
	id: string;

	/**
	 * The date/time of when the changeset was created.
	 * @json-ld namespace:sch
	 */
	dateCreated: string;

	/**
	 * The user identity that created the changes.
	 * @json-ld namespace:twin-common
	 */
	userIdentity?: string;

	/**
	 * The patches in the changeset.
	 * @json-ld container:set
	 */
	patches: IAuditableItemGraphPatchOperation[];

	/**
	 * The immutable proof id which contains the signature for this changeset.
	 * @json-ld type:sch:identifier
	 */
	proofId?: string;

	/**
	 * The verification for the changeset.
	 * @json-ld id
	 */
	verification?: IImmutableProofVerification;

	/**
	 * The version number of the vertex after this changeset was applied.
	 * Maps to https://schema.org/version.
	 * @json-ld namespace:sch
	 */
	version?: number;
}
