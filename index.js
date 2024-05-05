import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import config from './config.json'  with { type: "json" }
import { ApifyClient } from 'apify-client'

import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
TimeAgo.addDefaultLocale(en)

const timeAgo = new TimeAgo('en-US')
const client = new ApifyClient()

let app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

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
  const ago = timeAgo.format(new Date(actor['stats']['lastRunStartedAt']))
  const users = Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(actor['stats']['totalUsers'])

  const lastBuild = await client.build(actor['taggedBuilds']['latest']['buildId']).get()
  const buildStatus =  lastBuild.status == 'SUCCEEDED' ? 'passing' : 'failing'


  const runs = Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(actor['stats']['totalRuns']);

  res.render('badge', {
    actor,
    ago,
    runs,
    users,
    buildStatus
  })
})

app.server.listen(process.env.PORT || config.port, () => {
  console.log(`Started on port ${app.server.address().port}`);
});

export default app;
