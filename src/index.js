const express = require('express');
const app     = express();

const { CloudBuildClient } = require('@google-cloud/cloudbuild').v1;

app.use(express.json());

const CloudBuild = new CloudBuildClient();

const ConfigRun = require('../config/run.json');



app.get('/', async (req, res) => {
  res.send('Hello GCloud !');
});

app.post('/github-webhook', async (req, res) => {

  let projectId  = 'zero65';
  let registry   = 'docker';
  let repository = req.body.repository;
  let commit     = req.body.head_commit;

  let config = ConfigRun[repository.name];
  if(!config)
    return res.send('No action required !');
  config = { ...ConfigRun.default, ...config }

  const request = {
    projectId: projectId,
    build: {
      "steps": [
        {
          name: 'gcr.io/cloud-builders/git',
          args: [ 'clone', repository.clone_url ]
        },
        {
          name: 'gcr.io/cloud-builders/docker',
          args: [
            'build',
            '-t', `${ config.region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:${ commit.id }`,
            '-t', `${ config.region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:latest`,
            '-f', `${ repository.name }/Dockerfile`,
            repository.name
          ]
        },
        {
          name: 'gcr.io/cloud-builders/docker',
          args: [ 'push', `${ config.region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:${ commit.id }` ]
        },
        {
          name: 'gcr.io/cloud-builders/docker',
          args: [ 'push', `${ config.region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:latest` ]
        },
        {
          name: 'gcr.io/cloud-builders/gcloud',
          args: [
            'run', 'deploy', repository.name,
            '--image', `${ config.region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:${ commit.id }`,
            '--region',   config['region'],
            '--platform', config['platform'],
            '--port',     config['port'],
            '--memory',   config['memory'],
            '--cpu',      config['cpu'],
            '--timeout',       config['timeout'],
            '--concurrency',   config['concurrency'],
            '--min-instances', config['min-instances'],
            '--max-instances', config['max-instances'],
            '--service-account', config['service-account']
          ]
        }
      ]
    }
  };

  await CloudBuild.createBuild(request);

  res.send('Build created successfully !');

});



app.listen(process.env.PORT || 8080, console.log(`index: Server is up and listening at ${ process.env.PORT || 8080 } port.`));
