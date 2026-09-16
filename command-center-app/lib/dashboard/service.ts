import {
  AlertStatus,
  DeviceStatus,
  DeviceType,
  Prisma
} from "@prisma/client";

import { prisma } from "@/lib/db";
import type {
  DashboardSnapshot,
  DeviceDistributionItem,
  FilterToken,
  SiteHealthRow,
  StatusOverviewItem
} from "@/lib/dashboard/types";
import { getRecentAlertsTableRows } from "@/lib/management/alerts";
import { getOrganizationName } from "@/lib/management/organizations";
import { getScopedSiteMonitoringDataset } from "@/lib/management/health";
import {
  getScopedOrganizationWhere,
  getScopedRecordWhere
} from "@/lib/management/tenant";
import { isCommandCenterAdminRole, type AppRole } from "@/lib/rbac";

type DashboardUser = {
  role: AppRole;
  organizationId: string | null;
  projectInstallationId?: string | null;
  projectName?: string | null;
};

const deviceDistributionTones: Record<DeviceType, DeviceDistributionItem["tone"]> = {
  CAMERA: "cyan", NVR: "critical", SWITCH: "healthy", ROUTER: "neutral", ACCESS_POINT: "cyan",
  ACCESS_CONTROL: "warning", SENSOR: "healthy", SERVER: "neutral", OTHER: "warning"
};

function formatMetricValue(value: number) { return value.toLocaleString("en-US"); }
function buildDashboardFilters(user: DashboardUser, organizationName?: string | null): FilterToken[] {
  return [{ id:"scope",label:"Scope",value:isCommandCenterAdminRole(user.role)?"Global operations":organizationName??"Assigned organization" },
    ...(user.projectName?[{id:"project",label:"Project",value:user.projectName}]:[]),
    {id:"source",label:"Data source",value:"Prisma + MySQL"},{id:"alerts",label:"Alert scope",value:"Open + acknowledged"}];
}
function statusPriority(row: SiteHealthRow){switch(row.health){case"critical":return 0;case"warning":return 1;case"unknown":return 2;case"healthy":return 3;case"info":return 4;}}
function sortSiteHealthRows(rows:SiteHealthRow[]){return[...rows].sort((l,r)=>{const d=statusPriority(l)-statusPriority(r);return d!==0?d:l.site.localeCompare(r.site);});}
function summarizeSiteHealth(rows: SiteHealthRow[]) {
  return rows.reduce((summary,row)=>{if(row.health==="healthy")summary.healthySites++;else if(row.health==="warning")summary.warningSites++;else if(row.health==="critical")summary.criticalSites++;summary.unknownDevices+=row.unknownCount ?? 0;return summary;},{healthySites:0,warningSites:0,criticalSites:0,unknownDevices:0});
}
function buildMapCenter(coordinates:Array<[number,number]>,fallback:[number,number]):[number,number]{if(!coordinates.length)return fallback;const sums=coordinates.reduce((a,c)=>[a[0]+c[0],a[1]+c[1]],[0,0]);return[sums[0]/coordinates.length,sums[1]/coordinates.length];}
function getScopedDashboardSiteWhere(user:DashboardUser):Prisma.SiteWhereInput{return{...getScopedRecordWhere(user),...(user.projectInstallationId?{projectSites:{some:{projectInstallationId:user.projectInstallationId}}}:{})};}
function getScopedDashboardDeviceWhere(user:DashboardUser):Prisma.DeviceWhereInput{return{...getScopedRecordWhere(user),...(user.projectInstallationId?{projectInstallationId:user.projectInstallationId}:{})};}
function getScopedDashboardAlertWhere(user:DashboardUser):Prisma.AlertWhereInput{return{...getScopedRecordWhere(user),...(user.projectInstallationId?{OR:[{device:{is:{projectInstallationId:user.projectInstallationId}}},{site:{is:{projectSites:{some:{projectInstallationId:user.projectInstallationId}}}}}]}:{})};}
async function getScopedDashboardCounts(user:DashboardUser){const organizationWhere:Prisma.OrganizationWhereInput=user.projectInstallationId?{AND:[getScopedOrganizationWhere(user),{projectInstallations:{some:{id:user.projectInstallationId}}}]}:getScopedOrganizationWhere(user);const siteWhere=getScopedDashboardSiteWhere(user),deviceWhere=getScopedDashboardDeviceWhere(user),alertWhere=getScopedDashboardAlertWhere(user);const[organizationCount,siteCount,deviceCount,devicesOnline,devicesOffline,activeAlerts]=await prisma.$transaction([prisma.organization.count({where:organizationWhere}),prisma.site.count({where:siteWhere}),prisma.device.count({where:deviceWhere}),prisma.device.count({where:{...deviceWhere,status:DeviceStatus.ONLINE}}),prisma.device.count({where:{...deviceWhere,status:DeviceStatus.OFFLINE}}),prisma.alert.count({where:{...alertWhere,status:{in:[AlertStatus.OPEN,AlertStatus.ACKNOWLEDGED]}}})]);return{organizationCount,siteCount,deviceCount,devicesOnline,devicesOffline,activeAlerts};}
async function getDeviceDistribution(user:DashboardUser){const counts=await prisma.device.groupBy({by:["type"],where:getScopedDashboardDeviceWhere(user),_count:{_all:true},orderBy:{_count:{type:"desc"}}});const total=counts.reduce((t,i)=>t+i._count._all,0);return counts.map(i=>({id:`distribution-${i.type.toLowerCase()}`,label:i.type.toLowerCase().split("_").map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(" "),count:i._count._all,share:total?Math.round(i._count._all/total*100):0,tone:deviceDistributionTones[i.type]}));}
function buildStatusOverview(healthySites:number,warningSites:number,criticalSites:number,unknownDevices:number,openAlerts:number):StatusOverviewItem[]{return[
{id:"status-healthy-sites",label:"Healthy sites",value:formatMetricValue(healthySites),helper:"Sites within normal monitoring thresholds.",tone:"healthy"},
{id:"status-warning-sites",label:"Warning sites",value:formatMetricValue(warningSites),helper:"Sites with degraded device posture or pending review.",tone:"warning"},
{id:"status-critical-sites",label:"Critical sites",value:formatMetricValue(criticalSites),helper:"Sites with at least one critical device condition.",tone:"critical"},
{id:"status-unknown-devices",label:"Unknown devices",value:formatMetricValue(unknownDevices),helper:"Devices missing a recent or conclusive health state.",tone:"unknown"},
{id:"status-open-alerts",label:"Open alerts",value:formatMetricValue(openAlerts),helper:"Open or acknowledged alerts in the current scope.",tone:"info"}]}

async function buildViewerSnapshot(user:DashboardUser):Promise<DashboardSnapshot>{const[counts,organizationName,alerts,siteDataset,deviceDistribution]=await Promise.all([getScopedDashboardCounts(user),getOrganizationName(user),getRecentAlertsTableRows(user,6,{projectInstallationId:user.projectInstallationId??undefined}),getScopedSiteMonitoringDataset(user,{projectInstallationId:user.projectInstallationId??undefined}),getDeviceDistribution(user)]);const rows=sortSiteHealthRows(siteDataset.rows),health=summarizeSiteHealth(rows),filters=buildDashboardFilters(user,organizationName);return{variant:"viewer",title:"Organization Operations Dashboard",subtitle:"Unified visibility for your sites, devices, and infrastructure worldwide.",organizationName:organizationName??"Assigned organization",breadcrumbs:[{label:"Command Center"},{label:"Dashboard"}],metrics:[{id:"metric-organization",label:"Organization",value:organizationName??"Assigned organization",helper:"Read-only operations view for your assigned organization.",icon:"organization",tone:"cyan"},{id:"metric-sites",label:"Total sites",value:formatMetricValue(counts.siteCount),helper:"Accessible operating locations in this portal.",icon:"sites",tone:"neutral"},{id:"metric-devices",label:"Total devices",value:formatMetricValue(counts.deviceCount),helper:"Visible endpoints across your monitored locations.",icon:"devices",tone:"neutral"},{id:"metric-online",label:"Devices online",value:formatMetricValue(counts.devicesOnline),helper:"Devices responding within the latest health window.",icon:"online",tone:"healthy"},{id:"metric-alerts",label:"Active alerts",value:formatMetricValue(counts.activeAlerts),helper:"Open or acknowledged issues affecting your organization.",icon:"alerts",tone:"warning"}],statusOverview:buildStatusOverview(health.healthySites,health.warningSites,health.criticalSites,health.unknownDevices,counts.activeAlerts),filters,map:{title:"Site Visibility",description:"Current monitored locations and health posture for your organization.",size:"compact",center:buildMapCenter(siteDataset.mapSites.map(s=>s.coordinates),[39.5,-98.35]),zoom:siteDataset.mapSites.length?3:2,sites:siteDataset.mapSites},recentAlerts:{title:"Recent Alerts",description:"Latest alert activity affecting your organization.",rows:alerts},siteHealth:{title:"Site Summary",description:"Current site availability across your visible locations.",rows:rows.slice(0,8),compact:true},deviceDistribution:{title:"Device Distribution",description:"Current device mix across your monitored estate.",items:deviceDistribution}};}
async function buildSuperAdminSnapshot(user:DashboardUser):Promise<DashboardSnapshot>{const[counts,alerts,siteDataset,deviceDistribution]=await Promise.all([getScopedDashboardCounts(user),getRecentAlertsTableRows(user,8,{projectInstallationId:user.projectInstallationId??undefined}),getScopedSiteMonitoringDataset(user,{projectInstallationId:user.projectInstallationId??undefined}),getDeviceDistribution(user)]);const rows=sortSiteHealthRows(siteDataset.rows),health=summarizeSiteHealth(rows),filters=buildDashboardFilters(user);return{variant:"super-admin",title:"Global Operations Dashboard",subtitle:"Unified visibility for client sites, devices, and infrastructure worldwide.",breadcrumbs:[{label:"Command Center"},{label:"Dashboard"}],metrics:[{id:"metric-organizations",label:"Total organizations",value:formatMetricValue(counts.organizationCount),helper:"Active client and internal operating entities.",icon:"organizations",tone:"cyan"},{id:"metric-sites",label:"Total sites",value:formatMetricValue(counts.siteCount),helper:"Worldwide sites currently reporting into the command view.",icon:"sites",tone:"neutral"},{id:"metric-devices",label:"Total devices",value:formatMetricValue(counts.deviceCount),helper:"Connected field and infrastructure endpoints.",icon:"devices",tone:"neutral"},{id:"metric-online",label:"Devices online",value:formatMetricValue(counts.devicesOnline),helper:"Devices responding within the latest health window.",icon:"online",tone:"healthy"},{id:"metric-offline",label:"Devices offline",value:formatMetricValue(counts.devicesOffline),helper:"Endpoints requiring review, dispatch, or remote recovery.",icon:"offline",tone:"critical"},{id:"metric-alerts",label:"Active alerts",value:formatMetricValue(counts.activeAlerts),helper:"Open or acknowledged events across all monitored clients.",icon:"alerts",tone:"warning"}],statusOverview:buildStatusOverview(health.healthySites,health.warningSites,health.criticalSites,health.unknownDevices,counts.activeAlerts),filters,map:{title:"Global Site Visibility",description:"Operational geography for active customer and partner sites in the current command view.",size:"large",center:buildMapCenter(siteDataset.mapSites.map(s=>s.coordinates),[23,9]),zoom:siteDataset.mapSites.length?2:1,sites:siteDataset.mapSites},recentAlerts:{title:"Recent Alerts",description:"Latest alert activity prioritized for operational review.",rows:alerts},siteHealth:{title:"Site Health Summary",description:"Current device availability and last health-check window by site.",rows:rows.slice(0,10)},deviceDistribution:{title:"Device Distribution",description:"Command-level device mix across camera, network, and control infrastructure.",items:deviceDistribution}};}
export async function getDashboardSnapshot(user:DashboardUser):Promise<DashboardSnapshot>{return isCommandCenterAdminRole(user.role)?buildSuperAdminSnapshot(user):buildViewerSnapshot(user);}

// Compatibility entry points used by the protected dashboard routes. Keeping the
// authorization-aware service surface explicit prevents route code from reaching
// into the internal snapshot builders.
export async function getDashboardSnapshotForUser(user: DashboardUser): Promise<DashboardSnapshot> {
  return getDashboardSnapshot(user);
}

export async function getViewerPortalSnapshotForUser(user: DashboardUser): Promise<DashboardSnapshot> {
  return buildViewerSnapshot(user);
}
