# Matt & Hailey's Disposable Camera

A standalone, mobile-first disposable-camera app for wedding guests. Guests
can share up to five photos from a browser without creating an account. Photos
appear in the shared guest gallery as soon as each upload completes. Hosts can
review the roll and delete photos using a protected host page.

## Project layout

- `client/`: React + Vite camera, personal roll, public gallery, and host review.
- `backend/src/handler.mjs`: AWS Lambda API.
- `template.yaml`: AWS SAM infrastructure for the API, Lambda, DynamoDB, and
  private S3 bucket.

## Deploy the backend

Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
and [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html),
then configure AWS credentials. From this repository's root:

```bash
sam build
sam deploy --guided
```

Save the stack's `ApiUrl` output; it is the client's `VITE_API_URL`.
The table and photo bucket use retain policies to prevent accidental
CloudFormation stack deletion from deleting guest data.

To enable host review, put a code in a local `.env` file (never commit it) and
deploy only its SHA-256 digest:

```bash
set -a
source .env
set +a
CAMERA_ADMIN_CODE_HASH="$(printf %s "$CAMERA_ADMIN_CODE" | shasum -a 256 | cut -d ' ' -f 1)"
sam deploy --parameter-overrides "CameraAdminCodeHash=$CAMERA_ADMIN_CODE_HASH" "CameraPhotosPerGuest=5"
unset CAMERA_ADMIN_CODE CAMERA_ADMIN_CODE_HASH
```

The API stores only the hash. Do not put the raw access code in source control
or a client build variable. The code protects host review and photo deletion;
guest photos are public in the shared gallery immediately after upload.

## Run locally

```bash
npm ci --prefix client
# Set VITE_API_URL in client/.env to the deployed API URL.
./launch.sh
```

Open http://localhost:5173. Camera access works on localhost after you grant
browser permission. To test from a phone, use a secure deployment (for example
GitHub Pages); browsers require HTTPS for camera access on other devices.

## Publish on GitHub Pages

Set the repository's Pages source to **GitHub Actions**, add the public API
endpoint as the `VITE_API_URL` Actions variable, and run **Deploy wedding camera
to GitHub Pages** from the Actions tab.
