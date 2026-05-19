data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_s3_bucket" "resumes" {
  bucket        = "${var.project_name}-${var.environment}-${data.aws_caller_identity.current.account_id}-resumes"
  force_destroy = var.resume_bucket_force_destroy

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-resumes"
  })
}

resource "aws_s3_bucket_public_access_block" "resumes" {
  bucket                  = aws_s3_bucket.resumes.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "resumes" {
  bucket = aws_s3_bucket.resumes.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_sqs_queue" "resume_processing_dlq" {
  name = "${var.project_name}-${var.environment}-resume-processing-dlq"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-resume-processing-dlq"
  })
}

resource "aws_sqs_queue" "resume_processing" {
  name = "${var.project_name}-${var.environment}-resume-processing"

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.resume_processing_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-resume-processing"
  })
}

resource "aws_dynamodb_table" "hiring_platform" {
  name         = "${var.project_name}-${var.environment}-core"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "GSI2"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-core"
  })
}

resource "aws_cloudwatch_log_group" "lambda_parse_resume" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-parse-resume"
  retention_in_days = 30

  tags = var.tags
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda_parse_resume" {
  name               = "${var.project_name}-${var.environment}-parse-resume-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = var.tags
}

data "aws_iam_policy_document" "lambda_parse_resume" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["${aws_cloudwatch_log_group.lambda_parse_resume.arn}:*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.resumes.arn,
      "${aws_s3_bucket.resumes.arn}/*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:GetItem"
    ]
    resources = [aws_dynamodb_table.hiring_platform.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [aws_sqs_queue.resume_processing.arn]
  }
}

resource "aws_iam_role_policy" "lambda_parse_resume" {
  role   = aws_iam_role.lambda_parse_resume.id
  policy = data.aws_iam_policy_document.lambda_parse_resume.json
}

data "archive_file" "parse_resume_stub" {
  type        = "zip"
  output_path = "${path.module}/.artifacts/parse-resume.zip"

  source {
    content  = "exports.handler = async () => ({ statusCode: 200, body: JSON.stringify({ message: 'parseResume stub' }) });"
    filename = "index.js"
  }
}

resource "aws_lambda_function" "parse_resume" {
  function_name    = "${var.project_name}-${var.environment}-parse-resume"
  role             = aws_iam_role.lambda_parse_resume.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.parse_resume_stub.output_path
  source_code_hash = data.archive_file.parse_resume_stub.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      TABLE_NAME          = aws_dynamodb_table.hiring_platform.name
      RESUME_BUCKET_NAME  = aws_s3_bucket.resumes.id
      PROCESSING_QUEUE_URL = aws_sqs_queue.resume_processing.id
      AWS_REGION          = var.aws_region
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_parse_resume]

  tags = var.tags
}

resource "aws_lambda_event_source_mapping" "parse_resume_from_sqs" {
  event_source_arn = aws_sqs_queue.resume_processing.arn
  function_name    = aws_lambda_function.parse_resume.arn
  batch_size       = 5
}

resource "aws_s3_bucket_notification" "resume_to_sqs" {
  bucket = aws_s3_bucket.resumes.id

  queue {
    queue_arn = aws_sqs_queue.resume_processing.arn
    events    = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_sqs_queue_policy.allow_s3_to_send]
}

resource "aws_sqs_queue_policy" "allow_s3_to_send" {
  queue_url = aws_sqs_queue.resume_processing.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowS3ToSendMessage"
        Effect    = "Allow"
        Principal = { Service = "s3.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.resume_processing.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_s3_bucket.resumes.arn
          }
        }
      }
    ]
  })
}

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-user-pool"

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 10
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    name                = "tenantId"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 128
    }
  }

  tags = var.tags
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project_name}-${var.environment}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  generate_secret = false
}

resource "aws_cognito_user_group" "candidate" {
  name         = "candidate"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_user_group" "recruiter" {
  name         = "recruiter"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-${var.environment}-api"
  description = "Week 1 baseline API for AI hiring platform"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_parse_resume_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-parse-resume-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.parse_resume.function_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "resume_dlq_depth" {
  alarm_name          = "${var.project_name}-${var.environment}-resume-dlq-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Average"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.resume_processing_dlq.name
  }

  tags = var.tags
}
