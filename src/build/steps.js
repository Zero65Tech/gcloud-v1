exports.gitClonePrivate = (repositorySshUrl, sshKeySecretEnv='SSH_KEY', host='github.com') => {
  return [{
    id: 'Git Clone Private (1/2)',
    name: 'gcr.io/cloud-builders/git',
    secretEnv: [ sshKeySecretEnv ],
    script: `
      echo "$${ sshKeySecretEnv }" > /root/.ssh/id_rsa
      chmod 400 /root/.ssh/id_rsa
      ssh-keyscan -t rsa ${ host } > /root/.ssh/known_hosts
    `,
    volumes: [{
      name: 'ssh',
      path: '/root/.ssh'
    }]
  },{
    id: 'Git Clone Private (2/2)',
    name: 'gcr.io/cloud-builders/git',
    args: [ 'clone', '--depth', 1, '--single-branch', repositorySshUrl, '.' ],
    volumes: [{
      name: 'ssh',
      path: '/root/.ssh'
    }]
  }];
}

exports.artifactsNpm = (scope='@zero65', config) => {
  return [{
    id: 'Artifacts npm (1/2)',
    name: 'gcr.io/cloud-builders/gcloud',
    script: `
      gcloud artifacts print-settings npm \
        --project=${ config.project } \
        --repository=${ config.repository } \
        --location=${ config.region } \
        --scope=${ scope } > .npmrc
    `
  },{
    id: 'Artifacts npm (2/2)',
    name: 'gcr.io/cloud-builders/npm',
    script: `
      npx google-artifactregistry-auth
      echo "\n" >> .npmrc
      cat ~/.npmrc >> .npmrc
    `
  }];
}

exports.buildDocker = (dockerRepo) => {
  let tag = `${ dockerRepo.region }-docker.pkg.dev/${ dockerRepo.project }/${ dockerRepo.repository }/${ dockerRepo.name }:${ dockerRepo.tag }`;
  return [{
    id: 'Docker Build (1/2)',
    name: 'gcr.io/cloud-builders/docker',
    args: [ 'build', '-t', tag, '-f', `Dockerfile`, '.' ]
  },{
    id: 'Docker Build (2/2)',
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
