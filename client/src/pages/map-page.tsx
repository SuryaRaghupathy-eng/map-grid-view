import { useState, useRef, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { LatLngExpression, Icon } from "leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { coordinateInputSchema, type CoordinateInput, type Favorite } from "@shared/schema";
import { MapPin, Navigation, Plus, Minus, RotateCcw, Star, Trash2, Locate, Search, Map as MapIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

const favoriteMarkerIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MAP_STYLES = {
  street: {
    name: "Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  topo: {
    name: "Topographic",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
};

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

function MapClickHandler({ 
  onMapClick 
}: { 
  onMapClick: (lat: number, lng: number) => void 
}) {
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  
  useMapEvents({
    click: (e) => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      
      const timeout = setTimeout(() => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }, 300);
      
      setClickTimeout(timeout);
    },
  });
  
  return null;
}

function SaveFavoriteDialog({
  open,
  onOpenChange,
  position,
  address,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { lat: number; lng: number } | null;
  address?: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
    }
  }, [open]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Favorite Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="favorite-name">Location Name</Label>
            <Input
              id="favorite-name"
              placeholder="e.g., Home, Office, Favorite Restaurant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>
          {position && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Coordinates: {position.lat.toFixed(6)}°, {position.lng.toFixed(6)}°</p>
              {address && <p>Address: {address}</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CoordinateInputPanel({
  onNavigate,
  currentPosition,
  onSaveFavorite,
  onGetCurrentLocation,
  favorites,
  isLoadingFavorites,
  onDeleteFavorite,
}: {
  onNavigate: (lat: number, lng: number) => void;
  currentPosition: { lat: number; lng: number; address?: string } | null;
  onSaveFavorite: () => void;
  onGetCurrentLocation: () => void;
  favorites: Favorite[];
  isLoadingFavorites: boolean;
  onDeleteFavorite: (id: string) => void;
}) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  
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

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to search address");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const result = data[0];
        onNavigate(parseFloat(result.lat), parseFloat(result.lon));
        toast({
          title: "Location Found",
          description: result.display_name,
        });
        setSearchQuery("");
      } else {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "Could not find that address",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Search Error",
        description: error.message,
      });
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
    }
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
            Navigate by coordinates, address, or click on the map
          </p>
        </div>

        <Tabs defaultValue="coordinates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="coordinates">Coordinates</TabsTrigger>
            <TabsTrigger value="favorites">
              Favorites {favorites.length > 0 && `(${favorites.length})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="coordinates" className="space-y-4 mt-4">
            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">
                Address Search
              </Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  type="text"
                  placeholder="e.g., Empire State Building"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={searchMutation.isPending}
                />
                <Button type="submit" size="icon" disabled={searchMutation.isPending}>
                  {searchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
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

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={onGetCurrentLocation}
            >
              <Locate className="w-4 h-4 mr-2" />
              Use My Location
            </Button>

            {currentPosition && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-foreground">Current Location</h2>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={onSaveFavorite}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
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
                  {currentPosition.address && (
                    <div className="text-sm pt-2">
                      <span className="text-muted-foreground">Address:</span>
                      <p className="text-foreground mt-1">{currentPosition.address}</p>
                    </div>
                  )}
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
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4 mt-4">
            {isLoadingFavorites ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved favorites yet. Save your first location!
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {favorites.map((fav) => (
                    <div
                      key={fav.id}
                      className="p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex-1"
                          onClick={() => onNavigate(fav.latitude, fav.longitude)}
                        >
                          <div className="font-medium flex items-center gap-2">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            {fav.name}
                          </div>
                          {fav.address && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {fav.address}
                            </p>
                          )}
                          <p className="text-xs font-mono text-muted-foreground mt-1">
                            {fav.latitude.toFixed(6)}°, {fav.longitude.toFixed(6)}°
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFavorite(fav.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}

function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  mapStyle,
  onMapStyleChange,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  mapStyle: keyof typeof MAP_STYLES;
  onMapStyleChange: (style: keyof typeof MAP_STYLES) => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Select value={mapStyle} onValueChange={(value) => onMapStyleChange(value as keyof typeof MAP_STYLES)}>
        <SelectTrigger className="w-[180px] bg-secondary shadow-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(MAP_STYLES).map(([key, style]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4" />
                {style.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
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
  const [currentAddress, setCurrentAddress] = useState<string | undefined>(undefined);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>("street");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const mapRef = useRef<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery<Favorite[]>({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const response = await fetch("/api/favorites");
      if (!response.ok) throw new Error("Failed to fetch favorites");
      return response.json();
    },
  });

  const reverseGeocodeMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reverse geocode");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.display_name) {
        setCurrentAddress(data.display_name);
      }
    },
    onError: () => {
      setCurrentAddress(undefined);
    },
  });

  const saveFavoriteMutation = useMutation({
    mutationFn: async (favorite: { name: string; latitude: number; longitude: number; address?: string }) => {
      const existingFavorite = favorites.find(
        (f) => Math.abs(f.latitude - favorite.latitude) < 0.0001 && Math.abs(f.longitude - favorite.longitude) < 0.0001
      );
      
      if (existingFavorite) {
        throw new Error("This location is already in your favorites");
      }

      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(favorite),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save favorite");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Favorite Saved",
        description: "Location added to favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message,
      });
    },
  });

  const deleteFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/favorites/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete favorite");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Favorite Deleted",
        description: "Location removed from favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message,
      });
    },
  });

  const handleNavigate = useCallback((lat: number, lng: number) => {
    const newPosition: LatLngExpression = [lat, lng];
    setMapCenter(newPosition);
    setMarkerPosition(newPosition);
    setZoom(13);
    reverseGeocodeMutation.mutate({ lat, lng });
  }, [reverseGeocodeMutation]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    handleNavigate(lat, lng);
    toast({
      title: "Location Selected",
      description: `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`,
    });
  }, [handleNavigate, toast]);

  const handleSaveFavorite = () => {
    setSaveDialogOpen(true);
  };

  const handleSaveFavoriteConfirm = (name: string) => {
    if (!markerPosition) return;
    
    const [lat, lng] = Array.isArray(markerPosition) 
      ? markerPosition 
      : [markerPosition.lat, markerPosition.lng];
    
    saveFavoriteMutation.mutate({
      name,
      latitude: lat,
      longitude: lng,
      address: currentAddress,
    });
  };

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleNavigate(position.coords.latitude, position.coords.longitude);
          toast({
            title: "Location Found",
            description: "Navigated to your current location",
          });
        },
        (error) => {
          toast({
            variant: "destructive",
            title: "Location Error",
            description: "Could not get your location. Please enable location services.",
          });
        }
      );
    } else {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
      });
    }
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
    setCurrentAddress(undefined);
  };

  const getCurrentPosition = () => {
    if (!markerPosition) return null;
    const [lat, lng] = Array.isArray(markerPosition) 
      ? markerPosition 
      : [markerPosition.lat, markerPosition.lng];
    return { lat, lng, address: currentAddress };
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden">
        <CoordinateInputPanel
          onNavigate={handleNavigate}
          currentPosition={getCurrentPosition()}
          onSaveFavorite={handleSaveFavorite}
          onGetCurrentLocation={handleGetCurrentLocation}
          favorites={favorites}
          isLoadingFavorites={isLoadingFavorites}
          onDeleteFavorite={(id) => deleteFavoriteMutation.mutate(id)}
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
              attribution={MAP_STYLES[mapStyle].attribution}
              url={MAP_STYLES[mapStyle].url}
            />
            <MapController center={mapCenter} zoom={zoom} />
            <MapClickHandler onMapClick={handleMapClick} />
            {markerPosition && (
              <Marker position={markerPosition} icon={customMarkerIcon}>
                <Popup>
                  <div className="p-2">
                    <p className="font-medium mb-1">Selected Location</p>
                    <p className="text-sm font-mono">
                      {Array.isArray(markerPosition)
                        ? `${markerPosition[0].toFixed(6)}°, ${markerPosition[1].toFixed(6)}°`
                        : `${markerPosition.lat.toFixed(6)}°, ${markerPosition.lng.toFixed(6)}°`}
                    </p>
                    {currentAddress && (
                      <p className="text-xs text-muted-foreground mt-2">{currentAddress}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}
            {favorites.map((fav) => (
              <Marker 
                key={fav.id} 
                position={[fav.latitude, fav.longitude]} 
                icon={favoriteMarkerIcon}
              >
                <Popup>
                  <div className="p-2">
                    <p className="font-medium mb-1">{fav.name}</p>
                    <p className="text-sm font-mono">
                      {fav.latitude.toFixed(6)}°, {fav.longitude.toFixed(6)}°
                    </p>
                    {fav.address && (
                      <p className="text-xs text-muted-foreground mt-2">{fav.address}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
            mapStyle={mapStyle}
            onMapStyleChange={setMapStyle}
          />
        </div>
      </div>
      
      <SaveFavoriteDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        position={getCurrentPosition()}
        address={currentAddress}
        onSave={handleSaveFavoriteConfirm}
      />
    </>
  );
}
