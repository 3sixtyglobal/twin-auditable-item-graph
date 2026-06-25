// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { type ITelemetryMetric, MetricType } from "@twin.org/telemetry-models";
import { AuditableItemGraphMetricIds } from "./auditableItemGraphMetricIds.js";

/**
 * Metrics registered by the auditable item graph service.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemGraphMetrics: ITelemetryMetric[] = [
	{
		id: AuditableItemGraphMetricIds.VerticesCreated,
		label: "Vertices created",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.VerticesUpdated,
		label: "Vertices updated",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.ChangesetsCreated,
		label: "Changesets created",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.AliasesAdded,
		label: "Aliases added",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.AliasesModified,
		label: "Aliases modified",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.AliasesDeleted,
		label: "Aliases deleted",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.ResourcesAdded,
		label: "Resources added",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.ResourcesModified,
		label: "Resources modified",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.ResourcesDeleted,
		label: "Resources deleted",
		type: MetricType.Counter
	},
	{ id: AuditableItemGraphMetricIds.EdgesAdded, label: "Edges added", type: MetricType.Counter },
	{
		id: AuditableItemGraphMetricIds.EdgesModified,
		label: "Edges modified",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.EdgesDeleted,
		label: "Edges deleted",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.QueriesExecuted,
		label: "Queries executed",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.VerificationsSucceeded,
		label: "Verifications succeeded",
		type: MetricType.Counter
	},
	{
		id: AuditableItemGraphMetricIds.VerificationsFailed,
		label: "Verifications failed",
		type: MetricType.Counter
	}
];
