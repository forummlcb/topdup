output "prod_vpc_id" {
  value = module.prod_vpc.vpc_id
}

output "prod_vpc_private_subnets" {
  value = module.prod_vpc.private_subnets
}

output "prod_vpc_public_subnets" {
  value = module.prod_vpc.public_subnets
}

output "prod_vpc_cidr_block" {
  value = module.prod_vpc.vpc_cidr_block
}
