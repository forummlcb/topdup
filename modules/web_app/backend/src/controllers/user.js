const Pool = require("pg").Pool;
const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'topdup_db',
    password: 'admin',
    port: 5432
});

const getUsers = (request, response) => {
    const query = `
        SELECT *
        FROM public."user" ORDER BY id ASC
    `;
    pool.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
};

const getUserById = (request, response) => {
    const id = parseInt(request.params.id);
    const query = `
    SELECT * 
    FROM public."user" WHERE id = $1
  `;
    pool.query(query, [id], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
};

const createUser = (request, response) => {
    const { firstName, lastName, email, login, password } = request.body;
    const query = `
    INSERT INTO public."user" (firstName, lastName, email, login, password)
    VALUES ($1, $2, $3, $4, $5)
  `;
    pool.query(query, [firstName, lastName, email, login, password], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(201).send(`User added with ID: ${results.insertId}`);
    }
    );
};

const updateUser = (request, response) => {
    const id = parseInt(request.params.id)
    const { firstName, lastName, email, login, password } = request.body;
    const query = `
    UPDATE public."user" 
    SET firstName = $1, lastName = $2, email = $3, login = $4, password = $5 
    WHERE id = $6
  `;
    pool.query(query, [firstName, lastName, email, login, password, id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User modified with ID: ${id}`)
    }
    )
}

const deleteUser = (request, response) => {
    const id = parseInt(request.params.id)
    const query = `DELETE FROM public."user" WHERE id = $1`
    pool.query(query, [id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User deleted with ID: ${id}`)
    })
}

export default {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
