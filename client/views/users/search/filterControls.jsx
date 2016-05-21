'use strict'
const React = require('react')
const ErrorMessage = require('../../errorMessage.jsx')

class FilterControls extends React.Component {
  static propTypes = {
    // These are provided by ProfessionalSearchRouteHandler.
    authUser: React.PropTypes.object,
    // The rest of these are provided by GenericSearch.
    filterState: React.PropTypes.object,
    showApplyButton: React.PropTypes.bool,
    busy: React.PropTypes.bool,
    error: React.PropTypes.string,
    fieldErrors: React.PropTypes.object,
    onFilterChange: React.PropTypes.func,
    onApply: React.PropTypes.func,
    onRevert: React.PropTypes.func
  };
  static defaultProps = {
    authUser: null,
    profession: null,
    skills: null,
    filterState: {},
    showApplyButton: false,
    busy: false,
    error: null,
    fieldErrors: null,
    onFilterChange: null,
    onApply: () => {},
    onRevert: () => {}
  };
  constructor(props) {
    super(props)
    this._onChange = this._onChange.bind(this)
  }
  _onChange() {
    const {
      props: {
        onFilterChange
      },
      refs
    } = this
    // Collect the search parameters from the controls.
    onFilterChange({
      givenName: refs.givenName.value,
      familyName: refs.familyName.value,
      emailAddress: refs.emailAddress ? refs.emailAddress.value : undefined,
      sortBy: refs.sortBy.value,
      sortOrder: refs.sortOrderDescending.checked ? 'descending' : 'ascending'
    })
  }
  render() {
    const {
      props: {
        authUser,
        filterState,
        showApplyButton,
        busy,
        error,
        fieldErrors,
        onApply,
        onRevert
      },
      _onChange
    } = this
    return (
      <form className='filterControls'>
        {(authUser && authUser.admin) ? (
          <label>
            email address
            <input type='text' ref='emailAddress' value={filterState.emailAddress} onChange={_onChange}/>
          </label>
        ) : null}
        <label>
          first name
          <input type='text' ref='givenName' value={filterState.givenName} onChange={_onChange}/>
        </label>
        <label>
          last name
          <input type='text' ref='familyName' value={filterState.familyName} onChange={_onChange}/>
        </label>
        <label>
          sort by
          <select ref='sortBy' value={filterState.sortBy} onChange={_onChange}>
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
        </label>
        <label>
          <input type='checkbox' ref='sortOrderDescending' checked={filterState.sortOrder === 'descending'} onChange={_onChange}/>
          descending
        </label>
        {showApplyButton
          ? (
            <div>
              <button onClick={onApply} disabled={busy} className='highlighted'>
                apply
              </button>
              <button onClick={onRevert} disabled={busy}>
                revert
              </button>
            </div>
          )
          : (null)}
        <ErrorMessage error={error}/>
      </form>
    )
  }
}

module.exports = FilterControls
