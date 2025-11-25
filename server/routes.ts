import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { coordinateSchema } from "@shared/schema";

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

  const httpServer = createServer(app);

  return httpServer;
}
