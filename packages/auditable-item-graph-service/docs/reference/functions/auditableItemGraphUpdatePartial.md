# Function: auditableItemGraphUpdatePartial()

> **auditableItemGraphUpdatePartial**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Partially update the graph vertex (PATCH — merge provided sub-lists).

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuditableItemGraphUpdatePartialRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
