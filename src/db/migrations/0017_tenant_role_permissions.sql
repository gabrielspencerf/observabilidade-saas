-- Atribui permissões às roles de tenant (admin_tenant, operator, viewer).
-- super_admin continua coberto pelo seed; inserts são idempotentes.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug IN (
  'dashboard:read',
  'tenant:switch',
  'leads:read',
  'funnels:read'
)
WHERE r.slug = 'viewer'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug IN (
  'dashboard:read',
  'tenant:switch',
  'leads:read',
  'leads:write',
  'funnels:read',
  'funnels:write'
)
WHERE r.slug = 'operator'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'admin_tenant' AND p.slug <> 'admin:access'
ON CONFLICT DO NOTHING;
