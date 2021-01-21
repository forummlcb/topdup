# Developing queries for future usage:

## Reference:
[this](https://social.technet.microsoft.com/wiki/contents/articles/35120.sql-script-passing-parameters-to-sql-script-with-batch-file-and-powershell.aspx), and [this](https://dba.stackexchange.com/questions/19291/passing-arguments-to-psql).

## Production Pipeline
1. All sql queries in this folder must be tested thoroughly with psql cli before bringing in client call.
2. Use postgresql node client to execute sql files.

## Testing
To access the database command line in the docker container:
```
# First get inside the container.
docker exec -it db bin/bash

# Next, get inside the posgresql database cli.
psql -h localhost -p 5432 -d topdup_db -U admin --password admin

# After that, let's try some of the SQL statement:
SELECT * FROM users;
```