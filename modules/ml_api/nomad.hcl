job "ml-api" {
  type = "service"
  datacenters = ["components"]
  namespace = "default"
  group "ml-api" {
    count = 2
    network {
      port "http"{ 
        to = 8000
      }
    }
    restart {
      attempts = 2
      interval = "1m"
      delay = "15s"
      mode = "fail"
    }
    service {
      name = "ml-api"
      port = "http"
      tags = [
        "staging",
        "traefik.enable=true",
        "traefik.http.routers.ml-api.entrypoints=web",
        "traefik.http.middlewares.strip-prefix.stripprefix.prefixes=/mlapi",
        "traefik.http.routers.ml-api.middlewares=strip-prefix",
        "traefik.http.routers.ml-api.rule=Host(`traefik.service.consul`) && PathPrefix(`/mlapi`)",
        "traefik.http.routers.ml-api.service=ml-api",
      ]
      meta {
        name = "staging-ml-api"
      }
    }
    task "ml-api" {
      driver = "docker"
        resources {
          cpu = 1024
          memory = 1024
        }
      config {
        image = "$REGISTRY/$REPO:$TAG"
        ports = ["http"]
        volumes = [
           "/home/ubuntu/artifacts/:/artifacts"
        ]
        dns_servers = ["${attr.unique.network.ip-address}"]
      }
      env {
        POSTGRES_URI = "$POSTGRES_URI"
      }
    }
  }
}
