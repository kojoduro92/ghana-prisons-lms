ALTER TABLE `assignments`
  ADD COLUMN `attachmentFileName` VARCHAR(191) NULL,
  ADD COLUMN `attachmentMimeType` VARCHAR(191) NULL,
  ADD COLUMN `attachmentSizeBytes` INTEGER NULL,
  ADD COLUMN `attachmentPath` VARCHAR(191) NULL;

CREATE TABLE `course_materials` (
  `id` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileSizeBytes` INTEGER NOT NULL,
  `storagePath` VARCHAR(191) NOT NULL,
  `uploadedByName` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `course_materials_courseId_createdAt_idx`(`courseId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `course_materials`
  ADD CONSTRAINT `course_materials_courseId_fkey`
  FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
