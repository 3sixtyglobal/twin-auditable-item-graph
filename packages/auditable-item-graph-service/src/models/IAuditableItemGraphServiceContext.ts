// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IContextIds } from "@twin.org/context";

/**
 * Context for the auditable item graph service.
 */
export interface IAuditableItemGraphServiceContext {
	/**
	 * The current date/time.
	 */
	now: string;

	/**
	 * The context ids for the operation.
	 */
	contextIds?: IContextIds;
}
