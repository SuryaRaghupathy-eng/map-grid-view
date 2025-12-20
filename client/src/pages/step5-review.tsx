import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, CircleMarker } from "react-leaflet";
import { Icon, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface GridPoint {
  id: string;
  lat: number;
  lng: number;
  row: number;
  col: number;
  isSelected: boolean;
  isCenter: boolean;
}

interface GridConfig {
  enabled: boolean;
  distanceUnit: "meters" | "miles";
  spacing: number;
  gridSize: number;
}

const customMarkerIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const centerMarkerIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function calculateGridPoints(
  centerLat: number,
  centerLng: number,
  spacing: number,
  gridSize: number,
  distanceUnit: "meters" | "miles"
): GridPoint[] {
  const points: GridPoint[] = [];
  const half = Math.floor(gridSize / 2);
  
  const spacingInMeters = distanceUnit === "miles" ? spacing * 1609.34 : spacing;
  
  const latOffset = spacingInMeters / 111320;
  const lngOffset = spacingInMeters / (111320 * Math.cos(centerLat * Math.PI / 180));

  for (let row = -half; row <= half; row++) {
    for (let col = -half; col <= half; col++) {
      const lat = centerLat + (row * latOffset);
      const lng = centerLng + (col * lngOffset);
      const isCenter = row === 0 && col === 0;
      
      points.push({
        id: `${row}_${col}`,
        lat,
        lng,
        row,
        col,
        isSelected: true,
        isCenter,
      });
    }
  }

  return points;
}

export default function Step5Review() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const businessWebsite = sessionStorage.getItem("businessWebsite");
  const selectedLocationStr = sessionStorage.getItem("selectedLocation");
  const searchKeyword = sessionStorage.getItem("searchKeyword");
  const gridConfigStr = sessionStorage.getItem("gridConfig");

  let selectedLocation = null;
  let gridConfig: GridConfig | null = null;
  let gridPoints: GridPoint[] = [];
  let mapCenter: LatLngExpression = [40.7128, -74.0060];

  if (selectedLocationStr) {
    try {
      selectedLocation = JSON.parse(selectedLocationStr);
      if (selectedLocation?.lat && selectedLocation?.lng) {
        mapCenter = [selectedLocation.lat, selectedLocation.lng];
      }
    } catch {
      selectedLocation = null;
    }
  }

  if (gridConfigStr) {
    try {
      gridConfig = JSON.parse(gridConfigStr);
      if (selectedLocation && gridConfig) {
        gridPoints = calculateGridPoints(
          selectedLocation.lat,
          selectedLocation.lng,
          gridConfig.spacing,
          gridConfig.gridSize,
          gridConfig.distanceUnit
        );
      }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4 flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full">
        {/* Left Side - Summary Cards */}
        <div className="w-full lg:w-96 flex flex-col">
          <Card className="p-6 shadow-lg flex-1 flex flex-col">
            <div className="space-y-6 flex-1">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold">Ready to Analyze</h1>
                <p className="text-sm text-muted-foreground">Step 5 of 5: Review & Generate Report</p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-2">
                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                  <p className="text-xs text-muted-foreground">Business Website</p>
                  <p className="font-semibold text-xs break-all text-primary">{businessWebsite}</p>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold text-xs break-all">
                    {selectedLocation?.address || `${selectedLocation?.lat.toFixed(4)}°, ${selectedLocation?.lng.toFixed(4)}°`}
                  </p>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                  <p className="text-xs text-muted-foreground">Keyword</p>
                  <p className="font-semibold text-xs break-all">{searchKeyword}</p>
                </div>

                <div className="p-3 bg-secondary/50 rounded-lg border border-primary/10">
                  <p className="text-xs text-muted-foreground">Grid Configuration</p>
                  <p className="font-semibold text-xs">
                    {gridConfig?.gridSize}x{gridConfig?.gridSize} grid, {gridConfig?.spacing}{gridConfig?.distanceUnit === "miles" ? "mi" : "m"} spacing
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                <p className="text-xs font-medium">What will happen next?</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Search rankings across your grid of locations</li>
                  <li>• Find where your business website ranks</li>
                  <li>• Identify top-performing locations</li>
                  <li>• Generate comprehensive grid report</li>
                </ul>
              </div>

              {/* Button */}
              <Button
                onClick={handleGenerateReport}
                className="w-full h-11 text-sm font-semibold mt-auto"
                data-testid="button-generate-report"
              >
                Generate Report
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Side - Map Preview */}
        <div className="flex-1 min-h-96 lg:min-h-full">
          <Card className="p-0 shadow-lg h-full overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ width: "100%", height: "100%" }}
              className="rounded-lg"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* Center marker */}
              {selectedLocation && (
                <Marker
                  position={[selectedLocation.lat, selectedLocation.lng]}
                  icon={centerMarkerIcon}
                >
                </Marker>
              )}

              {/* Grid points */}
              {gridPoints.map((point) => (
                <CircleMarker
                  key={point.id}
                  center={[point.lat, point.lng]}
                  radius={5}
                  fillColor={point.isCenter ? "#ef4444" : "#3b82f6"}
                  color={point.isCenter ? "#dc2626" : "#1d4ed8"}
                  weight={1}
                  opacity={0.8}
                  fillOpacity={0.6}
                />
              ))}
            </MapContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
