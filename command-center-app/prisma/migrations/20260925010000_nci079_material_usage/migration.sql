ALTER TABLE OperationsExpense
  ADD COLUMN materialQuantityPurchased DECIMAL(12,3) NULL AFTER reimbursementStatus,
  ADD COLUMN materialQuantityUsed DECIMAL(12,3) NULL AFTER materialQuantityPurchased,
  ADD COLUMN materialUnit VARCHAR(32) NULL AFTER materialQuantityUsed;

ALTER TABLE OperationsExpense
  ADD CONSTRAINT OperationsExpense_material_quantity_chk
  CHECK (
    (category <> 'MATERIALS' AND materialQuantityPurchased IS NULL AND materialQuantityUsed IS NULL AND materialUnit IS NULL)
    OR
    (category = 'MATERIALS'
      AND materialQuantityPurchased IS NOT NULL
      AND materialQuantityUsed IS NOT NULL
      AND materialUnit IS NOT NULL
      AND materialQuantityPurchased > 0
      AND materialQuantityUsed >= 0
      AND materialQuantityUsed <= materialQuantityPurchased)
  );
