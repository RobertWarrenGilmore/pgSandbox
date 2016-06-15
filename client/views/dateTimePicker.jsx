'use strict'
const React = require('react')
const { connect } = require('react-redux')
const moment = require('moment-timezone')
require('moment/locale/en-gb')
const Datetime = require('react-datetime')
const classnames = require('classnames')

const mod = (a, b) => (((a % b) + b) % b)

const dateFormats = [
  'YYYY-MM-DD',
  'D MMMM YYYY',
  'D MMM YYYY',
  'DD MMMM YYYY',
  'DD MMM YYYY',
  'MMMM D YYYY',
  'MMM D YYYY',
  'MMMM DD YYYY',
  'MMM DD YYYY',
  'MMMM D, YYYY',
  'MMM D, YYYY',
  'MMMM DD, YYYY',
  'MMM DD, YYYY'
]
const timeFormats = [
  'hh:mm a',
  'hh:mm A',
  'HH:mm'
]
const dateTimeFormats = []
dateFormats.forEach(df => {
  dateTimeFormats.push(df)
  timeFormats.forEach(tf => {
    dateTimeFormats.push(`${df} ${tf}`)
  })
})
timeFormats.forEach(tf => {
  dateTimeFormats.push(tf)
})

const precisionValues = [
  'minute',
  '5 minutes',
  '15 minutes',
  '30 minutes',
  'hour',
  'day',
  'month',
  'year'
]

const DateTimePicker = props => {
  const {
    value,
    onChange = ((newValue) => {}),
    timeZone: providedTimeZone,
    appTimeZone,
    precision: propsPrecision = 'day',
    disabled
  } = props

  const timeZone = providedTimeZone || appTimeZone

  let precision = propsPrecision
  if (precisionValues.indexOf(propsPrecision) === -1) {
    console.warn(`Invalid precision for date picker (${precision}). Defaulting to day.`)
    precision = 'day'
  }

  const showMonths = (precision !== 'year')
  const showDays = showMonths && (precision !== 'month')
  const showTime = showDays && (precision !== 'day')
  let dateFormat = 'YYYY'
  if (showMonths)
    dateFormat = 'MMMM YYYY'
  if (showDays)
    dateFormat = 'YYYY-MM-DD'
  let timeFormat = false
  if (showTime)
    timeFormat = 'HH:mm'

  const _onChange = (newValue) => {
    const m = moment(value).tz(timeZone)
    if (moment.isMoment(newValue)) {



      // Enforce the precision on the value.
      if (precision === 'year')
        newValue.startOf('year')
      if (precision === 'month')
        newValue.startOf('month')
      if (precision === 'day')
        newValue.startOf('day')
      if (precision === 'hour')
        newValue.startOf('hour')
      if (precision === 'minute')
        newValue.startOf('minute')
      let minutesPrecision = precision.match(/^(\d*) minutes$/)
      if (minutesPrecision !== null) {
        minutesPrecision = Number.parseInt(minutesPrecision[1])

        // Snap up or down if the time was adjusted by one minute.
        const minutes = newValue.minutes()
        const plusOne = mod((m.minutes() + 1), 60)
        const minusOne = mod((m.minutes() - 1), 60)
        if (minutes === plusOne) {
          newValue.minutes(mod((minutes + (minutesPrecision - 1)), 60))
        } else if (minutes === minusOne) {
          newValue.minutes(mod((minutes - (minutesPrecision - 1)), 60))
        } else {
          // Do normal rounding otherwise.
          const stepDown = mod(newValue.minutes(), minutesPrecision)
          const stepUp = mod((minutesPrecision - stepDown), minutesPrecision)
          if (stepDown < stepUp) {
            newValue.minutes(minutes - stepDown)
          } else {
            newValue.minutes(minutes + stepUp)
          }
        }

      }
      newValue = newValue.valueOf()
    } else {
      const parsedM = moment.tz(newValue, dateTimeFormats, true, timeZone)
      if (parsedM.isValid())
        newValue = parsedM.valueOf()
    }
    onChange(newValue)
  }

  const today = moment()

  return (
    <div className='dateTimePicker'>
      <Datetime
        onChange={_onChange}
        dateFormat={dateFormat}
        timeFormat={timeFormat}
        value={value}
        disabled={disabled}
        locale='en-gb'

        renderDay={(dayProps, currentDate, selectedDate) => (
          <td
            {...dayProps}
            className={classnames({
              [dayProps.className]: true,
              rdtWeekend: currentDate.day() === 0 || currentDate.day() === 6
            })}
            >
            {currentDate.format('DD')}
          </td>
        )}

        renderMonth={(monthProps, month, year, selectedDate) => (
          <td
            {...monthProps}
            className={classnames({
              [monthProps.className]: true,
              rdtCurrentMonth: month === today.month() && year === today.year()
            })}
            >
            {moment({month}).format('MMMM')}
          </td>
        )}

        renderYear={(yearProps, year, selectedDate) => (
          <td
            {...yearProps}
            className={classnames({
              [yearProps.className]: true,
              rdtCurrentYear: year === today.year()
            })}
            >
            {year}
          </td>
        )}

        />
    </div>
  )
}

const wrapped = connect(
  function mapStateToProps(state, ownProps) {
    state = state.asMutable({deep: true})
    return {
      appTimeZone: state.timeZone
    }
  }
)(DateTimePicker)

module.exports = wrapped
