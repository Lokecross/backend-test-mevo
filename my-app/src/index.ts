import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import csvToJson from 'csvtojson'
import fs from 'fs'
import type { File } from 'buffer'

const app = new Hono()

function arrayBufferToCsvString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  
  const files = body['file'] as File;

  // check if files is an array and has length
  if (!files || (Array.isArray(files) && files.length === 0)) {
    return c.json({ message: "No files uploaded" }, 400);
  }

  // if files is not an array, convert it to an array
  const fileArray = Array.isArray(files) ? files : [files];

  const buffer = await files.arrayBuffer();

  const csvString = arrayBufferToCsvString(buffer);

  const jsonData = await csvToJson({ delimiter: ';' }).fromString(csvString);

  return c.json(jsonData)
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
