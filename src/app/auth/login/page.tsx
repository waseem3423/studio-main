
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
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
import { useAppSettings } from "@/components/app-settings-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { settings, loading: settingsLoading } = useAppSettings();
  const { theme } = useTheme();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Success", description: "Logged in successfully." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const logoUrl = theme === 'dark' ? settings.authLogoUrlDark || settings.authLogoUrlLight : settings.authLogoUrlLight;


  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background">
       <Card className="mx-auto max-w-sm w-full z-10">
         <CardHeader className="text-center">
            {settingsLoading ? <Skeleton className="h-10 w-10 mx-auto mb-2" /> : (
                logoUrl ? <Image src={logoUrl} alt="Logo" width={40} height={40} className="mx-auto mb-2" unoptimized/> : <Image src="https://iili.io/KYqQC1R.png" alt="Logo" width={40} height={40} className="mx-auto mb-2" />
            )}
          <CardTitle className="text-2xl font-headline">Login to {settingsLoading ? <Skeleton className="h-6 w-24 inline-block" /> : settings.appName}</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin}>
            <div className="grid gap-4">
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
              <Button type="submit" className="w-full">
                Login
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            {settingsLoading ? (
                <Skeleton className="h-4 w-48 mx-auto" />
            ) : settings.signupVisible && (
                <>
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/signup" className="underline">
                        Sign up
                    </Link>
                </>
            )}
          </div>
        </CardContent>
      </Card>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>Developed by <a href="http://waseemakram.wuaze.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Waseem Akram</a></p>
      </footer>
    </div>
  );
}
