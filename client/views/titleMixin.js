'use strict';
var appInfo = require('../../appInfo.json');

var TitleMixin = function (initialTitle) {
  return {
    componentDidMount: function () {
      this.setTitle(initialTitle);
    },
    componentWillUnmount: function () {
      this.setTitle();
    },
    setTitle: function (title) {
      document.title = appInfo.name;
      if (title && title.length) {
        document.title += ' - ' + title;
      }
    }
  };
};

module.exports = TitleMixin;
