# Week 1 Verification Runbook

Use this after updating `infrastructure/terraform/environments/dev/backend.hcl` from the example.

## 1) Configure remote state
Create `infrastructure/terraform/environments/dev/backend.hcl` from `backend.hcl.example` and set:
- `bucket`
- `dynamodb_table`
- `region`

## 2) Initialize and plan
Run from `infrastructure/terraform/environments/dev`:

```bash
terraform init -backend-config=backend.hcl
terraform plan -var-file=terraform.tfvars
```

## 3) Apply baseline
```bash
terraform apply -var-file=terraform.tfvars
```

## 4) Capture proof artifacts
```bash
terraform output -json > ../../../../docs/ops/dev-outputs.json
```

## 5) Completion check
Week 1 is complete when:
- plan/apply succeeds in `dev`
- `docs/ops/dev-outputs.json` contains real values (no `REPLACE_ME`)
- `docs/WEEK1_FOUNDATION.md` remains approved and unchanged in scope
- `docs/DYNAMODB_SINGLE_TABLE.md` remains locked for key conventions
