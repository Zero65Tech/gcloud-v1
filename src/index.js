const express = require('express');
const app     = express();

const { CloudBuildClient } = require('@google-cloud/cloudbuild').v1;
const { Obj, File } = require('@zero65/utils');

app.use(express.json());

const CloudBuild = new CloudBuildClient();

const BuildSteps = require('./build/steps');
const Config = require('./config');



const gitRepoBuildConfigMap = Object.keys(Config.build).reduce((map, name) => {

  if(name == 'default')
    return map;

  let config = Obj.clone(Config.build['default']);
  for(let [ key, value ] of Object.entries(Config.build[name])) {
    if(config[key] && value && (typeof value == 'object') && !(value instanceof Array))
      config[key] = { ...config[key], ...value };
    else
      config[key] = value;
  }

  config.git.name = config.git.name || name;

  if(config.docker)
    config.docker.name = config.docker.name || name;

  if(config['deploy'])
    config['deploy'].forEach(obj => obj.name = obj.name || name);
  else
    config['deploy'] = [];

  if(config['deploy-test'])
    config['deploy-test'].forEach(obj => obj.name = obj.name || name);
  else
    config['deploy-test'] = [];

  let gitRepo = `${ config.git.host }/${ config.git.owner }/${ config.git.name }`;
  Obj.push(map, [ gitRepo ], config);

  return map;

}, {});



app.use('/build/dockerfile', express.static(`${ __dirname }/build/dockerfile`));

app.post('/build/github', async (req, res) => {

  let commit = req.body.head_commit;
  if(commit.author.email == 'google-cloud-build@zero65.in')
    return res.send('Ignoring as the commit is created by google-cloud-build@zero65.in !');

  let configs = gitRepoBuildConfigMap[`github.com/${ req.body.repository.owner.name }/${ req.body.repository.name }`];
  if(!configs)
    return res.send('No config found !');

  let branch = req.body.ref.substring('refs/heads/'.length);

  for(let config of configs) {

    let steps = BuildSteps.gitClonePrivate({ ...config.git, branch: branch }, 'SSH_KEY');

    if(config.npm)
      steps = steps.concat(BuildSteps.npmScripts(config.npm));

    if(config.docker)
      steps = steps.concat(BuildSteps.docker({ ...config.docker, tag: commit.id }));

    let deployConfigArr = branch == req.body.repository.master_branch ? config['deploy'] : config['deploy-test'];
    for(deployConfig of deployConfigArr) {
      if(!deployConfig.auto)
        break;
      if(deployConfig.type == 'run')
        steps.push(BuildSteps.deployRun(deployConfig, { ...config.docker, tag: commit.id }));
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
