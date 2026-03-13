import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone
} from "lucide-react";

import {
  withAppBasePath,
  withMarketingSiteUrl
} from "@/lib/app-paths";

const primaryNavigation = [
  { label: "Home", href: withMarketingSiteUrl("/index.html") },
  { label: "About", href: withMarketingSiteUrl("/about.html") },
  { label: "Services", href: withMarketingSiteUrl("/service.html") },
  { label: "Tools", href: withMarketingSiteUrl("/tools/") },
  { label: "Command Center", href: withAppBasePath("/") }
] as const;

const trailingNavigation = [
  { label: "Contact Us", href: withMarketingSiteUrl("/contact.html") }
] as const;

const moreNavigation = [
  { label: "Features", href: withMarketingSiteUrl("/feature.html") },
  { label: "Pricing", href: withMarketingSiteUrl("/pricing.html") },
  { label: "Blog", href: withMarketingSiteUrl("/blog.html") },
  { label: "Testimonial", href: withMarketingSiteUrl("/testimonial.html") },
  {
    label: "Partner Support",
    href: withMarketingSiteUrl("/installation-partner-support.html")
  }
] as const;

const footerColumns = [
  {
    title: "Company",
    links: [
      { label: "Why NetworkConnectIt?", href: withMarketingSiteUrl("/about.html") },
      { label: "Our Features", href: withMarketingSiteUrl("/feature.html") },
      { label: "Our Portfolio", href: withMarketingSiteUrl("/service.html") },
      { label: "About Us", href: withMarketingSiteUrl("/about.html") },
      { label: "Our Blog & News", href: withMarketingSiteUrl("/blog.html") },
      { label: "Get In Touch", href: withMarketingSiteUrl("/contact.html") }
    ]
  },
  {
    title: "Quick Links",
    links: [
      { label: "About Us", href: withMarketingSiteUrl("/about.html") },
      { label: "Contact Us", href: withMarketingSiteUrl("/contact.html") },
      { label: "Privacy Policy", href: withMarketingSiteUrl("/index.html#privacy") },
      { label: "Terms & Conditions", href: withMarketingSiteUrl("/index.html#terms") },
      { label: "Our Blog & News", href: withMarketingSiteUrl("/blog.html") },
      { label: "Our Team", href: withMarketingSiteUrl("/about.html#team") }
    ]
  },
  {
    title: "Services",
    links: [
      { label: "All Services", href: withMarketingSiteUrl("/service.html") },
      {
        label: "Network Installation & Optimization",
        href: withMarketingSiteUrl("/service.html")
      },
      {
        label: "Network Maintenance & Support",
        href: withMarketingSiteUrl("/service.html")
      },
      {
        label: "Fast, Reliable, and Secure Networking",
        href: withMarketingSiteUrl("/service.html")
      },
      { label: "Cisco Solutions", href: withMarketingSiteUrl("/service.html") },
      {
        label: "Ubiquiti UniFi Integration",
        href: withMarketingSiteUrl("/service.html")
      },
      {
        label: "Installation Partner Support",
        href: withMarketingSiteUrl("/installation-partner-support.html")
      }
    ]
  }
] as const;

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61557354532955",
    icon: Facebook
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/networkconnectit/",
    icon: Instagram
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/network-connectit-6095b23a7/",
    icon: Linkedin
  }
] as const;

function MarketingAnchor({
  href,
  children,
  className
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const isExternal = /^https?:\/\//.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        className={className}
        rel="noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={withAppBasePath("/")} className="flex items-center gap-3">
            <Image
              src={withAppBasePath("/img/networkconnectit-logo.png")}
              alt="NetworkConnectIT"
              className="h-11 w-auto sm:h-12"
              height={100}
              priority
              unoptimized
              width={300}
            />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {primaryNavigation.map((item) => (
              <MarketingAnchor
                key={item.label}
                href={item.href}
                className={
                  item.label === "Command Center"
                    ? "text-sm font-semibold text-sky-400"
                    : "text-sm font-medium text-slate-200 transition-colors hover:text-sky-300"
                }
              >
                {item.label}
              </MarketingAnchor>
            ))}

            <div className="group relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-200 transition-colors hover:text-sky-300"
              >
                <span>More</span>
                <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
              </button>

              <div className="pointer-events-none absolute right-0 top-full z-20 mt-3 w-56 translate-y-2 rounded-2xl border border-white/10 bg-slate-950/95 p-2 opacity-0 shadow-[0_24px_60px_rgba(2,6,23,0.45)] transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                {moreNavigation.map((item) => (
                  <MarketingAnchor
                    key={item.label}
                    href={item.href}
                    className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-900 hover:text-sky-300"
                  >
                    {item.label}
                  </MarketingAnchor>
                ))}
              </div>
            </div>

            {trailingNavigation.map((item) => (
              <MarketingAnchor
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-slate-200 transition-colors hover:text-sky-300"
              >
                {item.label}
              </MarketingAnchor>
            ))}
          </nav>
        </div>
      </header>

      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_60%)]" />
        <div className="relative">{children}</div>
      </div>

      <footer className="border-t border-white/10 bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title} className="space-y-4">
                <h4 className="text-lg font-semibold">{column.title}</h4>
                <div className="space-y-2.5">
                  {column.links.map((link) => (
                    <MarketingAnchor
                      key={link.label}
                      href={link.href}
                      className="flex items-start gap-2 text-sm text-slate-600 transition-colors hover:text-sky-700"
                    >
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{link.label}</span>
                    </MarketingAnchor>
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Contact Info</h4>
              <div className="space-y-3.5 text-sm text-slate-600">
                <a
                  href="https://maps.google.com/?q=117+Berkshire+Dr+Farmingville+NY+11738"
                  className="flex items-start gap-3 transition-colors hover:text-sky-700"
                  rel="noreferrer"
                  target="_blank"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>117 Berkshire Dr, Farmingville, NY 11738, USA</span>
                </a>
                <a
                  href="mailto:network@networkconnectit.com"
                  className="flex items-start gap-3 transition-colors hover:text-sky-700"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>network@networkconnectit.com</span>
                </a>
                <a
                  href="tel:+19174037129"
                  className="flex items-start gap-3 transition-colors hover:text-sky-700"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>+1 917 403 7129 ingles and espanol</span>
                </a>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {socialLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      aria-label={item.label}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-white transition-colors hover:bg-sky-700"
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-950">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-slate-200 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>
              <a href="#" className="font-medium text-white">
                Networkconnectit
              </a>
              , All right reserved.
            </p>
            <p>
              Designed By{" "}
              <a
                className="border-b border-slate-400"
                href="https://ks-techconsulting.com/"
                rel="noreferrer"
                target="_blank"
              >
                2023
              </a>{" "}
              Distributed By{" "}
              <a
                className="border-b border-slate-400"
                href="https://ks-techconsulting.com/"
                rel="noreferrer"
                target="_blank"
              >
                ks-techconsulting
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
