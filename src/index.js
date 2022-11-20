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

  if(commit.author.email == 'google-cloud-build@zero65.in')
    return res.send('No action required !');

  const request = {
    projectId: projectId,
    build: {
      "steps": [
        {
          name: 'gcr.io/cloud-builders/git',
          secretEnv: [ 'SSH_KEY' ],
          entrypoint: 'bash',
          args: [ '-c', 'echo "$$SSH_KEY" >> /root/.ssh/id_rsa && chmod 400 /root/.ssh/id_rsa && ssh-keyscan -t rsa github.com >> /root/.ssh/known_hosts' ],
          volumes: [{
            name: 'ssh',
            path: '/root/.ssh'
          }]
        },
        {
          name: 'gcr.io/cloud-builders/git',
          args: [ 'clone', repository.ssh_url, '.' ],
          volumes: [{
            name: 'ssh',
            path: '/root/.ssh'
          }]
        },
        {
          name: 'gcr.io/cloud-builders/gcloud',
          entrypoint: 'bash',
          args: [ '-c', 'touch .npmrc && echo "\n" >> .npmrc && gcloud artifacts print-settings npm --project=zero65 --repository=npm --location=asia-southeast1 --scope=@zero65 >> .npmrc' ]
        },
        {
          name: 'gcr.io/cloud-builders/npm',
          entrypoint: 'npx',
          args: [ 'google-artifactregistry-auth' ]
        },
        {
          name: 'gcr.io/cloud-builders/git',
          entrypoint: 'bash',
          args: [ '-c', 'echo "\n" >> .npmrc && cat ~/.npmrc >> .npmrc' ]
        },
        {
          name: 'gcr.io/cloud-builders/docker',
          args: [
            'build',
            '-t', `${ config.region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:${ commit.id }`,
            '-f', `Dockerfile`,
            '.'
          ]
        },
        {
          name: 'gcr.io/cloud-builders/docker',
          args: [ 'push', `${ config.region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:${ commit.id }` ]
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
      ],
      availableSecrets: {
        secretManager: [{
          versionName: 'projects/zero65/secrets/SSH_KEY/versions/latest',
          env: 'SSH_KEY'
        }]
      }
    }
  };

  await CloudBuild.createBuild(request);

  res.send('Build created successfully !');

});



app.listen(process.env.PORT || 8080, console.log(`index: Server is up and listening at ${ process.env.PORT || 8080 } port.`));
