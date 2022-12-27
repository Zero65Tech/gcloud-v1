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

exports.auth = (serviceAccount) => {
  return {
    id: 'Identity Token',
    name: 'gcr.io/cloud-builders/gcloud',
    script: `gcloud auth print-identity-token --impersonate-service-account=${ serviceAccount } >> .auth`
  }
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

  let steps = [];

  if(config.file)
    steps.push({
      id: 'Dockerfile',
      name: 'gcr.io/cloud-builders/curl',
      args: [ '-o', 'Dockerfile', `https://gcloud.zero65.in/build/dockerfile/${ config.file }` ]
    });

  let registry = Config.artifacts.docker['default'];
  if(Config.artifacts.docker[config.name])
    registry = { ...registry, ...Config.artifacts.docker[config.name] };

  let tag = `${ registry.region }-docker.pkg.dev/${ registry.project }/${ registry.repository }/${ config.name }:${ config.tag }`;

  steps.push({
    id: 'Docker Build',
    name: 'gcr.io/cloud-builders/docker',
    args: [ 'build', '-t', tag, '-f', `Dockerfile`, '.' ]
  });

  steps.push({
    id: 'Docker Push',
    name: 'gcr.io/cloud-builders/docker',
    args: [ 'push', tag ]
  });

  return steps;

}

exports.deployRun = (config, dockerConfig) => {

  let service = Config.run['default'];
  if(Config.run[config.name])
    service = { ...service, ...Config.run[config.name] };

  if(config.overrides)
    service = { ...service, ...config.overrides };

  let registry = Config.artifacts.docker['default'];
  if(Config.artifacts.docker[dockerConfig.name])
    registry = { ...registry, ...Config.artifacts.docker[dockerConfig.name] };

  return {
    id: 'Run Deploy',
    name: 'gcr.io/cloud-builders/gcloud',
    args: [
      'run', 'deploy', service.name || config.name,
      '--image', `${ registry.region }-docker.pkg.dev/${ registry.project }/${ registry.repository }/${ dockerConfig.name }:${ dockerConfig.tag }`,
      '--region',   service['region'],
      '--platform', service['platform'],
      '--port',     service['port'],
      '--memory',   service['memory'],
      '--cpu',      service['cpu'],
      '--timeout',       service['timeout'],
      '--concurrency',   service['concurrency'],
      '--min-instances', service['min-instances'],
      '--max-instances', service['max-instances'],
      '--service-account', service['service-account']
    ]
  };

}
