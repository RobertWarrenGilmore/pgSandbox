module.exports = function (res) {
  return function handleError(err) {
    res.status(err.errorCode || 500).send(err.message);
  };
};
