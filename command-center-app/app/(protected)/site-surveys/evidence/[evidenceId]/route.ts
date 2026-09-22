import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPrivateDesignAsset } from "@/lib/contractor-os/private-design-storage";
import { requireAssignedTechnicianAccess } from "@/lib/contractor-os/field-technician-access";

export const dynamic="force-dynamic";

export async function GET(_:Request,{params}:{params:{evidenceId:string}}){
 const user=await requireUser();
 const rows=await prisma.$queryRaw<Array<{storageKey:string;mimeType:string;organizationId:string;workOrderId:string;surveySessionId:string}>>(Prisma.sql`SELECT e.storageKey,e.mimeType,e.organizationId,e.workOrderId,w.surveySessionId FROM ProjectWorkOrderEvidence e JOIN ProjectWorkOrder w ON w.id=e.workOrderId AND w.organizationId=e.organizationId WHERE e.id=${params.evidenceId} LIMIT 1`);
 const evidence=rows[0];if(!evidence)return new NextResponse("Not found",{status:404});
 if(user.role==="CLIENT_ADMIN"){if(user.organizationId!==evidence.organizationId)return new NextResponse("Not found",{status:404});}
 else if(user.role==="VIEWER"){try{await requireAssignedTechnicianAccess({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId:evidence.organizationId,sessionId:evidence.surveySessionId,workOrderId:evidence.workOrderId,scope:"WORK_ORDER"});}catch{return new NextResponse("Not found",{status:404});}}
 else if(user.role!=="SUPER_ADMIN"&&user.role!=="INTERNAL_ADMIN")return new NextResponse("Not found",{status:404});
 const bytes=await readPrivateDesignAsset(evidence.storageKey);
 return new NextResponse(bytes,{headers:{"Content-Type":evidence.mimeType,"Cache-Control":"private, no-store","Content-Disposition":"inline","X-Content-Type-Options":"nosniff"}});
}
