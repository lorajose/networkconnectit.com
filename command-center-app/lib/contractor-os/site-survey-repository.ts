import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";
import { checklistForDisciplines, type SurveyDiscipline } from "./site-survey";

export type SurveyAssignmentSummary = {
  id: string;
  organizationId: string;
  projectInstallationId: string;
  siteId: string;
  title: string;
  status: string;
  disciplinesJson: string;
  assignedToUserId: string | null;
  scheduledAt: Date | null;
  dueAt: Date | null;
  updatedAt: Date;
  projectName: string;
  siteName: string;
  technicianName: string | null;
};

function clean(value: string, label: string) {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required`);
  if (result.length > 191) throw new Error(`${label} is too long`);
  return result;
}

export async function listSurveyAssignments(actor: CommercialActor, requestedOrganizationId?: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<SurveyAssignmentSummary[]>(Prisma.sql`
    SELECT a.id,a.organizationId,a.projectInstallationId,a.siteId,a.title,a.status,
      a.disciplinesJson,a.assignedToUserId,a.scheduledAt,a.dueAt,a.updatedAt,
      p.name AS projectName,s.name AS siteName,u.name AS technicianName
    FROM SurveyAssignment a
    JOIN ProjectInstallation p ON p.id=a.projectInstallationId AND p.organizationId=a.organizationId
    JOIN Site s ON s.id=a.siteId AND s.organizationId=a.organizationId
    LEFT JOIN User u ON u.id=a.assignedToUserId AND u.organizationId=a.organizationId
    WHERE a.organizationId=${scope.organizationId}
    ORDER BY a.updatedAt DESC
  `);
}

export async function createSurveyAssignment(
  actor: CommercialActor,
  input: {
    organizationId: string;
    projectInstallationId: string;
    siteId: string;
    title: string;
    disciplines: SurveyDiscipline[];
    assignedToUserId?: string | null;
    assignedByUserId: string;
    instructions?: string | null;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  const projectRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT p.id FROM ProjectInstallation p
    JOIN ProjectSite ps ON ps.projectInstallationId=p.id AND ps.organizationId=p.organizationId
    WHERE p.id=${input.projectInstallationId} AND p.organizationId=${organizationId}
      AND ps.siteId=${input.siteId}
    LIMIT 1
  `);
  if (!projectRows[0]) throw new Error("Project/site relationship not found for this organization");

  if (input.assignedToUserId) {
    const users = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM User WHERE id=${input.assignedToUserId} AND organizationId=${organizationId} LIMIT 1
    `);
    if (!users[0]) throw new Error("Assigned technician is not a member of this organization");
  }

  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO SurveyAssignment
      (id,organizationId,projectInstallationId,siteId,title,status,disciplinesJson,
       assignedToUserId,assignedByUserId,instructions,createdAt,updatedAt)
    VALUES
      (${id},${organizationId},${input.projectInstallationId},${input.siteId},
       ${clean(input.title,"Survey title")},'ASSIGNED',${JSON.stringify(input.disciplines)},
       ${input.assignedToUserId ?? null},${input.assignedByUserId},
       ${input.instructions?.trim() || null},NOW(3),NOW(3))
  `);
  return id;
}

export async function startSurveySession(
  actor: CommercialActor,
  input: { organizationId: string; assignmentId: string; technicianUserId: string },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  const assignments = await prisma.$queryRaw<Array<{ disciplinesJson: string }>>(Prisma.sql`
    SELECT disciplinesJson FROM SurveyAssignment
    WHERE id=${input.assignmentId} AND organizationId=${organizationId} LIMIT 1
  `);
  const assignment = assignments[0];
  if (!assignment) throw new Error("Survey assignment not found");
  const disciplines = JSON.parse(assignment.disciplinesJson) as SurveyDiscipline[];
  const checklist = checklistForDisciplines(disciplines);
  const id = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO SurveySession
        (id,organizationId,assignmentId,technicianUserId,status,checklistSnapshotJson,startedAt,createdAt,updatedAt)
      VALUES
        (${id},${organizationId},${input.assignmentId},${input.technicianUserId},
         'IN_PROGRESS',${JSON.stringify(checklist)},NOW(3),NOW(3),NOW(3))
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE SurveyAssignment SET status='IN_PROGRESS',updatedAt=NOW(3)
      WHERE id=${input.assignmentId} AND organizationId=${organizationId}
    `);
  });
  return id;
}
