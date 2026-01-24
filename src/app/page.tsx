"use client";

import { useState, useEffect } from "react";
import { HeroSection } from "@/components/hero-section-5";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Prevent hydration mismatch by only rendering after mount
  if (!mounted || !isLoaded || isSignedIn) {
    return null;
  }

  return <HeroSection />;
}
