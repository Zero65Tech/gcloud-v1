const Config = require('../config');



exports.gitClonePrivate = (repo, sshKeySecretEnv) => {
  return [{
    id: 'Git Clone Private (1/2)',
    name: 'gcr.io/cloud-builders/git',
    secretEnv: [ sshKeySecretEnv ],
    script: `
      echo "$${ sshKeySecretEnv }" > /root/.ssh/id_rsa
      chmod 400 /root/.ssh/id_rsa
      ssh-keyscan -t rsa ${ repo.host } > /root/.ssh/known_hosts
    `,
    volumes: [{
      name: 'ssh',
      path: '/root/.ssh'
    }]
  },{
    id: 'Git Clone Private (2/2)',
    name: 'gcr.io/cloud-builders/git',
    args: [ 'clone', '--depth', 1, '--single-branch', `git@${ repo.host }:${ repo.owner }/${ repo.name }.git`, '.' ],
    volumes: [{
      name: 'ssh',
      path: '/root/.ssh'
    }]
  }];
}

exports.npmScripts = (config) => {

  let steps = [];

  if(config.scopes) {

    let script = '';

    config.scopes.forEach(scope => {
      let registry = Config.artifacts.npm['default'];
      if(Config.artifacts.npm[scope])
        registry = { ...registry, ...Config.artifacts.npm[scope] };
      script += `
        gcloud artifacts print-settings npm \
          --project=${ registry.project } \
          --repository=${ registry.repository } \
          --location=${ registry.region } \
          --scope=${ scope } >> .npmrc
        echo "\n" >> .npmrc
      `
    });

    steps.push({
      id: 'Artifacts Registry (1/2)',
      name: 'gcr.io/cloud-builders/gcloud',
      script: script
    });

    steps.push({
      id: 'Artifacts Registry (2/2)',
      name: 'gcr.io/cloud-builders/npm',
      script: 'npx google-artifactregistry-auth'
    });

  }

  if(config.cmds) {
    config.cmds.forEach(cmd => steps.push({
      id: 'npm ' + cmd,
      name: config.builder || 'gcr.io/cloud-builders/npm',
      script: 'npm ' + cmd
    }));
  }

  return steps;

}

exports.docker = (config) => {

  let registry = Config.artifacts.docker['default'];
  if(Config.artifacts.docker[config.name])
    registry = { ...registry, ...Config.artifacts.docker[config.name] };

  let tag = `${ registry.region }-docker.pkg.dev/${ registry.project }/${ registry.repository }/${ config.name }:${ config.tag }`;
  return [{
    id: 'Docker Build',
    name: 'gcr.io/cloud-builders/docker',
    args: [ 'build', '-t', tag, '-f', `Dockerfile`, '.' ]
  }, {
    id: 'Docker Push',
    name: 'gcr.io/cloud-builders/docker',
    args: [ 'push', tag ]
  }];

}

exports.deployRun = (serviceName, dockerRepo, config) => {
  return [{
    id: 'Run Deploy',
    name: 'gcr.io/cloud-builders/gcloud',
    args: [
      'run', 'deploy', serviceName,
      '--image', `${ dockerRepo.region }-docker.pkg.dev/${ dockerRepo.project }/${ dockerRepo.repository }/${ dockerRepo.name }:${ dockerRepo.tag }`,
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
  }];
}
