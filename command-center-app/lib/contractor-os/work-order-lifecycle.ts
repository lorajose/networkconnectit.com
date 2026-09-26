import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type WorkOrderLifecycleDb = Pick<typeof prisma, "$queryRaw">;

export async function requireOpenWorkOrder(
  organizationId:string,
  workOrderId:string,
  db:WorkOrderLifecycleDb=prisma,
  lock=false,
){
 const rows=await db.$queryRaw<Array<{status:string}>>(lock
  ? Prisma.sql`SELECT status FROM ProjectWorkOrder WHERE id=${workOrderId} AND organizationId=${organizationId} LIMIT 1 FOR UPDATE`
  : Prisma.sql`SELECT status FROM ProjectWorkOrder WHERE id=${workOrderId} AND organizationId=${organizationId} LIMIT 1`);
 if(!rows[0])throw new Error("Work order not found");
 if(rows[0].status==="CLOSED")throw new Error("Closed work orders are immutable");
}
