-- ═══════════════════════════════════════════════════════════════════
-- Full pricing refresh from Official Pricing & Packaging 2026 CSVs
-- Spain 🇪🇸 + France 🇫🇷 (Q4 special)
-- ═══════════════════════════════════════════════════════════════════

-- Clear existing pricing line items (bundles are kept as-is since prices haven't changed)
DELETE FROM pricing;

-- ═══════════════════════════════════════════════════════════════════
-- SPAIN (ES) — Line Items
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO pricing (country, sku_type, sku_name, architecture, price_business_monthly, price_enterprise_monthly, price_business_yearly, price_enterprise_yearly, notes) VALUES
-- Core
('ES', 'line_item', 'Employee platform /Core', 'Per seat', '1.1', '1.7', '1.0', '1.5', 'Core is always mandatory. Min a la carte 100€ ARPU monthly.'),
('ES', 'line_item', 'Time-off', 'Per seat', '2.8', '4.3', '2.5', '3.9', NULL),
('ES', 'line_item', 'Time Tracking', 'Per seat', '2.8', '4.3', '2.5', '3.9', NULL),
('ES', 'line_item', 'Trust channel (Complaints/Whistleblower)', 'Per seat', '1.0', NULL, '0.9', NULL, NULL),
('ES', 'line_item', 'Shift Management', 'Per seat', '2.7', '4.0', '2.4', '3.6', NULL),
('ES', 'line_item', 'Compensation', 'Per seat', '2.5', NULL, '2.3', NULL, 'Includes: Professionals, a3innuva and DATEV.'),
('ES', 'line_item', 'Payroll Connect', 'Per seat', '4.0', NULL, '3.6', NULL, 'Includes: Compensation + Factorial Professionals'),
('ES', 'line_item', 'Benefits Standard (Retribucion flexible)', 'Per seat', '3.0', NULL, '2.7', NULL, 'Includes: Meals, Transport, Childcare, Trainings, Health Insurance'),
('ES', 'line_item', 'Benefits Plus', 'Per seat', '5.0', NULL, '4.5', NULL, 'Includes: Benefits Plus + Training'),
('ES', 'line_item', 'Wellhub', 'Per seat', '5.0', NULL, '4.5', NULL, NULL),
-- Talent
('ES', 'line_item', 'Engagement', 'Per seat', '2.1', '4.5', '1.9', '4.1', NULL),
('ES', 'line_item', 'Performance', 'Per seat', '2.8', '4.5', '2.5', '4.1', NULL),
('ES', 'line_item', 'Trainings', 'Per seat', '2.8', NULL, '2.5', NULL, NULL),
('ES', 'line_item', 'LMS', 'Per seat', '2.0', NULL, '1.8', NULL, 'TRAININGS mandatory to have LMS.'),
('ES', 'line_item', 'Recruitment (Unlimited job posts)', 'Per seat', '2.5', NULL, '2.3', NULL, 'Requires 100 seats minimum.'),
('ES', 'line_item', 'Recruitment (5 Active Jobs)', 'Fixed', '98.9', '143.3', '89.0', '129.0', NULL),
('ES', 'line_item', 'Recruitment (10 Active Jobs)', 'Fixed', '154.4', '232.2', '139.0', '209.0', NULL),
('ES', 'line_item', 'Recruitment (Unlimited)', 'Fixed', '276.7', '332.2', '249.0', '299.0', NULL),
-- Finance
('ES', 'line_item', 'Expenses Fixed Fee', 'Fixed', '43.3', '76.7', '39.0', '69.0', '3 users in Business / 5 in Enterprise. 3 cards in Business / 5 in Enterprise.'),
('ES', 'line_item', 'Expenses Extra User [1-20]', 'Per user', '4.0', '6.0', '3.6', '5.4', NULL),
('ES', 'line_item', 'Expenses Extra User [21-50]', 'Per user', '3.2', '4.8', '2.9', '4.4', '20% disc.'),
('ES', 'line_item', 'Expenses Extra User [51-100]', 'Per user', '2.8', '4.2', '2.6', '3.8', '30% disc.'),
('ES', 'line_item', 'Expenses Extra User (+100)', 'Per user', '2.0', '3.0', '1.8', '2.7', '50% disc.'),
('ES', 'line_item', 'Procurement XS', 'Fixed (1-20)', '149.0', NULL, '134.1', NULL, NULL),
('ES', 'line_item', 'Procurement S', 'Fixed (21-70)', '399.0', NULL, '359.1', NULL, NULL),
('ES', 'line_item', 'Procurement M', 'Fixed (71-200)', '599.0', NULL, '539.1', NULL, NULL),
('ES', 'line_item', 'Procurement L', 'Fixed (201-500)', '799.0', NULL, '719.1', NULL, NULL),
('ES', 'line_item', 'Procurement XL', 'Fixed (+500)', '999.0', NULL, '899.1', NULL, NULL),
('ES', 'line_item', 'Project Management', 'Per seat', '2.8', '4.3', '2.5', '3.9', NULL),
('ES', 'line_item', 'CRM', 'Fixed', '30.0', NULL, '27.0', NULL, NULL),
('ES', 'line_item', 'Headcount Planning', 'Per seat', '2.5', NULL, '2.3', NULL, NULL),
-- Bundled add-ons
('ES', 'line_item', 'Spending Management', 'Fixed + Per user', '65.6', '98.9', '59.0', '89.0', 'Includes: Fixed Expenses + Procurement. Extra users on top.'),
-- Other
('ES', 'line_item', 'Spaces', 'Per seat', '1.0', NULL, '0.9', NULL, NULL),
('ES', 'line_item', 'Software Management', 'Per seat', '0.6', NULL, '0.5', NULL, NULL),
('ES', 'line_item', 'IT Inventory', 'Per seat', '2.5', NULL, '2.3', NULL, NULL),
-- Integrations (by partners)
('ES', 'integration', 'Business Central', 'Per seat (with floor)', '1.5', NULL, '1.4', NULL, 'Min ARPU/Floor: 80€'),
('ES', 'integration', 'Netsuite', 'Fixed', '140.0', NULL, '126.0', NULL, 'Min ARPU/Floor: 140€'),
('ES', 'integration', 'SAGE 200', 'Per seat (with floor)', '1.5', NULL, '1.4', NULL, 'Min ARPU/Floor: 85€. Spain only.'),
('ES', 'integration', 'Milena', 'Per seat (with floor)', '1.5', NULL, '1.4', NULL, 'Min ARPU/Floor: 100€. Spain only.'),
('ES', 'integration', 'Suprema Xiptic', 'Per seat (with floor)', '1.0', NULL, NULL, NULL, NULL),
-- Factorial One
('ES', 'one_pack', 'One Starter', 'Fixed', '109.0', NULL, '98.1', NULL, '1000 credits'),
('ES', 'one_pack', 'One Growth', 'Fixed', '199.0', NULL, '179.1', NULL, '2000 credits'),
('ES', 'one_pack', 'One Mid', 'Fixed', '389.0', NULL, '350.1', NULL, '3000 credits. Only for current customers.'),
('ES', 'one_pack', 'One Scale', 'Fixed', '549.0', NULL, '494.1', NULL, '5000 credits'),
('ES', 'one_xl', 'One XL Starter', 'Fixed', '999.0', NULL, '899.1', NULL, '10000 credits. XL segment only.'),
('ES', 'one_xl', 'One XL Growth', 'Fixed', '1750.0', NULL, '1575.0', NULL, '20000 credits. XL segment only.'),
('ES', 'one_xl', 'One XL Mid', 'Fixed', '3000.0', NULL, '2700.0', NULL, '40000 credits. XL segment only.'),
('ES', 'one_xl', 'One XL Scale', 'Fixed', '7000.0', NULL, '6300.0', NULL, '100000 credits. XL segment only.');

-- ═══════════════════════════════════════════════════════════════════
-- FRANCE (FR) — Line Items
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO pricing (country, sku_type, sku_name, architecture, price_business_monthly, price_enterprise_monthly, price_business_yearly, price_enterprise_yearly, notes) VALUES
-- Core
('FR', 'line_item', 'Employee platform /Core', 'Per seat', '1.5', '2.2', '1.3', '2.0', 'Core is always mandatory. Min a la carte 100€ ARPU.'),
('FR', 'line_item', 'Time-off', 'Per seat', '2.7', '3.8', '2.4', '3.4', NULL),
('FR', 'line_item', 'Time Tracking', 'Per seat', '2.7', '3.8', '2.4', '3.4', NULL),
('FR', 'line_item', 'One - AI Agent', 'Per seat', '10.0', NULL, '9.0', NULL, NULL),
('FR', 'line_item', 'Trust channel', 'Per seat', '0.8', NULL, '0.8', NULL, NULL),
('FR', 'line_item', 'Shift Management', 'Per seat', '2.2', '3.2', '2.0', '2.9', NULL),
('FR', 'line_item', 'SILAE Integration', 'Per seat', '0.6', NULL, '0.5', NULL, NULL),
('FR', 'line_item', 'Compensation (Includes SILAE Integration)', 'Per seat', '1.8', NULL, '1.6', NULL, 'Included in bundles till end of 2025'),
-- Talent
('FR', 'line_item', 'Engagement', 'Per seat', '1.9', '3.5', '1.7', '3.2', NULL),
('FR', 'line_item', 'Performance', 'Per seat', '2.7', '3.5', '2.4', '3.2', NULL),
('FR', 'line_item', 'Trainings', 'Per seat', '2.7', NULL, '2.4', NULL, NULL),
('FR', 'line_item', 'LMS', 'Per seat', '2.0', NULL, '1.8', NULL, 'TRAININGS mandatory to have LMS.'),
('FR', 'line_item', 'Recruitment (Unlimited job posts)', 'Per seat', '2.5', NULL, '2.3', NULL, 'Requires 100 seats minimum.'),
('FR', 'line_item', 'Recruitment (5 Active Jobs)', 'Fixed', '77.0', '115.9', '69.3', '104.3', NULL),
('FR', 'line_item', 'Recruitment (10 Active Jobs)', 'Fixed', '115.9', '178.1', '104.3', '160.3', NULL),
('FR', 'line_item', 'Recruitment (Unlimited)', 'Fixed', '193.7', '271.5', '174.3', '244.3', NULL),
-- Finance
('FR', 'line_item', 'Expenses Fixed Fee', 'Fixed', '38.1', '61.5', '34.3', '55.3', '3 users in Business / 5 in Enterprise.'),
('FR', 'line_item', 'Expenses Extra User [1-20]', 'Per user', '4.0', '6.6', '3.6', '5.9', NULL),
('FR', 'line_item', 'Expenses Extra User [21-50]', 'Per user', '3.2', '5.3', '2.9', '4.8', '20% disc.'),
('FR', 'line_item', 'Expenses Extra User [51-100]', 'Per user', '2.8', '2.8', '2.6', '4.2', '30% disc.'),
('FR', 'line_item', 'Expenses Extra User (+100)', 'Per user', '2.0', '3.3', '1.8', '3.0', '50% disc.'),
('FR', 'line_item', 'Procurement XS', 'Fixed (1-20)', '149.0', NULL, '134.1', NULL, NULL),
('FR', 'line_item', 'Procurement S', 'Fixed (21-70)', '399.0', NULL, '359.1', NULL, NULL),
('FR', 'line_item', 'Procurement M', 'Fixed (71-200)', '599.0', NULL, '539.1', NULL, NULL),
('FR', 'line_item', 'Procurement L', 'Fixed (201-500)', '799.0', NULL, '719.1', NULL, NULL),
('FR', 'line_item', 'Procurement XL', 'Fixed (+500)', '999.0', NULL, '899.1', NULL, NULL),
('FR', 'line_item', 'Project Management', 'Per seat', '2.2', '3.8', '2.0', '3.4', NULL),
('FR', 'line_item', 'CRM', 'Fixed', '28.0', NULL, '25.2', NULL, NULL),
('FR', 'line_item', 'Headcount Planning', 'Per seat', '2.5', NULL, '2.3', NULL, NULL),
-- Other
('FR', 'line_item', 'Spaces', 'Per seat', '1.1', NULL, '0.9', NULL, NULL),
('FR', 'line_item', 'Software Management', 'Per seat', '0.7', NULL, '0.6', NULL, NULL),
('FR', 'line_item', 'It Inventory', 'Per seat', '2.5', NULL, '2.3', NULL, NULL),
-- Integrations (by partners)
('FR', 'integration', 'Business Central', 'Per seat (with floor)', '1.5', NULL, '1.4', NULL, 'Min ARPU/Floor: 80€'),
('FR', 'integration', 'Netsuite', 'Fixed', '140.0', NULL, '126.0', NULL, 'Min ARPU/Floor: 140€'),
('FR', 'integration', 'Suprema Xiptic', 'Per seat (with floor)', '1.0', NULL, NULL, NULL, NULL),
-- Factorial One
('FR', 'one_pack', 'One Starter', 'Fixed', '109.0', NULL, '98.1', NULL, '1000 credits'),
('FR', 'one_pack', 'One Growth', 'Fixed', '199.0', NULL, '179.1', NULL, '2000 credits'),
('FR', 'one_pack', 'One Mid', 'Fixed', '389.0', NULL, '350.1', NULL, '3000 credits. Only for current customers.'),
('FR', 'one_pack', 'One Scale', 'Fixed', '549.0', NULL, '494.1', NULL, '5000 credits'),
('FR', 'one_xl', 'One XL Starter', 'Fixed', '999.0', NULL, '899.1', NULL, '10000 credits. XL segment only.'),
('FR', 'one_xl', 'One XL Growth', 'Fixed', '1750.0', NULL, '1575.0', NULL, '20000 credits. XL segment only.'),
('FR', 'one_xl', 'One XL Mid', 'Fixed', '3000.0', NULL, '2700.0', NULL, '40000 credits. XL segment only.'),
('FR', 'one_xl', 'One XL Scale', 'Fixed', '7000.0', NULL, '6300.0', NULL, '100000 credits. XL segment only.');

-- ═══════════════════════════════════════════════════════════════════
-- Add integration modules to the modules table
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO modules (module, description, available_es, available_fr) VALUES
  ('Business Central', 'ERP integration with Microsoft Business Central', true, true),
  ('Netsuite', 'ERP integration with Oracle Netsuite', true, true),
  ('SAGE 200', 'ERP integration with SAGE 200', true, false),
  ('Milena', 'Payroll integration with Milena', true, false),
  ('Suprema Xiptic', 'Access control integration', true, true),
  ('SILAE Integration', 'Payroll integration with SILAE', false, true),
  ('Headcount Planning', 'Workforce planning and budget modeling', true, true),
  ('CRM', 'Talent pool and candidate relationship management', true, true)
ON CONFLICT (module) DO UPDATE SET
  available_es = EXCLUDED.available_es,
  available_fr = EXCLUDED.available_fr,
  description = EXCLUDED.description;
