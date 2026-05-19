# Week 1 Foundation

## MVP Scope (Frozen)
- Candidate resume upload
- AI scoring with explainability
- Recruiter dashboard list/rank/filter
- AI interview question generation

## Monorepo Structure
- `frontend/` Next.js app
- `backend/` Lambda handlers and shared logic
- `infrastructure/` Terraform and infra scripts
- `docs/` architecture and engineering docs
- `scripts/` local utilities

## Environments
- `dev`: fast iteration, lower guardrails
- `prod`: stricter defaults and safer lifecycle settings

## Terraform Entry Points
- `infrastructure/terraform/environments/dev`
- `infrastructure/terraform/environments/prod`

Both environments call module:
- `infrastructure/terraform/modules/foundation`

## Provisioned Baseline (Week 1)
- `S3` resume bucket with public access blocked and encryption enabled
- `SQS` processing queue with `DLQ`
- `Lambda` parse-resume skeleton wired to SQS
- `DynamoDB` single-table (`PK`, `SK`) with `GSI1`, `GSI2`
- `Cognito` user pool + app client + groups (`candidate`, `recruiter`, `admin`)
- `API Gateway` REST API shell
- `CloudWatch` logs and baseline alarms for lambda errors and DLQ backlog

## Next Implementation Boundary (Week 2)
- Cognito auth in frontend
- pre-signed upload URL API
- strict file validation
- end-to-end upload flow: `Frontend -> API Gateway -> S3 -> SQS -> Lambda`
