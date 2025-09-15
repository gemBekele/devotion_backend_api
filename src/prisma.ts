// apps/server/src/prisma.ts
import { PrismaClient } from "../prisma/generated/client.js"; // Adjust path if needed

const prisma = new PrismaClient();

export default prisma;
