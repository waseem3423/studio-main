
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/lib/data";
import { useAppSettings } from "@/components/app-settings-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";


export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const { toast } = useToast();
  const router = useRouter();
  const { settings, loading: settingsLoading } = useAppSettings();
  const { theme } = useTheme();

  useEffect(() => {
    if (!settingsLoading && !settings.signupVisible) {
      router.push("/auth/login");
    }
  }, [settings, settingsLoading, router]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast({
        title: "Error",
        description: "Please select a role.",
        variant: "destructive",
      });
      return;
    }
    
    if (!name) {
      toast({
        title: "Error",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: user.email,
        role: role,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Success", description: "Account created successfully. Please login." });
      router.push("/auth/login");
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
        });
    }
  };

  const logoUrl = theme === 'dark' ? settings.authLogoUrlDark || settings.authLogoUrlLight : settings.authLogoUrlLight;
  
  if (settingsLoading || !settings.signupVisible) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="mx-auto max-w-sm w-full">
                <CardHeader>
                    <Skeleton className="h-10 w-10 mx-auto" />
                    <Skeleton className="h-7 w-48 mx-auto mt-2" />
                    <Skeleton className="h-5 w-64 mx-auto mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-4 w-48 mx-auto" />
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full z-10">
        <CardHeader className="text-center">
          {settingsLoading ? <Skeleton className="h-10 w-10 mx-auto mb-2" /> : (
                logoUrl ? <Image src={logoUrl} alt="Logo" width={40} height={40} className="mx-auto mb-2" unoptimized/> : <Image src="https://iili.io/KYqQC1R.png" alt="Logo" width={40} height={40} className="mx-auto mb-2" />
            )}
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignup}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., John Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select onValueChange={(value) => setRole(value as Role)} value={role}>
                    <SelectTrigger id="role">
                        <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="salesman">Salesman</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Sign Up
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>Developed by <a href="http://waseemakram.wuaze.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Waseem Akram</a></p>
      </footer>
    </div>
  );
}
