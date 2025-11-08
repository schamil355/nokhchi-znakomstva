import "@nestjs/common";

declare module "express" {
  interface Request {
    user?: { id: string; role?: string };
  }
}
