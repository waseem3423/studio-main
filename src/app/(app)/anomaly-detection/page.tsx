
import { AnomalyForm } from "./anomaly-form";
import { AlertTriangle } from "lucide-react";

export default function AnomalyDetectionPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <AlertTriangle className="h-8 w-8" />
        <h1 className="text-3xl font-bold font-headline">Sales Anomaly Detection</h1>
      </div>
      <AnomalyForm />
    </div>
  );
}
