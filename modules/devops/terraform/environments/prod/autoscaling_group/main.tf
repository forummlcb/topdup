module "prod_backend_asg" {
  source = "../../../modules/terraform-aws-ec2-autoscale-group"
 
  namespace   = "topdup"
  environment = "production"
  name        = "backend"

  image_id                    = "ami-0b399f28a2b437224"
  instance_type               = "t3a.medium"
  security_group_ids          = [module.prod_backend_secgroup.this_security_group_id]
  subnet_ids                  = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_private_subnets
  health_check_type           = "EC2"
  min_size                    = 2
  max_size                    = 4
  wait_for_capacity_timeout   = "5m"
  associate_public_ip_address = false
  target_group_arns           = data.terraform_remote_state.prod_alb.outputs.target_group_arns
  launch_template_version     = "$Latest"
  user_data_base64           = base64encode(local.userdata)

  tags = {
    Terraform = true
  }
}
module "prod_backend_secgroup" {
  source  = "../../../modules/terraform-aws-security-group"

  name        = "prod_backend_secgroup"
  description = "Security group for Production Backend Ec2 instance"
  vpc_id      = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id

  ingress_cidr_blocks = [data.terraform_remote_state.prod_vpc.outputs.prod_vpc_cidr_block]
  ingress_rules       = ["ssh-tcp", "all-icmp"]
  ingress_with_cidr_blocks = [
    {
      from_port   = 5000
      to_port     = 5000
      protocol    = "tcp"
      description = "Allows access to SFTP from EKS and Infra subnets"
      cidr_blocks = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_cidr_block
    }
  ]
  egress_rules        = ["all-all"]
}

locals {
  userdata = <<-USERDATA
    #!/bin/bash
    nvm use 10
    sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/v10.24.0/bin /home/ubuntu/.nvm/versions/node/v10.24.0/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
    sudo systemctl start pm2-ubuntu
  USERDATA
}
