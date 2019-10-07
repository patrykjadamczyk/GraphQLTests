const { ApolloServer, gql } = require('apollo-server');
const config = require('./config');
const mysql = require('mysql');

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
    # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

    type Flag {
        id: ID
        code: String
        state: Int
        data: String
        lastUpdate: String
    }

    # The "Query" type is special: it lists all of the available queries that
    # clients can execute, along with the return type for each. In this
    # case, the "books" query returns an array of zero or more Books (defined above).
    type Query {
        flags: [Flag]
        getFlag(id: ID): Flag
    }
`;


function executeSQL(sql, values=[]) {
    const dbConnection = mysql.createConnection({
        host: config.db.host,
        user: config.db.user,
        password: config.db.pass,
        database: config.db.db,
    });
    dbConnection.connect();
    return new Promise((res, rej) => {
        const resultPromise = new Promise((resolve, reject) => {
            return dbConnection.query(sql, values, (err, result) => {
                if (err) {
                    console.error(err);
                    return reject(err);
                }
                return resolve(result);
            });
        });
        return resultPromise.then(res).catch(rej).finally(() => dbConnection.end());
    })
}

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
    // Resolver function (parent, args, context, info) => (null||undefined) | array | Promise | (Object||Scalar)
    Query: {
        flags: async () => {
            let results;
            try {
                results = await executeSQL('SELECT * FROM flag ORDER BY flag_id ASC');
            } catch(e) {
                console.error(e);
                return undefined;
            }
            return results.map(field => ({
                id: field.flag_id,
                code: field.flag_code,
                state: field.state,
                data: field.flag_data,
                lastUpdate: (new Date(field.last_update)).toString(),
            }));
        },
        getFlag: async (p, { id }) => {
            let results;
            try {
                results = await executeSQL('SELECT * FROM flag WHERE flag_id = ?', [id]);
            } catch(e) {
                console.error(e);
                return undefined;
            }
            console.warn(id, results);
            if (results.length === 0) {
                console.error('No results');
                return undefined;
            }
            return {
                id: results[0].flag_id,
                code: results[0].flag_code,
                state: results[0].state,
                data: results[0].flag_data,
                lastUpdate: (new Date(results[0].last_update)).toString(),
            };
        },
    },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
    typeDefs,
    resolvers,
});

// The `listen` method launches a web server.
server.listen()
    .then(({ url }) => {
        console.log(`🚀  Server ready at ${url}`);
    });
