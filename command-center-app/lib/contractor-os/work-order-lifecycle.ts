import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function requireOpenWorkOrder(organizationId:string,workOrderId:string){
 const rows=await prisma.$queryRaw<Array<{status:string}>>(Prisma.sql`SELECT status FROM ProjectWorkOrder WHERE id=${workOrderId} AND organizationId=${organizationId} LIMIT 1`);
 if(!rows[0])throw new Error("Work order not found");
 if(rows[0].status==="CLOSED")throw new Error("Closed work orders are immutable");
}
