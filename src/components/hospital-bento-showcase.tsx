import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import {
  Settings2,
  Activity,
  Plus,
  Users,
  FileText,
  Clock,
} from "lucide-react";

// --- Helper Components for Hospital Features ---

const BentoCardHeader = ({ title, description, icon: Icon, colorClass = "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" }: any) => (
  <div className="flex flex-col gap-4">
    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${colorClass}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  </div>
);

const EMRIntegrationCard = () => (
  <Card className="flex h-full flex-col border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
    <CardHeader>
      <BentoCardHeader 
        title="Electronic Medical Records"
        description="Unified records across all departments. Access complete history, prescriptions, and results in one secure platform."
        icon={FileText}
      />
    </CardHeader>
    <CardFooter className="mt-auto flex items-center justify-between p-6 pt-0">
      <Button variant="outline" size="sm" className="h-8 text-xs">
        <Settings2 className="mr-2 h-3 w-3" />
        Configure
      </Button>
      <Switch
        className="data-[state=checked]:bg-blue-500 scale-75"
        aria-label="Toggle EMR"
        defaultChecked
      />
    </CardFooter>
  </Card>
);

const ActivePatientsCard = () => (
  <Card className="h-full border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
    <CardContent className="flex h-full flex-col justify-between p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Active Patients</span>
        <Users className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="flex -space-x-2 overflow-hidden mb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 ring-2 ring-background dark:bg-neutral-800">
              <Users className="h-3 w-3 text-neutral-500" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">+247</span> today</p>
      </div>
    </CardContent>
  </Card>
);

const BedOccupancyCard = () => (
  <Card className="h-full border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
    <CardContent className="flex h-full flex-col justify-between p-6">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">Occupancy</span>
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100">
          Normal
        </Badge>
      </div>
      <div>
        <span className="text-4xl font-bold tracking-tight">78%</span>
        <p className="text-xs text-muted-foreground mt-1">156/200 beds</p>
      </div>
    </CardContent>
  </Card>
);

const EfficiencyCard = () => (
  <Card className="relative h-full w-full overflow-hidden border-neutral-200 dark:border-neutral-800 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
    <div
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
        backgroundSize: "12px 12px",
      }}
    />
    <CardContent className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center">
      <span className="text-5xl font-bold tracking-tighter">3.5x</span>
      <p className="mt-2 text-xs font-medium opacity-80">Faster Processing</p>
    </CardContent>
  </Card>
);

const RevenueCard = () => (
  <Card className="h-full border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
    <CardHeader>
      <BentoCardHeader 
        title="Revenue Cycle"
        description="Automated billing and insurance claims."
        icon={Activity}
        colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
      />
    </CardHeader>
  </Card>
);

const QuickAccessCard = () => (
  <Card className="h-full border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
    <CardContent className="flex h-full flex-col justify-between p-6">
      <div className="flex items-center justify-between">
         <span className="text-sm font-medium text-muted-foreground">Actions</span>
         <Clock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full">
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full">
          <FileText className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

// --- The Hospital Features Demo ---
export default function HospitalBentoShowcase() {
  return (
    <div className="w-full bg-background/50 pt-0 pb-6 lg:pb-8 relative z-10">
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400">
            Comprehensive Hospital Management
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Streamline operations with our integrated platform. From EMR to revenue cycles, 
            experience operational excellence.
          </p>
        </div>

        <BentoGridShowcase
          integration={<EMRIntegrationCard />}
          trackers={<ActivePatientsCard />}
          statistic={<EfficiencyCard />}
          focus={<BedOccupancyCard />}
          productivity={<RevenueCard />}
          shortcuts={<QuickAccessCard />}
        />
      </div>
    </div>
  );
}
