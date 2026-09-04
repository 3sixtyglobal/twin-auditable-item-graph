// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * How the mutations of a vertex are recorded.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemGraphAuditMode = {
	/**
	 * Every mutation appends a new version entry and maintains a full audit trail.
	 */
	Audited: "audited",

	/**
	 * Mutations overwrite the stored state in place, with no version chain or audit entries.
	 */
	Bypass: "bypass"
} as const;

/**
 * How the mutations of a vertex are recorded.
 */
export type AuditableItemGraphAuditMode =
	(typeof AuditableItemGraphAuditMode)[keyof typeof AuditableItemGraphAuditMode];
