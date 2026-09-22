import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPrivateDesignAsset } from "@/lib/contractor-os/private-design-storage";
import { requireAssignedTechnicianAccess } from "@/lib/contractor-os/field-technician-access";

export const dynamic="force-dynamic";

export async function GET(_:Request,{params}:{params:{assetId:string}}){
 const user=await requireUser();
 const rows=await prisma.$queryRaw<Array<{storageKey:string;mimeType:string;organizationId:string;sessionId:string}>>(Prisma.sql`SELECT storageKey,mimeType,organizationId,sessionId FROM SurveyAsset WHERE id=${params.assetId} LIMIT 1`);
 const asset=rows[0];if(!asset)return new NextResponse("Not found",{status:404});
 if(user.role==="CLIENT_ADMIN"){if(user.organizationId!==asset.organizationId)return new NextResponse("Not found",{status:404});}
 else if(user.role==="VIEWER"){try{await requireAssignedTechnicianAccess({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId:asset.organizationId,sessionId:asset.sessionId,scope:"SURVEY"});}catch{return new NextResponse("Not found",{status:404});}}
 else if(user.role!=="SUPER_ADMIN"&&user.role!=="INTERNAL_ADMIN")return new NextResponse("Not found",{status:404});
 const bytes=await readPrivateDesignAsset(asset.storageKey);
 return new NextResponse(bytes,{headers:{"Content-Type":asset.mimeType,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
