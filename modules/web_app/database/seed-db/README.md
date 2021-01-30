Using postgres docker container by running command:
`sudo docker run -d -p 5432:5432 --name db --restart always -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=topdup_db -d postgres`

To init database only run: `npm run init-database`

To seed database only run: `npm run seed-database`

To init and seed database run: `npm run init-seed-database`

To access the database command line in the docker container:
```
# First get inside the container.
docker exec -it db bin/bash

# Next, get inside the posgresql database cli.
psql -h localhost -p 5432 -d topdup_db -U admin --password admin
```