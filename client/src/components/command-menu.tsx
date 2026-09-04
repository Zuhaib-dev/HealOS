"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Stethoscope,
  Users,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Activity,
  Package,
  Calendar,
  Sun,
  Moon,
  LogOut,
  Bed,
  CreditCard,
  UserCheck,
} from "lucide-react";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    window.addEventListener("keydown", down);
    window.addEventListener("open-command-menu", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("open-command-menu", handleCustomOpen);
    };
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search hospital portal..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Clinical Portals">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/doctor"))}
            className="cursor-pointer"
          >
            <Stethoscope className="mr-2 size-4 text-emerald-500" />
            <span>Doctor Consultation Worklist</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/reception"))}
            className="cursor-pointer"
          >
            <Users className="mr-2 size-4 text-primary" />
            <span>Reception & Patient Registration</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/patient"))}
            className="cursor-pointer"
          >
            <Activity className="mr-2 size-4 text-blue-500" />
            <span>Patient Health Portal</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/emergency"))}
            className="cursor-pointer"
          >
            <ShieldCheck className="mr-2 size-4 text-rose-500" />
            <span>Emergency Resuscitation & Triage</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Diagnostics & Pharmacy">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/pharmacy"))}
            className="cursor-pointer"
          >
            <Package className="mr-2 size-4 text-amber-500" />
            <span>Pharmacy & Dispensary Queue</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/radiology"))}
            className="cursor-pointer"
          >
            <Activity className="mr-2 size-4 text-indigo-500" />
            <span>Radiology & DICOM Imaging</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/lab"))}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="mr-2 size-4 text-teal-500" />
            <span>Laboratory Specimen Diagnostics</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Administration & Operations">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin"))}
            className="cursor-pointer"
          >
            <Building2 className="mr-2 size-4 text-amber-500" />
            <span>Admin Console Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/schedule"))}
            className="cursor-pointer"
          >
            <Calendar className="mr-2 size-4 text-primary" />
            <span>Theatre & Staff Scheduling</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/billing"))}
            className="cursor-pointer"
          >
            <CreditCard className="mr-2 size-4 text-emerald-500" />
            <span>Revenue Ledger & Invoicing</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/patients"))}
            className="cursor-pointer"
          >
            <UserCheck className="mr-2 size-4 text-blue-500" />
            <span>Patient Registry Census</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/supplies"))}
            className="cursor-pointer"
          >
            <Package className="mr-2 size-4 text-purple-500" />
            <span>Medical Supplies & Inventory</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/wards"))}
            className="cursor-pointer"
          >
            <Bed className="mr-2 size-4 text-cyan-500" />
            <span>Inpatient Wards & Beds Census</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="System Preferences">
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              )
            }
            className="cursor-pointer"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="mr-2 size-4 text-amber-500" />
            ) : (
              <Moon className="mr-2 size-4 text-indigo-500" />
            )}
            <span>Toggle Theme ({resolvedTheme === "dark" ? "Light" : "Dark"})</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/login"))}
            className="cursor-pointer"
          >
            <LogOut className="mr-2 size-4 text-muted-foreground" />
            <span>Switch Workspace Account</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
