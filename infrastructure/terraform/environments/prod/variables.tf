variable "project_name" {
  type    = string
  default = "ai-hiring-platform"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "owner" {
  type    = string
  default = "platform-team"
}

variable "resume_bucket_force_destroy" {
  type    = bool
  default = false
}
