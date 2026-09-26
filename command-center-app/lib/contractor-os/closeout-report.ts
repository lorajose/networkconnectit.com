import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";

export async function getCloseoutReport(actor:CommercialActor,input:{organizationId:string;packageId:string}){
 const organizationId=input.organizationId.trim();if(actor.role==="CLIENT_ADMIN"||actor.role==="VIEWER"){if(actor.organizationId!==organizationId)throw new Error("Cross-tenant closeout report read denied");}
 const rows=await prisma.$queryRaw<Array<{id:string;projectInstallationId:string;surveySessionId:string;workOrderId:string;packageVersion:number;status:string;manifestJson:string;manifestHash:string;generatedAt:Date}>>(Prisma.sql`SELECT id,projectInstallationId,surveySessionId,workOrderId,packageVersion,status,manifestJson,manifestHash,generatedAt FROM ProjectCloseoutPackage WHERE id=${input.packageId} AND organizationId=${organizationId} LIMIT 1`);const pkg=rows[0];if(!pkg)return null;
 const project=(await prisma.$queryRaw<Array<{projectName:string;projectCode:string|null;siteName:string|null;organizationName:string;logoUrl:string|null;brandTagline:string|null}>>(Prisma.sql`SELECT p.name projectName,p.projectCode,s.name siteName,o.name organizationName,o.logoUrl,o.brandTagline FROM ProjectInstallation p JOIN Organization o ON o.id=p.organizationId LEFT JOIN Site s ON s.id=p.primarySiteId AND s.organizationId=p.organizationId WHERE p.id=${pkg.projectInstallationId} AND p.organizationId=${organizationId} LIMIT 1`))[0];if(!project)throw new Error("Closeout project not found");let manifest:unknown;try{manifest=JSON.parse(pkg.manifestJson);}catch{throw new Error("Closeout manifest is invalid");}return {...pkg,...project,manifest};
}
