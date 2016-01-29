'use strict'
import _ from 'lodash'
import React from 'react'
import {Link} from 'react-router'
import BusyIndicator from './busyIndicator.jsx'
import appScroll from '../utilities/appScroll'
import ajax from '../utilities/ajax'
import auth from '../flux/auth'
import setWindowTitle from '../utilities/setWindowTitle'

class Users extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      authUser: null,
      error: null,
      queryUpdateTimeout: null,
      workingQuery: this.props.location.query,
      results: [],
      endReached: false
    }
    this._useManualApply = this._useManualApply.bind(this)
    this._loadAuthUser = this._loadAuthUser.bind(this)
    this._updateWorkingQuery = this._updateWorkingQuery.bind(this)
    this._correctUrlQuery = this._correctUrlQuery.bind(this)
    this._doSearch = this._doSearch.bind(this)
    this._loadMoreResults = this._loadMoreResults.bind(this)
    this._isInNextPageZone = this._isInNextPageZone.bind(this)
    this._onScroll = this._onScroll.bind(this)
    this._onApply = this._onApply.bind(this)
    this._onRevert = this._onRevert.bind(this)
  }
  // Are we redirecting after input or waiting until the user manually clicks "apply"?
  _useManualApply() {
    // Borrowed from rackt/history/modules/DOMUtils.supportsHistory
    const ua = navigator.userAgent
    if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) && ua.indexOf('Mobile Safari') !== -1 && ua.indexOf('Chrome') === -1 && ua.indexOf('Windows Phone') === -1) {
      return true
    }
    if (ua.indexOf('CriOS') !== -1) {
      return true
    }
    return !window.history || !window.history.pushState

  }
  _loadAuthUser() {
    const credentials = auth.getCredentials()
    if (credentials) {
      let r = ajax({
        method: 'GET',
        uri: '/api/users/' + credentials.id,
        json: true,
        auth: credentials
      })
      this.setState({
        runningRequest: r // Hold on to the Ajax promise in case we need to cancel it later.
      })
      return r.then((response) =>{
        if (response.statusCode === 200) {
          this.setState({
            authUser: response.body
          })
        } else {
          this.setState({
            serverError: response.body
          })
        }
        return null
      }).catch((error) => {
        this.setState({
          serverError: error.message
        })
      })
    } else {
      return Promise.resolve()
    }
  }
  // Read the search parameters from the controls and use them to construct the working query.
  _updateWorkingQuery() {
    // Collect the search parameters from the controls.
    let parameters = {
      givenName: this.refs.givenName.value,
      familyName: this.refs.familyName.value,
      emailAddress: this.refs.emailAddress ? this.refs.emailAddress.value : undefined,
      sortBy: this.refs.sortBy.value,
      sortOrder: this.refs.sortOrderDescending.checked ? 'descending' : 'ascending'
    }
    this.setState({workingQuery: parameters})
  }
  // Correct any errors in the provided query.
  _correctUrlQuery(query, options) {
    const delayed = options && !!options.delayed
    const replace = options && !!options.replace
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
        this.setState({queryUpdateTimeout: null})
      }
    }
    if (this.state.queryUpdateTimeout) {
      clearTimeout(this.state.queryUpdateTimeout)
    }
    // If the valid query differs from the supplied query, redirect to it.
    if (delayed) {
      // Delay the query update to one second after the most recent edit.
      let queryUpdateTimeout = setTimeout(doRedirect, 500)
      this.setState({queryUpdateTimeout: queryUpdateTimeout})
    } else {
      doRedirect()
    }
  }
  // Initiate a search from the URL query.
  _doSearch(offset) {
    if (this.state.runningRequest) {
      this.state.runningRequest.cancel()
    }
    const authCredentials = auth.getCredentials()
    let query = _.cloneDeep(this.props.location.query)
    if (offset) {
      query.offset = offset
    }
    let r = ajax({
      method: 'GET',
      uri: '/api/users',
      auth: authCredentials,
      json: true,
      qs: query
    })
    this.setState({
      runningRequest: r,
      error: null
    })
    r.then((response) => {
      if (response.statusCode === 200) {
        let results = []
        if (offset) {
          Array.prototype.push.apply(results, this.state.results)
        }
        Array.prototype.push.apply(results, response.body)
        this.setState({
          error: null,
          results: results,
          runningRequest: null,
          endReached: !response.body.length
        }, this._loadMoreResults)
        return null
      } else {
        this.setState({
          error: response.body,
          runningRequest: null
        })
      }
    }).catch((error) => {
      this.setState({
        error: error.message,
        runningRequest: null
      })
    })
  }
  _loadMoreResults() {
    if (this._isInNextPageZone() && !this.state.runningRequest && !this.state.endReached) {
      this._doSearch(this.state.results.length)
    }
  }
  componentWillMount() {
    // Correct the URL query if it's invalid.
    this._loadAuthUser().then(() => {
      this._correctUrlQuery(this.props.location.query, {
        replace: true,
        delayed: false
      })
      this._doSearch()
    })
  }
  componentWillReceiveProps(nextProps) {
    const urlQueryChanged = !_.isEqual(nextProps.location.query, this.props.location.query)
    if (urlQueryChanged) {
      this.setState({workingQuery: nextProps.location.query})
    }
  }
  componentWillUpdate(nextProps, nextState) {
    if (!this._useManualApply()) {
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
    }
  }
  componentDidMount() {
    appScroll.addListener(this._onScroll)
    setWindowTitle('user search')
  }
  componentWillUnmount() {
    appScroll.removeListener(this._onScroll)
    setWindowTitle()
  }
  _isInNextPageZone() {
    const element = this.refs.caboose
    if (element) {
      return element.getBoundingClientRect().top <= window.innerHeight
    } else {
      return false
    }
  }
  _onScroll(event) {
    return this._loadMoreResults()
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
    this.setState({workingQuery: this.props.location.query})
  }
  render() {
    let caboose = null
    const authUser = this.state.authUser
    if (this.state.endReached) {
      if (!this.state.results.length) {
        caboose = (
          <div className='caboose' ref='caboose'>
            no results
          </div>
        )
      }
    } else {
      caboose = (
        <div className='caboose' ref='caboose'>
          <BusyIndicator/>
          loading more
        </div>
      )
    }
    return (
      <div id='userSearch'>
        <form id='filter' onChange={this._updateWorkingQuery}>
          {(authUser && authUser.admin) ? (
            <label>
              email address
              <input type='text' ref='emailAddress' value={this.state.workingQuery.emailAddress}/>
            </label>
          ) : null}
          <label>
            first name
            <input type='text' ref='givenName' value={this.state.workingQuery.givenName}/>
          </label>
          <label>
            last name
            <input type='text' ref='familyName' value={this.state.workingQuery.familyName}/>
          </label>
          <label>
            sort by
            <select ref='sortBy' value={this.state.workingQuery.sortBy}>
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
            <input type='checkbox' ref='sortOrderDescending' checked={this.state.workingQuery.sortOrder === 'descending'}/>
            descending
          </label>
          {this._useManualApply()
            ? (
              <div>
                <button onClick={this._onApply} disabled={!!this.state.runningRequest} className='highlighted'>
                  apply
                </button>
                <button onClick={this._onRevert} disabled={!!this.state.runningRequest}>
                  revert
                </button>
              </div>
            )
            : (null)}
        </form>
        <div id='userList'>
          {_.map(this.state.results, function(user) {
            return <Entry user={user} authUser={authUser} key={user.id}/>
          })}
          {caboose}
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

export default Users
