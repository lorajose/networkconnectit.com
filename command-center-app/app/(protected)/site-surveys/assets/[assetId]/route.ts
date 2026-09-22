import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPrivateDesignAsset } from "@/lib/contractor-os/private-design-storage";
import { routeAccess } from "@/lib/rbac";

export const dynamic="force-dynamic";

export async function GET(_:Request,{params}:{params:{assetId:string}}){
 const user=await requireRoles(routeAccess.siteSurveys);
 const rows=await prisma.$queryRaw<Array<{storageKey:string;mimeType:string;organizationId:string}>>(Prisma.sql`SELECT storageKey,mimeType,organizationId FROM SurveyAsset WHERE id=${params.assetId} LIMIT 1`);
 const asset=rows[0];if(!asset)return new NextResponse("Not found",{status:404});
 if((user.role==="CLIENT_ADMIN"||user.role==="VIEWER")&&user.organizationId!==asset.organizationId)return new NextResponse("Not found",{status:404});
 const bytes=await readPrivateDesignAsset(asset.storageKey);
 return new NextResponse(bytes,{headers:{"Content-Type":asset.mimeType,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
