You can run postgres docker container by running this command:
`sudo docker run -d -p 5432:5432 --name db --restart always -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=topdup_db -d postgres`

To init database, you can run: `npm run init-database`
Check number of rows in your table similarity_report in database, when it greater than 30000 then you need to go back to the terminall and `Ctrl+c` to terminate the program manually.  