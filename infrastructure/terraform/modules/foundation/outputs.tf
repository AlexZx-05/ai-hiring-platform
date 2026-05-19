output "resume_bucket_name" { value = aws_s3_bucket.resumes.id }
output "resume_processing_queue_url" { value = aws_sqs_queue.resume_processing.id }
output "resume_processing_dlq_url" { value = aws_sqs_queue.resume_processing_dlq.id }
output "dynamodb_table_name" { value = aws_dynamodb_table.hiring_platform.name }
output "cognito_user_pool_id" { value = aws_cognito_user_pool.main.id }
output "cognito_web_client_id" { value = aws_cognito_user_pool_client.web.id }
output "api_gateway_id" { value = aws_api_gateway_rest_api.main.id }
output "parse_resume_lambda_name" { value = aws_lambda_function.parse_resume.function_name }
