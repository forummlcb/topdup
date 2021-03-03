data "terraform_remote_state" "prod_vpc" {
  backend = "s3"
  config  = {
    bucket  = "infra-remotestates"
    key     = "prod/vpc"
    region  = "ap-southeast-1"
  }
}

data "aws_subnet_ids" "a" {
  filter {
    name   = "tag:Name"
    values = ["*prod-public-ap-southeast-1a"]
  }
  vpc_id = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id
}
data "aws_subnet_ids" "b" {
  filter {
    name   = "tag:Name"
    values = ["*prod-public-ap-southeast-1b"]
  }
  vpc_id = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id
}

data "aws_subnet_ids" "c" {
  filter {
    name   = "tag:Name"
    values = ["*prod-public-ap-southeast-1c"]
  }
  vpc_id = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id
}


