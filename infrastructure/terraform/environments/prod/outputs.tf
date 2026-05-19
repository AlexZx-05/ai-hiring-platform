output "resume_bucket_name" { value = module.foundation.resume_bucket_name }
output "resume_processing_queue_url" { value = module.foundation.resume_processing_queue_url }
output "resume_processing_dlq_url" { value = module.foundation.resume_processing_dlq_url }
output "dynamodb_table_name" { value = module.foundation.dynamodb_table_name }
output "cognito_user_pool_id" { value = module.foundation.cognito_user_pool_id }
output "cognito_web_client_id" { value = module.foundation.cognito_web_client_id }
output "api_gateway_id" { value = module.foundation.api_gateway_id }
output "parse_resume_lambda_name" { value = module.foundation.parse_resume_lambda_name }
