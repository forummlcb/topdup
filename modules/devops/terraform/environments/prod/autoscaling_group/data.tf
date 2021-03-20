data "terraform_remote_state" "prod_vpc" {
  backend = "s3"
  config  = {
    bucket  = "infra-remotestates"
    key     = "prod/vpc"
    region  = "ap-southeast-1"
  }
}

data "terraform_remote_state" "prod_alb" {
  backend = "s3"
  config  = {
    bucket  = "infra-remotestates"
    key     = "prod/elb"
    region  = "ap-southeast-1"
  }
}
