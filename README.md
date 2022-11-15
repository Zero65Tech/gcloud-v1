**Cloud Run (gcloud)**
- Receives http post requests from **GitHub** on a webhook.
- Creates a build on **Cloud Build** for each request.

**Cloud Build**
- Uses **SSH_KEY** stored with **Security / Secret Manager** to pull repositories from **GitHub**.
- Uses **Dockerfile** to build a docker image.
- Pushes the docker image to **Artifacts Registry**.
- Deploys a new **Cloud Run (same-as-repo-name)** version with the docker image.


### Script to clean-up Google Cloud Contain Registry
```
PROJECT="zero65"
REGISTRY="gcloud"

while true; do
  echo "\n"
  DIGEST=$(gcloud container images list-tags gcr.io/$PROJECT/$REGISTRY --format="get(digest)" --limit 1)
  if [ "$DIGEST" = "" ]; then
    break;
  fi  
  gcloud container images delete gcr.io/$PROJECT/$REGISTRY@$DIGEST --force-delete-tags --quiet
done
```
