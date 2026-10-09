// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The contexts of auditable item graph data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemGraphContexts = {
	/**
	 * The canonical RDF namespace URI for Auditable Item Graph.
	 */
	Namespace: "https://schema.3sixty.global/aig/",

	/**
	 * The value to use in context for Auditable Item Graph.
	 */
	Context: "https://schema.3sixty.global/aig/",

	/**
	 * The JSON-LD Context URL for Auditable Item Graph.
	 */
	JsonLdContext: "https://schema.3sixty.global/aig/types.jsonld",

	/**
	 * The canonical RDF namespace URI for TWIN Common.
	 */
	NamespaceCommon: "https://schema.3sixty.global/common/",

	/**
	 * The value to use in JSON-LD context for TWIN Common.
	 */
	ContextCommon: "https://schema.3sixty.global/common/",

	/**
	 * The JSON-LD Context URL for TWIN Common.
	 */
	JsonLdContextCommon: "https://schema.3sixty.global/common/types.jsonld"
} as const;

/**
 * The contexts of auditable item graph data.
 */
export type AuditableItemGraphContexts =
	(typeof AuditableItemGraphContexts)[keyof typeof AuditableItemGraphContexts];
