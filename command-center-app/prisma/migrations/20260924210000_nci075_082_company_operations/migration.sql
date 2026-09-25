ALTER TABLE FieldTechnicianProfile
  ADD COLUMN workerType VARCHAR(16) NOT NULL DEFAULT '1099',
  ADD COLUMN email VARCHAR(255) NULL,
  ADD COLUMN phone VARCHAR(64) NULL,
  ADD COLUMN skillsJson LONGTEXT NULL,
  ADD COLUMN certificationsJson LONGTEXT NULL,
  ADD COLUMN hourlyPayRate DECIMAL(12,2) NULL,
  ADD COLUMN overtimeMultiplier DECIMAL(6,3) NOT NULL DEFAULT 1.500,
  ADD COLUMN availabilityStatus VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN notes TEXT NULL;

CREATE TABLE OperationsScheduleEntry (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  technicianProfileId VARCHAR(191) NOT NULL,
  projectInstallationId VARCHAR(191) NULL,
  workOrderId VARCHAR(191) NULL,
  entryType VARCHAR(32) NOT NULL DEFAULT 'ASSIGNMENT',
  title VARCHAR(255) NOT NULL,
  startsAt DATETIME(3) NOT NULL,
  endsAt DATETIME(3) NOT NULL,
  timeZone VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
  status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX OperationsScheduleEntry_org_time_idx (organizationId, startsAt, endsAt),
  INDEX OperationsScheduleEntry_tech_time_idx (organizationId, technicianProfileId, startsAt),
  INDEX OperationsScheduleEntry_project_idx (organizationId, projectInstallationId, startsAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE OperationsTimeEntry (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  technicianProfileId VARCHAR(191) NOT NULL,
  projectInstallationId VARCHAR(191) NULL,
  workOrderId VARCHAR(191) NULL,
  workDate DATE NOT NULL,
  regularHours DECIMAL(8,2) NOT NULL DEFAULT 0,
  overtimeHours DECIMAL(8,2) NOT NULL DEFAULT 0,
  hourlyPayRateSnapshot DECIMAL(12,2) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  notes TEXT NULL,
  approvedByUserId VARCHAR(191) NULL,
  approvedAt DATETIME(3) NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX OperationsTimeEntry_org_date_idx (organizationId, workDate, status),
  INDEX OperationsTimeEntry_tech_date_idx (organizationId, technicianProfileId, workDate),
  INDEX OperationsTimeEntry_project_idx (organizationId, projectInstallationId, workDate)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE OperationsInvoice (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  projectInstallationId VARCHAR(191) NULL,
  workOrderId VARCHAR(191) NULL,
  invoiceNumber VARCHAR(64) NOT NULL,
  customerName VARCHAR(255) NOT NULL,
  customerEmail VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  issueDate DATE NULL,
  dueDate DATE NULL,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  taxAmount DECIMAL(14,2) NOT NULL DEFAULT 0,
  discountAmount DECIMAL(14,2) NOT NULL DEFAULT 0,
  totalAmount DECIMAL(14,2) NOT NULL DEFAULT 0,
  paidAmount DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX OperationsInvoice_number_key (organizationId, invoiceNumber),
  INDEX OperationsInvoice_org_status_idx (organizationId, status, dueDate),
  INDEX OperationsInvoice_project_idx (organizationId, projectInstallationId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE OperationsInvoiceLine (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  invoiceId VARCHAR(191) NOT NULL,
  lineType VARCHAR(32) NOT NULL DEFAULT 'SERVICE',
  description VARCHAR(512) NOT NULL,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  unitPrice DECIMAL(14,2) NOT NULL DEFAULT 0,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  sortOrder INT NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX OperationsInvoiceLine_invoice_idx (organizationId, invoiceId, sortOrder)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE OperationsPayment (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  invoiceId VARCHAR(191) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  paidAt DATETIME(3) NOT NULL,
  method VARCHAR(32) NULL,
  reference VARCHAR(191) NULL,
  notes TEXT NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX OperationsPayment_invoice_idx (organizationId, invoiceId, paidAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE OperationsExpense (
  id VARCHAR(191) NOT NULL,
  organizationId VARCHAR(191) NOT NULL,
  projectInstallationId VARCHAR(191) NULL,
  workOrderId VARCHAR(191) NULL,
  technicianProfileId VARCHAR(191) NULL,
  category VARCHAR(64) NOT NULL,
  vendor VARCHAR(255) NULL,
  description VARCHAR(512) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  expenseDate DATE NOT NULL,
  reimbursable BOOLEAN NOT NULL DEFAULT FALSE,
  reimbursementStatus VARCHAR(32) NULL,
  receiptStorageKey VARCHAR(512) NULL,
  createdByUserId VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX OperationsExpense_org_date_idx (organizationId, expenseDate),
  INDEX OperationsExpense_project_idx (organizationId, projectInstallationId, expenseDate),
  INDEX OperationsExpense_tech_idx (organizationId, technicianProfileId, expenseDate)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;