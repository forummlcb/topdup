job "crawler" {
  type = "service"
  datacenters = ["components"]
  namespace = "default"
  group "crawler" {
    count = 1
    restart {
      attempts = 2
      interval = "1m"
      delay = "15s"
      mode = "fail"
    }
    service {
      name = "crawler"
      meta {
        name = "staging-crawler"
      }
    }
    task "crawler" {
      driver = "docker"
      resources {
        cpu = 200
        memory = 200
      }
      config {
        image = "$REGISTRY/$REPO:$TAG"
        volumes = [
           "/home/ubuntu/artifacts/:/artifacts"
        ]
        dns_servers = ["${attr.unique.network.ip-address}"]
      }
      env {
        DOCBAO_POSTGRES_HOST =
        DOCBAO_POSTGRES_USERNAME =
        DOCBAO_POSTGRES_PASSWORD =
        DOCBAO_POSTGRES_DATABASE =
        DOCBAO_POSTGRES_PORT =
        PGADMIN_DEFAULT_EMAIL =
        PGADMIN_DEFAULT_PASSWORD =
        POSTGRES_DB =
        POSTGRES_USER =
        POSTGRES_PASSWORD =
      }
    }
  }
}
