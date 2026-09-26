"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export function CloseoutReportToolbar({backHref}:{backHref:string}){return <div className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 shadow-sm backdrop-blur print:hidden"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Project Closeout Package</p><p className="text-xs text-muted-foreground">Print or save this immutable package as PDF.</p></div><div className="flex gap-2"><Button variant="outline" asChild><Link href={backHref}>Back to project</Link></Button><Button onClick={()=>window.print()}>Print / Save PDF</Button></div></div></div>}
