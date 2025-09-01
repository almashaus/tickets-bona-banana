"use client";

import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { useAuth } from "@/src/features/auth/auth-provider";
import { AppUser } from "@/src/models/user";
import { useLanguage } from "../i18n/language-provider";

export function UserNav({ user }: { user: AppUser }) {
  const { logout } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="relative h-9 w-9 rounded-lg bg-muted"
        >
          <Avatar className="h-9 w-9 text-black">
            <AvatarFallback>
              <User className="h-[1.2rem] w-[1.2rem]" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        style={{ direction: language === "ar" ? "rtl" : "ltr" }}
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            {t("nav.profile")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/profile?tab=tickets")}>
            {t("nav.myTickets")}
          </DropdownMenuItem>
          {user.hasDashboardAccess && (
            <DropdownMenuItem
              className="text-redColor"
              onClick={() => router.push("/admin")}
            >
              {t("nav.dashboard")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          {t("nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
