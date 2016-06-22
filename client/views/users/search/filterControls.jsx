'use strict'
const _ = require('lodash')
const React = require('react')
const ErrorMessage = require('../../errorMessage.jsx')
const update = require('react-addons-update')

const FilterControls = props => {
  const {
    // These are provided by ProfessionalSearchRouteHandler.
    authUser,
    // The rest of these are provided by GenericSearch.
    filterState,
    showApplyButton,
    busy,
    error,
    fieldErrors,
    onFilterChange,
    onApply,
    onRevert
  } = props
  const fieldErrorMessage = fieldName =>
    <ErrorMessage error={_.at(fieldErrors, fieldName)[0] || []}/>
  const onFieldChange = fieldName => value =>
    onFilterChange(update(filterState, {
      [fieldName]: {$set: value}
    }))
  const onChangeSortOrder = checked =>
    onFieldChange('sortOrder')(checked ? 'descending' : 'ascending')
  return (
    <form className='filterControls'>
      {(authUser && authUser.admin) ? (
        <label>
          email address
          <input
            type='text'
            value={filterState.emailAddress || ''}
            onChange={({target: {value}}) =>
              onFieldChange('emailAddress')(value)
            }
            />
          {fieldErrorMessage('emailAddress')}
        </label>
      ) : null}
      <label>
        first name
        <input
          type='text'
          value={filterState.givenName || ''}
          onChange={({target: {value}}) =>
            onFieldChange('givenName')(value)
          }
          />
        {fieldErrorMessage('givenName')}
      </label>
      <label>
        last name
        <input
          type='text'
          value={filterState.familyName || ''}
          onChange={({target: {value}}) =>
            onFieldChange('familyName')(value)
          }
          />
        {fieldErrorMessage('familyName')}
      </label>
      <label>
        sort by
        <select
          value={filterState.sortBy}
          onChange={({target: {value}}) =>
            onFieldChange('sortBy')(value)
          }
          >
          {(authUser && authUser.admin) ? (
            <option value='emailAddress'>
              email address
            </option>
          ) : null}
          <option value='givenName'>
            first name
          </option>
          <option value='familyName'>
            last name
          </option>
        </select>
        {fieldErrorMessage('sortBy')}
      </label>
      <label>
        <input
          type='checkbox'
          checked={filterState.sortOrder === 'descending'}
          onChange={({target: {checked}}) =>
            onChangeSortOrder(checked)
          }
          />
        descending
        {fieldErrorMessage('sortOrder')}
      </label>
      {showApplyButton
        ? (
          <div>
            <button
              onClick={onApply}
              disabled={busy}
              className='highlighted'
              >
              apply
            </button>
            <button
              onClick={onRevert}
              disabled={busy}
              >
              revert
            </button>
          </div>
        )
        : (null)}
      <ErrorMessage error={error}/>
    </form>
  )
}

module.exports = FilterControls
