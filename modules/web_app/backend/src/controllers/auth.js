const getToken = (request, response) => {
  response.send({
    token: "test123"
  });
};

module.exports = {
  getToken
};
