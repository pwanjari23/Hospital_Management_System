# Hospital Management System (HMS) — Architecture & Database Design

## 1. Multi-Tenancy Architecture

The HMS is designed as a secure, shared-database, multi-tenant SaaS application serving healthcare organizations.

```text
                    HMS SaaS Application
                             │
            ┌────────────────┴────────────────┐
            │                                 │
     PLATFORM LEVEL                   HOSPITAL TENANTS
            │                                 │
       SUPER_ADMIN                       Hospital A
                                              │
                                     ┌────────┼────────┐
                                     │        │        │
                                   Users   Settings   ...

                                         Hospital B
                                              │
                                     ┌────────┼────────┐
                                     │        │        │
                                   Users   Settings   ...
```

### Core Tenant Rule: Strict Isolation

> **Data belonging to Hospital A must NEVER be accessible under Hospital B's context.**

---

## 2. Entity Classification

Entities are strictly categorized based on tenant ownership:

| Classification                  | Entities                               | Description                                                                      | Tenant Foreign Key                         |
| :------------------------------ | :------------------------------------- | :------------------------------------------------------------------------------- | :----------------------------------------- |
| **Tenant Root**                 | `Hospital`                             | Represents the hospital tenant organization itself.                              | _Root entity_ (`id` UUID PK)               |
| **Tenant-Owned**                | `User`, `HospitalSetting`              | Belongs exclusively to one hospital. Must be queried with tenant scoping.        | `hospital_id` -> `hospitals.id` (RESTRICT) |
| **Global / System**             | `Role`, `Permission`, `RolePermission` | Platform-wide authorization and permission catalogue. Shared across all tenants. | _None_                                     |
| **Junction (Tenant-to-Global)** | `UserRole`                             | Connects a tenant-scoped user to a system-defined role.                          | `user_id` (CASCADE), `role_id` (RESTRICT)  |

---

## 3. Database Identifiers & PostgreSQL Configuration

- **Primary Keys**: Standardized across all core entities as UUIDv4 using PostgreSQL's native `gen_random_uuid()` function.
- **Junction Keys**: Pure junction tables (`role_permissions`, `user_roles`) use composite primary keys: `PRIMARY KEY (role_id, permission_id)` and `PRIMARY KEY (user_id, role_id)`.
- **Naming Conventions**: Models use camelCase in JavaScript; PostgreSQL tables and columns use standard `snake_case` (e.g., `hospital_id`, `password_hash`, `logo_url`, `created_at`, `updated_at`).

---

## 4. Role Scope & Hierarchy

Roles are defined at the platform level with explicit operational scopes:

```text
Role.scope:
├── PLATFORM  → SUPER_ADMIN (cross-hospital / platform governance)
└── HOSPITAL  → HOSPITAL_ADMIN, DOCTOR, NURSE, RECEPTIONIST, PHARMACIST, LAB_STAFF (tenant operations)
```

---

## 5. Tenant-Scoped Email Uniqueness

In a multi-tenant healthcare SaaS, the same individual (e.g., a consulting physician) may operate across distinct hospitals.

- The unique constraint is tenant-scoped:
  ```sql
  CONSTRAINT users_hospital_id_email_unique UNIQUE (hospital_id, email)
  ```
- Normalization (trimming and converting to lower case) is enforced by model hooks prior to validation and persistence to eliminate case-mismatch duplicates.

---

## 6. Tenant Scoping & Isolation Invariants

When querying tenant-owned records, future services must **never** query purely by record ID. The trusted tenant boundary derived from the authenticated identity must always be included:

```javascript
// Correct (Strict Tenant Scoping):
const user = await User.findOne({
  where: {
    id: targetUserId,
    hospitalId: req.user.hospitalId, // Trusted tenant boundary from authenticated token
  },
});

// Prohibited (Cross-Tenant Vulnerability):
const unsafeUser = await User.findByPk(targetUserId);
```

Client-supplied `hospitalId` in request bodies or query parameters must never override the authenticated user's tenant context.

---

## 7. Migration & Seeder Management

Database schema changes and seed datasets are managed via an ESM-native Sequelize runner (`src/database/migrator.js`):

```bash
# Apply pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:undo

# Execute seeders (Roles, Permissions, RolePermissions)
npm run db:seed

# Rollback seeders
npm run db:seed:undo

# Execute database verification suite (constraints, transactions, tenant isolation)
npm run test:db
```
