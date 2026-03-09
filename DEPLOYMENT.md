# NAO Learning Platform — Deployment

## Architecture

Static site deployed to **AWS S3 + CloudFront** (serverless, ~$0.50/month).

```
User → CloudFront (CDN + HTTPS) → S3 Bucket (static files)
```

## Live URL

https://d8qh0dd85hepx.cloudfront.net

## AWS Resources

| Resource | Name / ID | Region |
|----------|-----------|--------|
| S3 Bucket | `nao-learning-platform-site` | us-east-1 |
| CloudFront Distribution | `E3O5OPO64GA2M7` | Global |
| Origin Access Control | `E2QAPRJRP0AQQZ` | — |
| AWS Account | `935118464261` (user: Danny) | — |

## How to Deploy Updates

After making changes, run these two commands from the project root:

```bash
# 1. Upload files to S3
aws s3 sync . s3://nao-learning-platform-site --delete \
  --exclude ".git/*" --exclude ".DS_Store" --exclude "downloads/*" --exclude ".github/*"

# 2. Clear the CDN cache
aws cloudfront create-invalidation --distribution-id E3O5OPO64GA2M7 --paths "/*"
```

CloudFront takes ~2-5 minutes to propagate after invalidation.

## CI/CD (Active)

GitHub Actions auto-deploys on every push to `main` via `.github/workflows/deploy.yml`.

All 5 repository secrets are configured (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`).

## Teardown

To remove all AWS resources and stop billing:

```bash
# 1. Empty and delete S3 bucket
aws s3 rm s3://nao-learning-platform-site --recursive
aws s3 rb s3://nao-learning-platform-site

# 2. Disable and delete CloudFront distribution
#    (must disable first, wait for status "Deployed", then delete)
aws cloudfront get-distribution-config --id E3O5OPO64GA2M7 > /tmp/cf-config.json
# Edit /tmp/cf-config.json: set "Enabled": false, use ETag from response
aws cloudfront update-distribution --id E3O5OPO64GA2M7 --distribution-config file:///tmp/cf-config.json --if-match <ETAG>
# Wait a few minutes, then:
aws cloudfront delete-distribution --id E3O5OPO64GA2M7 --if-match <NEW_ETAG>

# 3. Delete Origin Access Control
aws cloudfront delete-origin-access-control --id E2QAPRJRP0AQQZ --if-match ETVPDKIKX0DER
```
