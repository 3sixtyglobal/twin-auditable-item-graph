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
	Namespace: "https://schema.twindev.org/aig/",

	/**
	 * The value to use in context for Auditable Item Graph.
	 */
	Context: "https://schema.twindev.org/aig/",

	/**
	 * The JSON-LD Context URL for Auditable Item Graph.
	 */
	JsonLdContext: "https://schema.twindev.org/aig/types.jsonld",

	/**
	 * The canonical RDF namespace URI for TWIN Common.
	 */
	NamespaceCommon: "https://schema.twindev.org/common/",

	/**
	 * The value to use in JSON-LD context for TWIN Common.
	 */
	ContextCommon: "https://schema.twindev.org/common/",

	/**
	 * The JSON-LD Context URL for TWIN Common.
	 */
	JsonLdContextCommon: "https://schema.twindev.org/common/types.jsonld"
} as const;

/**
 * The contexts of auditable item graph data.
 */
export type AuditableItemGraphContexts =
	(typeof AuditableItemGraphContexts)[keyof typeof AuditableItemGraphContexts];
