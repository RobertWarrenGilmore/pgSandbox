'use strict'
const _ = require('lodash')
const React = require('react')
const { Link } = require('react-router')
const BusyIndicator = require('../busyIndicator.jsx')
const ScrollCaboose = require('../scrollCaboose.jsx')
const ErrorMessage = require('../errorMessage.jsx')
const { connect } = require('react-redux')
const { search: searchUsers } = require('../../flux/users/actions')
const Helmet = require('react-helmet')

const ua = navigator.userAgent
// Are we redirecting after input or waiting until the user manually clicks "apply"?
// Borrowed from rackt/history/modules/DOMUtils.supportsHistory
const useManualApply =
  (
    (ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
    ua.indexOf('Mobile Safari') !== -1 && ua.indexOf('Chrome') === -1 && ua.indexOf('Windows Phone') === -1
  ) ||
  (ua.indexOf('CriOS') !== -1) ||
  !window.history ||
  !window.history.pushState

class UserSearch extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      error: null,
      queryUpdateTimeout: null,
      workingQuery: this.props.location.query,
      results: [],
      endReached: false,
      scrolledToBottom: false
    }
    this._updateWorkingQuery = this._updateWorkingQuery.bind(this)
    this._correctUrlQuery = this._correctUrlQuery.bind(this)
    this._doSearch = this._doSearch.bind(this)
    this._loadMoreResults = this._loadMoreResults.bind(this)
    this._scrollCabooseListener = this._scrollCabooseListener.bind(this)
    this._onApply = this._onApply.bind(this)
    this._onRevert = this._onRevert.bind(this)
  }
  // Read the search parameters = require(the controls and use them to construct the working query.
  _updateWorkingQuery() {
    // Collect the search parameters = require(the controls.
    let parameters = {
      givenName: this.refs.givenName.value,
      familyName: this.refs.familyName.value,
      emailAddress: this.refs.emailAddress ? this.refs.emailAddress.value : undefined,
      sortBy: this.refs.sortBy.value,
      sortOrder: this.refs.sortOrderDescending.checked ? 'descending' : 'ascending'
    }
    this.setState({
      workingQuery: parameters
    })
  }
  // Correct any errors in the provided query.
  _correctUrlQuery(query, options) {
    const { delayed, replace } = options || {}
    let validQuery = {}
    // Only these parameters can be filtered on.
    const validFilter = ['familyName', 'givenName', 'emailAddress']
    for (let i in validFilter) {
      let parameter = validFilter[i]
      if (query[parameter]) {
        validQuery[parameter] = query[parameter]
      }
    }
    // sortBy has valid values and a default.
    const validSortBy = ['familyName', 'givenName', 'emailAddress']
    if (!query.sortBy || (validSortBy.indexOf(query.sortBy) == -1)) {
      validQuery.sortBy = validSortBy[0]
    } else {
      validQuery.sortBy = query.sortBy
    }
    // sortOrder has valid values and a default.
    const validSortOrder = ['ascending', 'descending']
    if (!query.sortOrder || (validSortOrder.indexOf(query.sortOrder) == -1)) {
      validQuery.sortOrder = validSortOrder[0]
    } else {
      validQuery.sortOrder = query.sortOrder
    }
    let navigate = this.props.history[replace
        ? 'replaceState'
        : 'pushState']
    const doRedirect = () => {
      if (!_.isEqual(query, validQuery)) {
        navigate(null, this.props.location.pathname, validQuery)
      }
      if (this.state.queryUpdateTimeout) {
        this.setState({
          queryUpdateTimeout: null
        })
      }
    }
    if (this.state.queryUpdateTimeout) {
      clearTimeout(this.state.queryUpdateTimeout)
    }
    // If the valid query differs from the supplied query, redirect to it.
    if (delayed) {
      // Delay the query update to half a second after the most recent edit.
      let queryUpdateTimeout = setTimeout(doRedirect, 500)
      this.setState({
        queryUpdateTimeout: queryUpdateTimeout
      })
    } else {
      doRedirect()
    }
  }
  // Initiate a search.
  _doSearch(newSearch = true) {
    const startingResults = newSearch ? [] : this.state.results
    const endReached = newSearch ? false : this.state.endReached
    this.setState({
      busy: true,
      error: null,
      results: startingResults,
      endReached
    })
    return this._loadMoreResults(startingResults)
      .catch(err => this.setState({
        error: err.message || err
      }))
      .then(() => this.setState({
        busy: false
      }))
  }
  // Continue a search.
  _loadMoreResults(existingResults = []) {
    if (this.state.scrolledToBottom && !this.state.endReached) {
      const query = Object.assign({
        offset: this.state.results.length
      }, this.props.location.query)
      return this.props.searchUsers(query).then(ids => {
        if (ids.length) {
          const newResults = existingResults.concat(ids)
          this.setState({
            results: newResults
          })
          // We keep adding this back into this promise chain until no more ids are returned.
          return this._loadMoreResults(newResults)
        } else {
          // Base case; no more ids to add.
          this.setState({
            endReached: true
          })
        }
      })
    } else {
      return Promise.resolve()
    }
  }
  componentWillMount() {
    // Correct the URL query if it's invalid.
    this._correctUrlQuery(this.props.location.query, {
      replace: true,
      delayed: false
    })
  }
  componentDidMount() {
    this._doSearch()
  }
  componentWillReceiveProps(nextProps) {
    const urlQueryChanged = !_.isEqual(nextProps.location.query, this.props.location.query)
    if (urlQueryChanged) {
      this.setState({
        workingQuery: nextProps.location.query
      })
    }
  }
  componentWillUpdate(nextProps, nextState) {
    if (!useManualApply) {
      const workingQueryChanged = !_.isEqual(nextState.workingQuery, this.state.workingQuery)
      const urlQueryIsBehindWorkingQuery = !_.isEqual(nextState.workingQuery, nextProps.location.query)
      if (workingQueryChanged && urlQueryIsBehindWorkingQuery) {
        this._correctUrlQuery(nextState.workingQuery, {
          replace: false,
          delayed: true
        })
      }
    }
  }
  componentDidUpdate(prevProps, prevState) {
    const urlQueryChanged = !_.isEqual(this.props.location.query, prevProps.location.query)
    if (urlQueryChanged) {
      this._correctUrlQuery(this.props.location.query, {
        replace: true,
        delayed: false
      })
      this._doSearch()
    } else if (this.state.scrolledToBottom && !this.state.endReached && !this.state.busy) {
      this._doSearch(false)
    }
  }
  _scrollCabooseListener(visible) {
    this.setState({
      scrolledToBottom: visible
    })
  }
  _onApply(event) {
    event.preventDefault()
    this._correctUrlQuery(this.state.workingQuery, {
      replace: false,
      delayed: false
    })
  }
  _onRevert(event) {
    event.preventDefault()
    this.setState({
      workingQuery: this.props.location.query
    })
  }
  render() {
    const { authUser, users } = this.props
    const { busy, results, error, endReached, workingQuery } = this.state
    return (
      <div id='userSearch'>
        <Helmet title='user search'/>
        <form id='filter' onChange={this._updateWorkingQuery}>
          {(authUser && authUser.admin) ? (
            <label>
              email address
              <input type='text' ref='emailAddress' value={workingQuery.emailAddress}/>
            </label>
          ) : null}
          <label>
            first name
            <input type='text' ref='givenName' value={workingQuery.givenName}/>
          </label>
          <label>
            last name
            <input type='text' ref='familyName' value={workingQuery.familyName}/>
          </label>
          <label>
            sort by
            <select ref='sortBy' value={workingQuery.sortBy}>
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
            <input type='checkbox' ref='sortOrderDescending' checked={workingQuery.sortOrder === 'descending'}/>
            descending
          </label>
          {useManualApply
            ? (
              <div>
                <button onClick={this._onApply} disabled={busy} className='highlighted'>
                  apply
                </button>
                <button onClick={this._onRevert} disabled={busy}>
                  revert
                </button>
              </div>
            )
            : (null)}
          <ErrorMessage error={error}/>
        </form>
        <div id='userList'>
          {_.map(results, userId =>
            <Entry user={users[userId]} authUser={authUser} key={userId}/>
          )}
          {(endReached) ? (
            (!results.length) ? (
              <ScrollCaboose visibilityListener={this._scrollCabooseListener}>
                no results
              </ScrollCaboose>
            ) : null
          ) : (
            <ScrollCaboose visibilityListener={this._scrollCabooseListener}>
              <BusyIndicator/>
              loading more
            </ScrollCaboose>
          )}
        </div>
      </div>
    )
  }
}

const Entry = (props) => {
  const user = props.user
  return (
    <Link className='user' to={'/users/' + user.id}>
      <div className='name'>
        {user.givenName} {user.familyName}
      </div>
      {(user.emailAddress) ? (
        <div className='emailAddress'>
          {user.emailAddress}
        </div>
      ) : null}
    </Link>
  )
}
UserSearch.propTypes = {
  authUser: React.PropTypes.object,
  users: React.PropTypes.object,
  searchUsers: React.PropTypes.func
}
UserSearch.defaultProps = {
  authUser: null,
  users: null,
  searchUsers: null
}

const wrapped = connect(
  function mapStateToProps(state) {
    state = state.asMutable({deep: true})
    let authUser
    if (state.auth.id && state.users) {
      authUser = state.users[state.auth.id]
    }
    return {
      authUser,
      users: state.users
    }
  },
  function mapDispatchToProps(dispatch) {
    return {
      searchUsers: (user, id) => dispatch(searchUsers(user, id))
    }
  }
)(UserSearch)

module.exports = wrapped
