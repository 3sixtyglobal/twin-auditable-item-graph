// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing the base properties for auditable elements.
 */
export interface IAuditableItemGraphAuditedElement {
	/**
	 * The id of the element.
	 */
	id?: string;

	/**
	 * The date/time of when the element was created.
	 * json-ld namespace:sch
	 */
	dateCreated?: string;

	/**
	 * The date/time of when the element was modified.
	 * json-ld namespace:sch
	 */
	dateModified?: string;

	/**
	 * The date/time of when the element was deleted, as we never actually remove items.
	 * json-ld namespace:sch
	 */
	dateDeleted?: string;
}
