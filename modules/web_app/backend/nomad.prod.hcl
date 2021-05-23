job "backend" {
  type = "service"
  datacenters = ["dc1"]
  namespace = "default"
  group "backend" {
    count = 4
    network {
      port "http" {
        to = 5000
      }
    }
    restart {
      attempts = 2
      interval = "1m"
      delay = "15s"
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
        "traefik.http.routers.webapp-backend.rule=Host(`alb.topdup.org`)",
        "traefik.http.routers.webapp-backend.service=backend",
        "production"
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
        ML_API_CUSTOM_HEADERS = "{\"function\":\"api\"}"
        WEB_EMAIL = "$WEB_EMAIL"
        WEB_EMAIL_PASS = "$WEB_EMAIL_PASS"
      }
    }
  }
}
