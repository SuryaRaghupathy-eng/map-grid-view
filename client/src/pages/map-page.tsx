import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { LatLngExpression, Icon } from "leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { coordinateInputSchema, type CoordinateInput } from "@shared/schema";
import { MapPin, Navigation, Plus, Minus, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: LatLngExpression = [40.7128, -74.0060];
const DEFAULT_ZOOM = 13;

const customMarkerIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapController({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  }, [center, zoom, map]);
  
  return null;
}

function CoordinateInputPanel({
  onNavigate,
  currentPosition,
}: {
  onNavigate: (lat: number, lng: number) => void;
  currentPosition: { lat: number; lng: number } | null;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CoordinateInput>({
    resolver: zodResolver(coordinateInputSchema),
    defaultValues: {
      latitude: "",
      longitude: "",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      onNavigate(data.latitude, data.longitude);
      toast({
        title: "Navigation Successful",
        description: `Navigated to ${data.latitude.toFixed(6)}°, ${data.longitude.toFixed(6)}°`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid Coordinates",
        description: "Please check your input and try again.",
      });
    }
  };

  const handleClear = () => {
    reset();
  };

  return (
    <Card className="w-full lg:w-96 h-full lg:h-screen flex flex-col overflow-hidden">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Map Navigator</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter coordinates to navigate to any location on the map
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="latitude" className="text-sm font-medium">
              Latitude (°)
            </Label>
            <Input
              id="latitude"
              type="text"
              placeholder="e.g., 40.7128"
              data-testid="input-latitude"
              {...register("latitude")}
              className={errors.latitude ? "border-destructive" : ""}
            />
            {errors.latitude && (
              <p className="text-sm text-destructive" data-testid="text-latitude-error">
                {errors.latitude.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="longitude" className="text-sm font-medium">
              Longitude (°)
            </Label>
            <Input
              id="longitude"
              type="text"
              placeholder="e.g., -74.0060"
              data-testid="input-longitude"
              {...register("longitude")}
              className={errors.longitude ? "border-destructive" : ""}
            />
            {errors.longitude && (
              <p className="text-sm text-destructive" data-testid="text-longitude-error">
                {errors.longitude.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid="button-navigate"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Navigate to Location
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleClear}
              data-testid="button-clear"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </form>

        {currentPosition && (
          <div className="space-y-2 pt-4 border-t">
            <h2 className="text-sm font-medium text-foreground">Current Map Center</h2>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Latitude:</span>
                <code className="font-mono text-foreground" data-testid="text-current-latitude">
                  {currentPosition.lat.toFixed(6)}°
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Longitude:</span>
                <code className="font-mono text-foreground" data-testid="text-current-longitude">
                  {currentPosition.lng.toFixed(6)}°
                </code>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t">
          <h2 className="text-sm font-medium text-foreground">Quick Examples</h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigate(40.7128, -74.0060)}
              className="w-full text-left text-sm p-2 rounded-md hover-elevate active-elevate-2 bg-muted/50"
              data-testid="button-example-nyc"
            >
              <div className="font-medium">New York City</div>
              <div className="text-muted-foreground font-mono text-xs">40.7128, -74.0060</div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate(51.5074, -0.1278)}
              className="w-full text-left text-sm p-2 rounded-md hover-elevate active-elevate-2 bg-muted/50"
              data-testid="button-example-london"
            >
              <div className="font-medium">London</div>
              <div className="text-muted-foreground font-mono text-xs">51.5074, -0.1278</div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate(35.6762, 139.6503)}
              className="w-full text-left text-sm p-2 rounded-md hover-elevate active-elevate-2 bg-muted/50"
              data-testid="button-example-tokyo"
            >
              <div className="font-medium">Tokyo</div>
              <div className="text-muted-foreground font-mono text-xs">35.6762, 139.6503</div>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Button
        size="icon"
        variant="secondary"
        onClick={onZoomIn}
        className="shadow-lg"
        data-testid="button-zoom-in"
      >
        <Plus className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={onZoomOut}
        className="shadow-lg"
        data-testid="button-zoom-out"
      >
        <Minus className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={onReset}
        className="shadow-lg"
        data-testid="button-reset"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function MapPage() {
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(DEFAULT_CENTER);
  const mapRef = useRef<any>(null);

  const handleNavigate = (lat: number, lng: number) => {
    const newPosition: LatLngExpression = [lat, lng];
    setMapCenter(newPosition);
    setMarkerPosition(newPosition);
    setZoom(13);
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleReset = () => {
    setMapCenter(DEFAULT_CENTER);
    setMarkerPosition(DEFAULT_CENTER);
    setZoom(DEFAULT_ZOOM);
  };

  const getCurrentPosition = () => {
    if (!markerPosition) return null;
    const [lat, lng] = Array.isArray(markerPosition) 
      ? markerPosition 
      : [markerPosition.lat, markerPosition.lng];
    return { lat, lng };
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden">
      <CoordinateInputPanel
        onNavigate={handleNavigate}
        currentPosition={getCurrentPosition()}
      />
      
      <div className="relative flex-1 h-full" data-testid="map-container">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          zoomControl={false}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={mapCenter} zoom={zoom} />
          {markerPosition && (
            <Marker position={markerPosition} icon={customMarkerIcon}>
              <Popup>
                <div className="p-2">
                  <p className="font-medium mb-1">Location</p>
                  <p className="text-sm font-mono">
                    {Array.isArray(markerPosition)
                      ? `${markerPosition[0].toFixed(6)}°, ${markerPosition[1].toFixed(6)}°`
                      : `${markerPosition.lat.toFixed(6)}°, ${markerPosition.lng.toFixed(6)}°`}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}
