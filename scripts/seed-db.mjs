import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedRoles() {
  const roles = [
    { name: "admin", description: "Administrative operations and system control" },
    { name: "management", description: "Executive analytics and reporting" },
    { name: "lecturer", description: "Instruction, grading, and course operations" },
    { name: "inmate", description: "Learner access role" },
    { name: "clocking_officer", description: "Facility access and clock-in supervision" },
  ];

  const map = new Map();
  for (const role of roles) {
    const saved = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
    map.set(role.name, saved);
  }
  return map;
}

async function upsertUser(roleId, username, passwordHash) {
  return prisma.user.upsert({
    where: { username },
    update: {
      roleId,
      passwordHash,
      status: "active",
    },
    create: {
      roleId,
      username,
      passwordHash,
      status: "active",
    },
  });
}

async function main() {
  const roleMap = await seedRoles();
  const passwordHash = await argon2.hash("Prison1234", {
    type: argon2.argon2id,
    memoryCost: 64 * 1024,
    timeCost: 3,
    parallelism: 1,
  });

  const adminUser = await upsertUser(roleMap.get("admin").id, "admin", passwordHash);
  const managerUser = await upsertUser(roleMap.get("management").id, "manager", passwordHash);
  const lecturerUser = await upsertUser(roleMap.get("lecturer").id, "lecturer", passwordHash);
  const officerUser = await upsertUser(roleMap.get("clocking_officer").id, "officer", passwordHash);
  const inmateUser = await upsertUser(roleMap.get("inmate").id, "GP-10234", passwordHash);

  await prisma.staffProfile.upsert({
    where: { userId: adminUser.id },
    update: { fullName: "Admin Officer", staffType: "admin", staffCode: "STF-ADMIN-001" },
    create: { userId: adminUser.id, fullName: "Admin Officer", staffType: "admin", staffCode: "STF-ADMIN-001" },
  });

  await prisma.staffProfile.upsert({
    where: { userId: managerUser.id },
    update: { fullName: "Command Staff", staffType: "management", staffCode: "STF-MGMT-001" },
    create: { userId: managerUser.id, fullName: "Command Staff", staffType: "management", staffCode: "STF-MGMT-001" },
  });

  const lecturer = await prisma.staffProfile.upsert({
    where: { userId: lecturerUser.id },
    update: { fullName: "Samuel Appiah", staffType: "lecturer", staffCode: "STF-LECT-001" },
    create: { userId: lecturerUser.id, fullName: "Samuel Appiah", staffType: "lecturer", staffCode: "STF-LECT-001" },
  });

  const officer = await prisma.staffProfile.upsert({
    where: { userId: officerUser.id },
    update: { fullName: "Clocking Officer", staffType: "clocking_officer", staffCode: "STF-OFF-001" },
    create: { userId: officerUser.id, fullName: "Clocking Officer", staffType: "clocking_officer", staffCode: "STF-OFF-001" },
  });

  const inmate = await prisma.inmateProfile.upsert({
    where: { userId: inmateUser.id },
    update: {
      studentId: "GP-10234",
      prisonNumber: "GTE-10234",
      fullName: "John Mensah",
      gender: "Male",
      assignedPrison: "Nsawam",
      blockAssignment: "Block C",
      educationBackground: "Senior High",
      skillInterests: ["Basic Computer", "Entrepreneurship"],
      biometricStatus: "Enrolled",
    },
    create: {
      userId: inmateUser.id,
      studentId: "GP-10234",
      prisonNumber: "GTE-10234",
      fullName: "John Mensah",
      dateOfBirth: new Date("1996-03-24"),
      gender: "Male",
      assignedPrison: "Nsawam",
      blockAssignment: "Block C",
      educationBackground: "Senior High",
      skillInterests: ["Basic Computer", "Entrepreneurship"],
      biometricStatus: "Enrolled",
    },
  });

  await prisma.biometricEnrollment.upsert({
    where: { inmateId: inmate.id },
    update: {
      strictMode: false,
      deviceBiometricSupported: false,
      mode: "fallback",
    },
    create: {
      inmateId: inmate.id,
      faceCapturedAt: new Date(),
      fingerprintCapturedAt: new Date(),
      strictMode: false,
      deviceBiometricSupported: false,
      mode: "fallback",
    },
  });

  const category = await prisma.courseCategory.upsert({
    where: { name: "IT & Digital Skills" },
    update: { description: "Core digital literacy and practical tools" },
    create: { name: "IT & Digital Skills", description: "Core digital literacy and practical tools" },
  });

  const course = await prisma.course.upsert({
    where: { courseCode: "C-001" },
    update: {
      title: "Basic Computer Skills",
      categoryId: category.id,
      lecturerStaffId: lecturer.id,
      status: "active",
      level: "Beginner",
      durationWeeks: 6,
    },
    create: {
      courseCode: "C-001",
      title: "Basic Computer Skills",
      description: "Digital foundations for literacy, productivity, and safe online usage.",
      categoryId: category.id,
      lecturerStaffId: lecturer.id,
      status: "active",
      level: "Beginner",
      durationWeeks: 6,
    },
  });

  await prisma.courseEnrollment.upsert({
    where: {
      inmateId_courseId: {
        inmateId: inmate.id,
        courseId: course.id,
      },
    },
    update: {
      completionPct: 68,
      completionStatus: "in_progress",
      timeSpentMinutes: 540,
      lessonsCompleted: 12,
      assessmentsTaken: 3,
      latestScore: 74,
      lastActivityAt: new Date(),
    },
    create: {
      inmateId: inmate.id,
      courseId: course.id,
      completionPct: 68,
      completionStatus: "in_progress",
      timeSpentMinutes: 540,
      lessonsCompleted: 12,
      assessmentsTaken: 3,
      latestScore: 74,
      lastActivityAt: new Date(),
    },
  });

  const hall = await prisma.hallRoom.upsert({
    where: {
      name_location: {
        name: "Hall A - ICT Lab",
        location: "Block 1",
      },
    },
    update: { roomType: "ICT" },
    create: {
      name: "Hall A - ICT Lab",
      location: "Block 1",
      roomType: "ICT",
    },
  });

  const device = await prisma.device.upsert({
    where: { serialId: "GH-TRB-2024-001" },
    update: {
      deviceType: "Tablet",
      status: "available",
    },
    create: {
      serialId: "GH-TRB-2024-001",
      deviceType: "Tablet",
      status: "available",
    },
  });

  const existingSession = await prisma.clockinSession.findFirst({
    where: {
      inmateId: inmate.id,
      roomId: hall.id,
      deviceId: device.id,
    },
  });

  if (!existingSession) {
    await prisma.clockinSession.create({
      data: {
        inmateId: inmate.id,
        officerStaffId: officer.id,
        roomId: hall.id,
        deviceId: device.id,
        biometricMethod: "fingerprint",
        biometricProof: "simulated",
        sessionStatus: "closed",
        clockInAt: new Date(Date.now() - 60 * 60 * 1000),
        clockOutAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });
  }

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
