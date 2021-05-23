job "data_wrangler" {
  type = "service"
  datacenters = ["components"]
  namespace = "default"
  group "data_wrangler" {
    count = 1
    restart {
      attempts = 2
      interval = "1m"
      delay = "15s"
      mode = "fail"
    }
    service {
      name = "data_wrangler"
      meta {
        name = "staging-data_wrangler"
      }
    }
    task "data_wrangler" {
      driver = "docker"
      resources {
        cpu = 1024
        memory = 1024
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
