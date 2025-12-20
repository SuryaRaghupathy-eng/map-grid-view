import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Step5Review() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const businessWebsite = sessionStorage.getItem("businessWebsite");
  const selectedLocationStr = sessionStorage.getItem("selectedLocation");
  const searchKeyword = sessionStorage.getItem("searchKeyword");
  const gridConfigStr = sessionStorage.getItem("gridConfig");

  let selectedLocation = null;
  let gridConfig = null;

  if (selectedLocationStr) {
    try {
      selectedLocation = JSON.parse(selectedLocationStr);
    } catch {
      selectedLocation = null;
    }
  }

  if (gridConfigStr) {
    try {
      gridConfig = JSON.parse(gridConfigStr);
    } catch {
      gridConfig = null;
    }
  }

  // Redirect if missing previous steps
  useEffect(() => {
    if (!businessWebsite || !selectedLocation || !searchKeyword || !gridConfig) {
      setLocation("/");
    }
  }, [businessWebsite, selectedLocation, searchKeyword, gridConfig, setLocation]);

  const handleGenerateReport = () => {
    // Store flag to trigger report generation on map page
    sessionStorage.setItem("generateReportOnLoad", "true");
    setLocation("/map");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold">Ready to Analyze</h1>
              <p className="text-muted-foreground">Step 5 of 5: Review & Generate Report</p>
            </div>

            {/* Summary Cards */}
            <div className="space-y-3">
              <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                <p className="text-xs text-muted-foreground">Business Website</p>
                <p className="font-semibold text-sm break-all text-primary">{businessWebsite}</p>
              </div>

              <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-semibold text-sm break-all">
                  {selectedLocation?.address || `${selectedLocation?.lat.toFixed(4)}°, ${selectedLocation?.lng.toFixed(4)}°`}
                </p>
              </div>

              <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                <p className="text-xs text-muted-foreground">Keyword</p>
                <p className="font-semibold text-sm break-all">{searchKeyword}</p>
              </div>

              <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                <p className="text-xs text-muted-foreground">Grid Configuration</p>
                <p className="font-semibold text-sm">
                  {gridConfig?.gridSize}x{gridConfig?.gridSize} grid, {gridConfig?.spacing}{gridConfig?.distanceUnit === "miles" ? "mi" : "m"} spacing
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
              <p className="text-sm font-medium">What will happen next?</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Search rankings across your grid of locations</li>
                <li>• Find where your business website ranks</li>
                <li>• Identify top-performing locations</li>
                <li>• Generate comprehensive grid report</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleGenerateReport}
                className="w-full h-12 text-base font-semibold"
                data-testid="button-generate-report"
              >
                Generate Report
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
