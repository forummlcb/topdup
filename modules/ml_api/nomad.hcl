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
        "traefik.http.routers.ml-api.rule=Headers(`function`, `api`)",
        "traefik.http.routers.ml-api.service=ml-api",
      ]
      meta {
        name = "staging-ml-api"
      }
    }
    task "ml-api" {
      driver = "docker"
      resources {
        cpu = 512
        memory = 1024
      }
      config {
        image = "$REGISTRY/$REPO:$TAG"
        ports = ["http"]
        volumes = [
           "local/:/artifacts/"
        ]
        dns_servers = ["${attr.unique.network.ip-address}"]
      }
      env {
        POSTGRES_URI = "$POSTGRES_URI"
      }
      artifact {
        source      = "ml-api-artifacts.s3-ap-southeast-1.amazonaws.com/cand.bin"
        destination = "local/"
      }
    }
  }
}
