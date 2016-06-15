'use strict'
const React = require('react')
const { connect } = require('react-redux')
const moment = require('moment-timezone')

const DateTime = props => {
  const {
    date,
    showTime = true,
    showWeekDay = false,
    timeZone,
    appTimeZone
  } = props
  const m = moment(date).tz(timeZone || appTimeZone)

  let format = 'YYYY-MM-DD'
  if (showWeekDay)
    format = `dddd ${format}`
  if (showTime) {
    format = `${format} HH:mm`
    if (timeZone !== appTimeZone)
      format = `${format} z`
  }
  return (
    <time dateTime={m.format()}>
      {m.format(format)}
    </time>
  )
}

const wrapped = connect(
  function mapStateToProps(state, ownProps) {
    state = state.asMutable({deep: true})
    return {
      appTimeZone: state.timeZone
    }
  }
)(DateTime)

module.exports = wrapped
