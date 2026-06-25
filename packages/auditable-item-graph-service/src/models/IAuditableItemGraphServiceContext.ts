// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Context for the auditable item graph service.
 */
export interface IAuditableItemGraphServiceContext {
	/**
	 * The current date/time.
	 */
	now: string;

	/**
	 * The organization identity for the operation.
	 */
	organizationIdentity: string;

	/**
	 * The user identity for the operation.
	 */
	userIdentity?: string;
}
