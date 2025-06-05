import { neon } from "@neondatabase/serverless";
import "dotenv/config"



//sql daytabase creation 
export const sql = neon(process.env.DATABASE_URL);