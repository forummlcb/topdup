output "lb_id" {
  value = module.prod_webapp_alb.this_lb_id
}

output "lb_arn" {
  value = module.prod_webapp_alb.this_lb_arn
}

output "target_group_arns" {
  value = module.prod_webapp_alb.target_group_arns
}

output "target_group_names" {
  value = module.prod_webapp_alb.target_group_names
}
