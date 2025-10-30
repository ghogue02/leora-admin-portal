-- Create missing customers from invoice import
-- These customers were found in invoices but not in the database

BEGIN;

-- Get tenant ID
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM "Tenant" LIMIT 1;

  -- Create: 1259 Park LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '1259 Park LLC', 'Net 30', NOW(), NOW());

  -- Create: 157 REST LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '157 REST LLC', 'Net 30', NOW(), NOW());

  -- Create: 1616 2nd Ave Restaurant Corp
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '1616 2nd Ave Restaurant Corp', 'Net 30', NOW(), NOW());

  -- Create: 174 West 72nd Cafe LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '174 West 72nd Cafe LLC', 'Net 30', NOW(), NOW());

  -- Create: 1996 Corp.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '1996 Corp.', 'Net 30', NOW(), NOW());

  -- Create: 205 Thompson St. LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '205 Thompson St. LLC', 'Net 30', NOW(), NOW());

  -- Create: 243 Dekalb Ave Rest. Corp
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '243 Dekalb Ave Rest. Corp', 'Net 30', NOW(), NOW());

  -- Create: 284 Via Grande LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '284 Via Grande LLC', 'Net 30', NOW(), NOW());

  -- Create: 293 Green Wine LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '293 Green Wine LLC', 'Net 30', NOW(), NOW());

  -- Create: 299 Hospitality LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '299 Hospitality LLC', 'Net 30', NOW(), NOW());

  -- Create: 354 Steakhouse
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '354 Steakhouse', 'Net 30', NOW(), NOW());

  -- Create: 42-44 East Broadway Restaurant Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '42-44 East Broadway Restaurant Inc', 'Net 30', NOW(), NOW());

  -- Create: 448 Franklin Avenue LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '448 Franklin Avenue LLC', 'Net 30', NOW(), NOW());

  -- Create: 4F Sur Montaigu LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '4F Sur Montaigu LLC', 'Net 30', NOW(), NOW());

  -- Create: 4Zip Square Corp
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '4Zip Square Corp', 'Net 30', NOW(), NOW());

  -- Create: 5 Kings Liquor
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '5 Kings Liquor', 'Net 30', NOW(), NOW());

  -- Create: 56 Degrees Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '56 Degrees Wine', 'Net 30', NOW(), NOW());

  -- Create: 61 Hester LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '61 Hester LLC', 'Net 30', NOW(), NOW());

  -- Create: 6th Tot, LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, '6th Tot, LLC', 'Net 30', NOW(), NOW());

  -- Create: A Perfect U
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'A Perfect U', 'Net 30', NOW(), NOW());

  -- Create: A-B LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'A-B LLC', 'Net 30', NOW(), NOW());

  -- Create: A24 Commerce St LLC and Galactus Group LLC as
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'A24 Commerce St LLC and Galactus Group LLC as', 'Net 30', NOW(), NOW());

  -- Create: ABM JG GREENWICH LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'ABM JG GREENWICH LLC', 'Net 30', NOW(), NOW());

  -- Create: ANTONIO SAMPLES NF
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'ANTONIO SAMPLES NF', 'Net 30', NOW(), NOW());

  -- Create: Aaron Pas
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Aaron Pas', 'Net 30', NOW(), NOW());

  -- Create: Abrahamson
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Abrahamson', 'Net 30', NOW(), NOW());

  -- Create: Acker Merrall & Condit Co. Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Acker Merrall & Condit Co. Inc.', 'Net 30', NOW(), NOW());

  -- Create: Agora Beacon LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Agora Beacon LLC', 'Net 30', NOW(), NOW());

  -- Create: Air Guitar, LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Air Guitar, LLC', 'Net 30', NOW(), NOW());

  -- Create: All Star Wine and Liquor
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'All Star Wine and Liquor', 'Net 30', NOW(), NOW());

  -- Create: American Sake Group Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'American Sake Group Inc', 'Net 30', NOW(), NOW());

  -- Create: Amuninni
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Amuninni', 'Net 30', NOW(), NOW());

  -- Create: Amuninni LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Amuninni LLC', 'Net 30', NOW(), NOW());

  -- Create: Ancona's Branchville
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Ancona''s Branchville', 'Net 30', NOW(), NOW());

  -- Create: Ancona's Ridgefield
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Ancona''s Ridgefield', 'Net 30', NOW(), NOW());

  -- Create: Ancona's Wilton
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Ancona''s Wilton', 'Net 30', NOW(), NOW());

  -- Create: Andrew Brunner
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Andrew Brunner', 'Net 30', NOW(), NOW());

  -- Create: Angela Fultz Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Angela Fultz Samples', 'Net 30', NOW(), NOW());

  -- Create: Angela Wu
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Angela Wu', 'Net 30', NOW(), NOW());

  -- Create: Antares Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Antares Inc', 'Net 30', NOW(), NOW());

  -- Create: Anton's
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Anton''s', 'Net 30', NOW(), NOW());

  -- Create: Aretsky's Patroon
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Aretsky''s Patroon', 'Net 30', NOW(), NOW());

  -- Create: Armonk Wine Holdings Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Armonk Wine Holdings Inc.', 'Net 30', NOW(), NOW());

  -- Create: Art of Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Art of Wine', 'Net 30', NOW(), NOW());

  -- Create: Astoria Wine and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Astoria Wine and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Aszu Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Aszu Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Atlas Wine Merchants
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Atlas Wine Merchants', 'Net 30', NOW(), NOW());

  -- Create: Aunts et Uncles
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Aunts et Uncles', 'Net 30', NOW(), NOW());

  -- Create: Avenue A Pizza, LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Avenue A Pizza, LLC', 'Net 30', NOW(), NOW());

  -- Create: Avon Wine and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Avon Wine and Spirits', 'Net 30', NOW(), NOW());

  -- Create: BARBUTO RESTAURANT
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'BARBUTO RESTAURANT', 'Net 30', NOW(), NOW());

  -- Create: BB KITCHEN LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'BB KITCHEN LLC', 'Net 30', NOW(), NOW());

  -- Create: BB at 55th & 5th LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'BB at 55th & 5th LLC', 'Net 30', NOW(), NOW());

  -- Create: BH-76 Forsyth LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'BH-76 Forsyth LLC', 'Net 30', NOW(), NOW());

  -- Create: Babbo LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Babbo LLC', 'Net 30', NOW(), NOW());

  -- Create: BabySips
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'BabySips', 'Net 30', NOW(), NOW());

  -- Create: Bahr's Landing Restaurant & Marina
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bahr''s Landing Restaurant & Marina', 'Net 30', NOW(), NOW());

  -- Create: Bande a Part LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bande a Part LLC', 'Net 30', NOW(), NOW());

  -- Create: Bar Bianchi
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bar Bianchi', 'Net 30', NOW(), NOW());

  -- Create: Bar Oliver
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bar Oliver', 'Net 30', NOW(), NOW());

  -- Create: Bar Pitti
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bar Pitti', 'Net 30', NOW(), NOW());

  -- Create: Barrel & Brew Bar and Liquor
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Barrel & Brew Bar and Liquor', 'Net 30', NOW(), NOW());

  -- Create: Beacon Diner
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Beacon Diner', 'Net 30', NOW(), NOW());

  -- Create: Beer Karma, LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Beer Karma, LLC', 'Net 30', NOW(), NOW());

  -- Create: Benjamin Robbins
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Benjamin Robbins', 'Net 30', NOW(), NOW());

  -- Create: Berkeley & Stuart Wine Company
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Berkeley & Stuart Wine Company', 'Net 30', NOW(), NOW());

  -- Create: Bernardsville Wine Co. LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bernardsville Wine Co. LLC', 'Net 30', NOW(), NOW());

  -- Create: Big Gary's Discount Liquors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Big Gary''s Discount Liquors', 'Net 30', NOW(), NOW());

  -- Create: Big Tiny
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Big Tiny', 'Net 30', NOW(), NOW());

  -- Create: Binx
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Binx', 'Net 30', NOW(), NOW());

  -- Create: Birds
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Birds', 'Net 30', NOW(), NOW());

  -- Create: Bistrotier LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bistrotier LLC', 'Net 30', NOW(), NOW());

  -- Create: Black Cat Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Black Cat Wines', 'Net 30', NOW(), NOW());

  -- Create: Blue Angel Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Blue Angel Wines', 'Net 30', NOW(), NOW());

  -- Create: Blue Hill at Stone Barns
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Blue Hill at Stone Barns', 'Net 30', NOW(), NOW());

  -- Create: Bluebird Wine LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bluebird Wine LLC', 'Net 30', NOW(), NOW());

  -- Create: Bob's Centerbrook Package Store
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bob''s Centerbrook Package Store', 'Net 30', NOW(), NOW());

  -- Create: Bodega Wines and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bodega Wines and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Bom Dia Bubbles
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bom Dia Bubbles', 'Net 30', NOW(), NOW());

  -- Create: Bon Vivant Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bon Vivant Wine', 'Net 30', NOW(), NOW());

  -- Create: Born to Lose LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Born to Lose LLC', 'Net 30', NOW(), NOW());

  -- Create: Botanicus Greenpoint, INC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Botanicus Greenpoint, INC', 'Net 30', NOW(), NOW());

  -- Create: Bouquet BK LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bouquet BK LLC', 'Net 30', NOW(), NOW());

  -- Create: Bread and bowl inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Bread and bowl inc.', 'Net 30', NOW(), NOW());

  -- Create: Broadbent Selections
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Broadbent Selections', 'Net 30', NOW(), NOW());

  -- Create: Broadway Desserts, LTD
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Broadway Desserts, LTD', 'Net 30', NOW(), NOW());

  -- Create: Brooklyn Wine Exchange
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Brooklyn Wine Exchange', 'Net 30', NOW(), NOW());

  -- Create: Buddakan
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Buddakan', 'Net 30', NOW(), NOW());

  -- Create: CQDQ Flatiron New York, LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'CQDQ Flatiron New York, LLC', 'Net 30', NOW(), NOW());

  -- Create: CSEN Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'CSEN Inc.', 'Net 30', NOW(), NOW());

  -- Create: CT Beverage Mart Newington
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'CT Beverage Mart Newington', 'Net 30', NOW(), NOW());

  -- Create: CT Beverage Mart Wallingford
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'CT Beverage Mart Wallingford', 'Net 30', NOW(), NOW());

  -- Create: CW Distributing Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'CW Distributing Inc', 'Net 30', NOW(), NOW());

  -- Create: CWD Samples Tara
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'CWD Samples Tara', 'Net 30', NOW(), NOW());

  -- Create: CWD Samples- Joe
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'CWD Samples- Joe', 'Net 30', NOW(), NOW());

  -- Create: Cachette LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cachette LLC', 'Net 30', NOW(), NOW());

  -- Create: Cafe Cluny
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cafe Cluny', 'Net 30', NOW(), NOW());

  -- Create: Cafe D'Alsace
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cafe D''Alsace', 'Net 30', NOW(), NOW());

  -- Create: Calf & Bull Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Calf & Bull Inc.', 'Net 30', NOW(), NOW());

  -- Create: Canopy Productions LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Canopy Productions LLC', 'Net 30', NOW(), NOW());

  -- Create: Canopy samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Canopy samples', 'Net 30', NOW(), NOW());

  -- Create: Caraluzzi’s Wine & Spirits Bethel
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Caraluzzi’s Wine & Spirits Bethel', 'Net 30', NOW(), NOW());

  -- Create: Caraluzzi’s Wine & Spirits Danbury
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Caraluzzi’s Wine & Spirits Danbury', 'Net 30', NOW(), NOW());

  -- Create: Caraluzzi’s Wine & Spirits Danbury Fairgrounds
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Caraluzzi’s Wine & Spirits Danbury Fairgrounds', 'Net 30', NOW(), NOW());

  -- Create: Caraluzzi’s Wine & Spirits Wilton
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Caraluzzi’s Wine & Spirits Wilton', 'Net 30', NOW(), NOW());

  -- Create: Carmella's Wine bar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Carmella''s Wine bar', 'Net 30', NOW(), NOW());

  -- Create: Carmine Fine Foods LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Carmine Fine Foods LLC', 'Net 30', NOW(), NOW());

  -- Create: Carylou LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Carylou LLC', 'Net 30', NOW(), NOW());

  -- Create: Cecily
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cecily', 'Net 30', NOW(), NOW());

  -- Create: Cellar 36
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cellar 36', 'Net 30', NOW(), NOW());

  -- Create: Central Perk Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Central Perk Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Chausse Selections
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Chausse Selections', 'Net 30', NOW(), NOW());

  -- Create: Cheese and Wine Hoboken
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cheese and Wine Hoboken', 'Net 30', NOW(), NOW());

  -- Create: Chef Driven Hospitality
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Chef Driven Hospitality', 'Net 30', NOW(), NOW());

  -- Create: Cherry on Top LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cherry on Top LLC', 'Net 30', NOW(), NOW());

  -- Create: Chez Fifi
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Chez Fifi', 'Net 30', NOW(), NOW());

  -- Create: Chez Ma Tante Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Chez Ma Tante Samples', 'Net 30', NOW(), NOW());

  -- Create: Chez Margaux
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Chez Margaux', 'Net 30', NOW(), NOW());

  -- Create: Chipandtinanyc LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Chipandtinanyc LLC', 'Net 30', NOW(), NOW());

  -- Create: Churrascaria Brazerio Cliffside Park
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Churrascaria Brazerio Cliffside Park', 'Net 30', NOW(), NOW());

  -- Create: Churrascaria Brazerio North Bergen
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Churrascaria Brazerio North Bergen', 'Net 30', NOW(), NOW());

  -- Create: Citarella Wine and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Citarella Wine and Spirits', 'Net 30', NOW(), NOW());

  -- Create: City Supermarket
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'City Supermarket', 'Net 30', NOW(), NOW());

  -- Create: Cloche Wine Co
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cloche Wine Co', 'Net 30', NOW(), NOW());

  -- Create: Clos & Monopole
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Clos & Monopole', 'Net 30', NOW(), NOW());

  -- Create: Clos & Monopole Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Clos & Monopole Samples', 'Net 30', NOW(), NOW());

  -- Create: Colonia Verde
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Colonia Verde', 'Net 30', NOW(), NOW());

  -- Create: Colors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Colors', 'Net 30', NOW(), NOW());

  -- Create: Community Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Community Wine', 'Net 30', NOW(), NOW());

  -- Create: Convive Wine and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Convive Wine and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Cool Wines and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cool Wines and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Cornwall Package
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cornwall Package', 'Net 30', NOW(), NOW());

  -- Create: Cost Cutters Dayville
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cost Cutters Dayville', 'Net 30', NOW(), NOW());

  -- Create: Cost Cutters Plainfield
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cost Cutters Plainfield', 'Net 30', NOW(), NOW());

  -- Create: Court Liquors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Court Liquors', 'Net 30', NOW(), NOW());

  -- Create: Crane Club Lounge
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Crane Club Lounge', 'Net 30', NOW(), NOW());

  -- Create: Crane Club Restaurant
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Crane Club Restaurant', 'Net 30', NOW(), NOW());

  -- Create: Crazy Beautiful Wines LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Crazy Beautiful Wines LLC', 'Net 30', NOW(), NOW());

  -- Create: Cree Wine Company
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cree Wine Company', 'Net 30', NOW(), NOW());

  -- Create: Crevette
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Crevette', 'Net 30', NOW(), NOW());

  -- Create: Cristina Valverde
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Cristina Valverde', 'Net 30', NOW(), NOW());

  -- Create: Crossroads Package Store
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Crossroads Package Store', 'Net 30', NOW(), NOW());

  -- Create: Crow and Chick LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Crow and Chick LLC', 'Net 30', NOW(), NOW());

  -- Create: Crown Heights 2020 LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Crown Heights 2020 LLC', 'Net 30', NOW(), NOW());

  -- Create: Crown Shy
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Crown Shy', 'Net 30', NOW(), NOW());

  -- Create: D-I Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'D-I Wine', 'Net 30', NOW(), NOW());

  -- Create: D.Vino
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'D.Vino', 'Net 30', NOW(), NOW());

  -- Create: DF Rosati
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'DF Rosati', 'Net 30', NOW(), NOW());

  -- Create: Dae New York LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Dae New York LLC', 'Net 30', NOW(), NOW());

  -- Create: Daniel Hampton
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Daniel Hampton', 'Net 30', NOW(), NOW());

  -- Create: Dash of Salt Catering
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Dash of Salt Catering', 'Net 30', NOW(), NOW());

  -- Create: David Bowler LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'David Bowler LLC', 'Net 30', NOW(), NOW());

  -- Create: Davin Milun
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Davin Milun', 'Net 30', NOW(), NOW());

  -- Create: De Wine Spot
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'De Wine Spot', 'Net 30', NOW(), NOW());

  -- Create: Death Ave Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Death Ave Wines', 'Net 30', NOW(), NOW());

  -- Create: Depanneur
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Depanneur', 'Net 30', NOW(), NOW());

  -- Create: Dianne Barclay
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Dianne Barclay', 'Net 30', NOW(), NOW());

  -- Create: Digesteve Gastronomic Spirits & Wine LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Digesteve Gastronomic Spirits & Wine LLC', 'Net 30', NOW(), NOW());

  -- Create: Dimes
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Dimes', 'Net 30', NOW(), NOW());

  -- Create: Diner
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Diner', 'Net 30', NOW(), NOW());

  -- Create: Direct Import Wines Inc. [samples] Brett
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Direct Import Wines Inc. [samples] Brett', 'Net 30', NOW(), NOW());

  -- Create: Disco Bottles
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Disco Bottles', 'Net 30', NOW(), NOW());

  -- Create: Disco Liquids
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Disco Liquids', 'Net 30', NOW(), NOW());

  -- Create: Domino Wine LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Domino Wine LLC', 'Net 30', NOW(), NOW());

  -- Create: Doppio
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Doppio', 'Net 30', NOW(), NOW());

  -- Create: Double Chicken Please
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Double Chicken Please', 'Net 30', NOW(), NOW());

  -- Create: Double Deep LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Double Deep LLC', 'Net 30', NOW(), NOW());

  -- Create: Drink Puritan LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Drink Puritan LLC', 'Net 30', NOW(), NOW());

  -- Create: Due West 1
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Due West 1', 'Net 30', NOW(), NOW());

  -- Create: Duke’s
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Duke’s', 'Net 30', NOW(), NOW());

  -- Create: Dylans Wine Cellar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Dylans Wine Cellar', 'Net 30', NOW(), NOW());

  -- Create: Eagle Eye Brands
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Eagle Eye Brands', 'Net 30', NOW(), NOW());

  -- Create: East Harlem Bottling Co LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'East Harlem Bottling Co LLC', 'Net 30', NOW(), NOW());

  -- Create: East Village Wine Corp.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'East Village Wine Corp.', 'Net 30', NOW(), NOW());

  -- Create: Eastdale LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Eastdale LLC', 'Net 30', NOW(), NOW());

  -- Create: Eastside Cellars
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Eastside Cellars', 'Net 30', NOW(), NOW());

  -- Create: Eataly Wine LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Eataly Wine LLC', 'Net 30', NOW(), NOW());

  -- Create: El Hefé
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'El Hefé', 'Net 30', NOW(), NOW());

  -- Create: El Vino Crudo
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'El Vino Crudo', 'Net 30', NOW(), NOW());

  -- Create: Eleven Madison Park
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Eleven Madison Park', 'Net 30', NOW(), NOW());

  -- Create: Eli's Table
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Eli''s Table', 'Net 30', NOW(), NOW());

  -- Create: Elvis
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Elvis', 'Net 30', NOW(), NOW());

  -- Create: Embassy Liquor dba New Embassy Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Embassy Liquor dba New Embassy Wine', 'Net 30', NOW(), NOW());

  -- Create: Emmett's on Grove
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Emmett''s on Grove', 'Net 30', NOW(), NOW());

  -- Create: Entre Amis
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Entre Amis', 'Net 30', NOW(), NOW());

  -- Create: Entre Deux Mers LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Entre Deux Mers LLC', 'Net 30', NOW(), NOW());

  -- Create: Erica Birmingham
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Erica Birmingham', 'Net 30', NOW(), NOW());

  -- Create: Ernest Muzquiz
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Ernest Muzquiz', 'Net 30', NOW(), NOW());

  -- Create: Evan Gaston
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Evan Gaston', 'Net 30', NOW(), NOW());

  -- Create: F - C LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'F - C LLC', 'Net 30', NOW(), NOW());

  -- Create: Fairway Liquor Mart
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fairway Liquor Mart', 'Net 30', NOW(), NOW());

  -- Create: Fanou Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fanou Inc.', 'Net 30', NOW(), NOW());

  -- Create: Fantasma LLC | Cork & Fork
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fantasma LLC | Cork & Fork', 'Net 30', NOW(), NOW());

  -- Create: Fig and Grape
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fig and Grape', 'Net 30', NOW(), NOW());

  -- Create: Fiorino Ristorante & Bar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fiorino Ristorante & Bar', 'Net 30', NOW(), NOW());

  -- Create: Five Oclock Forever LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Five Oclock Forever LLC', 'Net 30', NOW(), NOW());

  -- Create: Flatiron Wines NYC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Flatiron Wines NYC', 'Net 30', NOW(), NOW());

  -- Create: Flora and Jasper inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Flora and Jasper inc', 'Net 30', NOW(), NOW());

  -- Create: Flower Alley
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Flower Alley', 'Net 30', NOW(), NOW());

  -- Create: Flowercup Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Flowercup Wine', 'Net 30', NOW(), NOW());

  -- Create: Folkways Croton Falls llc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Folkways Croton Falls llc', 'Net 30', NOW(), NOW());

  -- Create: FoodexBrooklynLLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'FoodexBrooklynLLC', 'Net 30', NOW(), NOW());

  -- Create: Fort Greene Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fort Greene Wines', 'Net 30', NOW(), NOW());

  -- Create: Fountainhead Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fountainhead Wines', 'Net 30', NOW(), NOW());

  -- Create: Four Hands LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Four Hands LLC', 'Net 30', NOW(), NOW());

  -- Create: Fradei
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fradei', 'Net 30', NOW(), NOW());

  -- Create: Franklin Wine and Spirits Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Franklin Wine and Spirits Inc.', 'Net 30', NOW(), NOW());

  -- Create: Frankly Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Frankly Wines', 'Net 30', NOW(), NOW());

  -- Create: French 37 LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'French 37 LLC', 'Net 30', NOW(), NOW());

  -- Create: French Laundry
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'French Laundry', 'Net 30', NOW(), NOW());

  -- Create: Frog Winebar LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Frog Winebar LLC', 'Net 30', NOW(), NOW());

  -- Create: Fulgurances NYC LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fulgurances NYC LLC', 'Net 30', NOW(), NOW());

  -- Create: Funk and Fermentation
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Funk and Fermentation', 'Net 30', NOW(), NOW());

  -- Create: Fuzi Pasta Co.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Fuzi Pasta Co.', 'Net 30', NOW(), NOW());

  -- Create: G And C Wines LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'G And C Wines LLC', 'Net 30', NOW(), NOW());

  -- Create: GV Samples - David Seal
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'GV Samples - David Seal', 'Net 30', NOW(), NOW());

  -- Create: GV Samples - John Livingston
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'GV Samples - John Livingston', 'Net 30', NOW(), NOW());

  -- Create: GV Samples - Marquis Williams
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'GV Samples - Marquis Williams', 'Net 30', NOW(), NOW());

  -- Create: GV Samples - Mike Hoffmann
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'GV Samples - Mike Hoffmann', 'Net 30', NOW(), NOW());

  -- Create: GV Samples - Tyler Gambino
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'GV Samples - Tyler Gambino', 'Net 30', NOW(), NOW());

  -- Create: Gallaghers Steakhouse
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Gallaghers Steakhouse', 'Net 30', NOW(), NOW());

  -- Create: Gary's Wine & Market Place
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Gary''s Wine & Market Place', 'Net 30', NOW(), NOW());

  -- Create: Gary's Wine & Marketplace - Closter
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Gary''s Wine & Marketplace - Closter', 'Net 30', NOW(), NOW());

  -- Create: Gather Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Gather Inc.', 'Net 30', NOW(), NOW());

  -- Create: George Marcel LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'George Marcel LLC', 'Net 30', NOW(), NOW());

  -- Create: Georgia Room / Bar Calico
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Georgia Room / Bar Calico', 'Net 30', NOW(), NOW());

  -- Create: Glen Liquors Incorporated
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Glen Liquors Incorporated', 'Net 30', NOW(), NOW());

  -- Create: Golden Vines samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Golden Vines samples', 'Net 30', NOW(), NOW());

  -- Create: Goldman Sachs / Aramark
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Goldman Sachs / Aramark', 'Net 30', NOW(), NOW());

  -- Create: Graham Wine Co.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Graham Wine Co.', 'Net 30', NOW(), NOW());

  -- Create: Grain & Vine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Grain & Vine', 'Net 30', NOW(), NOW());

  -- Create: Gramercy Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Gramercy Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Gran Morsi
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Gran Morsi', 'Net 30', NOW(), NOW());

  -- Create: Granada Wines and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Granada Wines and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Grande Cellars Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Grande Cellars Inc.', 'Net 30', NOW(), NOW());

  -- Create: Grapes on Van LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Grapes on Van LLC', 'Net 30', NOW(), NOW());

  -- Create: Grassroots Wine Wholesalers LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Grassroots Wine Wholesalers LLC', 'Net 30', NOW(), NOW());

  -- Create: Greca Mediterranean Kitchen & Bar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Greca Mediterranean Kitchen & Bar', 'Net 30', NOW(), NOW());

  -- Create: Greed Island LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Greed Island LLC', 'Net 30', NOW(), NOW());

  -- Create: Green Canoe Hospitality, LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Green Canoe Hospitality, LLC', 'Net 30', NOW(), NOW());

  -- Create: Greenings Fine Foods LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Greenings Fine Foods LLC', 'Net 30', NOW(), NOW());

  -- Create: Greens Farms Spirit Shop
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Greens Farms Spirit Shop', 'Net 30', NOW(), NOW());

  -- Create: Gus’s
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Gus’s', 'Net 30', NOW(), NOW());

  -- Create: H Wine & Spirits Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'H Wine & Spirits Inc.', 'Net 30', NOW(), NOW());

  -- Create: H. J. G. Liquor Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'H. J. G. Liquor Inc', 'Net 30', NOW(), NOW());

  -- Create: HRLM Champagne
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'HRLM Champagne', 'Net 30', NOW(), NOW());

  -- Create: Hamilton Farm Golf Club
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Hamilton Farm Golf Club', 'Net 30', NOW(), NOW());

  -- Create: Handcrafted - Nebraska
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Handcrafted - Nebraska', 'Net 30', NOW(), NOW());

  -- Create: Hanover Ventures Marketplace LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Hanover Ventures Marketplace LLC', 'Net 30', NOW(), NOW());

  -- Create: Harbor Point Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Harbor Point Wines', 'Net 30', NOW(), NOW());

  -- Create: Harry's Discount Liquors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Harry''s Discount Liquors', 'Net 30', NOW(), NOW());

  -- Create: Harry's Wine & Liquor Market
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Harry''s Wine & Liquor Market', 'Net 30', NOW(), NOW());

  -- Create: Hawthorne Liquors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Hawthorne Liquors', 'Net 30', NOW(), NOW());

  -- Create: Hazelton Wine and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Hazelton Wine and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Hearth
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Hearth', 'Net 30', NOW(), NOW());

  -- Create: Hef's Hut Bar and Grill
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Hef''s Hut Bar and Grill', 'Net 30', NOW(), NOW());

  -- Create: Heuristic Analytic Services CC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Heuristic Analytic Services CC', 'Net 30', NOW(), NOW());

  -- Create: Hirohisa
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Hirohisa', 'Net 30', NOW(), NOW());

  -- Create: Horse with No Name
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Horse with No Name', 'Net 30', NOW(), NOW());

  -- Create: Horseneck Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Horseneck Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Hot Chicken LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Hot Chicken LLC', 'Net 30', NOW(), NOW());

  -- Create: Hunt & Fish Club
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Hunt & Fish Club', 'Net 30', NOW(), NOW());

  -- Create: IL VIGNETTO CORP
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'IL VIGNETTO CORP', 'Net 30', NOW(), NOW());

  -- Create: IL Villaggio
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'IL Villaggio', 'Net 30', NOW(), NOW());

  -- Create: International Cellars
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'International Cellars', 'Net 30', NOW(), NOW());

  -- Create: International Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'International Wines', 'Net 30', NOW(), NOW());

  -- Create: Isle of Capri
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Isle of Capri', 'Net 30', NOW(), NOW());

  -- Create: JAMES A YAEGER INC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'JAMES A YAEGER INC', 'Net 30', NOW(), NOW());

  -- Create: JAS Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'JAS Samples', 'Net 30', NOW(), NOW());

  -- Create: JFW LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'JFW LLC', 'Net 30', NOW(), NOW());

  -- Create: JG Dumbo LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'JG Dumbo LLC', 'Net 30', NOW(), NOW());

  -- Create: JMB Harlem
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'JMB Harlem', 'Net 30', NOW(), NOW());

  -- Create: Jared Lorenz Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Jared Lorenz Samples', 'Net 30', NOW(), NOW());

  -- Create: Jasmine Monet
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Jasmine Monet', 'Net 30', NOW(), NOW());

  -- Create: Jeff Hansen Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Jeff Hansen Samples', 'Net 30', NOW(), NOW());

  -- Create: Jeffrey Alpert Selections
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Jeffrey Alpert Selections', 'Net 30', NOW(), NOW());

  -- Create: Jennifer Rugani
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Jennifer Rugani', 'Net 30', NOW(), NOW());

  -- Create: Jill Salmon
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Jill Salmon', 'Net 30', NOW(), NOW());

  -- Create: Johnson Wine Group
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Johnson Wine Group', 'Net 30', NOW(), NOW());

  -- Create: Jojo Restaurant
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Jojo Restaurant', 'Net 30', NOW(), NOW());

  -- Create: Jonathan Blazek
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Jonathan Blazek', 'Net 30', NOW(), NOW());

  -- Create: Julian Castaybert - Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Julian Castaybert - Samples', 'Net 30', NOW(), NOW());

  -- Create: Juliette Restaurant
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Juliette Restaurant', 'Net 30', NOW(), NOW());

  -- Create: Jupiter WInes LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Jupiter WInes LLC', 'Net 30', NOW(), NOW());

  -- Create: Just Adventure INC La Vid Wines & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Just Adventure INC La Vid Wines & Spirits', 'Net 30', NOW(), NOW());

  -- Create: K2R2 Logistics
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'K2R2 Logistics', 'Net 30', NOW(), NOW());

  -- Create: Kate Aufdenkamp
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Kate Aufdenkamp', 'Net 30', NOW(), NOW());

  -- Create: Kelly samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Kelly samples', 'Net 30', NOW(), NOW());

  -- Create: Killingly Discount Liquors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Killingly Discount Liquors', 'Net 30', NOW(), NOW());

  -- Create: Kily Import
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Kily Import', 'Net 30', NOW(), NOW());

  -- Create: Kinchley's Tavern
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Kinchley''s Tavern', 'Net 30', NOW(), NOW());

  -- Create: Kindred Spirits & Wine Fairfield
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Kindred Spirits & Wine Fairfield', 'Net 30', NOW(), NOW());

  -- Create: Kindred Spirits & Wine Monroe
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Kindred Spirits & Wine Monroe', 'Net 30', NOW(), NOW());

  -- Create: Kindred Spirits & Wine Westport
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Kindred Spirits & Wine Westport', 'Net 30', NOW(), NOW());

  -- Create: Kings County Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Kings County Wines', 'Net 30', NOW(), NOW());

  -- Create: Kingston Bistro LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Kingston Bistro LLC', 'Net 30', NOW(), NOW());

  -- Create: L'Abeille
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'L''Abeille', 'Net 30', NOW(), NOW());

  -- Create: LFG Pizza LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'LFG Pizza LLC', 'Net 30', NOW(), NOW());

  -- Create: LIQUIDERIE INC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'LIQUIDERIE INC', 'Net 30', NOW(), NOW());

  -- Create: LQK Companies LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'LQK Companies LLC', 'Net 30', NOW(), NOW());

  -- Create: La Bastide by Andrea Calstier
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'La Bastide by Andrea Calstier', 'Net 30', NOW(), NOW());

  -- Create: La Cantine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'La Cantine', 'Net 30', NOW(), NOW());

  -- Create: La Compagnie Centre Street
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'La Compagnie Centre Street', 'Net 30', NOW(), NOW());

  -- Create: La Compagnie Flatiron
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'La Compagnie Flatiron', 'Net 30', NOW(), NOW());

  -- Create: LaRina Pastificio & Vino
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'LaRina Pastificio & Vino', 'Net 30', NOW(), NOW());

  -- Create: Lama Spiral 66th Floor LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lama Spiral 66th Floor LLC', 'Net 30', NOW(), NOW());

  -- Create: Larchmont Yacht Club
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Larchmont Yacht Club', 'Net 30', NOW(), NOW());

  -- Create: Lassoni Restaurant
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lassoni Restaurant', 'Net 30', NOW(), NOW());

  -- Create: Le Bernardin
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Le Bernardin', 'Net 30', NOW(), NOW());

  -- Create: Le Caviste
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Le Caviste', 'Net 30', NOW(), NOW());

  -- Create: Le Chene
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Le Chene', 'Net 30', NOW(), NOW());

  -- Create: Le Crocodile 80 Wythe LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Le Crocodile 80 Wythe LLC', 'Net 30', NOW(), NOW());

  -- Create: Le French Diner
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Le French Diner', 'Net 30', NOW(), NOW());

  -- Create: Le Garrec NYC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Le Garrec NYC', 'Net 30', NOW(), NOW());

  -- Create: Le Gratin
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Le Gratin', 'Net 30', NOW(), NOW());

  -- Create: Legacy Wine and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Legacy Wine and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Lei Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lei Wine', 'Net 30', NOW(), NOW());

  -- Create: Leo
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Leo', 'Net 30', NOW(), NOW());

  -- Create: LibCorp LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'LibCorp LLC', 'Net 30', NOW(), NOW());

  -- Create: Libation Project
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Libation Project', 'Net 30', NOW(), NOW());

  -- Create: Lieu Dit Distribution
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lieu Dit Distribution', 'Net 30', NOW(), NOW());

  -- Create: Lillie Wolff Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lillie Wolff Inc.', 'Net 30', NOW(), NOW());

  -- Create: Liquor Locker of Westport
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Liquor Locker of Westport', 'Net 30', NOW(), NOW());

  -- Create: Little Calf LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Little Calf LLC', 'Net 30', NOW(), NOW());

  -- Create: Little Mo Wine Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Little Mo Wine Inc.', 'Net 30', NOW(), NOW());

  -- Create: Little West Wine and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Little West Wine and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Lo Secco LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lo Secco LLC', 'Net 30', NOW(), NOW());

  -- Create: Lone Star Wine and Spirits, LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lone Star Wine and Spirits, LLC', 'Net 30', NOW(), NOW());

  -- Create: Long Hill Liquors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Long Hill Liquors', 'Net 30', NOW(), NOW());

  -- Create: Lord's
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lord''s', 'Net 30', NOW(), NOW());

  -- Create: Lost Vines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lost Vines', 'Net 30', NOW(), NOW());

  -- Create: Lovebirds Wine Bar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lovebirds Wine Bar', 'Net 30', NOW(), NOW());

  -- Create: Luca Zocche
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Luca Zocche', 'Net 30', NOW(), NOW());

  -- Create: Lucky's Steakhouse
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Lucky''s Steakhouse', 'Net 30', NOW(), NOW());

  -- Create: Luc’s
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Luc’s', 'Net 30', NOW(), NOW());

  -- Create: Luthun
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Luthun', 'Net 30', NOW(), NOW());

  -- Create: MISIPASTA
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'MISIPASTA', 'Net 30', NOW(), NOW());

  -- Create: MYS WINES INC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'MYS WINES INC', 'Net 30', NOW(), NOW());

  -- Create: Madd Hatter
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Madd Hatter', 'Net 30', NOW(), NOW());

  -- Create: Magic 5 Pie Co.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Magic 5 Pie Co.', 'Net 30', NOW(), NOW());

  -- Create: Main St. Wine and Liquor
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Main St. Wine and Liquor', 'Net 30', NOW(), NOW());

  -- Create: Maison Brondeau
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Maison Brondeau', 'Net 30', NOW(), NOW());

  -- Create: Mamo
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Mamo', 'Net 30', NOW(), NOW());

  -- Create: Manchester Wine and Liquor
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Manchester Wine and Liquor', 'Net 30', NOW(), NOW());

  -- Create: Manhatta
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Manhatta', 'Net 30', NOW(), NOW());

  -- Create: Manleys Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Manleys Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Marea
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Marea', 'Net 30', NOW(), NOW());

  -- Create: Marguerite Wincek
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Marguerite Wincek', 'Net 30', NOW(), NOW());

  -- Create: Maria Bonita Salon
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Maria Bonita Salon', 'Net 30', NOW(), NOW());

  -- Create: Mark Giangreco
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Mark Giangreco', 'Net 30', NOW(), NOW());

  -- Create: Marseille
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Marseille', 'Net 30', NOW(), NOW());

  -- Create: Massawa Foods alc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Massawa Foods alc', 'Net 30', NOW(), NOW());

  -- Create: Maverick Beverage Minnesota
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Maverick Beverage Minnesota', 'Net 30', NOW(), NOW());

  -- Create: Maywood Market
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Maywood Market', 'Net 30', NOW(), NOW());

  -- Create: Meeting House Princeton
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Meeting House Princeton', 'Net 30', NOW(), NOW());

  -- Create: Melody's Piano Bar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Melody''s Piano Bar', 'Net 30', NOW(), NOW());

  -- Create: Metta Platamata LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Metta Platamata LLC', 'Net 30', NOW(), NOW());

  -- Create: Michael Waite
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Michael Waite', 'Net 30', NOW(), NOW());

  -- Create: Mid Valley Wine & Liquor
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Mid Valley Wine & Liquor', 'Net 30', NOW(), NOW());

  -- Create: Midwood Wine Merchants LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Midwood Wine Merchants LLC', 'Net 30', NOW(), NOW());

  -- Create: Million Goods LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Million Goods LLC', 'Net 30', NOW(), NOW());

  -- Create: Minerva Muzquiz
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Minerva Muzquiz', 'Net 30', NOW(), NOW());

  -- Create: Minetta Tavern
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Minetta Tavern', 'Net 30', NOW(), NOW());

  -- Create: Misi Domino LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Misi Domino LLC', 'Net 30', NOW(), NOW());

  -- Create: Mission Fine Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Mission Fine Wines', 'Net 30', NOW(), NOW());

  -- Create: Mister Wright Fine Wines & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Mister Wright Fine Wines & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Mistral
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Mistral', 'Net 30', NOW(), NOW());

  -- Create: Mitsuru
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Mitsuru', 'Net 30', NOW(), NOW());

  -- Create: Moonflower
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Moonflower', 'Net 30', NOW(), NOW());

  -- Create: Morimoto
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Morimoto', 'Net 30', NOW(), NOW());

  -- Create: Mozzarella Holdings LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Mozzarella Holdings LLC', 'Net 30', NOW(), NOW());

  -- Create: Mt. Carmel Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Mt. Carmel Wines', 'Net 30', NOW(), NOW());

  -- Create: Musket Room
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Musket Room', 'Net 30', NOW(), NOW());

  -- Create: My Loup
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'My Loup', 'Net 30', NOW(), NOW());

  -- Create: NODA
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'NODA', 'Net 30', NOW(), NOW());

  -- Create: NRK Cafe
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'NRK Cafe', 'Net 30', NOW(), NOW());

  -- Create: Nada Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Nada Wine', 'Net 30', NOW(), NOW());

  -- Create: Natural Wine Company
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Natural Wine Company', 'Net 30', NOW(), NOW());

  -- Create: Navesink Country Club
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Navesink Country Club', 'Net 30', NOW(), NOW());

  -- Create: Neon Sky LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Neon Sky LLC', 'Net 30', NOW(), NOW());

  -- Create: Nightmoves Bar LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Nightmoves Bar LLC', 'Net 30', NOW(), NOW());

  -- Create: Nippon Naturals LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Nippon Naturals LLC', 'Net 30', NOW(), NOW());

  -- Create: Noble Hill Vineyards Pty. Ltd.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Noble Hill Vineyards Pty. Ltd.', 'Net 30', NOW(), NOW());

  -- Create: Noble Hill Wines Pty. Ltd.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Noble Hill Wines Pty. Ltd.', 'Net 30', NOW(), NOW());

  -- Create: Noreetuh
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Noreetuh', 'Net 30', NOW(), NOW());

  -- Create: North American Beverage Selections
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'North American Beverage Selections', 'Net 30', NOW(), NOW());

  -- Create: North Street Wine and Liquor
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'North Street Wine and Liquor', 'Net 30', NOW(), NOW());

  -- Create: Nuyores
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Nuyores', 'Net 30', NOW(), NOW());

  -- Create: ODO
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'ODO', 'Net 30', NOW(), NOW());

  -- Create: OLD MILL OPS LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'OLD MILL OPS LLC', 'Net 30', NOW(), NOW());

  -- Create: ONA Wine & Sprits Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'ONA Wine & Sprits Inc', 'Net 30', NOW(), NOW());

  -- Create: Old Greenwich Wine Merchants
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Old Greenwich Wine Merchants', 'Net 30', NOW(), NOW());

  -- Create: Om Nityanand LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Om Nityanand LLC', 'Net 30', NOW(), NOW());

  -- Create: One Hanover LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'One Hanover LLC', 'Net 30', NOW(), NOW());

  -- Create: Ordinem Ecentrici Coctores
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Ordinem Ecentrici Coctores', 'Net 30', NOW(), NOW());

  -- Create: Oxalis Food LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Oxalis Food LLC', 'Net 30', NOW(), NOW());

  -- Create: Palinkerie
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Palinkerie', 'Net 30', NOW(), NOW());

  -- Create: Palladino's NYC Steak and Seafood
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Palladino''s NYC Steak and Seafood', 'Net 30', NOW(), NOW());

  -- Create: Paradise Liquors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Paradise Liquors', 'Net 30', NOW(), NOW());

  -- Create: Paradise Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Paradise Wines', 'Net 30', NOW(), NOW());

  -- Create: Park Place Wines & Liquors East Hampton
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Park Place Wines & Liquors East Hampton', 'Net 30', NOW(), NOW());

  -- Create: Pastabilities
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Pastabilities', 'Net 30', NOW(), NOW());

  -- Create: Patsy's Bistro LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Patsy''s Bistro LLC', 'Net 30', NOW(), NOW());

  -- Create: Paul Soper
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Paul Soper', 'Net 30', NOW(), NOW());

  -- Create: Paul Thompson
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Paul Thompson', 'Net 30', NOW(), NOW());

  -- Create: Peasant
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Peasant', 'Net 30', NOW(), NOW());

  -- Create: Penn Cellars Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Penn Cellars Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Penny
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Penny', 'Net 30', NOW(), NOW());

  -- Create: Per Se
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Per Se', 'Net 30', NOW(), NOW());

  -- Create: Perriellos Cantina LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Perriellos Cantina LLC', 'Net 30', NOW(), NOW());

  -- Create: Perry St
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Perry St', 'Net 30', NOW(), NOW());

  -- Create: Perry Street Restaurant
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Perry Street Restaurant', 'Net 30', NOW(), NOW());

  -- Create: Peter Brunet samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Peter Brunet samples', 'Net 30', NOW(), NOW());

  -- Create: Phoenix Hospitality Llc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Phoenix Hospitality Llc', 'Net 30', NOW(), NOW());

  -- Create: Pier Wines Corp.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Pier Wines Corp.', 'Net 30', NOW(), NOW());

  -- Create: Pierre Lefebvre
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Pierre Lefebvre', 'Net 30', NOW(), NOW());

  -- Create: Pinkerton Wine Bar LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Pinkerton Wine Bar LLC', 'Net 30', NOW(), NOW());

  -- Create: Pitt's Red Hook LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Pitt''s Red Hook LLC', 'Net 30', NOW(), NOW());

  -- Create: Pivco LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Pivco LLC', 'Net 30', NOW(), NOW());

  -- Create: Pizzeria Panina
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Pizzeria Panina', 'Net 30', NOW(), NOW());

  -- Create: Planet Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Planet Wine', 'Net 30', NOW(), NOW());

  -- Create: Playground Coffee Shop Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Playground Coffee Shop Inc.', 'Net 30', NOW(), NOW());

  -- Create: Plus de Vin
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Plus de Vin', 'Net 30', NOW(), NOW());

  -- Create: Point Seven
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Point Seven', 'Net 30', NOW(), NOW());

  -- Create: Polo Bar Ralph Lauren
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Polo Bar Ralph Lauren', 'Net 30', NOW(), NOW());

  -- Create: Popina
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Popina', 'Net 30', NOW(), NOW());

  -- Create: Popina Wine Cellar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Popina Wine Cellar', 'Net 30', NOW(), NOW());

  -- Create: Premium Wine & Spirits LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Premium Wine & Spirits LLC', 'Net 30', NOW(), NOW());

  -- Create: Press Club Grill
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Press Club Grill', 'Net 30', NOW(), NOW());

  -- Create: Princeton Corkscrew Wine Shop
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Princeton Corkscrew Wine Shop', 'Net 30', NOW(), NOW());

  -- Create: Quadrant
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Quadrant', 'Net 30', NOW(), NOW());

  -- Create: Quality Rockets Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Quality Rockets Inc', 'Net 30', NOW(), NOW());

  -- Create: RECEPTION BAR INC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'RECEPTION BAR INC', 'Net 30', NOW(), NOW());

  -- Create: RIO-Well Crafted Wine & Beverage Co.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'RIO-Well Crafted Wine & Beverage Co.', 'Net 30', NOW(), NOW());

  -- Create: Race Lane Liquors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Race Lane Liquors', 'Net 30', NOW(), NOW());

  -- Create: Racines NYC LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Racines NYC LLC', 'Net 30', NOW(), NOW());

  -- Create: Red, White, & Green Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Red, White, & Green Wine', 'Net 30', NOW(), NOW());

  -- Create: Redding Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Redding Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Regiis Ova Bar & Lounge
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Regiis Ova Bar & Lounge', 'Net 30', NOW(), NOW());

  -- Create: Rennaissance Beverages II LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rennaissance Beverages II LLC', 'Net 30', NOW(), NOW());

  -- Create: Rezdora
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rezdora', 'Net 30', NOW(), NOW());

  -- Create: Rhodora Wine Bar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rhodora Wine Bar', 'Net 30', NOW(), NOW());

  -- Create: Riley Hunt
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Riley Hunt', 'Net 30', NOW(), NOW());

  -- Create: Ritz Carlton Nomad
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Ritz Carlton Nomad', 'Net 30', NOW(), NOW());

  -- Create: River Cliff Wines and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'River Cliff Wines and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Robert Pinkas
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Robert Pinkas', 'Net 30', NOW(), NOW());

  -- Create: Robert Williams
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Robert Williams', 'Net 30', NOW(), NOW());

  -- Create: Rock 45 SW Bistro, L.L.C. & 45 Rock Center, L.L.C.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rock 45 SW Bistro, L.L.C. & 45 Rock Center, L.L.C.', 'Net 30', NOW(), NOW());

  -- Create: Rodeo Brooklyn LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rodeo Brooklyn LLC', 'Net 30', NOW(), NOW());

  -- Create: Rolo's
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rolo''s', 'Net 30', NOW(), NOW());

  -- Create: Rooseter Group LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rooseter Group LLC', 'Net 30', NOW(), NOW());

  -- Create: Rosa-Anna Winchell Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rosa-Anna Winchell Samples', 'Net 30', NOW(), NOW());

  -- Create: Roscioli
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Roscioli', 'Net 30', NOW(), NOW());

  -- Create: Roy Moran
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Roy Moran', 'Net 30', NOW(), NOW());

  -- Create: Royal Wine Merchants Ltd
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Royal Wine Merchants Ltd', 'Net 30', NOW(), NOW());

  -- Create: Ruby Wines - Massachusetts
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Ruby Wines - Massachusetts', 'Net 30', NOW(), NOW());

  -- Create: Rude Mouth BK LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rude Mouth BK LLC', 'Net 30', NOW(), NOW());

  -- Create: Rush Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Rush Wines', 'Net 30', NOW(), NOW());

  -- Create: SECRET SUMMER HOSPITALITY GROUP LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'SECRET SUMMER HOSPITALITY GROUP LLC', 'Net 30', NOW(), NOW());

  -- Create: SHMONÉ
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'SHMONÉ', 'Net 30', NOW(), NOW());

  -- Create: SUZYS RENDEZVOUS LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'SUZYS RENDEZVOUS LLC', 'Net 30', NOW(), NOW());

  -- Create: Saint Urban
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Saint Urban', 'Net 30', NOW(), NOW());

  -- Create: Saker Enterprises Management Company Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Saker Enterprises Management Company Inc', 'Net 30', NOW(), NOW());

  -- Create: Salvo's Cucina Casalinga
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Salvo''s Cucina Casalinga', 'Net 30', NOW(), NOW());

  -- Create: Sample Account - 38 Actors Colony Road
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sample Account - 38 Actors Colony Road', 'Net 30', NOW(), NOW());

  -- Create: Sample Account - 59 Howard Street
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sample Account - 59 Howard Street', 'Net 30', NOW(), NOW());

  -- Create: Samples (Replacement Bottles)
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Samples (Replacement Bottles)', 'Net 30', NOW(), NOW());

  -- Create: Samples Account LQK
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Samples Account LQK', 'Net 30', NOW(), NOW());

  -- Create: Samples to Customers
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Samples to Customers', 'Net 30', NOW(), NOW());

  -- Create: San Vicente West Village
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'San Vicente West Village', 'Net 30', NOW(), NOW());

  -- Create: Sandra Gurowitz
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sandra Gurowitz', 'Net 30', NOW(), NOW());

  -- Create: Sandy Hook Wine and Liquor
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sandy Hook Wine and Liquor', 'Net 30', NOW(), NOW());

  -- Create: Sara Morano
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sara Morano', 'Net 30', NOW(), NOW());

  -- Create: Sarah Moran
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sarah Moran', 'Net 30', NOW(), NOW());

  -- Create: Sauced Rooster LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sauced Rooster LLC', 'Net 30', NOW(), NOW());

  -- Create: Scalini Fedeli
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Scalini Fedeli', 'Net 30', NOW(), NOW());

  -- Create: Scarr Pizza
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Scarr Pizza', 'Net 30', NOW(), NOW());

  -- Create: Sea Grape Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sea Grape Wines', 'Net 30', NOW(), NOW());

  -- Create: Selectuion Sauvage
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Selectuion Sauvage', 'Net 30', NOW(), NOW());

  -- Create: She Said NYC LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'She Said NYC LLC', 'Net 30', NOW(), NOW());

  -- Create: Sheila Kassner
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sheila Kassner', 'Net 30', NOW(), NOW());

  -- Create: Shellbi and Co. LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Shellbi and Co. LLC', 'Net 30', NOW(), NOW());

  -- Create: Shukette
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Shukette', 'Net 30', NOW(), NOW());

  -- Create: Simple Simon
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Simple Simon', 'Net 30', NOW(), NOW());

  -- Create: Siwanoy Country Club
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Siwanoy Country Club', 'Net 30', NOW(), NOW());

  -- Create: Skin Contact LLLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Skin Contact LLLC', 'Net 30', NOW(), NOW());

  -- Create: Slapthecook LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Slapthecook LLC', 'Net 30', NOW(), NOW());

  -- Create: Slope Cellars
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Slope Cellars', 'Net 30', NOW(), NOW());

  -- Create: Smith and Vine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Smith and Vine', 'Net 30', NOW(), NOW());

  -- Create: Soil Expedition Co Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Soil Expedition Co Samples', 'Net 30', NOW(), NOW());

  -- Create: Soil Expedition Co.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Soil Expedition Co.', 'Net 30', NOW(), NOW());

  -- Create: Solera Beverage Group New Mexico
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Solera Beverage Group New Mexico', 'Net 30', NOW(), NOW());

  -- Create: Some Good Wine
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Some Good Wine', 'Net 30', NOW(), NOW());

  -- Create: Somm Cellars Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Somm Cellars Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Sossego Modern Brazilian Design
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sossego Modern Brazilian Design', 'Net 30', NOW(), NOW());

  -- Create: Sotto Il Sole Signature Products
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sotto Il Sole Signature Products', 'Net 30', NOW(), NOW());

  -- Create: Southbridge Wines & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Southbridge Wines & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Southdown Coffee LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Southdown Coffee LLC', 'Net 30', NOW(), NOW());

  -- Create: Spirits of Cairo
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Spirits of Cairo', 'Net 30', NOW(), NOW());

  -- Create: Spring Lake Golf Club
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Spring Lake Golf Club', 'Net 30', NOW(), NOW());

  -- Create: Springs Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Springs Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Square Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Square Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: St Jardim
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'St Jardim', 'Net 30', NOW(), NOW());

  -- Create: Steak Frites
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Steak Frites', 'Net 30', NOW(), NOW());

  -- Create: Steel Wheel Tavern
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Steel Wheel Tavern', 'Net 30', NOW(), NOW());

  -- Create: Steklen and Walker
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Steklen and Walker', 'Net 30', NOW(), NOW());

  -- Create: Stelle Wine Co.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Stelle Wine Co.', 'Net 30', NOW(), NOW());

  -- Create: Steven Graf LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Steven Graf LLC', 'Net 30', NOW(), NOW());

  -- Create: Steven Graf Office - Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Steven Graf Office - Samples', 'Net 30', NOW(), NOW());

  -- Create: Stew Leonard's Wine and Spirits-Danbury
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Stew Leonard''s Wine and Spirits-Danbury', 'Net 30', NOW(), NOW());

  -- Create: Stew Leonard's Wines and Spirits Newington
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Stew Leonard''s Wines and Spirits Newington', 'Net 30', NOW(), NOW());

  -- Create: Stockton Inn
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Stockton Inn', 'Net 30', NOW(), NOW());

  -- Create: Suburban Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Suburban Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Sullaluna NYC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sullaluna NYC', 'Net 30', NOW(), NOW());

  -- Create: Supernatural Wine Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Supernatural Wine Inc', 'Net 30', NOW(), NOW());

  -- Create: Susan or Chad McCord
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Susan or Chad McCord', 'Net 30', NOW(), NOW());

  -- Create: Sushi Nakazawa
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sushi Nakazawa', 'Net 30', NOW(), NOW());

  -- Create: Sweetwater
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Sweetwater', 'Net 30', NOW(), NOW());

  -- Create: TKM 228 EAST 10TH ST LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'TKM 228 EAST 10TH ST LLC', 'Net 30', NOW(), NOW());

  -- Create: TORTILLAS AND CAVIAR LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'TORTILLAS AND CAVIAR LLC', 'Net 30', NOW(), NOW());

  -- Create: TS Pizza Restaurant Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'TS Pizza Restaurant Inc', 'Net 30', NOW(), NOW());

  -- Create: Taste 56
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Taste 56', 'Net 30', NOW(), NOW());

  -- Create: Ten Thousand A.D. LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Ten Thousand A.D. LLC', 'Net 30', NOW(), NOW());

  -- Create: Teri Wiedeman Rouse
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Teri Wiedeman Rouse', 'Net 30', NOW(), NOW());

  -- Create: Terroir - Tribeca
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Terroir - Tribeca', 'Net 30', NOW(), NOW());

  -- Create: Test Retailer
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Test Retailer', 'Net 30', NOW(), NOW());

  -- Create: The Alps
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Alps', 'Net 30', NOW(), NOW());

  -- Create: The Clocktower
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Clocktower', 'Net 30', NOW(), NOW());

  -- Create: The Cookery Restaurant
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Cookery Restaurant', 'Net 30', NOW(), NOW());

  -- Create: The Core Club
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Core Club', 'Net 30', NOW(), NOW());

  -- Create: The Dublin Yard
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Dublin Yard', 'Net 30', NOW(), NOW());

  -- Create: The East Pole
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The East Pole', 'Net 30', NOW(), NOW());

  -- Create: The Four Horsemen
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Four Horsemen', 'Net 30', NOW(), NOW());

  -- Create: The Gilded Grape
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Gilded Grape', 'Net 30', NOW(), NOW());

  -- Create: The Grapevine At King's Corner LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Grapevine At King''s Corner LLC', 'Net 30', NOW(), NOW());

  -- Create: The Grill
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Grill', 'Net 30', NOW(), NOW());

  -- Create: The Inn at Pound Ridge by Jean-Georges
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Inn at Pound Ridge by Jean-Georges', 'Net 30', NOW(), NOW());

  -- Create: The Liquor Mart Wallingford
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Liquor Mart Wallingford', 'Net 30', NOW(), NOW());

  -- Create: The Modern
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Modern', 'Net 30', NOW(), NOW());

  -- Create: The New York Athletic Club City House
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The New York Athletic Club City House', 'Net 30', NOW(), NOW());

  -- Create: The Noortwyck
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Noortwyck', 'Net 30', NOW(), NOW());

  -- Create: The Pluckemin Inn
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Pluckemin Inn', 'Net 30', NOW(), NOW());

  -- Create: The River
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The River', 'Net 30', NOW(), NOW());

  -- Create: The Spread South Norwalk
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Spread South Norwalk', 'Net 30', NOW(), NOW());

  -- Create: The Study Fine Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Study Fine Wines', 'Net 30', NOW(), NOW());

  -- Create: The Whitlock
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Whitlock', 'Net 30', NOW(), NOW());

  -- Create: The Wine Store
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Wine Store', 'Net 30', NOW(), NOW());

  -- Create: The Wine Thief- Whitney Ave
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Wine Thief- Whitney Ave', 'Net 30', NOW(), NOW());

  -- Create: The Winery NYC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Winery NYC', 'Net 30', NOW(), NOW());

  -- Create: The Wise Old Dog
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Wise Old Dog', 'Net 30', NOW(), NOW());

  -- Create: The Yard Haledon
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The Yard Haledon', 'Net 30', NOW(), NOW());

  -- Create: The three Lenox brothers corp
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'The three Lenox brothers corp', 'Net 30', NOW(), NOW());

  -- Create: Theodore Chestnut
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Theodore Chestnut', 'Net 30', NOW(), NOW());

  -- Create: Third Leaf Ventures LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Third Leaf Ventures LLC', 'Net 30', NOW(), NOW());

  -- Create: Thirst Wine Merchants
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Thirst Wine Merchants', 'Net 30', NOW(), NOW());

  -- Create: Timothy McGinn
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Timothy McGinn', 'Net 30', NOW(), NOW());

  -- Create: Timothy Pittman
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Timothy Pittman', 'Net 30', NOW(), NOW());

  -- Create: Total Wine & More Milford
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Total Wine & More Milford', 'Net 30', NOW(), NOW());

  -- Create: Total Wine & More Norwalk
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Total Wine & More Norwalk', 'Net 30', NOW(), NOW());

  -- Create: Total Wine and More- Brookfield
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Total Wine and More- Brookfield', 'Net 30', NOW(), NOW());

  -- Create: Tourmaline
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Tourmaline', 'Net 30', NOW(), NOW());

  -- Create: Train Design LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Train Design LLC', 'Net 30', NOW(), NOW());

  -- Create: Trapizzino LES LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Trapizzino LES LLC', 'Net 30', NOW(), NOW());

  -- Create: Trattoria Tre Colori Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Trattoria Tre Colori Inc', 'Net 30', NOW(), NOW());

  -- Create: Trattoria Vivolo
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Trattoria Vivolo', 'Net 30', NOW(), NOW());

  -- Create: Travis Vernon Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Travis Vernon Samples', 'Net 30', NOW(), NOW());

  -- Create: Tria, Rittenhouse Square
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Tria, Rittenhouse Square', 'Net 30', NOW(), NOW());

  -- Create: Tribeca Wine Merchants
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Tribeca Wine Merchants', 'Net 30', NOW(), NOW());

  -- Create: Universal Discount Package Store
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Universal Discount Package Store', 'Net 30', NOW(), NOW());

  -- Create: Untable
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Untable', 'Net 30', NOW(), NOW());

  -- Create: Upland
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Upland', 'Net 30', NOW(), NOW());

  -- Create: Urban Wines and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Urban Wines and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Utah DABS
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Utah DABS', 'Net 30', NOW(), NOW());

  -- Create: VSI Samples
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'VSI Samples', 'Net 30', NOW(), NOW());

  -- Create: Vanessa Vega
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Vanessa Vega', 'Net 30', NOW(), NOW());

  -- Create: Venerdi INC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Venerdi INC', 'Net 30', NOW(), NOW());

  -- Create: Venture Studios
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Venture Studios', 'Net 30', NOW(), NOW());

  -- Create: Verdugo Vista LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Verdugo Vista LLC', 'Net 30', NOW(), NOW());

  -- Create: Veritas Distributors, Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Veritas Distributors, Inc.', 'Net 30', NOW(), NOW());

  -- Create: Village Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Village Wines', 'Net 30', NOW(), NOW());

  -- Create: Vine Box
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Vine Box', 'Net 30', NOW(), NOW());

  -- Create: Vinegar Hill House Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Vinegar Hill House Inc.', 'Net 30', NOW(), NOW());

  -- Create: Vineyard Fare
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Vineyard Fare', 'Net 30', NOW(), NOW());

  -- Create: Vinicola Wine Bar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Vinicola Wine Bar', 'Net 30', NOW(), NOW());

  -- Create: Vino Navigato
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Vino Navigato', 'Net 30', NOW(), NOW());

  -- Create: Vinport LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Vinport LLC', 'Net 30', NOW(), NOW());

  -- Create: Vins De Lieu
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Vins De Lieu', 'Net 30', NOW(), NOW());

  -- Create: Vintegrity Missouri
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Vintegrity Missouri', 'Net 30', NOW(), NOW());

  -- Create: W Hotel Times Square
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'W Hotel Times Square', 'Net 30', NOW(), NOW());

  -- Create: W4TH BUILDING SOCIETY LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'W4TH BUILDING SOCIETY LLC', 'Net 30', NOW(), NOW());

  -- Create: WINDY GATES SOHO INC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'WINDY GATES SOHO INC', 'Net 30', NOW(), NOW());

  -- Create: WWPalmetto LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'WWPalmetto LLC', 'Net 30', NOW(), NOW());

  -- Create: Warehouse Wines and Liquor
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Warehouse Wines and Liquor', 'Net 30', NOW(), NOW());

  -- Create: We Love to Drink LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'We Love to Drink LLC', 'Net 30', NOW(), NOW());

  -- Create: Well Crafted Wine & Beverage Co.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Well Crafted Wine & Beverage Co.', 'Net 30', NOW(), NOW());

  -- Create: West Harlem Vines Inc.
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'West Harlem Vines Inc.', 'Net 30', NOW(), NOW());

  -- Create: Westchester Wine Warehouse
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Westchester Wine Warehouse', 'Net 30', NOW(), NOW());

  -- Create: White Walker LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'White Walker LLC', 'Net 30', NOW(), NOW());

  -- Create: Whole Foods Wine Store Manhattan
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Whole Foods Wine Store Manhattan', 'Net 30', NOW(), NOW());

  -- Create: Wholesome Wine LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wholesome Wine LLC', 'Net 30', NOW(), NOW());

  -- Create: Whoopsie Daisy
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Whoopsie Daisy', 'Net 30', NOW(), NOW());

  -- Create: Why Nose LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Why Nose LLC', 'Net 30', NOW(), NOW());

  -- Create: Wild Wines
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wild Wines', 'Net 30', NOW(), NOW());

  -- Create: WildAir Cuatro Lobos Inc
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'WildAir Cuatro Lobos Inc', 'Net 30', NOW(), NOW());

  -- Create: Windsor Court Wine and Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Windsor Court Wine and Spirits', 'Net 30', NOW(), NOW());

  -- Create: Windsor Wine Merchants
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Windsor Wine Merchants', 'Net 30', NOW(), NOW());

  -- Create: Wine Dad's
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wine Dad''s', 'Net 30', NOW(), NOW());

  -- Create: Wine Hut Corp
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wine Hut Corp', 'Net 30', NOW(), NOW());

  -- Create: Wine Outlet Vienna
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wine Outlet Vienna', 'Net 30', NOW(), NOW());

  -- Create: Wine Stop Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wine Stop Spirits', 'Net 30', NOW(), NOW());

  -- Create: Wine Tasters of Larchmont
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wine Tasters of Larchmont', 'Net 30', NOW(), NOW());

  -- Create: Wine Therapy
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wine Therapy', 'Net 30', NOW(), NOW());

  -- Create: Wine Thief Madison
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wine Thief Madison', 'Net 30', NOW(), NOW());

  -- Create: Wine-O
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wine-O', 'Net 30', NOW(), NOW());

  -- Create: Wine.com
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wine.com', 'Net 30', NOW(), NOW());

  -- Create: Wines To Go
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wines To Go', 'Net 30', NOW(), NOW());

  -- Create: Witherspoon Wine & Spirits
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Witherspoon Wine & Spirits', 'Net 30', NOW(), NOW());

  -- Create: Wolf on Broadway LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Wolf on Broadway LLC', 'Net 30', NOW(), NOW());

  -- Create: Woodfire Collision LLC
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Woodfire Collision LLC', 'Net 30', NOW(), NOW());

  -- Create: Woodhul Wine Bar
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Woodhul Wine Bar', 'Net 30', NOW(), NOW());

  -- Create: Yara Salon
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Yara Salon', 'Net 30', NOW(), NOW());

  -- Create: You and Me Wines & Liquors
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'You and Me Wines & Liquors', 'Net 30', NOW(), NOW());

  -- Create: ZZs club New York
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'ZZs club New York', 'Net 30', NOW(), NOW());

  -- Create: Zahav
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Zahav', 'Net 30', NOW(), NOW());

  -- Create: Zimmi's New York
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'Zimmi''s New York', 'Net 30', NOW(), NOW());

  -- Create: central
  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), v_tenant_id, 'central', 'Net 30', NOW(), NOW());

END $$;

COMMIT;

-- Verify
SELECT COUNT(*) as customers_created FROM "Customer" WHERE "createdAt" > NOW() - INTERVAL '1 minute';

-- Expected: 626 new customers