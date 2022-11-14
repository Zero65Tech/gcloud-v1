const express = require('express');
const app     = express();

const { CloudBuildClient } = require('@google-cloud/cloudbuild').v1;

app.use(express.json());

const CloudBuild = new CloudBuildClient();



app.get('/', async (req, res) => {
  res.send('Hello GCloud !');
});

app.post('/github-webhook', async (req, res) => {

  let projectId = 'zero65';
  let region = 'asia-southeast1';
  let registry = 'docker';
  let repository = req.body.repository;
  let commit = req.body.head_commit;

  const request = {
    projectId: projectId,
    build: {
      "steps": [
        {
          name: 'gcr.io/cloud-builders/git',
          args: [ 'clone', repository.clone_url ]
        },
        {
          name: 'gcr.io/cloud-builders/docker',
          args: [
            'build',
            '-t', `${ region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:${ commit.id }`,
            '-t', `${ region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:latest`,
            '-f', `${ repository.name }/Dockerfile`,
            repository.name ]
        },
        {
          name: 'gcr.io/cloud-builders/docker',
          args: ['push', `${ region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:${ commit.id }`]
        },
        {
          name: 'gcr.io/cloud-builders/docker',
          args: ['push', `${ region }-docker.pkg.dev/${ projectId }/${ registry }/${ repository.name }:latest`]
        }
      ]
    }
  };

  await CloudBuild.createBuild(request);

  res.send('Build created successfully !');

});



app.listen(process.env.PORT || 8080, console.log(`index: Server is up and listening at ${ process.env.PORT || 8080 } port.`));
