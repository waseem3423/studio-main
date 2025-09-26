"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Moon, Sun, UserPlus, Trash2, DatabaseZap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { currencies } from "@/lib/currencies";
import { Switch } from "@/components/ui/switch";
import { useAuthState } from "react-firebase-hooks/auth";
import type { User } from "@/lib/data";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { resetData } from "./actions";

export type AppSettings = {
  appName: string;
  logoUrlLight: string;
  logoUrlDark: string;
  authLogoUrlLight: string;
  authLogoUrlDark: string;
  faviconUrl: string;
  currency: string;
  signupVisible: boolean;
};

const dataResetOptions = [
  { id: "customers", label: "Customers" },
  { id: "sales", label: "Sales & Payment Records" },
  { id: "products", label: "Inventory (Products)" },
  { id: "expenses", label: "Expenses" },
  { id: "salesman_plans", label: "Salesman Plans (Current & History)" },
  { id: "worker_tasks", label: "Worker Tasks (Current & History)" },
];


export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const [user, authLoading] = useAuthState(auth);
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({
    appName: "JS Glow",
    logoUrlLight: "",
    logoUrlDark: "",
    authLogoUrlLight: "",
    authLogoUrlDark: "",
    faviconUrl: "",
    currency: "USD",
    signupVisible: true,
  });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [selectedDataToReset, setSelectedDataToReset] = useState<string[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchSettingsAndRole = async () => {
      // Fetch settings
      const settingsDocRef = doc(db, "settings", "app");
      const settingsSnap = await getDoc(settingsDocRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSettings({
            appName: "JS Glow",
            logoUrlLight: "",
            logoUrlDark: "",
            authLogoUrlLight: "",
            authLogoUrlDark: "",
            faviconUrl: "",
            currency: "USD",
            signupVisible: true,
            ...data
        });
      }

      // Fetch user role
      if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              setRole(userDoc.data().role as User['role']);
            }
        } catch (err) {
            console.error("Error fetching user role: ", err);
        } finally {
            setRoleLoading(false);
        }
      } else if (!authLoading) {
        setRoleLoading(false);
      }
    };
    
    fetchSettingsAndRole();
  }, [user, authLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleCurrencyChange = (value: string) => {
    setSettings((prev) => ({ ...prev, currency: value }));
  };
  
  const handleSwitchChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, signupVisible: checked }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "app"), settings, { merge: true });
      toast({
        title: "Success",
        description: "Settings saved successfully.",
      });
      if (document.querySelector<HTMLLinkElement>("link[rel='icon']")?.href !== settings.faviconUrl) {
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };
  
  const handleDataResetSelection = (id: string, checked: boolean) => {
    setSelectedDataToReset(prev => 
      checked ? [...prev, id] : prev.filter(item => item !== id)
    );
  };

  const handleResetData = async () => {
    if (selectedDataToReset.length === 0) {
      toast({ title: "No data selected", description: "Please select at least one data category to reset.", variant: "destructive" });
      return;
    }
    setIsResetting(true);
    try {
      await resetData(selectedDataToReset);
      toast({ title: "Success", description: "Selected data has been reset successfully." });
      setIsResetDialogOpen(false);
      setSelectedDataToReset([]);
      // You might want to reload the app or parts of it after a reset
      window.location.reload();
    } catch (error: any) {
        toast({ title: "Error", description: error?.message || "Failed to reset data.", variant: "destructive" });
    }
    setIsResetting(false);
  };

  if (!mounted || authLoading || roleLoading) {
    return null; // or a skeleton loader
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 font-headline">Settings</h1>
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of your application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme">Theme</Label>
              <div className="flex items-center gap-2">
                <Button variant={theme === 'light' ? 'default' : 'outline'} size="icon" onClick={() => setTheme('light')}>
                  <Sun className="h-5 w-5" />
                </Button>
                 <Button variant={theme === 'dark' ? 'default' : 'outline'} size="icon" onClick={() => setTheme('dark')}>
                  <Moon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {(role === 'admin' || role === 'manager') && (
            <Card>
            <CardHeader>
                <CardTitle>Branding &amp; Localization</CardTitle>
                <CardDescription>
                Manage your application's branding and currency.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                <Label htmlFor="appName">Application Name</Label>
                <Input
                    id="appName"
                    name="appName"
                    value={settings.appName}
                    onChange={handleInputChange}
                    placeholder="e.g., JS Glow"
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="logoUrlLight">Sidebar Logo URL (Light Mode)</Label>
                <Input
                    id="logoUrlLight"
                    name="logoUrlLight"
                    value={settings.logoUrlLight}
                    onChange={handleInputChange}
                    placeholder="https://example.com/logo-light.png"
                />
                 <p className="text-sm text-muted-foreground">
                    Your logo will be displayed in the sidebar. Recommended size: 32x32 pixels.
                </p>
                </div>
                <div className="space-y-2">
                <Label htmlFor="logoUrlDark">Sidebar Logo URL (Dark Mode)</Label>
                <Input
                    id="logoUrlDark"
                    name="logoUrlDark"
                    value={settings.logoUrlDark}
                    onChange={handleInputChange}
                    placeholder="https://example.com/logo-dark.png"
                />
                </div>
                 <div className="space-y-2">
                <Label htmlFor="authLogoUrlLight">Auth Page Logo URL (Light Mode)</Label>
                <Input
                    id="authLogoUrlLight"
                    name="authLogoUrlLight"
                    value={settings.authLogoUrlLight}
                    onChange={handleInputChange}
                    placeholder="https://example.com/auth-logo-light.png"
                />
                </div>
                 <div className="space-y-2">
                <Label htmlFor="authLogoUrlDark">Auth Page Logo URL (Dark Mode)</Label>
                <Input
                    id="authLogoUrlDark"
                    name="authLogoUrlDark"
                    value={settings.authLogoUrlDark}
                    onChange={handleInputChange}
                    placeholder="https://example.com/auth-logo-dark.png"
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                    id="faviconUrl"
                    name="faviconUrl"
                    value={settings.faviconUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/favicon.ico"
                />
                <p className="text-sm text-muted-foreground">
                    The icon that appears in the browser tab.
                </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={settings.currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a currency" />
                    </SelectTrigger>
                    <SelectContent>
                        {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                            {currency.name} ({currency.symbol})
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                    Choose the currency to be used across the application.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save Branding"}
                </Button>
            </CardContent>
            </Card>
        )}


        {role === 'admin' && (
           <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage application access and security settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                            <UserPlus />
                            Sign Up Page Visibility
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Control whether new users can create an account.
                        </p>
                    </div>
                    <Switch
                        checked={settings.signupVisible}
                        onCheckedChange={handleSwitchChange}
                    />
                </div>
                 <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : "Save Security Settings"}
                </Button>
            </CardContent>
           </Card>
        )}
        
        {role === 'admin' && (
           <Card>
            <CardHeader>
                <CardTitle className="text-destructive">Data Management</CardTitle>
                <CardDescription>Permanently delete application data. This is useful for clearing test data.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                    <Trash2 className="mr-2" />
                    Reset Application Data
                 </Button>
            </CardContent>
           </Card>
        )}
      </div>

       <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DatabaseZap/> Select Data to Reset</DialogTitle>
            <DialogDescription>
              Check the boxes for the data you want to permanently delete. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {dataResetOptions.map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  onCheckedChange={(checked) => handleDataResetSelection(option.id, !!checked)}
                  checked={selectedDataToReset.includes(option.id)}
                />
                <label htmlFor={option.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={selectedDataToReset.length === 0 || isResetting}>
                    {isResetting ? "Resetting..." : `Reset ${selectedDataToReset.length} Selected` }
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is permanent and cannot be undone. You are about to delete all selected data from the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">
                    Yes, Delete Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
