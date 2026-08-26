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

resource "aws_s3_bucket_cors_configuration" "resumes" {
  bucket = aws_s3_bucket.resumes.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET", "HEAD"]
    allowed_origins = ["http://localhost:3000"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
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

  attribute {
    name = "GSI3PK"
    type = "S"
  }

  attribute {
    name = "GSI3SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "GSI3"
    hash_key        = "GSI3PK"
    range_key       = "GSI3SK"
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
      "dynamodb:GetItem",
      "dynamodb:Query"
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

  statement {
    effect = "Allow"
    actions = [
      "textract:StartDocumentTextDetection",
      "textract:GetDocumentTextDetection"
    ]
    resources = ["*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["lambda:InvokeFunction"]
    resources = ["arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-${var.environment}-application-analysis"]
  }
}

resource "aws_iam_role_policy" "lambda_parse_resume" {
  role   = aws_iam_role.lambda_parse_resume.id
  policy = data.aws_iam_policy_document.lambda_parse_resume.json
}

data "archive_file" "parse_resume_source" {
  type        = "zip"
  output_path = "${path.module}/.artifacts/parse-resume.zip"

  source {
    filename = "index.mjs"
    content  = <<-EOT
      import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
      import {
        TextractClient,
        StartDocumentTextDetectionCommand,
        GetDocumentTextDetectionCommand
      } from "@aws-sdk/client-textract";
      import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
      import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

      const REGION = process.env.AWS_REGION || "ap-south-1";
      const TABLE_NAME = process.env.TABLE_NAME;
      const APPLICATION_ANALYSIS_FUNCTION_NAME = process.env.APPLICATION_ANALYSIS_FUNCTION_NAME;

      const s3Client = new S3Client({ region: REGION });
      const textractClient = new TextractClient({ region: REGION });
      const ddb = new DynamoDBClient({ region: REGION });
      const lambda = new LambdaClient({ region: REGION });

      const parseObjectKey = (objectKey) => {
        const parts = objectKey.split("/");
        if (parts.length < 6 || parts[0] !== "tenant" || parts[2] !== "candidate" || parts[4] !== "resume") {
          throw new Error(`Object key does not follow expected pattern: $${objectKey}`);
        }
        const tenantId = parts[1];
        const candidateId = parts[3];
        const fileName = parts[5];
        const resumeId = fileName.slice(0, 36);
        if (resumeId.length !== 36) {
          throw new Error(`Resume ID could not be parsed from object key: $${objectKey}`);
        }
        return { tenantId, candidateId, resumeId };
      };

      const normalizeText = (rawText) => {
        const email = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[A-Za-z]{2,}/)?.[0] || null;
        const phone = rawText.match(/(?:\\+?\\d{1,3}[\\s-]?)?(?:\\(?\\d{3}\\)?[\\s-]?)\\d{3}[\\s-]?\\d{4}/)?.[0] || null;
        const lines = rawText.split("\\n").map((line) => line.trim()).filter(Boolean);
        const name = lines[0] || null;

        const lower = rawText.toLowerCase();
        const skillLexicon = [
          "javascript", "typescript", "react", "next.js", "node.js", "node",
          "aws", "terraform", "docker", "kubernetes", "python", "java", "sql",
          "dynamodb", "lambda", "api gateway", "bedrock", "textract"
        ];
        const matchedSkills = skillLexicon.filter((skill) => lower.includes(skill));

        return {
          name,
          email,
          phone,
          skills: matchedSkills,
          rawTextLength: rawText.length
        };
      };

      const buildPk = (tenantId, candidateId) => `TENANT#$${tenantId}#CANDIDATE#$${candidateId}`;
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const extractTextFromPdf = async (bucketName, objectKey) => {
        const startResponse = await textractClient.send(
          new StartDocumentTextDetectionCommand({
            DocumentLocation: {
              S3Object: {
                Bucket: bucketName,
                Name: objectKey
              }
            }
          })
        );

        const jobId = startResponse.JobId;
        if (!jobId) {
          throw new Error("Textract job ID is missing");
        }

        let status = "IN_PROGRESS";
        let attempts = 0;
        const maxAttempts = 24;
        while (status === "IN_PROGRESS" && attempts < maxAttempts) {
          await sleep(2500);
          const statusResponse = await textractClient.send(
            new GetDocumentTextDetectionCommand({
              JobId: jobId,
              MaxResults: 10
            })
          );
          status = statusResponse.JobStatus || "IN_PROGRESS";
          attempts += 1;
          if (status === "FAILED") {
            throw new Error(`Textract failed: $${statusResponse.StatusMessage || "Unknown error"}`);
          }
        }

        if (status !== "SUCCEEDED") {
          throw new Error("Textract timed out before completion");
        }

        let nextToken = undefined;
        const lines = [];
        do {
          const page = await textractClient.send(
            new GetDocumentTextDetectionCommand({
              JobId: jobId,
              NextToken: nextToken
            })
          );
          const pageLines = (page.Blocks || [])
            .filter((block) => block.BlockType === "LINE" && block.Text)
            .map((block) => block.Text.trim())
            .filter(Boolean);
          lines.push(...pageLines);
          nextToken = page.NextToken;
        } while (nextToken);

        return lines.join("\\n");
      };

      const putParseStatus = async (pk, tenantId, candidateId, resumeId, status, details = {}) => {
        const timestamp = new Date().toISOString();
        await ddb.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: { S: pk },
              SK: { S: `RESUME#$${resumeId}#STATUS#$${timestamp}` },
              GSI1PK: { S: `RESUME#$${resumeId}` },
              GSI1SK: { S: `STATUS#$${timestamp}` },
              GSI2PK: { S: `TENANT#$${tenantId}#PARSE_STATUS` },
              GSI2SK: { S: timestamp },
              entityType: { S: "resumeParseStatus" },
              tenantId: { S: tenantId },
              candidateId: { S: candidateId },
              resumeId: { S: resumeId },
              status: { S: status },
              details: { S: JSON.stringify(details) },
              updatedAt: { S: timestamp }
            }
          })
        );
      };

      const triggerApplicationAnalysis = async (resumeId) => {
        if (!APPLICATION_ANALYSIS_FUNCTION_NAME) return;
        const applications = await ddb.send(new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI3",
          KeyConditionExpression: "GSI3PK = :pk",
          ExpressionAttributeValues: { ":pk": { S: `RESUME#$${resumeId}` } }
        }));
        for (const application of applications.Items || []) {
          const applicationId = application.applicationId?.S;
          if (!applicationId) continue;
          await lambda.send(new InvokeCommand({
            FunctionName: APPLICATION_ANALYSIS_FUNCTION_NAME,
            InvocationType: "Event",
            Payload: new TextEncoder().encode(JSON.stringify({ applicationId }))
          }));
        }
      };

      const processS3Record = async (record) => {
        const bucketName = record?.s3?.bucket?.name;
        const objectKey = decodeURIComponent(record?.s3?.object?.key || "").replace(/\\+/g, " ");
        if (!bucketName || !objectKey) return;

        const ids = parseObjectKey(objectKey);
        const pk = buildPk(ids.tenantId, ids.candidateId);
        await putParseStatus(pk, ids.tenantId, ids.candidateId, ids.resumeId, "PROCESSING", {
          objectKey,
          bucketName
        });

        try {
          const parsedAt = new Date().toISOString();
          const extractionVersion = Date.now().toString();

          const head = await s3Client.send(
            new HeadObjectCommand({
              Bucket: bucketName,
              Key: objectKey
            })
          );

          const rawText = await extractTextFromPdf(bucketName, objectKey);
          const normalized = normalizeText(rawText);

          await ddb.send(
            new PutItemCommand({
              TableName: TABLE_NAME,
              Item: {
                PK: { S: pk },
                SK: { S: `RESUME#$${ids.resumeId}#EXTRACTION#$${parsedAt}` },
                GSI1PK: { S: `RESUME#$${ids.resumeId}` },
                GSI1SK: { S: `EXTRACTION#$${parsedAt}` },
                GSI2PK: { S: `TENANT#$${ids.tenantId}#EXTRACTIONS` },
                GSI2SK: { S: parsedAt },
                entityType: { S: "resumeExtraction" },
                tenantId: { S: ids.tenantId },
                candidateId: { S: ids.candidateId },
                resumeId: { S: ids.resumeId },
                objectKey: { S: objectKey },
                bucketName: { S: bucketName },
                parsedAt: { S: parsedAt },
                extractionVersion: { S: extractionVersion },
                contentType: { S: head.ContentType || "" },
                eTag: { S: head.ETag || "" },
                normalized: { S: JSON.stringify(normalized) },
                rawText: { S: rawText }
              }
            })
          );

          await putParseStatus(pk, ids.tenantId, ids.candidateId, ids.resumeId, "SUCCEEDED", {
            extractionVersion,
            parsedAt
          });
          await triggerApplicationAnalysis(ids.resumeId);
        } catch (error) {
          await putParseStatus(pk, ids.tenantId, ids.candidateId, ids.resumeId, "FAILED", {
            message: error instanceof Error ? error.message : "Unknown parse failure"
          });
          throw error;
        }
      };

      export const handler = async (event) => {
        if (!TABLE_NAME) {
          throw new Error("TABLE_NAME is not configured");
        }

        for (const sqsRecord of event.Records || []) {
          const body = JSON.parse(sqsRecord.body || "{}");
          const records = Array.isArray(body.Records) ? body.Records : [];
          for (const record of records) {
            await processS3Record(record);
          }
        }

        return { statusCode: 200, body: JSON.stringify({ message: "parseResume completed" }) };
      };
    EOT
  }
}

resource "aws_lambda_function" "parse_resume" {
  function_name    = "${var.project_name}-${var.environment}-parse-resume"
  role             = aws_iam_role.lambda_parse_resume.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.parse_resume_source.output_path
  source_code_hash = data.archive_file.parse_resume_source.output_base64sha256
  timeout          = 120

  environment {
    variables = {
      TABLE_NAME           = aws_dynamodb_table.hiring_platform.name
      RESUME_BUCKET_NAME   = aws_s3_bucket.resumes.id
      PROCESSING_QUEUE_URL = aws_sqs_queue.resume_processing.id
      APPLICATION_ANALYSIS_FUNCTION_NAME = "${var.project_name}-${var.environment}-application-analysis"
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

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 20
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

  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "phone", "aws.cognito.signin.user.admin"]
  supported_identity_providers         = ["COGNITO"]
  callback_urls                        = ["http://localhost:3000/login", "http://localhost:3001/login"]
  logout_urls                          = ["http://localhost:3000/login", "http://localhost:3001/login"]
}

resource "aws_iam_role" "lambda_analyze_resume" {
  name               = "${var.project_name}-${var.environment}-analyze-resume-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = var.tags
}

resource "aws_cloudwatch_log_group" "lambda_analyze_resume" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-analyze-resume"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_secretsmanager_secret" "xai_api" {
  name                    = "${var.project_name}/${var.environment}/xai-api"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-xai-api"
  })
}

data "aws_iam_policy_document" "lambda_analyze_resume" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["${aws_cloudwatch_log_group.lambda_analyze_resume.arn}:*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:Query",
      "dynamodb:PutItem"
    ]
    resources = [aws_dynamodb_table.hiring_platform.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:GetUser"
    ]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [aws_secretsmanager_secret.xai_api.arn]
  }
}

resource "aws_iam_role_policy" "lambda_analyze_resume" {
  role   = aws_iam_role.lambda_analyze_resume.id
  policy = data.aws_iam_policy_document.lambda_analyze_resume.json
}

data "archive_file" "analyze_resume_source" {
  type        = "zip"
  output_path = "${path.module}/.artifacts/analyze-resume.zip"

  source {
    filename = "index.mjs"
    content  = <<-EOT
      import { DynamoDBClient, QueryCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
      import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
      import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

      const REGION = process.env.AWS_REGION || "ap-south-1";
      const TABLE_NAME = process.env.TABLE_NAME;
      const XAI_API_KEY = process.env.XAI_API_KEY || "";
      const XAI_API_URL = process.env.XAI_API_URL || "https://api.x.ai/v1/chat/completions";
      const XAI_MODEL_ID = process.env.XAI_MODEL_ID || "grok-3-mini";
      const XAI_SECRET_ARN = process.env.XAI_SECRET_ARN || "";

      const ddb = new DynamoDBClient({ region: REGION });
      const secrets = new SecretsManagerClient({ region: REGION });
      const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
      let cachedXaiKey = null;

      const corsHeaders = {
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      };

      const json = (statusCode, body) => ({
        statusCode,
        headers: { "content-type": "application/json", ...corsHeaders },
        body: JSON.stringify(body)
      });

      const parseBearerToken = (event) => {
        const header = event?.headers?.authorization || event?.headers?.Authorization || "";
        if (!header.toLowerCase().startsWith("bearer ")) return null;
        return header.slice(7).trim();
      };

      const attributeMap = (attributes = []) =>
        Object.fromEntries(attributes.map((attribute) => [attribute.Name, attribute.Value || ""]));

      const parseRole = (attributes) => {
        const customRole = attributes["custom:role"];
        if (customRole === "candidate" || customRole === "recruiter" || customRole === "admin") {
          return customRole;
        }
        return "candidate";
      };

      const resolveAuth = async (event) => {
        const accessToken = parseBearerToken(event);
        if (!accessToken) throw new Error("Missing bearer token");
        const response = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
        const attributes = attributeMap(response.UserAttributes);
        const sub = String(attributes.sub || "").trim();
        const tenantId = String(attributes["custom:tenantId"] || "").trim();
        if (!sub || !tenantId) throw new Error("Missing tenantId claim");
        return { sub, tenantId, role: parseRole(attributes) };
      };

      const modelPrompt = (resumeText, jobRequirements = "") => `
You are an enterprise ATS scoring engine. Compare the resume against the job description and return strict JSON only:
{
  "atsScore": number (0-100),
  "matchedSkills": string[],
  "missingSkills": string[],
  "confidence": number (0-1),
  "summary": string
}
Score should prioritize hard skills, role responsibilities, seniority, domain fit, and evidence quality. Do not invent resume facts.
Resume:
$${resumeText.slice(0, 12000)}
Job Requirements:
$${jobRequirements.slice(0, 6000)}
`;

      const parseModelJson = (text) => {
        const cleaned = String(text || "{}")
          .replace(/^```json\\s*/i, "")
          .replace(/^```\\s*/i, "")
          .replace(/```$/i, "")
          .trim();
        try {
          return JSON.parse(cleaned);
        } catch {
          const match = cleaned.match(/\\{[\\s\\S]*\\}/);
          return match ? JSON.parse(match[0]) : {};
        }
      };

      const getXaiApiKey = async () => {
        if (cachedXaiKey) return cachedXaiKey;
        if (XAI_SECRET_ARN) {
          const response = await secrets.send(
            new GetSecretValueCommand({ SecretId: XAI_SECRET_ARN })
          );
          const raw = response.SecretString || "";
          try {
            const parsed = JSON.parse(raw);
            cachedXaiKey = String(parsed.XAI_API_KEY || parsed.apiKey || parsed.key || "").trim();
          } catch {
            cachedXaiKey = raw.trim();
          }
        }
        if (!cachedXaiKey) {
          cachedXaiKey = XAI_API_KEY.trim();
        }
        return cachedXaiKey;
      };

      const invokeGrok = async (resumeText, jobRequirements) => {
        const apiKey = await getXaiApiKey();
        if (!apiKey) {
          throw new Error("XAI_API_KEY is not configured");
        }

        const payload = {
          model: XAI_MODEL_ID,
          temperature: 0.1,
          max_tokens: 700,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "Return only valid JSON for resume-to-job screening. No markdown."
            },
            {
              role: "user",
              content: modelPrompt(resumeText, jobRequirements)
            }
          ]
        };

        const response = await fetch(XAI_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer $${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const rawText = await response.text();
        if (!response.ok) {
          throw new Error(`Grok API failed with $${response.status}: $${rawText.slice(0, 300)}`);
        }

        const raw = JSON.parse(rawText);
        const text = raw?.choices?.[0]?.message?.content || "{}";
        try {
          return parseModelJson(text);
        } catch {
          return {
            atsScore: 0,
            matchedSkills: [],
            missingSkills: [],
            confidence: 0,
            summary: "Grok output was not valid JSON."
          };
        }
      };

      export const handler = async (event) => {
        if ((event?.requestContext?.http?.method || event?.httpMethod) === "OPTIONS") {
          return { statusCode: 200, headers: corsHeaders, body: "" };
        }
        if (!TABLE_NAME) return json(500, { message: "TABLE_NAME is not configured" });

        let auth;
        try {
          auth = await resolveAuth(event);
        } catch {
          return json(401, { message: "Unauthorized" });
        }
        if (!(auth.role === "candidate" || auth.role === "recruiter" || auth.role === "admin")) {
          return json(403, { message: "Forbidden" });
        }

        let payload;
        try {
          payload = JSON.parse(event.body || "{}");
        } catch {
          return json(400, { message: "Invalid JSON body" });
        }

        const resumeId = String(payload.resumeId || "").trim();
        const candidateId = String(payload.candidateId || auth.sub).trim();
        const jobRequirements = String(payload.jobRequirements || "").trim();
        const mode = String(payload.mode || "analyze").trim().toLowerCase();
        if (!resumeId) return json(400, { message: "resumeId is required" });

        const pk = `TENANT#$${auth.tenantId}#CANDIDATE#$${candidateId}`;
        const extractionPrefix = `RESUME#$${resumeId}#EXTRACTION#`;
        const extractionResult = await ddb.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk and begins_with(SK, :sk)",
            ExpressionAttributeValues: {
              ":pk": { S: pk },
              ":sk": { S: extractionPrefix }
            },
            ScanIndexForward: false,
            Limit: 1
          })
        );

        const latestExtraction = extractionResult.Items?.[0];
        if (!latestExtraction) {
          const statusResult = await ddb.send(
            new QueryCommand({
              TableName: TABLE_NAME,
              KeyConditionExpression: "PK = :pk and begins_with(SK, :sk)",
              ExpressionAttributeValues: {
                ":pk": { S: pk },
                ":sk": { S: `RESUME#$${resumeId}#STATUS#` }
              },
              ScanIndexForward: false,
              Limit: 1
            })
          );
          const latestStatus = statusResult.Items?.[0];
          const statusValue = latestStatus?.status?.S || "PENDING";
          const statusDetails = latestStatus?.details?.S || "{}";
          const waitingBody = {
            message: "Resume parsing is not complete yet",
            parseStatus: statusValue,
            parseDetails: statusDetails
          };
          if (mode === "status") {
            return json(200, waitingBody);
          }
          return json(404, waitingBody);
        }

        if (mode === "status") {
          return json(200, {
            message: "Resume parsing is complete",
            parseStatus: "SUCCEEDED",
            parseDetails: "{}"
          });
        }

        let analysis;
        try {
          analysis = await invokeGrok(String(latestExtraction.rawText?.S || ""), jobRequirements);
        } catch (error) {
          return json(502, {
            message: error instanceof Error ? error.message : "Grok analysis failed"
          });
        }
        const analyzedAt = new Date().toISOString();
        const analysisVersion = Date.now().toString();

        const normalized = {
          atsScore: Math.max(0, Math.min(100, Number.isFinite(Number(analysis.atsScore)) ? Number(analysis.atsScore) : 0)),
          matchedSkills: Array.isArray(analysis.matchedSkills) ? analysis.matchedSkills.map(String).slice(0, 20) : [],
          missingSkills: Array.isArray(analysis.missingSkills) ? analysis.missingSkills.map(String).slice(0, 20) : [],
          confidence: Math.max(0, Math.min(1, Number.isFinite(Number(analysis.confidence)) ? Number(analysis.confidence) : 0)),
          summary: String(analysis.summary || "No summary generated.")
        };

        await ddb.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: { S: pk },
              SK: { S: `RESUME#$${resumeId}#ANALYSIS#$${analyzedAt}` },
              GSI1PK: { S: `RESUME#$${resumeId}` },
              GSI1SK: { S: `ANALYSIS#$${analyzedAt}` },
              GSI2PK: { S: `TENANT#$${auth.tenantId}#ANALYSES` },
              GSI2SK: { S: analyzedAt },
              entityType: { S: "resumeAnalysis" },
              tenantId: { S: auth.tenantId },
              candidateId: { S: candidateId },
              resumeId: { S: resumeId },
              analyzedAt: { S: analyzedAt },
              analysisVersion: { S: analysisVersion },
              modelId: { S: XAI_MODEL_ID },
              extractionSk: { S: latestExtraction.SK?.S || "" },
              atsScore: { N: normalized.atsScore.toString() },
              matchedSkills: { S: JSON.stringify(normalized.matchedSkills) },
              missingSkills: { S: JSON.stringify(normalized.missingSkills) },
              confidence: { N: normalized.confidence.toString() },
              summary: { S: normalized.summary }
            }
          })
        );

        return json(200, {
          resumeId,
          candidateId,
          analyzedAt,
          analysisVersion,
          ...normalized
        });
      };
    EOT
  }
}

resource "aws_lambda_function" "analyze_resume" {
  function_name    = "${var.project_name}-${var.environment}-analyze-resume"
  role             = aws_iam_role.lambda_analyze_resume.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.analyze_resume_source.output_path
  source_code_hash = data.archive_file.analyze_resume_source.output_base64sha256
  timeout          = 60

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.hiring_platform.name
      XAI_API_URL    = "https://api.x.ai/v1/chat/completions"
      XAI_MODEL_ID   = "grok-3-mini"
      XAI_SECRET_ARN = aws_secretsmanager_secret.xai_api.arn
      XAI_API_KEY    = var.xai_api_key
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_analyze_resume]
  tags       = var.tags
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
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

resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${var.project_name}-${var.environment}-cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  identity_source = "method.request.header.Authorization"
}

# The backend is bundled from its TypeScript source by `npm run build` in backend/.
# Terraform packages the resulting, self-contained Lambda bundles; CI must run that
# command before `terraform plan` or `terraform apply`.
locals {
  backend_api_lambdas = {
    jobs = {
      artifact = "jobs"
      name     = "jobs"
      timeout  = 15
    }
    applications = {
      artifact = "applications"
      name     = "applications"
      timeout  = 15
    }
    recruiter = {
      artifact = "recruiter"
      name     = "recruiter"
      timeout  = 30
    }
    dashboard = {
      artifact = "recruiterDashboard"
      name     = "recruiter-dashboard"
      timeout  = 15
    }
    public_jobs = {
      artifact = "publicJobs"
      name     = "public-jobs"
      timeout  = 15
    }
    application_analysis = {
      artifact = "applicationAnalysis"
      name     = "application-analysis"
      timeout  = 60
    }
    recruiter_invitations = {
      artifact = "recruiterInvitations"
      name     = "recruiter-invitations"
      timeout  = 30
    }
  }
}

data "archive_file" "backend_api" {
  for_each    = local.backend_api_lambdas
  type        = "zip"

  source_dir  = "${path.module}/../../../../backend/.lambda-dist/${each.value.artifact}"

  output_path = "${path.module}/.artifacts/${each.key}.zip"
}

resource "aws_cloudwatch_log_group" "backend_api" {
  for_each          = local.backend_api_lambdas
  name              = "/aws/lambda/${var.project_name}-${var.environment}-${each.value.name}"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_iam_role" "backend_api" {
  name               = "${var.project_name}-${var.environment}-backend-api-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = var.tags
}

data "aws_iam_policy_document" "backend_api" {
  statement {
    effect  = "Allow"
    actions = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = [
      for log_group in aws_cloudwatch_log_group.backend_api : "${log_group.arn}:*"
    ]
  }

  statement {
    effect = "Allow"
    actions = ["cognito-idp:AdminCreateUser", "cognito-idp:AdminAddUserToGroup"]
    resources = [aws_cognito_user_pool.main.arn]
  }

  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.xai_api.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query"
    ]
    resources = [
      aws_dynamodb_table.hiring_platform.arn,
      "${aws_dynamodb_table.hiring_platform.arn}/index/*"
    ]
  }

  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.resumes.arn}/tenant/*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["lambda:InvokeFunction"]
    resources = ["arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-${var.environment}-application-analysis"]
  }
}

resource "aws_iam_role_policy" "backend_api" {
  role   = aws_iam_role.backend_api.id
  policy = data.aws_iam_policy_document.backend_api.json
}

resource "aws_lambda_function" "backend_api" {
  for_each         = local.backend_api_lambdas
  function_name    = "${var.project_name}-${var.environment}-${each.value.name}"
  role             = aws_iam_role.backend_api.arn
  handler          = "index.main"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.backend_api[each.key].output_path
  source_code_hash = data.archive_file.backend_api[each.key].output_base64sha256
  timeout          = each.value.timeout
  memory_size      = 512

  environment {
    variables = {
      COGNITO_REGION          = var.aws_region
      COGNITO_USER_POOL_ID    = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID       = aws_cognito_user_pool_client.web.id
      DYNAMODB_TABLE_NAME     = aws_dynamodb_table.hiring_platform.name
      RESUME_BUCKET_NAME      = aws_s3_bucket.resumes.id
      NOTIFICATION_WEBHOOK_URL = ""
      XAI_SECRET_ARN           = aws_secretsmanager_secret.xai_api.arn
      XAI_API_URL              = "https://api.x.ai/v1/chat/completions"
      XAI_MODEL_ID             = "grok-3-mini"
      APPLICATION_ANALYSIS_FUNCTION_NAME = "${var.project_name}-${var.environment}-application-analysis"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.backend_api,
    aws_iam_role_policy.backend_api
  ]
  tags = var.tags
}

resource "aws_api_gateway_resource" "jobs" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "jobs"
}

resource "aws_api_gateway_resource" "jobs_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.jobs.id
  path_part   = "{jobId}"
}

resource "aws_api_gateway_resource" "applications" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "applications"
}

resource "aws_api_gateway_resource" "careers" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "careers"
}

resource "aws_api_gateway_resource" "careers_tenant" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.careers.id
  path_part   = "{tenantSlug}"
}

resource "aws_api_gateway_resource" "careers_job" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.careers_tenant.id
  path_part   = "{slug}"
}

resource "aws_api_gateway_method" "public_job_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.careers_job.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "public_job_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.careers_job.id
  http_method             = aws_api_gateway_method.public_job_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.backend_api["public_jobs"].invoke_arn
}

resource "aws_lambda_permission" "public_job_get" {
  statement_id  = "AllowApiGatewayPublicCareerJob"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_api["public_jobs"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/GET/careers/*/*"
}

resource "aws_api_gateway_resource" "recruiter" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "recruiter"
}

resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "admin"
}

resource "aws_api_gateway_resource" "admin_recruiter_invitations" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "recruiter-invitations"
}

resource "aws_api_gateway_resource" "recruiter_jobs" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter.id
  path_part   = "jobs"
}

resource "aws_api_gateway_resource" "recruiter_jobs_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter_jobs.id
  path_part   = "{jobId}"
}

resource "aws_api_gateway_resource" "recruiter_jobs_id_applications" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter_jobs_id.id
  path_part   = "applications"
}

resource "aws_api_gateway_resource" "recruiter_applications" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter.id
  path_part   = "applications"
}

resource "aws_api_gateway_resource" "recruiter_applications_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter_applications.id
  path_part   = "{applicationId}"
}

resource "aws_api_gateway_resource" "recruiter_applications_id_status" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter_applications_id.id
  path_part   = "status"
}

resource "aws_api_gateway_resource" "recruiter_applications_id_resume_url" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter_applications_id.id
  path_part   = "resume-url"
}

resource "aws_api_gateway_resource" "recruiter_candidates" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter.id
  path_part   = "candidates"
}

resource "aws_api_gateway_resource" "recruiter_candidates_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter_candidates.id
  path_part   = "{candidateId}"
}

resource "aws_api_gateway_resource" "recruiter_dashboard" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.recruiter.id
  path_part   = "dashboard"
}

locals {
  protected_api_routes = {
    jobs_get = {
      resource_id = aws_api_gateway_resource.jobs.id
      method      = "GET"
      lambda      = "jobs"
      path        = "/jobs"
    }
    jobs_post = {
      resource_id = aws_api_gateway_resource.jobs.id
      method      = "POST"
      lambda      = "jobs"
      path        = "/jobs"
    }
    jobs_id_get = {
      resource_id = aws_api_gateway_resource.jobs_id.id
      method      = "GET"
      lambda      = "jobs"
      path        = "/jobs/{jobId}"
    }
    applications_get = {
      resource_id = aws_api_gateway_resource.applications.id
      method      = "GET"
      lambda      = "applications"
      path        = "/applications"
    }
    applications_post = {
      resource_id = aws_api_gateway_resource.applications.id
      method      = "POST"
      lambda      = "applications"
      path        = "/applications"
    }
    recruiter_jobs_get = {
      resource_id = aws_api_gateway_resource.recruiter_jobs.id
      method      = "GET"
      lambda      = "recruiter"
      path        = "/recruiter/jobs"
    }
    recruiter_job_applications_get = {
      resource_id = aws_api_gateway_resource.recruiter_jobs_id_applications.id
      method      = "GET"
      lambda      = "recruiter"
      path        = "/recruiter/jobs/{jobId}/applications"
    }
    recruiter_application_status_patch = {
      resource_id = aws_api_gateway_resource.recruiter_applications_id_status.id
      method      = "PATCH"
      lambda      = "recruiter"
      path        = "/recruiter/applications/{applicationId}/status"
    }
    recruiter_application_resume_url_get = {
      resource_id = aws_api_gateway_resource.recruiter_applications_id_resume_url.id
      method      = "GET"
      lambda      = "recruiter"
      path        = "/recruiter/applications/{applicationId}/resume-url"
    }
    recruiter_candidate_get = {
      resource_id = aws_api_gateway_resource.recruiter_candidates_id.id
      method      = "GET"
      lambda      = "recruiter"
      path        = "/recruiter/candidates/{candidateId}"
    }
    recruiter_dashboard_get = {
      resource_id = aws_api_gateway_resource.recruiter_dashboard.id
      method      = "GET"
      lambda      = "dashboard"
      path        = "/recruiter/dashboard"
    }
    admin_recruiter_invitation_post = {
      resource_id = aws_api_gateway_resource.admin_recruiter_invitations.id
      method      = "POST"
      lambda      = "recruiter_invitations"
      path        = "/admin/recruiter-invitations"
    }
  }
}

resource "aws_api_gateway_method" "protected" {
  for_each      = local.protected_api_routes
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value.resource_id
  http_method   = each.value.method
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "protected" {
  for_each                = local.protected_api_routes
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = each.value.resource_id
  http_method             = aws_api_gateway_method.protected[each.key].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.backend_api[each.value.lambda].invoke_arn
}

resource "aws_api_gateway_method" "protected_options" {
  for_each      = local.protected_api_routes
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value.resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "protected_options" {
  for_each          = local.protected_api_routes
  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = each.value.resource_id
  http_method       = aws_api_gateway_method.protected_options[each.key].http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "protected_options_200" {
  for_each    = local.protected_api_routes
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value.resource_id
  http_method = aws_api_gateway_method.protected_options[each.key].http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "protected_options_200" {
  for_each    = local.protected_api_routes
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value.resource_id
  http_method = aws_api_gateway_method.protected_options[each.key].http_method
  status_code = aws_api_gateway_method_response.protected_options_200[each.key].status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'http://localhost:3000'"
    "method.response.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,OPTIONS'"
  }
}

resource "aws_lambda_permission" "backend_api" {
  for_each      = local.protected_api_routes
  statement_id  = "AllowApiGateway${replace(title(each.key), "_", "")}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_api[each.value.lambda].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/${each.value.method}${each.value.path}"
}

resource "aws_iam_role" "lambda_upload_resume" {
  name               = "${var.project_name}-${var.environment}-upload-resume-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = var.tags
}

resource "aws_cloudwatch_log_group" "lambda_upload_resume" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-upload-resume"
  retention_in_days = 30
  tags              = var.tags
}

data "aws_iam_policy_document" "lambda_upload_resume" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["${aws_cloudwatch_log_group.lambda_upload_resume.arn}:*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject"
    ]
    resources = [
      "${aws_s3_bucket.resumes.arn}/tenant/*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:GetUser"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "lambda_upload_resume" {
  role   = aws_iam_role.lambda_upload_resume.id
  policy = data.aws_iam_policy_document.lambda_upload_resume.json
}

data "archive_file" "upload_resume_source" {
  type        = "zip"
  output_path = "${path.module}/.artifacts/upload-resume.zip"

  source {
    filename = "index.mjs"
    content  = <<-EOT
      import { randomUUID } from "node:crypto";
      import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
      import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
      import {
        CognitoIdentityProviderClient,
        GetUserCommand
      } from "@aws-sdk/client-cognito-identity-provider";

      const REGION = process.env.AWS_REGION || "ap-south-1";
      const RESUME_BUCKET_NAME = process.env.RESUME_BUCKET_NAME;
      const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES || 5242880);
      const SIGNED_URL_EXPIRY_SECONDS = 300;
      const ALLOWED_CONTENT_TYPES = new Set([
        "application/pdf"
      ]);

      const s3Client = new S3Client({ region: REGION });
      const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

      const corsHeaders = {
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      };

      const json = (statusCode, body) => ({
        statusCode,
        headers: { "content-type": "application/json", ...corsHeaders },
        body: JSON.stringify(body)
      });

      const parseBearerToken = (event) => {
        const header =
          event?.headers?.authorization ||
          event?.headers?.Authorization ||
          "";
        if (!header.toLowerCase().startsWith("bearer ")) {
          return null;
        }
        return header.slice(7).trim();
      };

      const attributeMap = (attributes = []) =>
        Object.fromEntries(attributes.map((attribute) => [attribute.Name, attribute.Value || ""]));

      const parseRole = (attributes) => {
        const customRole = attributes["custom:role"];
        if (customRole === "candidate" || customRole === "recruiter" || customRole === "admin") {
          return customRole;
        }
        return "candidate";
      };

      const resolveAuth = async (event) => {
        const accessToken = parseBearerToken(event);
        if (!accessToken) {
          throw new Error("Missing bearer token");
        }

        const response = await cognitoClient.send(
          new GetUserCommand({ AccessToken: accessToken })
        );
        const attributes = attributeMap(response.UserAttributes);
        const sub = String(attributes.sub || "").trim();
        const tenantId = String(attributes["custom:tenantId"] || "").trim();
        if (!sub || !tenantId) {
          throw new Error("Missing tenantId claim");
        }

        return {
          sub,
          tenantId,
          role: parseRole(attributes)
        };
      };

      export const handler = async (event) => {
        if ((event?.requestContext?.http?.method || event?.httpMethod) === "OPTIONS") {
          return { statusCode: 200, headers: corsHeaders, body: "" };
        }

        if (!RESUME_BUCKET_NAME) {
          return json(500, { message: "RESUME_BUCKET_NAME is not configured" });
        }

        let auth;
        try {
          auth = await resolveAuth(event);
        } catch {
          return json(401, { message: "Unauthorized" });
        }
        if (!(auth.role === "candidate" || auth.role === "admin")) {
          return json(403, { message: "Forbidden" });
        }

        let payload;
        try {
          payload = JSON.parse(event.body || "{}");
        } catch {
          return json(400, { message: "Invalid JSON body" });
        }

        const fileName = String(payload.fileName || "").trim();
        const contentType = String(payload.contentType || "").trim();
        const sizeBytes = Number(payload.sizeBytes);
        if (!fileName) return json(400, { message: "fileName is required" });
        if (!ALLOWED_CONTENT_TYPES.has(contentType)) return json(400, { message: "Only PDF files are supported" });
        if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return json(400, { message: "sizeBytes must be a positive number" });
        if (sizeBytes > MAX_FILE_SIZE_BYTES) return json(400, { message: "File exceeds maximum size of 5MB" });

        const allowedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-";
        const safeFileName = Array.from(fileName)
          .map((char) => (allowedChars.includes(char) ? char : "_"))
          .join("");
        const resumeId = randomUUID();
        const objectKey = `tenant/$${auth.tenantId}/candidate/$${auth.sub}/resume/$${resumeId}-$${safeFileName}`;

        const command = new PutObjectCommand({
          Bucket: RESUME_BUCKET_NAME,
          Key: objectKey,
          ContentType: contentType,
          Metadata: {
            tenantid: auth.tenantId,
            candidateid: auth.sub,
            resumeid: resumeId,
            scanstatus: "pending"
          }
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: SIGNED_URL_EXPIRY_SECONDS });

        return json(200, {
          uploadUrl,
          objectKey,
          resumeId,
          expiresIn: SIGNED_URL_EXPIRY_SECONDS,
          maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
          malwareScan: {
            status: "PENDING_HOOK",
            message: "Malware scan hook placeholder is enabled for Week 2."
          }
        });
      };
    EOT
  }
}

resource "aws_lambda_function" "upload_resume" {
  function_name    = "${var.project_name}-${var.environment}-upload-resume"
  role             = aws_iam_role.lambda_upload_resume.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.upload_resume_source.output_path
  source_code_hash = data.archive_file.upload_resume_source.output_base64sha256
  timeout          = 120

  environment {
    variables = {
      RESUME_BUCKET_NAME  = aws_s3_bucket.resumes.id
      MAX_FILE_SIZE_BYTES = "5242880"
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_upload_resume]
  tags       = var.tags
}

resource "aws_api_gateway_resource" "upload" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "upload"
}

resource "aws_api_gateway_resource" "upload_url" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.upload.id
  path_part   = "url"
}

resource "aws_api_gateway_resource" "resume" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "resume"
}

resource "aws_api_gateway_resource" "resume_analyze" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.resume.id
  path_part   = "analyze"
}

resource "aws_api_gateway_method" "upload_url_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.upload_url.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "upload_url_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.upload_url.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "resume_analyze_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.resume_analyze.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "resume_analyze_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.resume_analyze.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "upload_url_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.upload_url.id
  http_method             = aws_api_gateway_method.upload_url_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.upload_resume.invoke_arn
}

resource "aws_api_gateway_integration" "upload_url_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.upload_url.id
  http_method = aws_api_gateway_method.upload_url_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration" "resume_analyze_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.resume_analyze.id
  http_method             = aws_api_gateway_method.resume_analyze_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.analyze_resume.invoke_arn
}

resource "aws_api_gateway_integration" "resume_analyze_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.resume_analyze.id
  http_method = aws_api_gateway_method.resume_analyze_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "upload_url_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.upload_url.id
  http_method = aws_api_gateway_method.upload_url_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "upload_url_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.upload_url.id
  http_method = aws_api_gateway_method.upload_url_options.http_method
  status_code = aws_api_gateway_method_response.upload_url_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'http://localhost:3000'"
    "method.response.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
  }
}

resource "aws_api_gateway_method_response" "resume_analyze_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.resume_analyze.id
  http_method = aws_api_gateway_method.resume_analyze_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "resume_analyze_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.resume_analyze.id
  http_method = aws_api_gateway_method.resume_analyze_options.http_method
  status_code = aws_api_gateway_method_response.resume_analyze_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'http://localhost:3000'"
    "method.response.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'http://localhost:3000'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'http://localhost:3000'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,OPTIONS'"
  }
}

resource "aws_lambda_permission" "allow_apigw_upload_resume" {
  statement_id  = "AllowApiGatewayInvokeUploadResume"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_resume.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/POST/upload/url"
}

resource "aws_lambda_permission" "allow_apigw_analyze_resume" {
  statement_id  = "AllowApiGatewayInvokeAnalyzeResume"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.analyze_resume.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/POST/resume/analyze"
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.upload.id,
      aws_api_gateway_resource.upload_url.id,
      aws_api_gateway_resource.resume.id,
      aws_api_gateway_resource.resume_analyze.id,
      aws_api_gateway_method.upload_url_post.id,
      aws_api_gateway_method.upload_url_post.authorization,
      aws_api_gateway_method.upload_url_post.authorizer_id,
      aws_api_gateway_method.upload_url_options.id,
      aws_api_gateway_method.resume_analyze_post.id,
      aws_api_gateway_method.resume_analyze_options.id,
      aws_api_gateway_integration.upload_url_post.id,
      aws_api_gateway_integration.upload_url_options.id,
      aws_api_gateway_integration.resume_analyze_post.id,
      aws_api_gateway_integration.resume_analyze_options.id,
      aws_api_gateway_method_response.upload_url_options_200.id,
      aws_api_gateway_integration_response.upload_url_options_200.id,
      aws_api_gateway_method_response.resume_analyze_options_200.id,
      aws_api_gateway_integration_response.resume_analyze_options_200.id,
      aws_api_gateway_gateway_response.default_4xx.id,
      aws_api_gateway_gateway_response.default_5xx.id,
      aws_api_gateway_authorizer.cognito.id,
      aws_api_gateway_integration.public_job_get.id,
      [for integration in values(aws_api_gateway_integration.protected) : integration.id],
      [for integration in values(aws_api_gateway_integration.protected_options) : integration.id],
      [for response in values(aws_api_gateway_integration_response.protected_options_200) : response.id]
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.upload_url_post,
    aws_api_gateway_integration.upload_url_options,
    aws_api_gateway_integration.resume_analyze_post,
    aws_api_gateway_integration.resume_analyze_options,
    aws_api_gateway_method_response.upload_url_options_200,
    aws_api_gateway_integration_response.upload_url_options_200,
    aws_api_gateway_method_response.resume_analyze_options_200,
    aws_api_gateway_integration_response.resume_analyze_options_200,
    aws_api_gateway_integration.protected,
    aws_api_gateway_integration.public_job_get,
    aws_api_gateway_integration.protected_options,
    aws_api_gateway_integration_response.protected_options_200,
    aws_api_gateway_gateway_response.default_4xx,
    aws_api_gateway_gateway_response.default_5xx
  ]
}

resource "aws_api_gateway_stage" "main" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  deployment_id = aws_api_gateway_deployment.main.id
  stage_name    = var.environment
  tags          = var.tags
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
