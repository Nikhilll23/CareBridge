"use client";

import { motion } from "framer-motion";
import { Activity, ArrowRight, Heart, Users, FileText, Calendar, ShieldCheck, Zap, Globe, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show nothing while checking auth status
  if (!isLoaded || isSignedIn) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="container mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">HIS Core</span>
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-transparent -z-10" />
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="max-w-4xl mx-auto"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border bg-background/50 px-3 py-1 text-sm font-medium backdrop-blur-md mb-8">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Next-Gen Hospital Management System
              </motion.div>

              <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Healthcare Reimagined for <br />
                <span className="text-primary">The Digital Age</span>
              </motion.h1>

              <motion.p variants={itemVariants} className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Streamline operations, enhance patient care, and access cutting-edge research with a unified platform designed for modern medical institutions.
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/sign-in">
                  <Button size="lg" className="h-12 px-8 text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                    Enter Portal <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-lg rounded-full">
                    Learn More
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-accent/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Comprehensive Care Suite</h2>
              <p className="text-muted-foreground text-lg">Everything you need to manage a modern healthcare facility.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Users,
                  title: "Patient Management",
                  desc: "Complete lifecycle management from admission to discharge with secure records.",
                  color: "text-blue-500 bg-blue-500/10"
                },
                {
                  icon: Stethoscope,
                  title: "Clinical Workstation",
                  desc: "Integrated tools for doctors including diagnosis, prescriptions, and radiology reviews.",
                  color: "text-green-500 bg-green-500/10"
                },
                {
                  icon: Globe,
                  title: "Global Research",
                  desc: "Direct access to TCIA reference library for oncological imaging and research.",
                  color: "text-purple-500 bg-purple-500/10"
                },
                {
                  icon: ShieldCheck,
                  title: "Secure & Compliant",
                  desc: "Enterprise-grade security ensuring HIPAA compliance and data protection.",
                  color: "text-indigo-500 bg-indigo-500/10"
                },
                {
                  icon: Zap,
                  title: "Real-time Analytics",
                  desc: "Live dashboards for hospital occupancy, revenue, and operational efficiency.",
                  color: "text-yellow-500 bg-yellow-500/10"
                },
                {
                  icon: Heart,
                  title: "Patient Centric",
                  desc: "Portals for patients to view appointments, history, and communicate with providers.",
                  color: "text-red-500 bg-red-500/10"
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="bg-card border p-8 rounded-2xl shadow-xs hover:shadow-lg transition-all"
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 border-y bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "TCIA", label: "Access" },
                { value: "DICOM", label: "Viewer" },
                { value: "Secure", label: "Data" },
                { value: "24/7", label: "Support" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-muted-foreground font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="bg-primary rounded-3xl p-12 text-center text-primary-foreground relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Healthcare Facility?</h2>
                <p className="text-primary-foreground/80 text-lg mb-8">
                  Join hundreds of leading medical institutions using HIS Core to deliver better patient outcomes.
                </p>
                <Link href="/sign-up">
                  <Button size="lg" variant="secondary" className="h-12 px-8 text-lg rounded-full font-bold shadow-lg">
                    Get Started Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-muted/30 py-12 border-t">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-bold">HIS Core</span>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-foreground transition-colors">Privacy Policy</button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Privacy Policy</DialogTitle>
                    <DialogDescription>Last updated: January 2026</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <p>At HIS Core, we take your privacy seriously. This policy outlines how we handle your data.</p>
                    <h4 className="font-semibold text-foreground">1. Data Collection</h4>
                    <p>We collect only necessary information to provide our healthcare management services, including patient records and user credentials.</p>
                    <h4 className="font-semibold text-foreground">2. Security</h4>
                    <p>All data is encrypted at rest and in transit using industry-standard protocols. We are HIPAA compliant.</p>
                    <h4 className="font-semibold text-foreground">3. Data Usage</h4>
                    <p>Your data is used solely for the purpose of managing healthcare operations. We do not sell data to third parties.</p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-foreground transition-colors">Terms of Service</button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Terms of Service</DialogTitle>
                    <DialogDescription>Effective Date: January 2026</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <p>Welcome to HIS Core. By using our platform, you agree to these terms.</p>
                    <h4 className="font-semibold text-foreground">1. Acceptable Use</h4>
                    <p>You agree to use the platform only for lawful healthcare management purposes and in compliance with all medical regulations.</p>
                    <h4 className="font-semibold text-foreground">2. Account Security</h4>
                    <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
                    <h4 className="font-semibold text-foreground">3. Service Availability</h4>
                    <p>We strive for 99.9% uptime but do not guarantee uninterrupted access during scheduled maintenance.</p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="hover:text-foreground transition-colors">Support</button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Contact Support</DialogTitle>
                    <DialogDescription>We are here to help 24/7</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <div className="p-4 bg-accent/20 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">Emergency Support</h4>
                      <p>Call: +1 (800) HIS-HELP</p>
                      <p>Email: urgency@his-core.com</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">General Inquiries</h4>
                      <p>Email: support@his-core.com</p>
                    </div>
                    <p className="text-muted-foreground text-xs pt-2">Our support team typically responds within 15 minutes.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="text-sm text-muted-foreground text-center md:text-right">
              © 2026 HIS Core Systems. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
