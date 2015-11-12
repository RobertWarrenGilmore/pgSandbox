var TitleMixin = function (initialTitle) {
  return {
    componentDidMount: function () {
      this.setTitle(initialTitle);
    },
    componentWillUnmount: function () {
      this.setTitle();
    },
    setTitle: function (title) {
      this.getFlux().actions.title.set(title);
    }
  };
};

module.exports = TitleMixin;
