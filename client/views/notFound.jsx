'use strict'
var React = require('react')
var TitleMixin = require('./titleMixin')

var NotFound = React.createClass({
  mixins: [
    TitleMixin('page not found')
  ],
  render: function() {
    return (
      <div className='message'>
        <h1>
          no such page
        </h1>
        <p>
          That page wasn't found.
        </p>
      </div>
    )
  }
})

module.exports = NotFound
