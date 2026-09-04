# Variable: AuditableItemGraphAuditMode

> `const` **AuditableItemGraphAuditMode**: `object`

How the mutations of a vertex are recorded.

## Type Declaration

### Audited {#audited}

> `readonly` **Audited**: `"audited"` = `"audited"`

Every mutation appends a new version entry and maintains a full audit trail.

### Bypass {#bypass}

> `readonly` **Bypass**: `"bypass"` = `"bypass"`

Mutations overwrite the stored state in place, with no version chain or audit entries.
