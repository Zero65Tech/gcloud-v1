**Cloud Run (gcloud)**
- Receives http post requests from **GitHub** on a webhook.
- Creates a build on **Cloud Build** for each request.

**Cloud Build**
- Uses **SSH_KEY** stored with **Security / Secret Manager** to pull repositories from **GitHub**.
- Uses **Dockerfile** to build a docker image.
- Pushes the docker image to **Artifacts Registry**.
- Deploys a new **Cloud Run (same-as-repo-name)** version with the docker image.
