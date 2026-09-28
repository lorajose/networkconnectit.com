ALTER TABLE FieldTechnicianProfile
  ADD COLUMN externalTechnicianId VARCHAR(128) NULL,
  ADD COLUMN licenseNumber VARCHAR(128) NULL;

CREATE UNIQUE INDEX FieldTechnicianProfile_org_external_id_key
  ON FieldTechnicianProfile (organizationId, externalTechnicianId);

CREATE UNIQUE INDEX FieldTechnicianProfile_org_license_key
  ON FieldTechnicianProfile (organizationId, licenseNumber);

CREATE INDEX FieldTechnicianProfile_org_email_idx
  ON FieldTechnicianProfile (organizationId, email);
