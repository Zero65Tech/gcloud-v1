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



app.get('/', async (req, res) => {
  res.send('Hello World !');
});

app.use('/build/dockerfile', express.static(`${ __dirname }/build/dockerfile`));

app.post('/build/github', async (req, res) => {

  let commit = req.body.head_commit;
  if(commit.author.email == 'google-cloud-build@zero65.in')
    return res.send('Ignoring as the commit is created by google-cloud-build@zero65.in !');

  let configs = gitRepoBuildConfigMap[`github.com/${ req.body.repository.owner.name }/${ req.body.repository.name }`];
  if(!configs)
    return res.send('No config found !');

  for(let config of configs) {

    let steps = BuildSteps.gitClonePrivate(config.git, 'SSH_KEY');

    if(config.auth)
      steps.push(BuildSteps.auth(config.auth));

    if(config.npm)
      steps = steps.concat(BuildSteps.npmScripts(config.npm));

    if(config.docker)
      steps = steps.concat(BuildSteps.docker({ ...config.docker, ...{ tag: commit.id } }));

    if(config.deploy)
      for(deployConfig of config.deploy) {
        if(!deployConfig.auto)
          break;
        if(deployConfig.type == 'run')
          steps.push(BuildSteps.deployRun(deployConfig, { ...config.docker, ...{ tag: commit.id } }));
      }

    await CloudBuild.createBuild({
      projectId: config.project,
      build: {
        steps: steps,
        availableSecrets: {
          secretManager: [{
            versionName: config.ssh,
            env: 'SSH_KEY'
          }]
        }
      }
    });

  }

  res.send(`${ configs.length } build(s) created successfully !`);

});



app.listen(process.env.PORT || 8080, console.log(`index: Server is up and listening at ${ process.env.PORT || 8080 } port.`));
