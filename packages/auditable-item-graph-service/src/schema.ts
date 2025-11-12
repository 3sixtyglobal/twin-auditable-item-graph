// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { AuditableItemGraphAlias } from "./entities/auditableItemGraphAlias.js";
import { AuditableItemGraphChangeset } from "./entities/auditableItemGraphChangeset.js";
import { AuditableItemGraphEdge } from "./entities/auditableItemGraphEdge.js";
import { AuditableItemGraphPatch } from "./entities/auditableItemGraphPatch.js";
import { AuditableItemGraphResource } from "./entities/auditableItemGraphResource.js";
import { AuditableItemGraphVertex } from "./entities/auditableItemGraphVertex.js";

/**
 * Initialize the schema for the auditable item graph entity storage connector.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<AuditableItemGraphVertex>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphVertex)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphAlias>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphAlias)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphResource>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphResource)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphEdge>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphEdge)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphChangeset>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphChangeset)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphPatch>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphPatch)
	);
}
