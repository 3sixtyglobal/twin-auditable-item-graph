// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import { AuditableItemGraphAlias } from "./entities/auditableItemGraphAlias.js";
import { AuditableItemGraphChangeset } from "./entities/auditableItemGraphChangeset.js";
import { AuditableItemGraphEdge } from "./entities/auditableItemGraphEdge.js";
import { AuditableItemGraphPatch } from "./entities/auditableItemGraphPatch.js";
import { AuditableItemGraphResource } from "./entities/auditableItemGraphResource.js";
import { AuditableItemGraphVertex } from "./entities/auditableItemGraphVertex.js";
import { AuditableItemGraphVertexIndex } from "./entities/auditableItemGraphVertexIndex.js";
import { AuditableItemGraphVertexV0 } from "./entities/auditableItemGraphVertexV0.js";
import { AuditableItemGraphVertexV1 } from "./entities/auditableItemGraphVertexV1.js";

/**
 * Initialize the schema for the auditable item graph entity storage connector.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<AuditableItemGraphVertex>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphVertex)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphVertexV0>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphVertexV0)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphVertexV1>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphVertexV1)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphVertexIndex>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphVertexIndex)
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
