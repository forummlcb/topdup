module "prod_ml_api" {
  source = "../../../modules/terraform-aws-ec2-instance"

  name                   = "topdup-prod-ml_api"
  instance_count         = 1
  ami                    = "ami-06fb5332e8e3e577a"
  instance_type          = "t3a.medium"
  iam_instance_profile       = "topdup-ml-api"
  key_name               = "topdup-prod"
  user_data              = local.user_data
  root_block_device = [
    {
      volume_size           = 20
      delete_on_termination = true
    }
  ]

  ebs_block_device = [
    {
      device_name = "/dev/sdf"
      volume_type = "gp2"
      volume_size = 50
    }
  ]

  disable_api_termination     = true
  vpc_security_group_ids      = tolist([module.prod_ml_api_secgroup.this_security_group_id])
  subnet_ids                  = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_private_subnets

  tags = {
    Name        = "topdup-prod-ml-api"
    Terraform   = "true"
    Environment = "topdup-prod"
    Function    = "ml-api"
  }
}

module "prod_ml_api_secgroup" {
  source  = "../../../modules/terraform-aws-security-group"

  name        = "ml_api_secgroup"
  description = "Security group for Database Ec2 instance"
  vpc_id      = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id

  ingress_cidr_blocks = [data.terraform_remote_state.prod_vpc.outputs.prod_vpc_cidr_block]
  ingress_rules       = ["ssh-tcp", "all-icmp"]
  ingress_with_cidr_blocks = [
    {
      from_port   = 8000
      to_port     = 8000
      protocol    = "tcp"
      description = "Allow Wireguard VPN"
      cidr_blocks = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_cidr_block
    }
  ]
  egress_rules        = ["all-all"]
}
