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
  }, {
    id: 'Git Clone Private (2/2)',
    name: 'gcr.io/cloud-builders/git',
    args: [ 'clone', '--depth', 1, '--single-branch', repositorySshUrl, '.' ],
    volumes: [{
      name: 'ssh',
      path: '/root/.ssh'
    }]
  }];
}

exports.artifactsNpm = (project='zero65', repository='npm', location='asia-southeast1', scope='@zero65') => {
  return [{
    id: 'Artifacts npm (1/1)',
    name: 'gcr.io/cloud-builders/gcloud',
    script: `
      gcloud artifacts print-settings npm \
        --project=${ project } \
        --repository=${ repository } \
        --location=${ location } \
        --scope=${ scope } > .npmrc
    `
  }, {
    id: 'Artifacts npm (1/2)',
    name: 'gcr.io/cloud-builders/npm',
    script: 'npx google-artifactregistry-auth'
  }];
}
