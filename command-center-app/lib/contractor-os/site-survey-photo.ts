import { createHash, randomUUID } from "node:crypto";
import { basename, extname } from "node:path";

const MIME_TYPES = ["image/jpeg","image/png","image/webp"] as const;
export type SurveyPhotoMimeType=(typeof MIME_TYPES)[number];
const MAX_BYTES=25*1024*1024;

function detect(bytes:Uint8Array):SurveyPhotoMimeType|null{
  if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "image/jpeg";
  if(bytes.length>=8&&[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i)=>bytes[i]===v))return "image/png";
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return "image/webp";
  return null;
}

export function validateSurveyPhoto(input:{fileName:string;mimeType:string;bytes:Uint8Array}){
  const originalName=basename(input.fileName.trim());
  if(!originalName||originalName.length>255)throw new Error("Invalid survey photo name");
  if(!input.bytes.byteLength||input.bytes.byteLength>MAX_BYTES)throw new Error("Survey photo is empty or exceeds 25 MB");
  const mimeType=detect(input.bytes);
  if(!mimeType||mimeType!==input.mimeType.toLowerCase()||!MIME_TYPES.includes(mimeType))throw new Error("Survey photo type does not match its content");
  const extension=mimeType==="image/jpeg"?".jpg":mimeType==="image/png"?".png":".webp";
  const supplied=extname(originalName).toLowerCase();
  if(!(mimeType==="image/jpeg"?[".jpg",".jpeg"].includes(supplied):supplied===extension))throw new Error("Survey photo extension does not match its content");
  return {assetId:randomUUID(),originalName,mimeType,byteSize:input.bytes.byteLength,sha256:createHash("sha256").update(input.bytes).digest("hex"),extension};
}

export function surveyPhotoStorageKey(organizationId:string,sessionId:string,assetId:string,extension:string){
  for(const [label,value] of [["organization",organizationId],["session",sessionId],["asset",assetId]] as const)if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error(`Invalid ${label} identifier for storage`);
  if(![".jpg",".png",".webp"].includes(extension))throw new Error("Invalid survey photo extension");
  return `site-surveys/${organizationId}/${sessionId}/photos/${assetId}${extension}`;
}
