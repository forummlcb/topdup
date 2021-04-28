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
    service {
      name = "backend"
      port = "http"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.webapp-backend.rule=Path(`/`)",
        "traefik.http.routers.webapp-backend.rule=Host(`stag.alb.topdup.org`)",
        "function=backend",
        "env=staging"
      ]
    }
    task "backend" {
      driver = "docker"
      config {
        image = "$REGISTRY/$REPO:$TAG"
        ports = ["http"]
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
