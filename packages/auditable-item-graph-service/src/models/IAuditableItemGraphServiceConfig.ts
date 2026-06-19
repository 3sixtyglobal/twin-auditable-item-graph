// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the auditable item graph service.
 */
export interface IAuditableItemGraphServiceConfig {
	/**
	 * Timeout in milliseconds for acquiring a mutex lock.
	 */
	mutexTimeoutMs?: number;
}
