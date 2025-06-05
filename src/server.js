import express from "express";
import dotenv from "dotenv";
import { sql } from "./config/db.js";
import limiterrate from "./middleware/limiterrate.js";
//import limiterrate from "./middleware/limiterrate.js";
import job from "./config/cron.js";

dotenv.config();

const app = express();
if (process.env.NODE_ENV==="production")
job.start();

//middle ware 

app.use(express.json()); app.use(limiterrate);
//app.use(limiterrate)


app.use("/api/health", ( req, res )=> {
  res.status(200).json({status:ok})
})
/*      
app.use(    (req, res, next) => {
    console.log("hey we hit with method", req.method);
    next(); 
})
 */
const PORT = process.env.PORT || 5001;
async function initDB() {
  try {
    await sql`CREATE TABLE IF NOT EXISTS transactions(
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(102) NOT NULL,
        category VARCHAR(255) NOT NULL,
        created_at DATE NOT NULL DEFAULT CURRENT_DATE
        )`;

    console.log("database intilialized succesfully ");
  } catch (error) {
    console.log("error intilizing db", error);
    process.exit(1); //status code for failure is 1 and fir 0 is sucess
  }
}

app.get("/", (req, res) => {
  res.send("its working");
});

app.get("/api/transactions/:userId", async (req, res) => {
 // console.log("Fetching transactions for", req.params.userId);
  try {
    const { userId } = req.params;

    const transactions = await sql`
      SELECT * FROM transactions WHERE user_id= ${userId} ORDER BY created_at DESC
      `;
    res.status(200).json(transactions);
  } catch (error) {
    console.log("error getting the transaction ", error);
    res.status(500).json({ message: "internal server errror" });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const { title, amount, category, user_id } = req.body;
    if (!title || !user_id || !category || amount === undefined) {
      return res.status(400).json({ message: "ALL FEILD ARE REQUIRED" });
    }

    const transaction = await sql`
      INSERT INTO transactions(user_id,title,amount,category)
      VALUES (${user_id},${title},${amount},${category})
      RETURNING *
      `;
    console.log(transaction);
    res.status(201).json(transaction[0]);
  } catch (error) {
    console.log("error in transcactin creating", error);
    res.status(500).json({ message: "internal server errror" });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ message: "invalid transaction ID" });
    }
    const result = await sql`
    DELETE FROM transactions WHERE id = ${id} RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ message: "TRANSACTION NOT FOUND" });
    }

    res.status(200).json({ message: "transaction deleted  succesfully" });
  } catch (error) {
    console.log("error  deleting in transcaction ", error);
    res.status(500).json({ message: "internal server errror" });
  }
});
/*
app.get("/api/transactions/summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const balanceResult = await sql`
  select coalesce(sum(amount),0)as balance from transactions where user_id= ${userId}
  `;
    
    const incomeResult = await sql`
    select coalesce (sum(amount),0)as income from transactions where user_id=${userId} and amount >0
    `
    const expensesResult = await sql`
    select coalesce(sum(amount),0)as expenses from transactions
    where user_id=${userId} and amount>0
    `

    res.status(200).json({
      balance: balanceResult[0].balance,
      income: incomeResult[0].income,
      expenses: expensesResult[0].expenses,
    });

    
    
    
  } catch (error) {
    console.log("error getting summary", error);
    res.status(500).json({ message: "internal server error" });
  }

})
  */
app.get("/api/transactions/summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [summary] = await sql`
      SELECT
        COALESCE(SUM(CAST(amount AS NUMERIC)), 0) AS balance,
        COALESCE(SUM(CASE WHEN CAST(amount AS NUMERIC) > 0 THEN CAST(amount AS NUMERIC) ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN CAST(amount AS NUMERIC) < 0 THEN CAST(amount AS NUMERIC) ELSE 0 END), 0) AS expenses
      FROM transactions
      WHERE user_id = ${userId}
    `;

    res.status(200).json({
      balance: summary.balance,
      income: summary.income,
      expenses: summary.expenses,
    });
  } catch (error) {
    console.error("Error fetching transaction summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

 
  
 

initDB().then(() => {
  app.listen(PORT, () => {
    console.log("server is working on the port ", PORT);
  });
});
