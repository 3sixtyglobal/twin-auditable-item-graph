# TWIN Auditable Item Graph

This repository provides a modular implementation of an auditable item graph, covering shared models, an in-process service, and an HTTP client. Together, these packages make it easier to represent linked records, capture changes over time, and retrieve verifiable history in a consistent way.

The packages are designed to work independently or as a complete stack. You can use the models for shared contracts, run the service for graph and audit operations, and integrate over HTTP through the REST client.

## Packages

- [auditable-item-graph-models](packages/auditable-item-graph-models/README.md) - Defines shared graph data contracts, JSON schemas, and JSON-LD contexts for consistent interoperability.
- [auditable-item-graph-service](packages/auditable-item-graph-service/README.md) - Implements graph lifecycle operations and audited change tracking with API route definitions.
- [auditable-item-graph-rest-client](packages/auditable-item-graph-rest-client/README.md) - Provides a client for interacting with auditable graph endpoints over HTTP.

## Contributing

To contribute to this package see the guidelines for building and publishing in [CONTRIBUTING](./CONTRIBUTING.md)
