import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { coordinateSchema, insertFavoriteSchema } from "@shared/schema";

const geocodeCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000;
const GLOBAL_RATE_LIMIT_DELAY = 1000;
let lastGeocodingRequest = 0;

interface RateLimitInfo {
  tokens: number;
  lastRefill: number;
}

const clientRateLimits = new Map<string, RateLimitInfo>();
const MAX_TOKENS = 10;
const REFILL_RATE = 2;
const REFILL_INTERVAL = 1000;

function getClientIdentifier(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  let limitInfo = clientRateLimits.get(clientId);

  if (!limitInfo) {
    limitInfo = { tokens: MAX_TOKENS, lastRefill: now };
    clientRateLimits.set(clientId, limitInfo);
  }

  const timePassed = now - limitInfo.lastRefill;
  const refillAmount = Math.floor(timePassed / REFILL_INTERVAL) * REFILL_RATE;
  
  if (refillAmount > 0) {
    limitInfo.tokens = Math.min(MAX_TOKENS, limitInfo.tokens + refillAmount);
    limitInfo.lastRefill = now;
  }

  if (limitInfo.tokens >= 1) {
    limitInfo.tokens -= 1;
    
    if (clientRateLimits.size > 10000) {
      const oldestKey = clientRateLimits.keys().next().value;
      if (oldestKey) {
        clientRateLimits.delete(oldestKey);
      }
    }
    
    return true;
  }

  return false;
}

async function rateLimitedGeocode(url: string): Promise<any> {
  const cacheKey = url;
  const cached = geocodeCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastGeocodingRequest;
  
  if (timeSinceLastRequest < GLOBAL_RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, GLOBAL_RATE_LIMIT_DELAY - timeSinceLastRequest));
  }

  lastGeocodingRequest = Date.now();

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MapNavigator/1.0 (Replit)',
      'Referer': 'https://replit.com',
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    throw new Error("Geocoding service unavailable");
  }

  const data = await response.json();
  geocodeCache.set(cacheKey, { data, timestamp: Date.now() });

  if (geocodeCache.size > 1000) {
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey) {
      geocodeCache.delete(firstKey);
    }
  }

  return data;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/validate-coordinates", async (req, res) => {
    try {
      const result = coordinateSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid coordinates",
          details: result.error.errors,
        });
      }

      return res.json({
        valid: true,
        coordinates: result.data,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  app.get("/api/favorites", async (req, res) => {
    try {
      const allFavorites = await storage.getFavorites();
      return res.json(allFavorites);
    } catch (error) {
      return res.status(500).json({
        error: "Failed to fetch favorites",
      });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const result = insertFavoriteSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid favorite data",
          details: result.error.errors,
        });
      }

      const newFavorite = await storage.createFavorite(result.data);
      return res.json(newFavorite);
    } catch (error) {
      return res.status(500).json({
        error: "Failed to save favorite",
      });
    }
  });

  app.delete("/api/favorites/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFavorite(id);
      
      if (!deleted) {
        return res.status(404).json({
          error: "Favorite not found",
        });
      }
      
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to delete favorite",
      });
    }
  });

  app.get("/api/geocode/reverse", async (req, res) => {
    try {
      const clientId = getClientIdentifier(req);
      
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please wait before making more requests.",
        });
      }

      const { lat, lon } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({
          error: "Missing latitude or longitude",
        });
      }

      const latNum = parseFloat(lat as string);
      const lonNum = parseFloat(lon as string);

      if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
        return res.status(400).json({
          error: "Invalid coordinates",
        });
      }

      const data = await rateLimitedGeocode(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lonNum}&addressdetails=1`
      );

      return res.json(data);
    } catch (error: any) {
      return res.status(error.message.includes("Rate limit") ? 429 : 500).json({
        error: error.message || "Failed to reverse geocode",
      });
    }
  });

  app.get("/api/geocode/search", async (req, res) => {
    try {
      const clientId = getClientIdentifier(req);
      
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please wait before making more requests.",
        });
      }

      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: "Missing search query",
        });
      }

      if (q.length > 200) {
        return res.status(400).json({
          error: "Search query too long",
        });
      }

      const data = await rateLimitedGeocode(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`
      );

      return res.json(data);
    } catch (error: any) {
      return res.status(error.message.includes("Rate limit") ? 429 : 500).json({
        error: error.message || "Failed to search address",
      });
    }
  });

  app.get("/api/geocode/autocomplete", async (req, res) => {
    try {
      const clientId = getClientIdentifier(req);
      
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please wait before making more requests.",
        });
      }

      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      if (q.length < 3) {
        return res.json([]);
      }

      if (q.length > 200) {
        return res.status(400).json({
          error: "Search query too long",
        });
      }

      const data = await rateLimitedGeocode(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=8`
      );

      return res.json(data);
    } catch (error: any) {
      return res.status(error.message.includes("Rate limit") ? 429 : 500).json({
        error: error.message || "Failed to autocomplete",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
