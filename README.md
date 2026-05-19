# AI Hiring Platform

Cloud-native AI-powered hiring platform for resume screening, candidate ranking, and interview question generation.

## Week 1 Status (Foundation)
- MVP scope frozen
- Monorepo layout finalized (`frontend`, `backend`, `infrastructure`, `docs`, `scripts`)
- Terraform baseline added for `dev` and `prod`
- DynamoDB single-table model defined with `tenantId` partition strategy

## Terraform Baseline Components
- S3 resume bucket
- SQS processing queue + DLQ
- Lambda `parse-resume` skeleton
- DynamoDB single-table with GSIs
- Cognito user pool, client, role groups
- API Gateway baseline REST API
- CloudWatch log group + alarms

## Quick Start (Dev)
```powershell
cd infrastructure/terraform/environments/dev
Copy-Item terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Docs
- Week 1 foundation guide: `docs/WEEK1_FOUNDATION.md`
- Data model: `docs/DYNAMODB_SINGLE_TABLE.md`
- Phase 1 architecture: `docs/PHASE1_SYSTEM_DESIGN.md`
