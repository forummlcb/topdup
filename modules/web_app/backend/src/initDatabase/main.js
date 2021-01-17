const initDatabase = require('./initDatabase')
const seedDatabase = require('./seedDatabase')
const pool = require("pg");

initDatabase.init()
  .then(() => seedDatabase.seed()
    .then(() => {
      console.log('Init successfully')
    }))