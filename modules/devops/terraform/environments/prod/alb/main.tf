module "prod_webapp_alb" {
  source  = "../../../modules//terraform-aws-alb"
  create_lb = true

  name = "topdup-prod-alb"
  load_balancer_type = "application"
  vpc_id             = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id
  subnets            = local.public_subnets_per_az
  security_groups    = [module.prod_alb_secgroup.this_security_group_id]

  target_groups = [
    {
      name_prefix          = "asg"
      backend_protocol     = "HTTP"
      backend_port         = 5000
      target_type          = "instance"
      deregistration_delay = 10
      stickiness           = {
        enabled = true
        cookie_duration = 60 
        type = "lb_cookie"
      }
      health_check = {
        enabled             = true
        interval            = 10
        path                = "/"
        port                = "5000"
        healthy_threshold   = 3
        unhealthy_threshold = 3
        timeout             = 6
        protocol            = "HTTP"
        matcher             = "200-399"
      }
      tags = {
        InstanceTargetGroupTag = "webapp-target"
      }
    }
  ]

  http_tcp_listeners = [
    {
      port        = 80
      protocol    = "HTTP"
      action_type = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  ]

  https_listeners = [
    {
      port               = 443
      protocol           = "HTTPS"
      target_group_index = 0
      certificate_arn    = "arn:aws:acm:ap-southeast-1:221423461835:certificate/a55d2e79-d2bf-43ab-babd-8956872a7d1f"
    }
  ]

  tags = {
    Environment = "topdup-prod"
    Terraform   = "true"
  }
}

module "prod_alb_secgroup" {
  source  = "../../../modules/terraform-aws-security-group"

  name        = "prod_alb_secgroup"
  description = "Security group for Production ALB"
  vpc_id      = data.terraform_remote_state.prod_vpc.outputs.prod_vpc_id

  ingress_cidr_blocks = ["0.0.0.0/0"]
  ingress_rules       = ["all-icmp", "http-80-tcp", "https-443-tcp"]
  egress_rules        = ["all-all"]
}

locals {
  public_subnets_per_az = [tolist(data.aws_subnet_ids.a.ids)[0], tolist(data.aws_subnet_ids.b.ids)[0], tolist(data.aws_subnet_ids.c.ids)[0]]
}
