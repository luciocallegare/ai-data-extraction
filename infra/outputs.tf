output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

output "ecs_cluster_name" {
  value = module.ecs.ecs_cluster_name
}

output "ecs_service_name" {
  value = module.ecs.ecs_service_name
}

output "alb_dns_name" {
  value = module.ecs.alb_dns_name
}

output "api_url" {
  value = module.ecs.api_url
}

output "secrets_arn" {
  value = module.secrets.secrets_arn
  sensitive = true
}

output "log_group_name" {
  value = module.cloudwatch.log_group_name
}