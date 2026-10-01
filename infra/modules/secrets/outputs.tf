output "secrets_arn" {
  value = aws_secretsmanager_secret.jwt.arn
}

output "jwt_secret_arn" {
  value = aws_secretsmanager_secret.jwt.arn
}

output "openai_api_key_arn" {
  value = aws_secretsmanager_secret.openai.arn
}

output "anthropic_api_key_arn" {
  value = aws_secretsmanager_secret.anthropic.arn
}