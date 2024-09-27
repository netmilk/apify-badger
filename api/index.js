import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { ApifyClient } from 'apify-client'
import { Actor } from 'apify'

import path from 'node:path'
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
TimeAgo.addDefaultLocale(en)


const timeAgo = new TimeAgo('en-US')
const client = new ApifyClient()
await Actor.init();

//console.log(process.env)
const config = {

  "port": process.env.ACTOR_STANDBY_PORT,
  //"port": Actor.config.get('standbyPort'),
  "bodyLimit": "100kb",
  "corsHeaders": ["Link"]
}


let app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, './views'))

app.server = http.createServer(app);

// logger
app.use(morgan('dev'));

// 3rd party middleware
app.use(cors({
	exposedHeaders: config.corsHeaders
}));

app.use(bodyParser.json({
	limit : config.bodyLimit
}));	

app.get("/badge/:userName/:actorName", async (req,res) =>{

  res.setHeader('Content-Type', 'image/svg+xml');

  const actor = await client.actor(req['params']['userName'] + '/' + req['params']['actorName']).get()
  const ago = timeAgo.format(new Date(actor['stats']['lastRunStartedAt']), 'mini') + " ago"
  const users = Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(actor['stats']['totalUsers'])
  
  const defaultRunTag = actor['defaultRunOptions']['build']

  const lastBuild = await client.build(actor['taggedBuilds'][defaultRunTag]['buildId']).get()
  const buildStatus =  lastBuild.status == 'SUCCEEDED' ? 'passing' : 'failing'


  const runs = Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(actor['stats']['totalRuns']);
  
  let templateName = "apify"

  if(req['query']['type'] == "classic"){
    templateName = 'classic'
  }

  res.render(templateName, {
    actor,
    ago,
    runs,
    users,
    buildStatus
  })
})

console.log("config", config)
app.server.listen( config.port, () => {
  console.log(`Started on port ${app.server.address().port}`);
});

export default app;
