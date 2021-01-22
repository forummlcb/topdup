const { Client } = require('pg')

const configDatabase = {
  user: 'admin',
  host: 'localhost',
  database: 'topdup_db',
  password: 'admin',
  port: '5432'
}

const client = new Client(
  configDatabase
);

client.connect()

// Manually edit params here!
data = [
    
]

async function testQuery() {

    // Manually edit SQL statement here
    const query = {
        text: 'select * from user',
        values: data
      }
  
    await client.query(query, (err, res) => {
        if (err) {
          console.log(err.stack)
        } else {
            res.rows.forEach((row) => console.log(row))
        }
    })
    console.log("Please terminate it manually!")
}

testQuery()