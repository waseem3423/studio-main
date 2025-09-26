
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutGrid,
  DollarSign,
  Boxes,
  Receipt,
  FileText,
  Warehouse,
  Settings,
  ClipboardList,
  BookCopy,
  ClipboardPen,
  BarChartHorizontalBig,
  Users,
  History,
  DatabaseZap,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSettings } from "./app-settings-provider";
import Image from "next/image";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";

type UserRole = "admin" | "manager" | "cashier" | "salesman" | "worker";

const allMenuItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    roles: ["admin", "manager", "cashier", "salesman", "worker"],
  },
  {
    href: "/sales",
    label: "Sales Entry",
    icon: DollarSign,
    roles: ["admin", "manager", "cashier", "salesman"],
  },
  {
    href: "/my-customers",
    label: "My Customers",
    icon: Users,
    roles: ["salesman"],
  },
  {
    href: "/customers",
    label: "Customers",
    icon: Users,
    roles: ["admin", "manager", "cashier"],
  },
  {
    href: "/sales-records",
    label: "Sales Records",
    icon: BookCopy,
    roles: ["admin", "manager"],
  },
  {
    href: "/sales-plans",
    label: "Salesman Plans",
    icon: ClipboardList,
    roles: ["admin", "manager"],
  },
  {
    href: "/sales-plan-history",
    label: "Sales Plan History",
    icon: History,
    roles: ["admin", "manager"],
  },
   {
    href: "/worker-tasks",
    label: "Worker Tasks",
    icon: ClipboardPen,
    roles: ["admin", "manager"],
  },
  {
    href: "/worker-progress",
    label: "Worker Progress",
    icon: BarChartHorizontalBig,
    roles: ["admin", "manager"],
  },
  {
    href: "/worker-task-history",
    label: "Task History",
    icon: History,
    roles: ["worker"],
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: Boxes,
    roles: ["admin", "manager", "worker"],
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Receipt,
    roles: ["admin", "manager", "cashier"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileText,
    roles: ["admin", "manager", "salesman", "worker"],
  },
  {
    href: "/anomaly-detection",
    label: "Anomaly Detection",
    icon: AlertTriangle,
    roles: ["admin", "manager"],
  }
];

const secondaryMenuItems = [
    {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin", "manager"],
  },
]

export function AppSidebar() {
  const pathname = usePathname();
  const { settings, loading: settingsLoading } = useAppSettings();
  const { theme } = useTheme();
  const [user, authLoading] = useAuthState(auth);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role as UserRole);
          }
        } catch (error) {
            console.error("Error fetching user role: ", error);
        } finally {
            setRoleLoading(false);
        }
      } else if (!authLoading) {
        setRoleLoading(false);
      }
    };
    fetchUserRole();
  }, [user, authLoading]);

  const menuItems = allMenuItems.filter(item => role && item.roles.includes(role));
  const filteredSecondaryMenuItems = secondaryMenuItems.filter(item => role && item.roles.includes(role));
  
  const logoUrl = theme === 'dark' ? settings.logoUrlDark || settings.logoUrlLight : settings.logoUrlLight;

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="h-16 justify-center p-2 group-data-[collapsible=icon]:justify-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          {settingsLoading ? (
            <>
              <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
              <div className="h-6 w-32 bg-muted rounded-md animate-pulse group-data-[collapsible=icon]:hidden" />
            </>
          ) : (
            <>
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" width={32} height={32} className="h-8 w-8" unoptimized/>
              ) : (
                <Warehouse className="h-8 w-8 text-primary" />
              )}
              <span className="font-headline text-2xl font-semibold group-data-[collapsible=icon]:hidden">
                {settings.appName}
              </span>
            </>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2 flex flex-col justify-between">
        <SidebarMenu>
          {(authLoading || roleLoading) ? (
            <div className="flex flex-col gap-2 mt-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
            </div>
          ) : (menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label, className: "font-body" }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )))}
        </SidebarMenu>
         <SidebarMenu>
          {filteredSecondaryMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label, className: "font-body" }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
