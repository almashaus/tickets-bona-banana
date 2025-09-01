"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MonitorCog } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { LanguageToggle } from "@/src/components/i18n/language-toggle";
import { UserNav } from "@/src/components/auth/user-nav";
import { useAuth } from "@/src/features/auth/auth-provider";
import { ModeToggle } from "@/src/components/theme/mode-toggle";
import { AppUser } from "@/src/models/user";
import { useLanguage } from "../i18n/language-provider";

export default function Header({
  initialUser,
}: {
  initialUser?: AppUser | null;
}) {
  const pathname = usePathname();
  const { user, initialLoading } = useAuth();
  const { t } = useLanguage();

  return (
    <header
      className={`fixed top-0 z-50 w-full bg-white/95 backdrop-blur ${pathname.startsWith("/admin") ? "supports-[backdrop-filter]:bg-greenColor/90" : "supports-[backdrop-filter]:bg-white/60 border-b"}`}
    >
      <div className="ps-4 pe-8 flex h-16 items-center justify-between">
        <div className="flex justify-start items-center">
          <Link href="/" className="flex items-center">
            <img
              src="/images/bona-banana.svg"
              alt="Bona Banana Logo"
              className="h-10 me-2"
            />
            <span
              className={`hidden ${pathname.startsWith("/admin") ? "text-white" : "text-orangeColor"} font-bold sm:inline-block`}
            >
              Bona Banana
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-6 md:gap-10">
          <nav className="hidden gap-6 md:flex">
            {/* <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === "/" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Home
            </Link>
            <Link
              href="/events"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === "/events" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Events
            </Link> */}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="default">
            {user?.hasDashboardAccess && (
              <Button onClick={() => (window.location.href = "/admin")}>
                <MonitorCog className="text-redColor" />
              </Button>
            )}
          </Button>
          {/* <ModeToggle /> */}
          <LanguageToggle />
          {initialLoading ? (
            initialUser ? (
              <UserNav user={initialUser!} />
            ) : (
              <Button asChild variant="outline" size="default">
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
            )
          ) : user ? (
            <UserNav user={user} />
          ) : (
            <Button asChild variant="outline" size="default">
              <Link href="/login">{t("nav.login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
