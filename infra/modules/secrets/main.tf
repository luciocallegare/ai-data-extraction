resource "aws_secretsmanager_secret" "jwt" {
  name        = var.jwt_secret_key_name
  description = "JWT secret for ai-extractor API"
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    JWT_SECRET = var.jwt_secret_value
  })
}

resource "aws_secretsmanager_secret" "openai" {
  name        = var.openai_api_key_name
  description = "OpenAI API key for ai-extractor API"
}

resource "aws_secretsmanager_secret_version" "openai" {
  secret_id = aws_secretsmanager_secret.openai.id
  secret_string = jsonencode({
    OPENAI_API_KEY = var.openai_api_key_value
  })
}

resource "aws_secretsmanager_secret" "anthropic" {
  name        = var.anthropic_api_key_name
  description = "Anthropic API key for ai-extractor API"
}

resource "aws_secretsmanager_secret_version" "anthropic" {
  secret_id = aws_secretsmanager_secret.anthropic.id
  secret_string = jsonencode({
    ANTHROPIC_API_KEY = var.anthropic_api_key_value
  })
}

output "secrets_arn" {
  value = aws_secretsmanager_secret.jwt.arn
}