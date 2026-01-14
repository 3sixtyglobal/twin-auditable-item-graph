// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The contexts of auditable item graph data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemGraphContexts = {
	/**
	 * The namespace for the auditable item graph types.
	 */
	Namespace: "https://schema.twindev.org/aig/",

	/**
	 * The namespace for the common types.
	 */
	NamespaceCommon: "https://schema.twindev.org/common/"
} as const;

/**
 * The contexts of auditable item graph data.
 */
export type AuditableItemGraphContexts =
	(typeof AuditableItemGraphContexts)[keyof typeof AuditableItemGraphContexts];
