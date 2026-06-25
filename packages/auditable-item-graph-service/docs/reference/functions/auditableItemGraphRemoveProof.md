# Function: auditableItemGraphRemoveProof()

> **auditableItemGraphRemoveProof**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Remove the notarization proof from all changesets of a graph vertex.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuditableItemGraphRemoveProofRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
