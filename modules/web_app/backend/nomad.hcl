job "backend" {
  type = "service"
  datacenters = ["webapp"]
  namespace = "default"
  group "backend" {
    count = 2
    network {
      port "http" {
        to = 5000
      }
    }
    restart {
      attempts = 2
      interval = "1m"
      delay = "15s"
      mode = "fail"
    }
    update {
      min_healthy_time  = "30s"
      healthy_deadline  = "2m"
    }
    service {
      name = "backend"
      port = "http"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.webapp-backend.rule=Host(`stag.alb.topdup.org`)",
        "traefik.http.routers.webapp-backend.service=backend",
        "staging"
      ]
    }
    task "backend" {
      driver = "docker"
      config {
        image = "$REGISTRY/$REPO:$TAG"
        ports = ["http"]
        dns_servers = ["${attr.unique.network.ip-address}"]
      }
      env {
        POOL_HOST = "$POOL_HOST"
        POOL_DB_NAME = "$POOL_DB_NAME"
        POOL_USR = "$POOL_USR"
        POOL_PWD = "$POOL_PWD"
        ML_API_URL = "$ML_API_URL"
        WEB_EMAIL = "$WEB_EMAIL"
        WEB_EMAIL_PASS = "$WEB_EMAIL_PASS"
      }
    }
  }
}
