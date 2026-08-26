terraform {
  required_version = ">= 1.6.0"

  # Configure backend with `terraform init -backend-config=backend.hcl`.
  # Keep local state only as a temporary fallback for quick experiments.
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = var.owner
  }
}

module "foundation" {
  source = "../../modules/foundation"

  project_name                = var.project_name
  environment                 = var.environment
  aws_region                  = var.aws_region
  resume_bucket_force_destroy = var.resume_bucket_force_destroy
  xai_api_key                 = var.xai_api_key
  tags                        = local.common_tags
}
