const express = require('express');
const app     = express();

const { CloudBuildClient } = require('@google-cloud/cloudbuild').v1;

app.use(express.json());

const CloudBuild = new CloudBuildClient();

const ConfigRun = require('./config').run;
const BuildSteps = require('./build/steps');



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
      "steps":
      BuildSteps.gitClonePrivate('git@github.com:Zero65Tech/gcloud.git')
        .concat(BuildSteps.artifactsNpm())
        .concat(BuildSteps.buildDocker(`${ config.region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:${ commit.id }`))
        .concat(BuildSteps.deployRun(repository.name, `${ config.region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:${ commit.id }`, config))
      ,
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
