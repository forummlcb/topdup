job "ml-api" {
  type = "service"
  datacenters = ["components"]
  namespace = "default"
  group "ml-api" {
    count = 2
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
        "function=ml-api",
      ]
      meta {
        name = "staging-ml-api"
      }
    }
    task "ml-api" {
      driver = "docker"
      config {
        image = "$REGISTRY/$REPO:$TAG"
        ports = ["http"]
        volumes = [
           "/home/ubuntu/artifacts/:/artifacts"
        ]
      }
      env {
        POSTGRES_URI = $POSTGRES_URI
      }
    }
  }
}
