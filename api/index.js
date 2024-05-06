import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { ApifyClient } from 'apify-client'
import path from 'node:path'

import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
TimeAgo.addDefaultLocale(en)

const timeAgo = new TimeAgo('en-US')
const client = new ApifyClient()

const config = {
        "port": 8080,
        "bodyLimit": "100kb",
        "corsHeaders": ["Link"]
}


let app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), './api/views'))

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
  
  const defaultRunTag = actor['defaultRunOptions']['build']

  const lastBuild = await client.build(actor['taggedBuilds'][defaultRunTag]['buildId']).get()
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
