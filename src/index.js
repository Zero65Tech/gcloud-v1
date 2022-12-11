const express = require('express');
const app     = express();

const { CloudBuildClient } = require('@google-cloud/cloudbuild').v1;

app.use(express.json());

const CloudBuild = new CloudBuildClient();

const Config = require('./config');
const BuildSteps = require('./build/steps');



app.post('/github-webhook', async (req, res) => {

  let commit = req.body.head_commit;
  if(commit.author.email == 'google-cloud-build@zero65.in')
    return res.send('No action required !');

  let repository = req.body.repository;
  let name = repository.name;
  if(!Config.build[name]) // TODO: Use repo in build config instead
    return res.send('No action required !');

  let npmRepo     = { ...Config.artifacts.npm['default'],    ...(Config.artifacts.npm['@zero65'] || {}) };
  let dockerRepo  = { ...Config.artifacts.docker['default'], ...(Config.artifacts.docker[name]   || {}) };
  let buildConfig = { ...Config.build['default'],            ...(Config.build[name]              || {}) };
  let runConfig   = { ...Config.run['default'],              ...(Config.run[name]                || {}) };

  dockerRepo.name = dockerRepo.name || name;
  dockerRepo.tag  = dockerRepo.tag  || commit.id;

  // TODO: process nested fields in build config

  const request = {
    projectId: buildConfig.project,
    build: {
      steps: BuildSteps.gitClonePrivate(`git@github.com:Zero65Tech/${ name }.git`)
        .concat(BuildSteps.artifactsNpm('@zero65', npmRepo))
        .concat(BuildSteps.buildDocker(dockerRepo))
        .concat(BuildSteps.deployRun(name, dockerRepo, runConfig))
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
