ALTER TABLE `inmate_profiles`
    ADD COLUMN `warrantName` VARCHAR(191) NULL,
    ADD COLUMN `warrantSerialNumber` VARCHAR(191) NULL,
    ADD COLUMN `station` VARCHAR(191) NULL,
    ADD COLUMN `blockName` VARCHAR(191) NULL,
    ADD COLUMN `cellNumber` VARCHAR(191) NULL,
    ADD COLUMN `offense` VARCHAR(191) NULL,
    ADD COLUMN `sentence` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `inmate_profiles_warrantSerialNumber_key` ON `inmate_profiles`(`warrantSerialNumber`);
