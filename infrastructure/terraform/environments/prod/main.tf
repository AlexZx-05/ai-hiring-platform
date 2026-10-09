terraform {
  required_version = ">= 1.6.0"

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
  ai_api_url                  = var.ai_api_url
  ai_model_id                 = var.ai_model_id
  tags                        = local.common_tags
}
