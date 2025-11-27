import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, MapPin, Grid3X3, Download } from "lucide-react";

interface GridPoint {
  id: string;
  lat: number;
  lng: number;
  row: number;
  col: number;
  isSelected: boolean;
  isCenter: boolean;
}

interface ReportData {
  keyword: string;
  websiteFilter: string;
  gridPoints: GridPoint[];
  centerLocation: { lat: number; lng: number; address?: string } | null;
  gridConfig: {
    distanceUnit: "meters" | "miles";
    spacing: number;
    gridSize: number;
  };
  createdAt: string;
}

export default function ReportPage() {
  const [, navigate] = useLocation();
  
  const storedData = sessionStorage.getItem("reportData");
  const reportData: ReportData | null = storedData ? JSON.parse(storedData) : null;

  if (!reportData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Report Data</h2>
          <p className="text-muted-foreground mb-4">
            Please create a report from the map page first.
          </p>
          <Button onClick={() => navigate("/")} data-testid="button-back-to-map">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Map
          </Button>
        </Card>
      </div>
    );
  }

  const selectedPoints = reportData.gridPoints.filter(p => p.isSelected);
  const centerPoint = reportData.gridPoints.find(p => p.isCenter);

  const handleExportCSV = () => {
    const headers = ["Point ID", "Row", "Column", "Latitude", "Longitude", "Is Center", "Is Selected"];
    const rows = selectedPoints.map(point => [
      point.id,
      point.row,
      point.col,
      point.lat.toFixed(6),
      point.lng.toFixed(6),
      point.isCenter ? "Yes" : "No",
      point.isSelected ? "Yes" : "No"
    ]);

    const csvContent = [
      `# Report Generated: ${reportData.createdAt}`,
      `# Keyword: ${reportData.keyword || "Not specified"}`,
      `# Website Filter: ${reportData.websiteFilter || "Not specified"}`,
      `# Grid Size: ${reportData.gridConfig.gridSize}x${reportData.gridConfig.gridSize}`,
      `# Spacing: ${reportData.gridConfig.spacing} ${reportData.gridConfig.distanceUnit}`,
      "",
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grid-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back-to-map"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Grid Report
                </h1>
                <p className="text-sm text-muted-foreground">
                  Generated on {new Date(reportData.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <Button onClick={handleExportCSV} data-testid="button-export-csv">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <FileText className="w-4 h-4" />
              Keyword
            </div>
            <p className="font-medium text-lg" data-testid="text-report-keyword">
              {reportData.keyword || "Not specified"}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Grid3X3 className="w-4 h-4" />
              Grid Size
            </div>
            <p className="font-medium text-lg" data-testid="text-report-grid-size">
              {reportData.gridConfig.gridSize}x{reportData.gridConfig.gridSize}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <MapPin className="w-4 h-4" />
              Grid Points
            </div>
            <p className="font-medium text-lg" data-testid="text-report-points-count">
              {selectedPoints.length} selected
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <MapPin className="w-4 h-4" />
              Spacing
            </div>
            <p className="font-medium text-lg" data-testid="text-report-spacing">
              {reportData.gridConfig.spacing} {reportData.gridConfig.distanceUnit}
            </p>
          </Card>
        </div>

        {centerPoint && (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Center Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Coordinates</p>
                <p className="font-mono" data-testid="text-center-coordinates">
                  {centerPoint.lat.toFixed(6)}°, {centerPoint.lng.toFixed(6)}°
                </p>
              </div>
              {reportData.centerLocation?.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p data-testid="text-center-address">{reportData.centerLocation.address}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Grid Point Coordinates
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Latitude</TableHead>
                  <TableHead>Longitude</TableHead>
                  <TableHead className="text-right">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedPoints.map((point, index) => (
                  <TableRow key={point.id} data-testid={`row-grid-point-${point.id}`}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      Row {point.row}, Col {point.col}
                    </TableCell>
                    <TableCell className="font-mono" data-testid={`text-lat-${point.id}`}>
                      {point.lat.toFixed(6)}°
                    </TableCell>
                    <TableCell className="font-mono" data-testid={`text-lng-${point.id}`}>
                      {point.lng.toFixed(6)}°
                    </TableCell>
                    <TableCell className="text-right">
                      {point.isCenter ? (
                        <Badge variant="default" data-testid={`badge-center-${point.id}`}>
                          Center
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-point-${point.id}`}>
                          Grid Point
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
