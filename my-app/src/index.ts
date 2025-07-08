import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import csvToJson from 'csvtojson'
import type { File } from 'buffer'
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { transactionsTable } from './db/schema.js';
const db = drizzle(process.env.DATABASE_URL!);

const app = new Hono()

interface Transaction {
  from: string;
  to: string;
  amount: string;
}

function arrayBufferToCsvString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

async function processTransactions(transactions: Transaction[]): Promise<{
  validTransactions: Transaction[];
  invalidTransactions: (Transaction & { reason: string })[];
}> { 
  const invalidTransactions: (Transaction & { reason: string })[] = [];
  const validTransactions: Transaction[] = [];

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);

    const findDuplicated = validTransactions.find(({ to, from, amount }) => transaction.to === to && transaction.from === from && transaction.amount === amount)

    if (amount < 0) { 
      invalidTransactions.push({...transaction, reason: 'Negative Amount'});
    } else if (amount > 5000000) { 
      invalidTransactions.push({...transaction, reason: 'Suspicious Transaction'});
    } else if (findDuplicated) { 
      invalidTransactions.push({...transaction, reason: 'Duplicated Transaction'});
    } else {
      validTransactions.push(transaction);
    }
  }

  return {
    validTransactions,
    invalidTransactions,
  };
}

async function saveTransactions(transactions: Transaction[]) {
  for (const transaction of transactions) {
    const newTransaction: typeof transactionsTable.$inferInsert = {
      from: transaction.from,
      to: transaction.to,
      amount: Number(transaction.amount),
    };
    await db.insert(transactionsTable).values(newTransaction);
  }
}

app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  
  const files = body['file'] as File;

  const buffer = await files.arrayBuffer();

  const csvString = arrayBufferToCsvString(buffer);

  const jsonData: Transaction[] = await csvToJson({ delimiter: ';' }).fromString(csvString);

  const processedTransactions = await processTransactions(jsonData);

  await saveTransactions(processedTransactions.validTransactions);

  return c.json(processedTransactions.invalidTransactions);
})

app.get('/transactions', async (c) => {
  const transactions = await db.select().from(transactionsTable);

  return c.json(transactions)
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
