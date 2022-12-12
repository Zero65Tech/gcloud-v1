const express = require('express');
const app     = express();

const { CloudBuildClient } = require('@google-cloud/cloudbuild').v1;

app.use(express.json());

const CloudBuild = new CloudBuildClient();

const BuildSteps = require('./build/steps');
const Config = require('./config');

const gitRepoBuildConfigMap = Object.keys(Config.build).reduce((map, name) => {

  if(name == 'default')
    return map;

  let config = JSON.parse(JSON.stringify(Config.build['default']));
  Object.keys(Config.build[name]).forEach(key => {
    let value = Config.build[name][key];
    if(config[key] && value && (typeof value == 'object') && !(value instanceof Array))
      config[key] = { ...config[key], ...value };
    else
      config[key] = value;
  });

  config.git.name = config.git.name || name;
  if(config.docker)
    config.docker.name = config.docker.name || name;
  if(config.deploy)
    config.deploy.forEach(obj => obj.name = obj.name || name);

  let gitRepo = `${ config.git.host }/${ config.git.owner }/${ config.git.name }`;
  map[gitRepo] = map[gitRepo] || [];
  map[gitRepo].push(config);

  return map;

}, {});



app.post('/github-webhook', async (req, res) => {

  let commit = req.body.head_commit;
  if(commit.author.email == 'google-cloud-build@zero65.in')
    return res.send('No action required !');

  let configs = gitRepoBuildConfigMap[`github.com/${ req.body.repository.owner.name }/${ req.body.repository.name }`];
  if(!configs)
    return res.send('No action required !');

  let name = req.body.repository.name;
  let dockerRepo  = { ...Config.artifacts.docker['default'], ...(Config.artifacts.docker[name]   || {}) };
  let runConfig   = { ...Config.run['default'],              ...(Config.run[name]                || {}) };
  dockerRepo.name = dockerRepo.name || name;
  dockerRepo.tag  = dockerRepo.tag  || commit.id;

  for(let config of configs) {

    console.log(config);

    let steps = BuildSteps.gitClonePrivate(config.git, 'SSH_KEY');
    if(config.npm)
      steps = steps.concat(BuildSteps.npmScripts(config.npm));

    const request = {
      projectId: config.project,
      build: {
        steps: steps
          .concat(BuildSteps.buildDocker(dockerRepo))
          .concat(BuildSteps.deployRun(name, dockerRepo, runConfig))
        ,
        availableSecrets: {
          secretManager: [{
            versionName: config.ssh,
            env: 'SSH_KEY'
          }]
        }
      }
    };

    await CloudBuild.createBuild(request);

  }

  res.send(`${ configs.length } build(s) created successfully !`);

});



app.listen(process.env.PORT || 8080, console.log(`index: Server is up and listening at ${ process.env.PORT || 8080 } port.`));
