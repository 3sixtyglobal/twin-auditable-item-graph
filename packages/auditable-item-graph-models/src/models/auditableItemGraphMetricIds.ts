// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Metric IDs for the auditable item graph service.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemGraphMetricIds = {
	/**
	 * Number of vertices created.
	 */
	VerticesCreated: "aig_vertices_created",

	/**
	 * Number of vertices updated.
	 */
	VerticesUpdated: "aig_vertices_updated",

	/**
	 * Number of changesets created.
	 */
	ChangesetsCreated: "aig_changesets_created",

	/**
	 * Number of aliases added.
	 */
	AliasesAdded: "aig_aliases_added",

	/**
	 * Number of aliases modified.
	 */
	AliasesModified: "aig_aliases_modified",

	/**
	 * Number of aliases deleted.
	 */
	AliasesDeleted: "aig_aliases_deleted",

	/**
	 * Number of resources added.
	 */
	ResourcesAdded: "aig_resources_added",

	/**
	 * Number of resources modified.
	 */
	ResourcesModified: "aig_resources_modified",

	/**
	 * Number of resources deleted.
	 */
	ResourcesDeleted: "aig_resources_deleted",

	/**
	 * Number of edges added.
	 */
	EdgesAdded: "aig_edges_added",

	/**
	 * Number of edges modified.
	 */
	EdgesModified: "aig_edges_modified",

	/**
	 * Number of edges deleted.
	 */
	EdgesDeleted: "aig_edges_deleted",

	/**
	 * Number of queries executed.
	 */
	QueriesExecuted: "aig_queries_executed",

	/**
	 * Number of verifications succeeded.
	 */
	VerificationsSucceeded: "aig_verifications_succeeded",

	/**
	 * Number of verifications failed.
	 */
	VerificationsFailed: "aig_verifications_failed"
} as const;

/**
 * Metric IDs for the auditable item graph service.
 */
export type AuditableItemGraphMetricIds =
	(typeof AuditableItemGraphMetricIds)[keyof typeof AuditableItemGraphMetricIds];
